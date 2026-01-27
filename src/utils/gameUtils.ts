import { Card, PoliticianCard, SpecialCard, GameState, Player } from '../types/game';
import { getCardImagePath, Pols, Specials } from '../data/gameData';
import { getCardDetails } from '../data/cardDetails';
import { makePolInstance, makeSpecInstance } from './cardUtils';
import { makeUid } from './id';
import { getLaneCapacity } from '../ui/layout';

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

  govCards.forEach(card => {
    let influence = card.influence;

    // 🔥 CRITICAL FIX: Add temporary buffs and debuffs from effects
    const tempBuffs = (card as any).tempBuffs || 0;
    const tempDebuffs = (card as any).tempDebuffs || 0;
    influence += tempBuffs - tempDebuffs;

    // Koalitionszwang: Coalition bonus if at least two Tier-2 government cards are present
    if (govSlot?.kind === 'spec' && (govSlot as SpecialCard).name === 'Koalitionszwang') {
      const tier2GovCount = govCards.filter(c => c.T === 2 && !c.deactivated).length;
      if (tier2GovCount >= 2 && card.T === 2) {
        influence += 1;
      }
    }

    // Napoleon Komplex: Tier 1 Regierungskarten +1 Einfluss
    if (govSlot?.kind === 'spec' && (govSlot as SpecialCard).name === 'Napoleon Komplex') {
      if (card.T === 1) influence += 1;
    }

    // Zivilgesellschaft: Bewegung-Karten +1 Einfluss (wenn eine Bewegung in Öffentlichkeit liegt)
    if (pubSlot?.kind === 'spec' && (pubSlot as SpecialCard).name === 'Zivilgesellschaft') {
      const bewegungNames = ['Greta Thunberg', 'Malala Yousafzai', 'Ai Weiwei', 'Alexei Navalny'];
      const hasBewegung = state.board[player].innen.some(c => c.kind === 'spec' && (c as SpecialCard).type === 'Öffentlichkeitskarte' && bewegungNames.includes(c.name));
      if (hasBewegung) influence += 1;
    }

    // Joschka Fischer NGO-Boost: +1 Einfluss, wenn eine NGO-Öffentlichkeitskarte liegt
    if (card.name === 'Joschka Fischer' && (card as any).effect === 'ngo_boost') {
      const hasNgoCard = state.board[player].innen.some(c => c.kind === 'spec' && (c as SpecialCard).type === 'Öffentlichkeitskarte' && (c as any).tag === 'NGO');
      if (hasNgoCard) influence += 1;
    }

    // Milchglas Transparenz: +1 Einfluss wenn keine NGO/Bewegung liegt
    if (govSlot?.kind === 'spec' && (govSlot as SpecialCard).name === 'Milchglas Transparenz') {
      const ngoMovementNames = ['Jennifer Doudna', 'Noam Chomsky', 'Bill Gates', 'Greta Thunberg', 'Malala Yousafzai', 'Ai Weiwei', 'Alexei Navalny'];
      const hasNgoMovement = state.board[player].innen.some(c => c.kind === 'spec' && (c as SpecialCard).type === 'Öffentlichkeitskarte' && ngoMovementNames.includes(c.name));
      if (!hasNgoMovement) influence += 1;
    }

        // 🔥 CLUSTER 3: Aura-Effekte (on-demand Board-Check)
        // Legacy flag-based aura checks removed - auras are now calculated on-demand

        // Aura effects are now handled via Board-Check in the respective resolvers
        // No more flag-based aura calculations - everything is event-driven

    // Alternative Fakten is applied within interventions; no direct change here

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
