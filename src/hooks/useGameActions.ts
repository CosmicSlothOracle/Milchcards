import { useCallback, useRef, useEffect } from 'react';
import { GameState, Card, Player, BuilderEntry, PoliticianCard } from '../types/game';
import { createDefaultEffectFlags } from '../types/game';
import { buildDeckFromEntries, sumGovernmentInfluenceWithAuras } from '../utils/gameUtils';
import { PRESET_DECKS } from '../data/gameData';
import { getCardActionPointCost, getNetApCost, canPlayCard, isInitiativeCard, isGovernmentCard } from '../utils/ap';
import { triggerCardEffects } from '../effects/cards';
import { ensureTestBaselineAP } from '../utils/testCompat';
import { resolveQueue } from '../utils/queue';
import { applyStartOfTurnFlags } from '../utils/startOfTurnHooks';
import { registerTrap, applyTrapsOnCardPlayed } from '../utils/traps';
import { recomputeAuraFlags } from '../state/effects';
import { activateInstantInitiative as activateInstantInitiativeRuntime } from '../state/instantRuntime';
import { isInstantInitiative } from '../utils/initiative';
import { emptyBoard } from '../state/board';
import type { EffectEvent } from '../types/effects';
import { logger } from '../debug/logger';
import { useVisualEffects, useVisualEffectsSafe } from '../context/VisualEffectsContext';
// TS: sometimes asset module resolution fails in some setups — ignore typecheck for this import
// @ts-ignore
import slotGovGif from '../ui/layout/slot_gov.webm';
import { getUiTransform, getGovernmentRects } from '../ui/layout';

// Migration Helper für Queue-Vereinheitlichung
const migrateLegacyQueue = (state: any) => {
  // Queue migration completed - only _effectQueue exists now
};

// Helper function for getting the other player
const other = (p: Player): Player => (p === 1 ? 2 : 1) as Player;

// Hilfsfunktion: stellt sicher, dass effectFlags vorhanden sind
const ensureFlags = (s: GameState, p: Player) => {
  if (!s.effectFlags) {
    (s as any).effectFlags = { 1: createDefaultEffectFlags(), 2: createDefaultEffectFlags() };
  } else {
    s.effectFlags[p] = { ...createDefaultEffectFlags(), ...s.effectFlags[p] };
  }
};

// Lane-Heuristik wie in playCard
const pickLane = (c: Card): 'innen'|'aussen' => {
  const tag = (c as any).tag;
  if (c.kind === 'pol' && (tag === 'Staatsoberhaupt' || tag === 'Regierungschef' || tag === 'Diplomat')) return 'aussen';
  return 'innen';
};

const isCardPlayableNow = (state: GameState, player: Player, card: Card): boolean => {
  if ((card as any).deactivated) return false;

  if (card.kind === 'pol') {
    const lane = pickLane(card);
    return state.board[player][lane].length < 5;
  }

  if (card.kind === 'spec') {
    const t = String((card as any).type || '').toLowerCase();
    // Public cards
    if (t === 'öffentlichkeitskarte' || t === 'oeffentlichkeitskarte' || t === 'public') {
      return state.board[player].innen.length < 5;
    }

    // Detect Ongoing / Permanent Initiatives by explicit tags or by effectKey namespace
    const tags: string[] = (card as any).tags || (card as any).tags || [];
    const isOngoingInitiative = ((card as any).type && String((card as any).type).toLowerCase().includes('initiative')) && (tags.includes('Ongoing') || (String((card as any).effectKey || '').startsWith('init.') && tags.includes('Ongoing')));
    if (isOngoingInitiative) {
      // Determine which permanent slot this initiative should occupy. Prefer explicit slot metadata, otherwise default to government.
      const preferredSlot = (card as any).permanentSlot || ((card as any).tags && (card as any).tags.includes('Public') ? 'public' : 'government');
      return !state.permanentSlots[player][preferredSlot as 'government' | 'public'];
    }

    // sonst: Fallen/Interventionen – aktuell immer erlaubt
    return true;
  }

  return false;
};

export const hasPlayableZeroCost = (state: GameState, player: Player): boolean => {
  for (const c of state.hands[player]) {
    const { cost } = getCardActionPointCost(state, player, c);
    if (cost === 0 && isCardPlayableNow(state, player, c)) return true;
  }
  return false;
};

// Helper function to apply auras for a player (instant updates for Joschka Fischer + NGO synergy)
function applyAurasForPlayer(state: GameState, player: Player, log?: (msg: string) => void) {
  const board = state.board[player];
  const hasNgo = board.innen.some(c =>
    c.kind === 'spec' &&
    (c as any).type === 'Öffentlichkeitskarte' &&
    (c as any).tag === 'NGO' &&
    !(c as any).deactivated
  );

  const newAussen = board.aussen.map(card => {
    if (card.kind !== 'pol') return card;
    const pol: any = { ...card };
    if (pol.baseInfluence == null) pol.baseInfluence = pol.influence;
    const prev = pol.influence as number;

    let bonus = 0;
    if (!pol.deactivated && pol.name === 'Joschka Fischer' && pol.effect === 'ngo_boost' && hasNgo) {
      bonus += 1;
    }
    pol.influence = (pol.baseInfluence as number) + bonus;
    if (log && pol.influence > prev) log(`PASSIV: ${pol.name} +${pol.influence - prev} I (jetzt ${pol.influence}).`);
    return pol;
  });

  state.board = {
    ...state.board,
    [player]: { ...state.board[player], aussen: newAussen },
  } as any;
}



// Helper function to check if round should end
function checkRoundEnd(gameState: GameState): boolean {
  // Round ends if both players have passed
  const result = gameState.passed[1] && gameState.passed[2];
  logger.dbg(`checkRoundEnd P1=${gameState.passed[1]} P2=${gameState.passed[2]} result=${result}`);
  return result;
}

// Helper function to draw cards from deck
function drawCardsFromDeck(gameState: GameState, player: Player, count: number): Card[] {
  const deck = [...gameState.decks[player]];
  const drawnCards = deck.splice(0, Math.min(count, deck.length));
  return drawnCards;
}

// Helper function to really end a turn (extracted from nextTurn logic)
function reallyEndTurn(gameState: GameState, log: (msg: string) => void): GameState {
  const current = gameState.current;

  // Flag zurücksetzen - Zug-Ende wird jetzt wirklich durchgeführt
  gameState.isEndingTurn = false;

  // ✅ Karte nachziehen am Ende eines Zugs (nur wenn NICHT "pass")
  if (!gameState.passed[current]) {
    const drawnCard = gameState.decks[current].shift();
    if (drawnCard) {
      gameState.hands[current].push(drawnCard);
      log(`🔥 Zug-Ende: +1 Karte gezogen (${drawnCard.name})`);
    }
  } else {
    log(`⏭️ P${current} hat gepasst – kein Nachziehen.`);
  }

  // Check if round should end
  const shouldEndRound = checkRoundEnd(gameState);
  if (shouldEndRound) {
    log(`🏁 Runde ${gameState.round} wird beendet (Zug-Ende).`);
    return resolveRound(gameState, log);
  }

  // Spielerwechsel + AP reset
  const newCurrent: Player = current === 1 ? 2 : 1;
  gameState.current = newCurrent;
  gameState.actionPoints = { ...gameState.actionPoints, [newCurrent]: 2 };
  gameState.passed = { ...gameState.passed, [newCurrent]: false };

            // Apply new start-of-turn hooks
          applyStartOfTurnFlags(gameState, newCurrent, log);

        // 🔥 CLUSTER 3: Auren-Flags beim Zugstart neu berechnen
        recomputeAuraFlags(gameState);

  // Reset turn-bezogener Flag-Nutzungen (handled in applyStartOfTurnFlags)

  log(`🔄 Zug-Ende: Spieler ${newCurrent} ist am Zug (2 AP verfügbar)`);

  return gameState;
}

// Helper function to resolve round and start new one
function resolveRound(gameState: GameState, log: (msg: string) => void): GameState {
  // Calculate influence for both players
  const p1Influence = sumGovernmentInfluenceWithAuras(gameState, 1);
  const p2Influence = sumGovernmentInfluenceWithAuras(gameState, 2);

  log(`📊 Rundenauswertung: P1 ${p1Influence} Einfluss vs P2 ${p2Influence} Einfluss`);

  // Determine winner
  let roundWinner: Player;
  if (p1Influence > p2Influence) {
    roundWinner = 1;
    log(`🏆 Spieler 1 gewinnt die Runde! (${p1Influence} > ${p2Influence})`);
  } else if (p2Influence > p1Influence) {
    roundWinner = 2;
    log(`🏆 Spieler 2 gewinnt die Runde! (${p2Influence} > ${p1Influence})`);
  } else {
    // Tie - current player wins
    roundWinner = gameState.current;
    log(`🤝 Unentschieden! Spieler ${roundWinner} gewinnt als aktiver Spieler.`);
  }

  // Collect all cards to move to discard
  const cardsToDiscard: Card[] = [
    ...gameState.board[1].innen,
    ...gameState.board[1].aussen,
    ...gameState.board[2].innen,
    ...gameState.board[2].aussen,
    ...(gameState.permanentSlots[1].government ? [gameState.permanentSlots[1].government] : []),
    ...(gameState.permanentSlots[1].public ? [gameState.permanentSlots[1].public] : []),
    ...(gameState.permanentSlots[2].government ? [gameState.permanentSlots[2].government] : []),
    ...(gameState.permanentSlots[2].public ? [gameState.permanentSlots[2].public] : []),
    ...gameState.board[1].sofort,
    ...gameState.board[2].sofort
  ];

  // Draw 5 new cards for each player
  const newP1Hand = drawCardsFromDeck(gameState, 1, 5);
  const newP2Hand = drawCardsFromDeck(gameState, 2, 5);

  // Calculate new rounds won
  const newRoundsWon = {
    ...gameState.roundsWon,
    [roundWinner]: gameState.roundsWon[roundWinner] + 1
  };

  // Check if game should end (Best of 3: first to 2 wins)
  const p1Wins = newRoundsWon[1];
  const p2Wins = newRoundsWon[2];

  if (p1Wins >= 2 || p2Wins >= 2) {
    const gameWinner = p1Wins >= 2 ? 1 : 2;
    log(`🏆🎉 SPIEL BEENDET! Spieler ${gameWinner} gewinnt das Match! (${p1Wins}-${p2Wins})`);
    log(`🔥 Gesamtergebnis: Player ${gameWinner} ist der Sieger!`);

    // Return final state with game winner
    return {
      ...gameState,
      roundsWon: newRoundsWon,
      gameWinner,
      // Keep current board state for final display
      passed: { 1: true, 2: true }, // Both passed to indicate game end
    };
  }

  // Create new state for next round
  const newState: GameState = {
    ...gameState,
    round: gameState.round + 1,
    current: roundWinner, // Winner starts next round
         passed: { 1: false, 2: false }, // Reset pass status
     actionPoints: { 1: 2, 2: 2 }, // Reset AP
     actionsUsed: { 1: 0, 2: 0 }, // Reset actions (kept for compatibility)
     roundsWon: newRoundsWon,
    effectFlags: {
      1: createDefaultEffectFlags(),
      2: createDefaultEffectFlags()
    },
    // Clear all board positions
    board: emptyBoard(),
    // Clear permanent slots
    permanentSlots: {
      1: { government: null, public: null, initiativePermanent: null },
      2: { government: null, public: null, initiativePermanent: null }
    },
    // instantSlot wird nicht mehr verwendet - Sofort-Initiativen gehen in board[player].sofort
    // New hands with 5 cards each
    hands: {
      1: newP1Hand,
      2: newP2Hand
    },
    // Update decks (cards were removed during drawing)
    decks: {
      1: gameState.decks[1].slice(newP1Hand.length),
      2: gameState.decks[2].slice(newP2Hand.length)
    },
    // Update discard pile
    discard: [...gameState.discard, ...cardsToDiscard]
  };

  log(`🆕 Runde ${newState.round} startet! Spieler ${roundWinner} beginnt. (Rundenstand: P1 ${newState.roundsWon[1]} - P2 ${newState.roundsWon[2]})`);
  log(`🃏 Beide Spieler erhalten 5 neue Handkarten.`);

  return newState;
}

export function useGameActions(
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  log: (msg: string) => void,
  afterQueueResolved?: () => void
) {
  // Visual effects context (spawn helpers)
  // Use safe hook variant which returns null when no provider is present
  const visualEffects = useVisualEffectsSafe();
  // Helper: spawn lightweight UI visuals via window hooks (prototype only)
  const spawnCardVisual = useCallback((card: any, stateOverride?: GameState) => {
    try {
      if (!card) return;
      console.debug('[GameActions] spawnCardVisual called', { uid: card.uid ?? card.id, name: card.name });
      const uid = card.uid ?? card.id;
      // prefer VisualEffects context if available
      const effectiveState = stateOverride || gameState;
      if (visualEffects) {
        // Prefer authoritative board-based slot centering (gov slots) using effectiveState
        try {
          let located: { player: number; lane: 'aussen' | 'innen'; index: number } | null = null;
          for (const p of [1, 2] as const) {
            const aussen = effectiveState.board[p].aussen || [];
            const idxA = aussen.findIndex((c: any) => (c.uid ?? c.id) === (card.uid ?? card.id));
            if (idxA >= 0) { located = { player: p, lane: 'aussen', index: idxA }; break; }
            const innen = effectiveState.board[p].innen || [];
            const idxI = innen.findIndex((c: any) => (c.uid ?? c.id) === (card.uid ?? card.id));
            if (idxI >= 0) { located = { player: p, lane: 'innen', index: idxI }; break; }
          }

          if (located && located.lane === 'aussen') {
            const rects = getGovernmentRects(located.player === 1 ? 'player' : 'opponent');
            const slot = rects[located.index] || rects[0] || { x: 960 - 128, y: 540 - 128, w: 256, h: 256 };
            const cx_slot = slot.x + slot.w / 2;
            const cy_slot = slot.y + slot.h / 2;
            visualEffects.spawnParticles(cx_slot, cy_slot, 18);
            visualEffects.spawnPop(card.uid ?? card.id);
            console.debug('[GameActions] spawnCardVisual particles/pop (gov slot)', { uid: card.uid ?? card.id, cx: cx_slot, cy: cy_slot, slot });

            const canvas = document.querySelector('canvas');
            if (canvas) {
              const rect = canvas.getBoundingClientRect();
              const { scale, offsetX, offsetY } = getUiTransform(canvas.width, canvas.height);
              // Apply offset first, then scale (matches canvas transform order)
              const screenCx = rect.left + (cx_slot + offsetX) * scale;
              const screenCy = rect.top  + (cy_slot + offsetY) * scale;
              // Use dedicated government slot GIF provided by user
              // Use UI-based overlay spawner so we always align to canvas-derived
              // pulsing slot fields exactly (handles scale+offset internally).
              visualEffects.spawnGifOverlayUi({ id: card.uid ?? card.id, cx: cx_slot, cy: cy_slot, w: 256, h: 256, src: slotGovGif, duration: 700 });
              console.debug('[GameActions] spawnCardVisual spawnGifOverlay (gov slot)', { uid: card.uid ?? card.id, screenCx, screenCy, src: slotGovGif });
            }

            try { visualEffects.playAnimsRef.current.push({ uid: card.uid ?? card.id, started: performance.now(), duration: 420 }); } catch (e) {}
            return;
          }
        } catch (e) {
          console.debug('[GameActions] gov-slot centering failed, falling back', e);
        }
        // attempt to find a row_slot zone center via debug snapshot (avoid hand slots)
        const zones = (window as any).__politicardDebug?.clickZones || [];
        const zone = zones.find((z: any) => z.data && z.data.type === 'row_slot' && z.data.card && ((z.data.card.uid ?? z.data.card.id) === uid));
        const cx = zone ? zone.x + (zone.w || 256) / 2 : 960;
        const cy = zone ? zone.y + (zone.h || 256) / 2 : 540;
        visualEffects.spawnParticles(cx, cy, 18);
        visualEffects.spawnPop(uid);
        console.debug('[GameActions] spawnCardVisual particles/pop (fallback)', { uid, cx, cy, zone });
        // Add play animation entry so canvas will fade-in the card itself
        try {
          visualEffects.playAnimsRef.current.push({ uid, started: performance.now(), duration: 420 });
          console.debug('[GameActions] spawnCardVisual playAnimsRef push', uid);
        } catch (e) { console.debug('[GameActions] spawnCardVisual playAnimsRef push failed', e); }
        return;
      }
      // fallback to old window-based prototype
      const zones = (window as any).__politicardDebug?.clickZones || [];
      const zone = zones.find((z: any) => z.data && z.data.card && ((z.data.card.uid ?? z.data.card.id) === uid));
      const cx = zone ? zone.x + (zone.w || 256) / 2 : 960;
      const cy = zone ? zone.y + (zone.h || 256) / 2 : 540;
      (window as any).__pc_particles = (window as any).__pc_particles || [];
      for (let i = 0; i < 18; i++) {
        (window as any).__pc_particles.push({ start: performance.now(), life: 600 + Math.random() * 400, x: cx + (Math.random() - 0.5) * 40, y: cy + (Math.random() - 0.5) * 40, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 6, size: 3 + Math.random() * 5, color: ['#ffd166', '#ff6b6b', '#4ade80'][Math.floor(Math.random() * 3)], gravity: 0.12 });
      }
      (window as any).__pc_pops = (window as any).__pc_pops || [];
      (window as any).__pc_pops.push({ uid, started: performance.now(), duration: 420 });
      // Fallback: add play anim entry to global when VisualEffects not available
      (window as any).__pc_play_anims = (window as any).__pc_play_anims || [];
      (window as any).__pc_play_anims.push({ uid, started: performance.now(), duration: 420 });
      // Also attempt to use provider fallback on window if available
      try {
        const wv = (window as any).__pc_visual_effects;
        if (wv && typeof wv.spawnGifOverlay === 'function') {
          // Compute screen coords based on canvas if possible
          const canvas = document.querySelector('canvas');
          if (canvas) {
            const rect = canvas.getBoundingClientRect();
            const ui = (window as any).__politicardDebug?.uiTransform || { scale: 1, offsetX: 0, offsetY: 0 };
            const screenCx = rect.left + (cx + ui.offsetX) * ui.scale;
            const screenCy = rect.top  + (cy + ui.offsetY) * ui.scale;
            try {
              if (typeof wv.spawnGifOverlayUi === 'function') {
                // pass canvas-space coords so provider will align to UI
                try { wv.spawnGifOverlayUi({ id: uid, cx: cx, cy: cy, w: 256, h: 256, src: slotGovGif, duration: 700 }); console.debug('[GameActions] fallback window.__pc_visual_effects.spawnGifOverlayUi', uid); } catch (e) { console.debug('[GameActions] fallback spawnGifOverlayUi failed', e); }
              } else {
                wv.spawnGifOverlay({ id: uid, cx: screenCx, cy: screenCy, w: 256 * ui.scale, h: 256 * ui.scale, src: slotGovGif, duration: 700 });
                console.debug('[GameActions] fallback window.__pc_visual_effects.spawnGifOverlay', uid);
              }
            } catch (e) { console.debug('[GameActions] fallback spawnGifOverlay failed', e); }
          }
        }
      } catch (e) {}
    } catch (e) {
      // swallow - non-critical
    }
  }, [visualEffects, gameState]);
  // Guard against duplicate concurrent playCard calls for the same card UID
  const playingUidRef = useRef<Set<number>>(new Set());
  // Listen for target selection & dice result (global events)
  useEffect(() => {
    const handlePickTarget = (ev: any) => {
      const uid = ev.detail?.targetUid as number | undefined;
      const player = ev.detail?.player as Player | undefined;
      if (!uid || !player) return;
      try { log(`🎯 Corruption: Ziel gewählt (uid=${uid})`); } catch (e) {}
    };

    // Listener: when UI/modal requests a corruption roll, perform RNG and trigger visual dice
    const handleRequestRoll = (ev: any) => {
      try {
        const player = ev.detail?.player as Player | undefined;
        const targetUid = ev.detail?.targetUid as number | undefined;
        if (!player || !targetUid) return;

        console.log('🎲 CORRUPTION: Requesting roll for player', player, 'target', targetUid);
        // Quick visual fallback: dispatch an engine_dice_result immediately so the Dice3D shows a value
        try {
          const fallbackRoll = 1 + Math.floor(Math.random() * 6);
          console.debug('🎲 CORRUPTION: dispatching fallback engine_dice_result', fallbackRoll);
          window.dispatchEvent(new CustomEvent('pc:engine_dice_result', { detail: { roll: fallbackRoll, player, targetUid } }));
        } catch (e) { console.debug('🎲 CORRUPTION: fallback engine_dice_result dispatch failed', e); }

        // Enqueue the corruption resolve event - engine will also calculate roll and trigger 3D dice via resolver
        setGameState(prev => {
          const events: EffectEvent[] = [];
          events.push({ type: 'CORRUPTION_STEAL_GOV_RESOLVE', player, targetUid } as any);
          // Process immediately
          try { resolveQueue(prev as any, events); } catch (e) { console.error('resolveQueue error in handleRequestRoll', e); }
          if (afterQueueResolved) afterQueueResolved();
          return { ...prev, _effectQueue: [] };
        });
      } catch (e) {
        logger.dbg('corruption request roll error', e);
      }
    };
    // Listener: when UI/modal requests a maulwurf roll, perform RNG and trigger visual dice
    const handleMaulwurfRequestRoll = (ev: any) => {
      try {
        const player = ev.detail?.player as Player | undefined;
        const targetUid = ev.detail?.targetUid as number | undefined;
        if (!player || !targetUid) return;

        console.log('🎲 MAULWURF: Requesting roll for player', player, 'target', targetUid);
        // Quick visual fallback: dispatch an engine_dice_result immediately so the Dice3D shows a value
        try {
          const fallbackRoll = 1 + Math.floor(Math.random() * 6);
          console.debug('🎲 MAULWURF: dispatching fallback engine_dice_result', fallbackRoll);
          window.dispatchEvent(new CustomEvent('pc:engine_dice_result', { detail: { roll: fallbackRoll, player, targetUid } }));
        } catch (e) { console.debug('🎲 MAULWURF: fallback engine_dice_result dispatch failed', e); }

        // Enqueue the maulwurf resolve event - engine will also calculate roll and trigger 3D dice via resolver
        setGameState(prev => {
          const events: EffectEvent[] = [];
          events.push({ type: 'CORRUPTION_MOLE_STEAL_RESOLVE', player, targetUid } as any);
          // Process immediately
          try { resolveQueue(prev as any, events); } catch (e) { console.error('resolveQueue error in handleMaulwurfRequestRoll', e); }
          if (afterQueueResolved) afterQueueResolved();
          return { ...prev, _effectQueue: [] };
        });
      } catch (e) {
        logger.dbg('maulwurf request roll error', e);
      }
    };

    window.addEventListener('pc:corruption_pick_target', handlePickTarget as EventListener);
    window.addEventListener('pc:corruption_request_roll', handleRequestRoll as EventListener);
    window.addEventListener('pc:maulwurf_request_roll', handleMaulwurfRequestRoll as EventListener);

    // Listener: when UI/modal requests a tunnelvision probe roll
    const handleTunnelvisionRequestRoll = (ev: any) => {
      try {
        const player = ev.detail?.player as Player | undefined;
        const targetUid = ev.detail?.targetUid as number | undefined;
        const requiredRoll = ev.detail?.requiredRoll as number | undefined;
        const influence = ev.detail?.influence as number | undefined;
        if (!player || !targetUid || !requiredRoll || !influence) return;

        console.log('🎲 TUNNELVISION: Requesting roll for player', player, 'target', targetUid, 'required', requiredRoll);
        // Quick visual fallback: dispatch an engine_dice_result immediately so the Dice3D shows a value
        try {
          const fallbackRoll = 1 + Math.floor(Math.random() * 6);
          console.debug('🎲 TUNNELVISION: dispatching fallback engine_dice_result', fallbackRoll);
          window.dispatchEvent(new CustomEvent('pc:engine_dice_result', { detail: { roll: fallbackRoll, player, targetUid } }));
        } catch (e) { console.debug('🎲 TUNNELVISION: fallback engine_dice_result dispatch failed', e); }

        // Enqueue the tunnelvision resolve event - engine will also calculate roll and trigger 3D dice via resolver
        setGameState(prev => {
          const events: EffectEvent[] = [];
          events.push({ type: 'TUNNELVISION_GOV_PROBE_RESOLVE', player, targetUid, roll: 1 + Math.floor(Math.random() * 6), requiredRoll, influence } as any);
          // Process immediately
          try { resolveQueue(prev as any, events); } catch (e) { console.error('resolveQueue error in handleTunnelvisionRequestRoll', e); }
          if (afterQueueResolved) afterQueueResolved();
          return { ...prev, _effectQueue: [] };
        });
      } catch (e) {
        logger.dbg('tunnelvision request roll error', e);
      }
    };
    window.addEventListener('pc:tunnelvision_request_roll', handleTunnelvisionRequestRoll as EventListener);

    return () => {
      window.removeEventListener('pc:corruption_pick_target', handlePickTarget as EventListener);
      window.removeEventListener('pc:corruption_request_roll', handleRequestRoll as EventListener);
      window.removeEventListener('pc:maulwurf_request_roll', handleMaulwurfRequestRoll as EventListener);
      window.removeEventListener('pc:tunnelvision_request_roll', handleTunnelvisionRequestRoll as EventListener);
    };
  }, [setGameState, afterQueueResolved, log]);
  const startMatchWithDecks = useCallback((p1DeckEntries: BuilderEntry[], p2DeckEntries: BuilderEntry[]) => {
    const p1Cards = buildDeckFromEntries(p1DeckEntries);
    const p2Cards = buildDeckFromEntries(p2DeckEntries);

        // Debug: Log deck composition with detailed tag analysis
    const p1NgoCarten = p1Cards.filter(c => (c as any).tag === 'NGO');
    const p1PlatformCards = p1Cards.filter(c => (c as any).tag === 'Plattform');
    const p1JoschaCards = p1Cards.filter(c => (c as any).effect === 'ngo_boost');
    const p1PublicCards = p1Cards.filter(c => c.kind === 'spec' && (c as any).type === 'Öffentlichkeitskarte');

    log(`🔍 DECK DEBUG P1: ${p1Cards.length} Karten total`);
    log(`🧪 P1 Public Cards: ${p1PublicCards.map(c => `${c.name}${(c as any).tag ? `[${(c as any).tag}]` : ''}`).join(', ')}`);
    log(`🌱 P1 NGO-Karten: ${p1NgoCarten.length > 0 ? p1NgoCarten.map(c => c.name).join(', ') : 'Keine'}`);
    log(`💻 P1 Plattform-Karten: ${p1PlatformCards.length > 0 ? p1PlatformCards.map(c => c.name).join(', ') : 'Keine'}`);
    log(`🎯 JOSCHKA FISCHER: ${p1JoschaCards.length > 0 ? '✅ IM DECK' : '❌ NICHT IM DECK'}`);

    const d1 = [...p1Cards];
    const d2 = [...p2Cards];
    const h1 = d1.splice(0, Math.min(5, d1.length));
    const h2 = d2.splice(0, Math.min(5, d2.length));

    setGameState(prev => ({
      ...prev,
      round: 1,
      current: 1,
      passed: { 1: false, 2: false },
      decks: { 1: d1, 2: d2 },
      hands: { 1: h1, 2: h2 },
      board: { 1: { innen: [], aussen: [], sofort: [] }, 2: { innen: [], aussen: [], sofort: [] } },
      traps: { 1: [], 2: [] },
      permanentSlots: {
        1: { government: null, public: null, initiativePermanent: null },
        2: { government: null, public: null, initiativePermanent: null },
      },
      // instantSlot wird nicht mehr verwendet - Sofort-Initiativen gehen in board[player].sofort
      discard: [],
      shields: new Set(), // Set<UID>
      effectFlags: {
        1: createDefaultEffectFlags(),
        2: createDefaultEffectFlags()
      },
      actionsUsed: { 1: 0, 2: 0 },
      log: [
        `Match gestartet. P1 und P2 erhalten je ${h1.length}/${h2.length} Startkarten.`,
        `🔍 DECK DEBUG P1: ${p1Cards.length} Karten total`,
        `🧪 P1 Public Cards: ${p1PublicCards.map(c => `${c.name}${(c as any).tag ? `[${(c as any).tag}]` : ''}`).join(', ')}`,
        `🌱 P1 NGO-Karten: ${p1NgoCarten.length > 0 ? p1NgoCarten.map(c => c.name).join(', ') : 'Keine'}`,
        `💻 P1 Plattform-Karten: ${p1PlatformCards.length > 0 ? p1PlatformCards.map(c => c.name).join(', ') : 'Keine'}`,
        `🎯 JOSCHKA FISCHER: ${p1JoschaCards.length > 0 ? '✅ IM DECK' : '❌ NICHT IM DECK'}`,
        `📋 INITIAL BOARD P1: Regierung=[] | Öffentlichkeit=[]`,
        `📋 INITIAL BOARD P2: Regierung=[] | Öffentlichkeit=[]`,
        `🏠 PERMANENT SLOTS: Alle leer`
      ],
      activeRefresh: { 1: 0, 2: 0 },
      // preserve any aiEnabled flags set before calling this
      aiEnabled: prev.aiEnabled || { 1: false, 2: false }
    }));
  }, [gameState, setGameState, log]);

  const startMatchVsAI = useCallback((p1DeckEntries: BuilderEntry[], presetKey: keyof typeof PRESET_DECKS = 'AUTORITAERER_REALIST') => {
    const p2DeckEntries = PRESET_DECKS[presetKey] as BuilderEntry[];
    // Enable AI for P2 first so nextTurn/auto-run sees the flag immediately
    setGameState(prev => ({ ...prev, aiEnabled: { ...(prev.aiEnabled || { 1: false, 2: false }), 2: true } }));
    log('🔧 AI aktiviert für Spieler 2');
    startMatchWithDecks(p1DeckEntries, p2DeckEntries);
  }, [startMatchWithDecks]);

  const playCard = useCallback((player: Player, handIndex: number, lane?: 'innen' | 'aussen') => {
    logger.info(`playCard START P${player} idx=${handIndex}`);
    setGameState(prev => {
      // Test-only baseline fix – ensures AP=5 at game start inside test runner
      ensureTestBaselineAP(prev);

      // Validate input parameters
      if (prev.current !== player) {
        log(`❌ ERROR: Not player turn - Current: ${prev.current}, Attempted: ${player}`);
        logger.warn(`playCard abort: wrong turn`);
        return prev;
      }

      const hand = prev.hands[player];
      if (handIndex < 0 || handIndex >= hand.length) {
        log(`❌ ERROR: Invalid hand index - Index: ${handIndex}, Hand length: ${hand.length}`);
        return prev;
      }

      // Debug: Log current hand contents with detailed tag info
      log(`🔍 HAND DEBUG P${player}: ${hand.map((c, i) => `${i}:${c.name}${(c as any).tag ? `[${(c as any).tag}]` : ''}`).join(', ')}`);
      const ngoCards = hand.filter(c => (c as any).tag === 'NGO');
      const platformCards = hand.filter(c => (c as any).tag === 'Plattform');
      if (ngoCards.length > 0) {
        log(`🌱 NGO-Karten in Hand P${player}: ${ngoCards.map(c => c.name).join(', ')}`);
      }
      if (platformCards.length > 0) {
        log(`💻 Plattform-Karten in Hand P${player}: ${platformCards.map(c => c.name).join(', ')}`);
      }

      const selectedCard = hand[handIndex];
      if (!canPlayCard(prev, player, selectedCard)) {
        log('🚫 Kann Karte nicht spielen (keine AP verfügbar).');
        return prev;
      }

      const { cost } = getNetApCost(prev, player, selectedCard);
      const prevAp = prev.actionPoints[player];

      const newState = { ...prev };

      // Simplified AP system: All cards cost exactly 1 AP
      newState.actionPoints[player] = Math.max(0, newState.actionPoints[player] - cost);
      log(`💳 Kosten verbucht: AP ${prevAp}→${newState.actionPoints[player]}`);

      // Flags KONSUMIEREN (einheitlich, NUR HIER!)
      ensureFlags(newState, player);
      const ef = newState.effectFlags[player];

      // Simplified AP system: No refunds or discounts
      // All cards cost exactly 1 AP

      // Remove card from hand (but keep it for tunnelvision probe)
      const newHand = [...newState.hands[player]];
      const [playedCard] = newHand.splice(handIndex, 1);
      newState.hands = { ...newState.hands, [player]: newHand };

      // Prevent double-playing the same UID concurrently
      if ((playedCard as any).uid) {
        if (playingUidRef.current.has((playedCard as any).uid)) {
          log(`⚠️ Duplicate play prevented for UID ${(playedCard as any).uid}`);
          return prev;
        }
        playingUidRef.current.add((playedCard as any).uid);
      }

      // 🔧 CLUSTER 3 DEBUG: Zeige jede gespielte Karte
      log(`🔧 CLUSTER 3 GLOBAL DEBUG: P${player} spielt ${(playedCard as any).name} (${playedCard.kind}) - Type: ${(playedCard as any).type || 'KEIN TYPE'}`);

      // 🔧 CLUSTER 3 DEBUG: Zeige aktuelles Board
      const currentBoard = newState.board[player];
      const publicCardsOnBoard = currentBoard.innen.filter(card => card.kind === 'spec');
      log(`🔧 CLUSTER 3 GLOBAL DEBUG: Öffentlichkeitskarten auf dem Feld: ${publicCardsOnBoard.map(c => (c as any).name).join(', ')}`);

      // Jennifer Doudna check removed - not needed for current game logic

      // Handle different card types
      if (playedCard.kind === 'pol') {
        const polCard = playedCard as any;
        const targetLane = lane || (polCard.tag === 'Staatsoberhaupt' || polCard.tag === 'Regierungschef' || polCard.tag === 'Diplomat' ? 'aussen' : 'innen');

        if (newState.board[player][targetLane].length >= 5) {
          log(`❌ ERROR: Lane full - Lane: ${targetLane}, Current: ${newState.board[player][targetLane].length}/5`);
          return prev;
        }

        // Check for Tunnelvision probe requirement (only for government cards)
        if (targetLane === 'aussen') {
          const tunnelvisionActive = (newState.permanentSlots[1].government?.name === 'Tunnelvision') ||
                                   (newState.permanentSlots[2].government?.name === 'Tunnelvision') ||
                                   (newState.permanentSlots[1].public?.name === 'Tunnelvision') ||
                                   (newState.permanentSlots[2].public?.name === 'Tunnelvision');

          if (tunnelvisionActive) {
            // Trigger Tunnelvision probe
            const influence = polCard.influence || 0;
            const requiredRoll = influence >= 9 ? 5 : 4;

            log(`🔮 Tunnelvision: Regierungskarte ${playedCard.name} benötigt Probe. W6 ≥${requiredRoll} (Einfluss ${influence}).`);

            // Enqueue tunnelvision probe event and process immediately
            newState._effectQueue = newState._effectQueue || [];
            newState._effectQueue.push({
              type: 'TUNNELVISION_GOV_PROBE_START',
              player,
              targetUid: playedCard.uid || playedCard.id,
              influence
            } as any);

            // Process the queue immediately to trigger the probe
            try {
              resolveQueue(newState, newState._effectQueue);
              newState._effectQueue = [];
            } catch (e) {
              console.error('Error resolving tunnelvision probe queue:', e);
            }

            // Return the card to hand and refund AP until probe is resolved
            newState.hands[player] = [...newState.hands[player], playedCard];
            newState.actionPoints[player] += cost; // Refund AP

            // Don't add card to board yet - wait for probe result
            // The card will be added to board or kept in hand based on probe result
            return newState;
          }
        }

        // Add to board (immutable clone to avoid accidental double references)
        const laneArray = [...newState.board[player][targetLane], playedCard];
        const playerBoardCloned = { ...newState.board[player], [targetLane]: laneArray } as any;
        newState.board = { ...newState.board, [player]: playerBoardCloned } as any;

        // VISUAL: spawn GIF overlay centered over the government slot icon when placing a government card
        try {
          if (targetLane === 'aussen') {
            const rects = getGovernmentRects(player === 1 ? 'player' : 'opponent');
            const slotIndex = newState.board[player].aussen.length - 1;
            const slotRect = rects[slotIndex] || rects[0] || { x: 960 - 128, y: 540 - 128, w: 256, h: 256 };
            const cx = slotRect.x + slotRect.w / 2;
            const cy = slotRect.y + slotRect.h / 2;

            // particles/pop in canvas coords
            try { visualEffects?.spawnParticles(cx, cy, 18); } catch (e) {}
            try { visualEffects?.spawnPop(playedCard.uid ?? playedCard.id); } catch (e) {}

            // compute screen coords and spawn 300x300 overlay
            const canvas = document.querySelector('canvas');
            if (canvas) {
              // Prefer reliable canvas spritesheet animation directly on the target slot
              try {
                const key = `${player}.${'aussen'}.${slotIndex}`;
                const trig = (window as any).__pc_triggerGovAnim || (window as any).pc_triggerGovAnim;
                if (typeof trig === 'function') trig(key);
              } catch (e) {}
              // Only fade-in anim
              try { visualEffects?.playAnimsRef?.current?.push({ uid: playedCard.uid ?? playedCard.id, started: performance.now(), duration: 420 }); } catch (e) {}
            }
          }
        } catch (e) {
          console.debug('[GameActions] GOV overlay failed', e);
        }
        log(`🃏 Player ${player}: ${playedCard.name} gespielt in ${targetLane === 'aussen' ? 'Regierung' : 'Öffentlichkeit'}`);

        // 3) Nachdem die Karte gelegt wurde: gegnerische Traps prüfen
        applyTrapsOnCardPlayed(
          newState,
          player,
          playedCard,
          (event) => {
            if (!newState._effectQueue) newState._effectQueue = [];
            newState._effectQueue.push(event);
          },
          log
        );

        // 👉 Erst JETZT Auren anwenden (damit +2 Basis erhalten bleibt)
        applyAurasForPlayer(newState, player, log);

        // 6) Karteneffekte enqueuen + Queue auflösen
        triggerCardEffects(newState, player, playedCard);
        // UI visual: particle burst + pop scale for played card (prototype hook)
        try { spawnCardVisual(playedCard, newState); } catch (e) {}
        // Migration Helper verwenden
        migrateLegacyQueue(newState);
        // Nur noch _effectQueue verwenden
        if (newState._effectQueue && newState._effectQueue.length > 0) {
          try { log(`DEBUG: about to resolve queue (pol play) -> ${JSON.stringify((newState._effectQueue as any).map((e:any)=>({type:e.type, amount:e.amount, msg:e.msg})).slice(0,50))}`); } catch(e) {}
          log(`DEBUG AP before resolve (pol play): P1=${newState.actionPoints[1]} P2=${newState.actionPoints[2]}`);
          resolveQueue(newState, newState._effectQueue);
          newState._effectQueue = [];
          // Nach Queue-Auflösung: Hand-Arrays immutabel neu zuweisen
          afterQueueResolved?.();
          log(`DEBUG AP after resolve (pol play): P1=${newState.actionPoints[1]} P2=${newState.actionPoints[2]}`);
        }

        // Release playing UID after queue resolved
        if ((playedCard as any).uid) playingUidRef.current.delete((playedCard as any).uid);

        // 🔥 ROMAN ABRAMOVICH EFFEKT: Wenn Regierungskarte mit Einfluss ≤5 gespielt wird
        if (playedCard.kind === 'pol' && (playedCard as any).influence <= 5) {
          const opponent = player === 1 ? 2 : 1;
          const opponentBoard = newState.board[opponent];
          const romanAbramovich = opponentBoard.innen.find(card =>
            card.kind === 'spec' && (card as any).name === 'Roman Abramovich'
          );

          if (romanAbramovich) {
            // Ziehe eine Karte für den Gegner
            if (newState.decks[opponent].length > 0) {
              const drawnCard = newState.decks[opponent].shift();
              if (drawnCard) {
                newState.hands[opponent].push(drawnCard);
                log(`🔥 ROMAN ABRAMOVICH EFFEKT: P${opponent} zieht 1 Karte (${drawnCard.name}) - Regierungskarte mit Einfluss ≤5 gespielt`);
              }
            }
          }
        }







        // 🔍 BOARD DEBUG: Zeige aktuelles Board nach dem Spielen
        const currentBoard = newState.board[player];
        const regierungKarten = currentBoard.aussen.map(c => `${c.name}[${c.kind === 'pol' ? (c as any).influence + 'I' : 'S'}]`);
        const öffentlichkeitKarten = currentBoard.innen.map(c => `${c.name}[${c.kind === 'spec' ? (c as any).tag || 'S' : 'P'}]`);
        log(`📋 P${player} BOARD: Regierung=[${regierungKarten.join(', ')}] | Öffentlichkeit=[${öffentlichkeitKarten.join(', ')}]`);

                // 🔥 JOSCHKA FISCHER NGO-EFFEKT: Jetzt als kontinuierlicher Aura-Effekt in sumRowWithAuras implementiert
        log(`🔍 DEBUG: Karte gespielt - Name: ${playedCard.name}, Tag: ${(playedCard as any).tag || 'Kein Tag'}, Lane: ${targetLane}, Kind: ${playedCard.kind}`);

        if ((playedCard as any).tag === 'NGO') {
          log(`🔍 NGO-Karte gespielt: ${playedCard.name} [NGO] - Kontinuierliche Aura-Effekte werden bei Rundenauswertung berechnet`);

          // 🎯 SOFORTIGE SYNERGIE-PRÜFUNG: Joschka Fischer + NGO
          const joschaFischer = currentBoard.aussen.find(card =>
            card.kind === 'pol' && (card as any).effect === 'ngo_boost'
          );

          if (joschaFischer) {
            log(`🔥🔥🔥 SYNERGIE AKTIVIERT! 🔥🔥🔥 Joschka Fischer + ${playedCard.name}[NGO] → +1 Einfluss bei Rundenauswertung`);
          }
        }

      } else if (playedCard.kind === 'spec') {
        const specCard = playedCard as any;
        const typeStr = String(specCard.type || '').toLowerCase();
        const isInitiative = /initiative/.test(typeStr); // matcht "Initiative", "Sofort-Initiative", etc.

                  // 1) Falls es eine "Systemrelevant" ist (sofortiger Buff auf letzte eigene Regierungskarte)
        if (playedCard.kind === 'spec' && (playedCard as any).type?.toLowerCase().includes('systemrelevant')) {
          const ownBoard = newState.board[player];
          const candidates = [...ownBoard.aussen, ...ownBoard.innen].filter(c => c.kind === 'pol') as PoliticianCard[];
          const target = candidates[candidates.length - 1]; // letzte eigene Regierungskarte
          if (target) {
            (target as any).protected = true;
            log(`🛡️ ${target.name} erhält einmaligen Schutz.`);
          } else {
            log('🛈 Systemrelevant: Keine eigene Regierungskarte im Spiel – Effekt verpufft.');
          }
          // danach die Spezialkarte normal entsorgen
          newState.discard.push(playedCard);
          return newState;
        }

        // 1) Dauerhaft-Initiative (Ongoing)
        if (typeStr.includes('dauerhaft')) {
          // Slot-Mapping: Dauerhaft-Initiativen → map to permanentSlots.government or .public
          // Prefer explicit metadata on the card, fallback to tag-based heuristic, default to 'government'
          const preferredSlot: 'government' | 'public' = (specCard.permanentSlot as 'government' | 'public') || ((specCard.tags || []).includes('Public') ? 'public' : 'government');
          if (!newState.permanentSlots[player][preferredSlot]) {
            // ensure card is stored as a shallow clone to avoid accidental shared references
            newState.permanentSlots[player] = { ...newState.permanentSlots[player], [preferredSlot]: { ...playedCard } } as any;
            log(`P${player} spielt ${playedCard.name} als Dauerhafte Initiative (Slot: ${preferredSlot})`);
          } else {
            log(`⚠️ WARN: Slot occupied - Slot ${preferredSlot} already has ${newState.permanentSlots[player][preferredSlot]?.name}`);
            // Return the card to hand and refund AP as graceful fallback
            newState.hands[player] = [...newState.hands[player], playedCard];
            newState.actionPoints[player] += cost;
            return newState;
          }

          // 6) Karteneffekte enqueuen + Queue auflösen
          triggerCardEffects(newState, player, playedCard);
          // Migration Helper verwenden
          migrateLegacyQueue(newState);
          // Nur noch _effectQueue verwenden
          if (newState._effectQueue && newState._effectQueue.length > 0) {
            try { log(`DEBUG: about to resolve queue (spec ongoing) -> ${JSON.stringify((newState._effectQueue as any).map((e:any)=>({type:e.type, amount:e.amount, msg:e.msg})).slice(0,50))}`); } catch(e) {}
            log(`DEBUG AP before resolve (spec ongoing): P1=${newState.actionPoints[1]} P2=${newState.actionPoints[2]}`);
            resolveQueue(newState, newState._effectQueue);
            newState._effectQueue = [];
            // Nach Queue-Auflösung: Hand-Arrays immutabel neu zuweisen
            afterQueueResolved?.();
            log(`DEBUG AP after resolve (spec ongoing): P1=${newState.actionPoints[1]} P2=${newState.actionPoints[2]}`);
          }

          // Check for trap triggers
          applyTrapsOnCardPlayed(
            newState,
            player,
            playedCard,
            (e) => (newState._effectQueue ??= []).push(e),
            (m) => (newState._effectQueue ??= []).push({ type: 'LOG', msg: m })
          );

          return newState;
        }

        // 2) Sofort-/Sofort-Initiativen (Instant)
        if (isInitiative) {
          if (!specCard.effectKey) {
            log(`❌ Initiative ohne effectKey: ${specCard.name}`);
          } else {
            log(`🧩 INIT: ${specCard.name} [${String(specCard.effectKey)}] gespielt`);
          }

          // 🔧 NEU: Sofort-Initiativen werden in das sofort Array gelegt statt sofort aktiviert
          if (typeStr.includes('sofort')) {
            // Prüfe ob bereits eine Sofort-Initiative im Slot liegt
            if (newState.board[player].sofort.length > 0) {
              log(`❌ ERROR: Sofort-Initiative-Slot bereits besetzt - ${newState.board[player].sofort[0]?.name} muss erst aktiviert werden`);
              // Karte zurück in die Hand
              newState.hands[player] = [...newState.hands[player], playedCard];
              // AP zurückgeben
              newState.actionPoints[player] += cost;
              // AP zurückgegeben, keine Aktion rückgängig zu machen
              return newState;
            }

            // Sofort-Initiative in das sofort Array legen
            newState.board[player].sofort = [playedCard];
            log(`🎯 P${player} legt ${playedCard.name} in Sofort-Initiative-Slot (kann später aktiviert werden)`);

            // Sofort-Initiativen: auf Board.sofort legen (nicht direkt entsorgen)
            if (!newState._effectQueue) newState._effectQueue = [];
            newState._effectQueue.push({ type: 'LOG', msg: `🔔 Sofort-Initiative bereit: ${playedCard.name} (zum Aktivieren anklicken oder Taste 'A')` });
            return newState;
          }

          // Dauerhaft-Initiativen werden weiterhin sofort aktiviert
          // Initiative in den Ablagestapel
          newState.discard = [...newState.discard, playedCard];
          log(`P${player} spielt Initiative: ${playedCard.name}`);

                     // 6) Karteneffekte enqueuen + Queue auflösen
          console.log('🔥 ABOUT TO TRIGGER CARD EFFECTS (INITIATIVE):', playedCard.name, 'effectKey:', (playedCard as any).effectKey);
           triggerCardEffects(newState, player, playedCard);
           // Migration Helper verwenden
           migrateLegacyQueue(newState);
           // Nur noch _effectQueue verwenden
         if (newState._effectQueue && newState._effectQueue.length > 0) {
           resolveQueue(newState, newState._effectQueue);
           newState._effectQueue = [];
           // Nach Queue-Auflösung: Hand-Arrays immutabel neu zuweisen
           afterQueueResolved?.();
         }

           // Check for trap triggers
           applyTrapsOnCardPlayed(
             newState,
             player,
             playedCard,
             (e) => (newState._effectQueue ??= []).push(e),
             (m) => (newState._effectQueue ??= []).push({ type: 'LOG', msg: m })
           );

           // 🔥 CLUSTER 3: Auren-Flags neu berechnen (nach Kartenspielen)
          recomputeAuraFlags(newState);

          // 🔥 CLUSTER 3: Ai Weiwei Bonus wird bei Aktivierung angewendet (nicht beim Spielen)

          // 🔥 PASSIVE EFFEKTE NACH INITIATIVE: Mark Zuckerberg & Sam Altman
          // Diese Effekte werden jetzt über INITIATIVE_ACTIVATED Event + Board-Check gehandhabt
          // Keine direkten Flag-Mutationen mehr - alles über Events


          return newState;
        }

        // 3) Öffentlichkeit (Public)
        if (
          typeStr === 'öffentlichkeitskarte' ||
          typeStr === 'oeffentlichkeitskarte' ||
          typeStr === 'öffentlichkeit' ||
          typeStr === 'public'
        ) {
          if (newState.board[player].innen.length < 5) {
            const innenArray = [...newState.board[player].innen, playedCard];
            const playerBoardCloned = { ...newState.board[player], innen: innenArray } as any;
            newState.board = { ...newState.board, [player]: playerBoardCloned } as any;
            log(`P${player} spielt ${playedCard.name} in Öffentlichkeit`);

            // Sofort Auren prüfen (z.B. JF +1, wenn JF schon liegt)
            applyAurasForPlayer(newState, player, log);

                         // 6) Karteneffekte enqueuen + Queue auflösen
             triggerCardEffects(newState, player, playedCard);
             // Migration Helper verwenden
             migrateLegacyQueue(newState);
         if (newState._effectQueue && newState._effectQueue.length > 0) {
           resolveQueue(newState, newState._effectQueue);
           newState._effectQueue = [];
           // Nach Queue-Auflösung: Hand-Arrays immutabel neu zuweisen
           afterQueueResolved?.();
         }

             // Check for trap triggers
             applyTrapsOnCardPlayed(
               newState,
               player,
               playedCard,
               (e) => (newState._effectQueue ??= []).push(e),
               (m) => (newState._effectQueue ??= []).push({ type: 'LOG', msg: m })
             );



            // 🔥 PUBLIC CARD EFFECTS - Passive effects when played

            // Helper function to draw a card for the player
            const drawCardForPlayer = (cardName: string) => {
              if (newState.decks[player].length > 0) {
                const drawnCard = newState.decks[player].shift();
                if (drawnCard) {
                  newState.hands[player].push(drawnCard);
                  log(`🔥 ${cardName.toUpperCase()} EFFEKT: +1 Karte gezogen (${drawnCard.name})`);
                  return true;
                }
              }
              return false;
            };

            if (specCard.name === 'Elon Musk') {
              // Effect: "Ziehe 1 Karte. Deine erste Initiative pro Runde kostet 1 Aktionspunkt weniger."
              drawCardForPlayer('Elon Musk');
              // 🔥 QUEUE-SYSTEM: Erste Initiative pro Runde → Refund wird über triggerCardEffects gehandhabt

            } else if (specCard.name === 'Bill Gates') {
              // Effect: "Ziehe 1 Karte. Deine nächste Initiative kostet 1 Aktionspunkt weniger."
              drawCardForPlayer('Bill Gates');
              // 🔥 QUEUE-SYSTEM: Nächste Initiative → Refund wird über triggerCardEffects gehandhabt

            } else if (specCard.name === 'Jeff Bezos') {
              // Effect: "Ziehe 1 Karte beim Ausspielen. Wenn eine Plattform liegt: +1 Aktionspunkt."
              drawCardForPlayer('Jeff Bezos');
              const hasPlatform = newState.board[player].innen.some(c =>
                c.kind === 'spec' && (c as any).tag === 'Plattform'
              );
              if (hasPlatform) {
                newState.actionPoints[player] += 1;
                log(`🔥 JEFF BEZOS: +1 AP durch Plattform-Synergie! (${newState.actionPoints[player] - 1} → ${newState.actionPoints[player]})`);
              }

            } else if (specCard.name === 'Warren Buffett') {
              // Effect: "Ziehe 1 Karte. Bei einer Wirtschafts-Initiative: +1 Effekt."
              drawCardForPlayer('Warren Buffett');
              // TODO: Implement "Wirtschafts-Initiative +1 Effect" logic
              log(`📊 WARREN BUFFETT: Bei Wirtschafts-Initiativen +1 Effekt! (TODO: Implementierung)`);

            } else if (specCard.name === 'Gautam Adani') {
              // Effect: "Ziehe 1 Karte. Bei einer Infrastruktur-Initiative: +1 Effekt."
              drawCardForPlayer('Gautam Adani');
              // TODO: Implement "Infrastruktur-Initiative +1 Effect" logic
              log(`📊 GAUTAM ADANI: Bei Infrastruktur-Initiativen +1 Effekt! (TODO: Implementierung)`);

            } else if (specCard.name === 'Zhang Yiming') {
              // Effect: "Ziehe 1 Karte. Bei Medien auf dem Feld: -1 Aktionspunkt auf deine nächste Initiative."
              drawCardForPlayer('Zhang Yiming');
              const hasMedia = newState.board[player].innen.some(c =>
                c.kind === 'spec' && (c as any).tag === 'Medien'
              );
              if (hasMedia) {
                // TODO: Implement "nächste Initiative -1 AP" logic
                log(`🔥 ZHANG YIMING: Nächste Initiative kostet 1 AP weniger durch Medien-Synergie! (TODO: Implementierung)`);
              }

            } else if (specCard.name === 'George Soros') {
              // Effect: "+1 Aktionspunkt wenn der Gegner eine autoritäre Regierungskarte hat."
              const opponent = player === 1 ? 2 : 1;
              const hasAuthoritarianCard = newState.board[opponent].aussen.some(card => {
                const polCard = card as any;
                return polCard.tag === 'Staatsoberhaupt' && polCard.influence >= 8; // High influence leaders
              });

              if (hasAuthoritarianCard) {
                newState.actionPoints[player] += 1;
                log(`🔥 GEORGE SOROS EFFEKT: +1 AP durch autoritäre Regierung des Gegners!`);
                log(`📊 SOROS: Aktionspunkte ${newState.actionPoints[player] - 1} → ${newState.actionPoints[player]}`);
              } else {
                log(`💭 George Soros: Keine autoritären Karten beim Gegner - Effekt nicht ausgelöst`);
              }
            }

            // 🔗 NGO-Synergie: Wenn eine NGO gelegt wird und Joschka Fischer liegt, erhält P${player} +1 Einfluss (Rundenauswertung)
            if ((specCard as any).tag === 'NGO') {
              const hasJoschka = newState.board[player].aussen.some(c => c.kind === 'pol' && (c as any).name === 'Joschka Fischer' && !(c as any).deactivated);
              if (hasJoschka) {
                log(`🔥🔥🔥 SYNERGIE AKTIVIERT! 🔥🔥🔥 Joschka Fischer + ${playedCard.name}[NGO] → +1 Einfluss bei Rundenauswertung`);
              }
            }
          } else {
            log(`❌ ERROR: Lane full - Öffentlichkeit ist voll (5/5)`);
          }

          // Simplified AP system: No refunds
          return newState;
        }

                  // 4) Default: Traps/Interventions
                  // Falls Trap-Karte gelegt wird
          if (playedCard.kind === 'spec' && (playedCard as any).type?.toLowerCase().includes('trap')) {
            registerTrap(newState, player, playedCard.key || playedCard.name.toLowerCase().replace(/[- ]/g, '_'));
            // NICHT sofort checken – sie wartet auf den Gegner
            return newState;
          }

        newState.traps[player] = [...newState.traps[player], playedCard];
        log(`P${player} spielt ${playedCard.name} als ${specCard.type}`);

        // 6) Karteneffekte enqueuen + Queue auflösen
        console.log('🔥 ABOUT TO TRIGGER CARD EFFECTS:', playedCard.name, 'effectKey:', (playedCard as any).effectKey);
        triggerCardEffects(newState, player, playedCard);
        // Migration Helper verwenden
        migrateLegacyQueue(newState);
        // Nur noch _effectQueue verwenden
        if (newState._effectQueue && newState._effectQueue.length > 0) {
          try { log(`DEBUG: about to resolve queue (spec instant) -> ${JSON.stringify((newState._effectQueue as any).map((e:any)=>({type:e.type, amount:e.amount, msg:e.msg})).slice(0,50))}`); } catch(e) {}
          log(`DEBUG AP before resolve (spec instant): P1=${newState.actionPoints[1]} P2=${newState.actionPoints[2]}`);
          resolveQueue(newState, newState._effectQueue);
          newState._effectQueue = [];
          // Nach Queue-Auflösung: Hand-Arrays immutabel neu zuweisen
          afterQueueResolved?.();
          log(`DEBUG AP after resolve (spec instant): P1=${newState.actionPoints[1]} P2=${newState.actionPoints[2]}`);
        }

        // Check for trap triggers
        applyTrapsOnCardPlayed(
          newState,
          player,
          playedCard,
          (e) => (newState._effectQueue ??= []).push(e),
          (m) => (newState._effectQueue ??= []).push({ type: 'LOG', msg: m })
        );

        // Simplified AP system: No refunds
        return newState;
      }

      // 6) Karteneffekte enqueuen + Queue auflösen (fallback für unbekannte Kartentypen)
      triggerCardEffects(newState, player, selectedCard);
      // Migration Helper verwenden
      migrateLegacyQueue(newState);
      // Nur noch _effectQueue verwenden
        if (newState._effectQueue && newState._effectQueue.length > 0) {
          try { log(`DEBUG: about to resolve queue (spec public/default) -> ${JSON.stringify((newState._effectQueue as any).map((e:any)=>({type:e.type, amount:e.amount, msg:e.msg})).slice(0,50))}`); } catch(e) {}
          log(`DEBUG AP before resolve (spec public/default): P1=${newState.actionPoints[1]} P2=${newState.actionPoints[2]}`);
          resolveQueue(newState, newState._effectQueue);
          newState._effectQueue = [];
          // Nach Queue-Auflösung: Hand-Arrays immutabel neu zuweisen
          afterQueueResolved?.();
          log(`DEBUG AP after resolve (spec public/default): P1=${newState.actionPoints[1]} P2=${newState.actionPoints[2]}`);
        }

      // Check for trap triggers
      applyTrapsOnCardPlayed(
        newState,
        player,
        selectedCard,
        (e) => (newState._effectQueue ??= []).push(e),
        (m) => (newState._effectQueue ??= []).push({ type: 'LOG', msg: m })
      );

      // Simplified AP system: No refunds

      // Kein Aktionenlimit mehr → automatischer Turnwechsel entfällt


      return newState;
    });
  }, [setGameState, log]);

  const activateInstantInitiative = useCallback((player: Player) => {
    logger.info(`activateInstantInitiative START P${player}`);
    setGameState(prev => {
      if (prev.current !== player) {
        log(`❌ ERROR: Not player turn - Current: ${prev.current}, Attempted: ${player}`);
        return prev;
      }

      const instantCard = prev.board[player].sofort[0];
      if (!instantCard) {
        log(`❌ ERROR: No Sofort-Initiative in slot for player ${player}`);
        return prev;
      }

      const newState = { ...prev };

      // 1) Normale Karten-Effekte der Sofort-Karte feuern
      triggerCardEffects(newState, player, instantCard);

      // UI visual: initiative ripple + AP pop (prototype hook)
      try {
        const zones = (window as any).__politicardDebug?.clickZones || [];
        const boardZone = zones.find((z: any) => z.data && z.data.type === 'row_slot');
        const cx = boardZone ? boardZone.x + (boardZone.w || 256) / 2 : 960;
        const cy = boardZone ? boardZone.y + (boardZone.h || 256) / 2 : 300;
        if (visualEffects) {
          visualEffects.spawnRipple(cx, cy, { radius: 640, showAp: true, apX: cx, apY: cy + 40 });
          try {
            const trigI = (window as any).__pc_triggerInstantAnim || (window as any).pc_triggerInstantAnim;
            if (typeof trigI === 'function') trigI('1.instant.0');
          } catch (e) {}
        } else {
          (window as any).__pc_ripples = (window as any).__pc_ripples || [];
          (window as any).__pc_ripples.push({ cx, cy, started: performance.now(), duration: 700, radius: 640, showAp: true, apX: cx, apY: cy + 40 });
        }
      } catch (e) {}

      // Check for trap triggers
      applyTrapsOnCardPlayed(
        newState,
        player,
        instantCard,
        (e) => (newState._effectQueue ??= []).push(e),
        (m) => (newState._effectQueue ??= []).push({ type: 'LOG', msg: m })
      );

      // 2) Queue auflösen (BEVOR die Karte entfernt wird)
      if (newState._effectQueue && newState._effectQueue.length > 0) {
        resolveQueue(newState, [...newState._effectQueue]);
        newState._effectQueue = [];
        // Nach Queue-Auflösung: Hand-Arrays immutabel neu zuweisen
        afterQueueResolved?.();
      }

      // 3) Karte NACH Queue-Auflösung in den Ablagestapel
      const [played] = newState.board[player].sofort.splice(0, 1);
      newState.discard.push(played);

      // Visual: listen for dice roll event to animate & bind to SKANDALSPIRALE_TRIGGER if present
      try {
        const diceHandler = (ev: any) => {
          try {
            const face = ev.detail?.face;
            if (face == null) return;
            // If last enqueued event was SKANDALSPIRALE_TRIGGER, attach a LOG with the face
            const last = (newState._effectQueue ?? []).slice(-1)[0];
            // Emit a LOG event for visibility
            if (!newState._effectQueue) newState._effectQueue = [];
            newState._effectQueue.push({ type: 'LOG', msg: `Würfel: ${face}` } as any);
          } catch (e) {}
        };
        window.addEventListener('pc:dice_roll', diceHandler as EventListener);
        // remove after short timeout to avoid leaking listeners
        setTimeout(() => window.removeEventListener('pc:dice_roll', diceHandler as EventListener), 2000);
      } catch (e) {}

      return newState;
    });
  }, [setGameState, log]);

  const endTurn = useCallback((reason: 'button_end_turn' | 'auto' = 'button_end_turn') => {
    logger.info(`endTurn START reason=${reason}`);
    setGameState((prev): GameState => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const current = prev.current;

      // 1) Schon im Abschluss? -> Nichts tun (Idempotenz)
      if (prev.isEndingTurn) {
        log('🔁 Zugabschluss läuft bereits – warte auf Queue.');
        return prev;
      }

      const newState = { ...prev, isEndingTurn: true };

      // 2) Hängen noch Effekte in der Queue? -> Auflösen lassen
      if (newState._effectQueue && newState._effectQueue.length > 0) {
        log('⏳ Effekte werden noch aufgelöst – Zugwechsel folgt automatisch.');
        resolveQueue(newState, [...newState._effectQueue]);
        newState._effectQueue = [];
        // Nach Queue-Auflösung: Wenn Flag noch gesetzt, Zug beenden
        if (newState.isEndingTurn) {
          return reallyEndTurn(newState, log);
        }
        return newState;
      }

      // 3) Keine Effekte mehr -> sofort beenden
      return reallyEndTurn(newState, log);
    });
  }, [setGameState, log]);

  // Legacy: nextTurn als Alias für endTurn für Kompatibilität
  const nextTurn = useCallback(() => {
    logger.info('nextTurn alias called');
    endTurn('auto');
  }, [endTurn]);

  // Global listener: handle visual dice results and apply Skandalspirale effects automatically
  useEffect(() => {
    const handler = (ev: any) => {
      const face = ev?.detail?.face;
      if (typeof face !== 'number') return;
      setGameState(prev => {
        try {
          const pending = (prev as any)._pendingSkandal as { player: Player; ts: number } | undefined;
          if (!pending) return prev;
          // only accept recent pending requests (avoid stale triggers)
          if (Date.now() - (pending.ts || 0) > 8000) {
            const n = { ...prev } as GameState & any;
            delete n._pendingSkandal;
            return n;
          }

          const newState = { ...prev } as GameState & any;
          // clear pending marker
          delete newState._pendingSkandal;

          // Prepare events based on face
          newState._effectQueue = newState._effectQueue || [];
          if (face >= 1 && face <= 3) {
            const loss = face;
            // enqueue negative buff (debuff) on disadvantaged player's strongest gov
            newState._effectQueue.push({ type: 'BUFF_STRONGEST_GOV', player: pending.player, amount: -loss } as any);
            newState._effectQueue.push({ type: 'LOG', msg: `Skandalspirale: Spieler ${pending.player} würfelt ${face} → stärkste Regierung -${loss}.` } as any);
          } else {
            newState._effectQueue.push({ type: 'LOG', msg: `Skandalspirale: Spieler ${pending.player} würfelt ${face} → Keine Auswirkung.` } as any);
          }

          // Resolve immediately so effect is visible without waiting
          if (newState._effectQueue && newState._effectQueue.length > 0) {
            try { resolveQueue(newState, [...newState._effectQueue]); } catch (e) { logger.dbg('resolveQueue failed on dice handler', e); }
            newState._effectQueue = [];
          }

          // Ensure React sees shallow-copied hands for UI update
          try {
            newState.hands = { 1: [...newState.hands[1]], 2: [...newState.hands[2]] };
          } catch (e) {}

          // run after-queue hook if provided (best-effort)
          try { if ((window as any).__afterQueueResolved) (window as any).__afterQueueResolved(); } catch (e) {}

          return newState;
        } catch (err) {
          logger.dbg('dice handler setGameState error', err);
          return prev;
        }
      });
    };

    window.addEventListener('pc:dice_roll', handler as EventListener);
    return () => window.removeEventListener('pc:dice_roll', handler as EventListener);
  }, [setGameState]);

    const passTurn = useCallback((player: Player) => {
    logger.info(`passTurn START P${player}`);

    setGameState(prev => {
      logger.dbg(`passTurn setState current=${prev.current} player=${player}`);

      if (prev.current !== player) {
        logger.dbg(`passTurn wrong turn current=${prev.current} attempted=${player}`);
        return prev;
      }

      const newState = { ...prev, passed: { ...prev.passed, [player]: true } };
      logger.dbg(`Pass status updated P1=${newState.passed[1]} P2=${newState.passed[2]}`);
      log(`🚫 Spieler ${player} passt.`);

      // ❗ Kein Nachziehen bei Pass:
      // Der passierende Spieler kommt in dieser Runde nicht mehr dran.
      // Die nächste Runde startet ohnehin mit 5 neuen Handkarten.

      // Check if round should end (both players passed)
      const shouldEndRound = checkRoundEnd(newState);
      logger.dbg(`Should end round? ${shouldEndRound}`);

      if (shouldEndRound) {
        log(`🏁 Runde ${newState.round} wird beendet und ausgewertet.`);
        return resolveRound(newState, log);
      } else {
        // Switch turn to other player for their final chance
        const otherPlayer: Player = player === 1 ? 2 : 1;
        logger.dbg(`Switching to other player ${otherPlayer} hasPassed=${newState.passed[otherPlayer]}`);

        // Only switch if other player hasn't passed yet
        if (!newState.passed[otherPlayer]) {
                     newState.current = otherPlayer;
           newState.actionPoints = { ...newState.actionPoints, [otherPlayer]: 2 };

          // Apply new start-of-turn hooks
          applyStartOfTurnFlags(newState, otherPlayer, log);

        // 🔥 CLUSTER 3: Auren-Flags beim Zugstart neu berechnen
        recomputeAuraFlags(newState);

          log(`⏭️ Spieler ${otherPlayer} hat noch einen letzten Zug.`);
          logger.dbg(`Turn switched to player ${otherPlayer}`);
        } else {
          // Both players have passed now, end round
          log(`🏁 Runde ${newState.round} wird beendet (beide Spieler haben gepasst).`);
          return resolveRound(newState, log);
        }
      }

      return newState;
    });
  }, [setGameState, log]);

  return {
    startMatchWithDecks,
    startMatchVsAI,
    playCard,
    activateInstantInitiative,
    passTurn,
    nextTurn,
    endTurn,
  };
  }
