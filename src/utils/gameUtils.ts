import { Card, PoliticianCard, SpecialCard, GameState, Player } from '../types/game';
import { getCardImagePath, Pols, Specials } from '../data/gameData';
import { getCardDetails } from '../data/cardDetails';
import { makePolInstance, makeSpecInstance } from './cardUtils';
import { makeUid } from './id';
import { getLaneCapacity } from '../ui/layout';
import { isMovementCard, isNgoCard } from './cardClassification';

// Re-export helpers from effectUtils
export { EffectQueueManager, ActiveAbilitiesManager, tryApplyNegativeEffect, hasDiplomatCard } from './effectUtils';

// Re-export helpers from cardUtils
export {
  makePolInstance,
  makeSpecInstance,
  sortHandCards,
  adjustInfluence,
  findCardLocation,
  getAllowedLaneForCard,
  isLaneAllowedForCard,
  getCardActionPointCost
} from './cardUtils';

// Helper functions
export function ceil(x: number): number {
  return Math.ceil(x);
}

export function pow(a: number, b: number): number {
  return Math.pow(a, b);
}

export function calcBP(influence: number, T: number): number {
  return ceil(pow(influence, 1.4) + 2 * T);
}

export function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Game logic helpers
export function sumRow(arr: Card[]): number {
  return arr.reduce((a, c) => {
    if (c.kind === 'pol') {
      const card = c as PoliticianCard;
      const tempBuffs = (card as any).tempBuffs || 0;
      const tempDebuffs = (card as any).tempDebuffs || 0;
      return a + card.influence + tempBuffs - tempDebuffs; // 🔥 FIXED: Include temp buffs/debuffs
    }
    return a; // Special cards don't contribute to influence
  }, 0);
}

// Unified scoring: Government influence including permanent auras and Joschka+NGO synergy
export function sumGovernmentInfluenceWithAuras(state: GameState, player: Player): number {
  const govCards = state.board[player].aussen.filter(c => c.kind === 'pol') as PoliticianCard[];
  // Opponent reference kept for completeness of future aura checks

  let total = 0;

  const govSlot = state.permanentSlots[player].government;
  const pubSlot = state.permanentSlots[player].public;

  const scoreOf = (c: PoliticianCard) =>
    (c.influence || 0) + ((c as any).tempBuffs || 0) - ((c as any).tempDebuffs || 0);

  // Napoleon Komplex: +1 only on the strongest active Tier-1 government card
  let napoleonStrongestUid: number | null = null;
  if (govSlot?.kind === 'spec' && (govSlot as SpecialCard).name === 'Napoleon Komplex') {
    const t1 = govCards.filter(c => c.T === 1 && !(c as any).deactivated);
    if (t1.length > 0) {
      napoleonStrongestUid = (t1.reduce((best, c) => (scoreOf(c) > scoreOf(best) ? c : best)) as any).uid ?? null;
    }
  }

  // Zivilgesellschaft: +1 per active Movement on strongest gov (cap +2) — not every gov
  let zivilStrongestUid: number | null = null;
  let zivilBonus = 0;
  if (pubSlot?.kind === 'spec' && (pubSlot as SpecialCard).name === 'Zivilgesellschaft') {
    const movements = (state.board[player].innen || []).filter(c => isMovementCard(c) && !(c as any).deactivated);
    zivilBonus = Math.min(2, movements.length);
    const active = govCards.filter(c => !(c as any).deactivated);
    if (zivilBonus > 0 && active.length > 0) {
      zivilStrongestUid = (active.reduce((best, c) => (scoreOf(c) > scoreOf(best) ? c : best)) as any).uid ?? null;
    }
  }

  // Milchglas Transparenz: +1 on strongest gov when YOU have no NGO/Movement watchdogs
  let milchglasStrongestUid: number | null = null;
  if (govSlot?.kind === 'spec' && (govSlot as SpecialCard).name === 'Milchglas Transparenz') {
    const hasWatchdog = (state.board[player].innen || []).some(
      c => !(c as any).deactivated && (isNgoCard(c) || isMovementCard(c))
    );
    if (!hasWatchdog) {
      const active = govCards.filter(c => !(c as any).deactivated);
      if (active.length > 0) {
        milchglasStrongestUid = (active.reduce((best, c) => (scoreOf(c) > scoreOf(best) ? c : best)) as any).uid ?? null;
      }
    }
  }

  govCards.forEach(card => {
    if ((card as any).deactivated) return;

    let influence = card.influence;
    influence += ((card as any).tempBuffs || 0) - ((card as any).tempDebuffs || 0);

    // Koalitionszwang: all Tier-2 govs +1 when ≥2 Tier-2 present
    // Anti double-dip: skip aura on the turn on-play bonus already fired
    if (
      govSlot?.kind === 'spec' &&
      (govSlot as SpecialCard).name === 'Koalitionszwang' &&
      !state.effectFlags?.[player]?.koalitionOnPlayFiredThisTurn
    ) {
      const tier2GovCount = govCards.filter(c => c.T === 2 && !c.deactivated).length;
      if (tier2GovCount >= 2 && card.T === 2) {
        influence += 1;
      }
    }

    if (napoleonStrongestUid != null && (card as any).uid === napoleonStrongestUid) {
      influence += 1;
    }

    if (zivilStrongestUid != null && (card as any).uid === zivilStrongestUid) {
      influence += zivilBonus;
    }

    if (milchglasStrongestUid != null && (card as any).uid === milchglasStrongestUid) {
      influence += 1;
    }

    if (card.name === 'Joschka Fischer' && (card as any).effect === 'ngo_boost') {
      const hasNgo = state.board[player].innen.some(c => isNgoCard(c) && !(c as any).deactivated);
      if (hasNgo) influence += 1;
    }

    // Der Unbestechliche: +2 while global KP ≥ 4
    if (
      (card.effectKey === 'gov.unbestechlicher.kp_bonus' || card.name === 'Der Unbestechliche') &&
      Number(state.korruptionsPegel ?? 1) >= 4
    ) {
      influence += 2;
    }

    total += influence;
  });

  return total;
}

export function drawCards(
  player: Player,
  count: number,
  state: GameState,
  log: (msg: string) => void
): { newHands: GameState['hands']; newDecks: GameState['decks'] } {
  const deck = [...state.decks[player]];
  const hand = [...state.hands[player]];

  const drawn = deck.splice(0, Math.min(count, deck.length));
  hand.push(...drawn);

  if (drawn.length > 0) {
    log(`P${player} zieht ${drawn.length} Karte(n) (${deck.length} Karten verbleiben im Deck)`);
  } else if (count > 0) {
    log(`⚠️ P${player} kann keine Karten ziehen - Deck ist leer (${deck.length} Karten verbleiben)`);
  }

  return {
    newHands: { ...state.hands, [player]: hand },
    newDecks: { ...state.decks, [player]: deck }
  };
}

export function removeCardFromDeck(
  player: Player,
  card: Card,
  state: GameState,
  log: (msg: string) => void
): { newDecks: GameState['decks'] } {
  const deck = [...state.decks[player]];

  // Finde die Karte im Deck (basierend auf UID oder Name)
  const cardIndex = deck.findIndex(c =>
    (c.uid && card.uid && c.uid === card.uid) ||
    (!c.uid && !card.uid && c.name === card.name && c.kind === card.kind)
  );

  if (cardIndex !== -1) {
    deck.splice(cardIndex, 1);
    log(`🗑️ ${card.name} wurde dauerhaft aus P${player}s Deck entfernt (${deck.length} Karten verbleiben)`);
  } else {
    log(`⚠️ Karte ${card.name} nicht im Deck von P${player} gefunden`);
  }

  return {
    newDecks: { ...state.decks, [player]: deck }
  };
}

export function drawCardsAtRoundEnd(
  state: GameState,
  log: (msg: string) => void
): { newHands: GameState['hands']; newDecks: GameState['decks']; gameEnded?: boolean; winner?: Player } {
  let newHands = { ...state.hands };
  let newDecks = { ...state.decks };
  let gameEnded = false;
  let winner: Player | undefined;

  [1, 2].forEach(player => {
    const targetHandSize = 5;
    const currentHandSize = newHands[player as Player].length;
    const deckSize = newDecks[player as Player].length;
    let drawCount = Math.max(0, targetHandSize - currentHandSize);

    // 🔥 PERSISTENT DECK LOGIC: Prüfe ob Spieler keine Karten mehr hat
    // Diese Prüfung ist jetzt redundant, da sie bereits beim Karten spielen stattfindet
    // Aber als Fallback-Sicherheit beibehalten
    if (deckSize === 0 && currentHandSize === 0) {
      log(`🏁 FALLBACK: P${player} hat keine Karten mehr - Spieler ${player === 1 ? 2 : 1} gewinnt automatisch!`);
      gameEnded = true;
      winner = (player === 1 ? 2 : 1) as Player;
      return;
    }

    // 🔥 MUKESH AMBANI EFFEKT: Gegner darf 1 Karte weniger nachziehen
    const opponent = player === 1 ? 2 : 1;
    const opponentBoard = state.board[opponent];
    const mukeshAmbani = opponentBoard.innen.find(card =>
      card.kind === 'spec' && (card as any).name === 'Mukesh Ambani'
    );

    if (mukeshAmbani && drawCount > 0) {
      drawCount = Math.max(0, drawCount - 1);
      log(`🔥 MUKESH AMBANI EFFEKT: P${player} zieht 1 Karte weniger (${drawCount} statt ${drawCount + 1})`);
    }

    if (drawCount > 0) {
      const result = drawCards(player as Player, drawCount,
        { ...state, hands: newHands, decks: newDecks }, log);
      newHands = result.newHands;
      newDecks = result.newDecks;
    }
  });

  return { newHands, newDecks, gameEnded, winner };
}

// Deck building utilities
export function currentBuilderBudget(deck: any[]): number {
  return deck.reduce((sum, entry) => {
    if (entry.kind === 'pol') {
      const pol = entry.base || (entry.baseId ? Pols.find(p => p.id === entry.baseId) : null);
      if (!pol) return sum;
      const details = getCardDetails(pol.name);
      const cost = details?.deckCost ?? pol.BP ?? 0;
      return sum + cost * entry.count;
    } else {
      const spec = entry.base || (entry.baseId ? Specials.find(s => s.id === entry.baseId) : null);
      if (!spec) return sum;
      const details = getCardDetails(spec.name);
      const cost = details?.deckCost ?? spec.bp ?? 0;
      return sum + cost * entry.count;
    }
  }, 0);
}

export function currentBuilderCount(deck: any[]): number {
  return deck.reduce((sum, entry) => sum + entry.count, 0);
}

export function buildDeckFromEntries(entries: any[]): Card[] {
  const deck: Card[] = [];

  entries.forEach(entry => {
    for (let i = 0; i < entry.count; i++) {
      if (entry.kind === 'pol') {
        // Support both base object (deckbuilder) and baseId (presets)
        const base = entry.base || (entry.baseId ? Pols.find(p => p.id === entry.baseId) : null);
        if (base) deck.push(makePolInstance(base));
      } else {
        // Support both base object (deckbuilder) and baseId (presets)
        const base = entry.base || (entry.baseId ? Specials.find(s => s.id === entry.baseId) : null);
        if (base) deck.push(makeSpecInstance(base));
      }
    }
  });

  // Stelle sicher, dass jede Karte eine uid besitzt
  const deckWithUids = deck.map((c: any) => (c && c.uid) ? c : { ...c, uid: makeUid('card') });
  return shuffle(deckWithUids);
}

// Image loading utilities (Legacy function for backwards compatibility)
export function drawCardImage(
  ctx: CanvasRenderingContext2D,
  card: Card,
  dx: number,
  dy: number,
  size: number,
  imageSize: 'ui' | 'modal' = 'ui'
): void {
  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, dx, dy, size, size);
  };
  img.src = getCardImagePath(card, imageSize);
}

// Kapazitätsprüfung für Reihen (verhindert zu viele Karten in kleinen Rows)
export function canPlayToLane(state: GameState, player: Player, lane: 'public' | 'government'): boolean {
  const cap = getLaneCapacity(lane);
  const row = lane === 'public'
    ? state.board[player]?.innen ?? []
    : state.board[player]?.aussen ?? [];
  return row.length < cap;
}
