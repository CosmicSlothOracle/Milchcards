import { createDefaultEffectFlags, GameState, Player } from '../types/game';
import { Pols, Specials } from '../data/gameData';
import { makePolInstance, makeSpecInstance } from '../utils/cardUtils';
import { resolveQueue } from '../utils/queue';
import { triggerCardEffect } from '../effects/registry';
import { PRESET_DECKS, presetToBuilderEntries } from '../data/presetDecks';
import { currentBuilderBudget, currentBuilderCount } from '../utils/gameUtils';

function emptyState(player: Player = 1): GameState {
  return {
    round: 1,
    current: player,
    passed: { 1: false, 2: false },
    actionPoints: { 1: 2, 2: 2 },
    actionsUsed: { 1: 0, 2: 0 },
    hands: { 1: [], 2: [] },
    decks: {
      1: [makePolInstance(Pols[0]), makePolInstance(Pols[1]), makePolInstance(Pols[2])],
      2: [],
    },
    board: {
      1: { innen: [], aussen: [], sofort: [] },
      2: { innen: [], aussen: [], sofort: [] },
    },
    permanentSlots: {
      1: { government: null, public: null, initiativePermanent: null },
      2: { government: null, public: null, initiativePermanent: null },
    },
    traps: { 1: [], 2: [] },
    discard: [],
    log: [],
    activeRefresh: { 1: 0, 2: 0 },
    roundsWon: { 1: 0, 2: 0 },
    effectFlags: { 1: createDefaultEffectFlags(), 2: createDefaultEffectFlags() },
    _effectQueue: [],
  } as any;
}

describe('Öffentlichkeitskarten AP + effects', () => {
  test('Tim Cook on-play ADD_AP survives after charging 1 AP cost', () => {
    const state = emptyState(1);
    const cook = makeSpecInstance(Specials.find(s => s.name === 'Tim Cook')!);
    state.board[1].innen.push(cook);
    state.actionPoints[1] = 2;

    // Simulate fixed play order: charge cost, then resolve on-play effect
    state.actionPoints[1] -= 1;
    triggerCardEffect(state, 1, cook);
    resolveQueue(state, [...(state._effectQueue || [])]);
    state._effectQueue = [];

    // Net: 2 - 1 cost + 1 Tim Cook = 2
    expect(state.actionPoints[1]).toBe(2);
  });

  test('Elon Musk draws on play and grants +1 AP once on INITIATIVE_ACTIVATED', () => {
    const state = emptyState(1);
    const elon = makeSpecInstance(Specials.find(s => s.name === 'Elon Musk')!);
    state.board[1].innen.push(elon);
    const handBefore = state.hands[1].length;
    const deckBefore = state.decks[1].length;

    triggerCardEffect(state, 1, elon);
    resolveQueue(state, [...(state._effectQueue || [])]);
    state._effectQueue = [];

    expect(state.hands[1].length).toBe(handBefore + 1);
    expect(state.decks[1].length).toBe(deckBefore - 1);

    const apBefore = state.actionPoints[1];
    state._effectQueue = [{ type: 'INITIATIVE_ACTIVATED', player: 1 } as any];
    (state as any)._lastActivatedInitiative = 'Spin Doctor';
    resolveQueue(state, [...state._effectQueue]);
    expect(state.actionPoints[1]).toBe(apBefore + 1);

    // Second activation same round: no extra Elon AP
    state._effectQueue = [{ type: 'INITIATIVE_ACTIVATED', player: 1 } as any];
    resolveQueue(state, [...state._effectQueue]);
    expect(state.actionPoints[1]).toBe(apBefore + 1);
  });

  test('Opportunist ADD_AP mirror does not recurse', () => {
    const state = emptyState(1);
    state.effectFlags[1].opportunistActive = true;
    state.effectFlags[2].opportunistActive = true;
    state.actionPoints = { 1: 2, 2: 2 };

    resolveQueue(state, [{ type: 'ADD_AP', player: 1, amount: 1 } as any]);
    // P1 +1, mirrored once to P2 +1 — not infinite
    expect(state.actionPoints[1]).toBe(3);
    expect(state.actionPoints[2]).toBe(3);
  });
});

describe('Premade coverage', () => {
  test('every catalog card appears in at least one premade; decks are builder-legal', () => {
    const covered = new Set<string>();
    for (const preset of PRESET_DECKS) {
      const entries = presetToBuilderEntries(preset);
      expect(entries.length).toBe(preset.cards.length);
      const count = currentBuilderCount(entries);
      const budget = currentBuilderBudget(entries);
      const gov = entries.filter(e => e.kind === 'pol').reduce((n, e) => n + (e.count || 1), 0);
      expect(count).toBeGreaterThanOrEqual(10);
      expect(count).toBeLessThanOrEqual(15);
      expect(gov).toBeGreaterThanOrEqual(6);
      expect(budget).toBeGreaterThanOrEqual(75);
      expect(budget).toBeLessThanOrEqual(105);
      preset.cards.forEach(c => covered.add(c));
    }
    const allNames = new Set([
      ...Pols.map(p => p.name),
      ...Specials.map(s => s.name),
    ]);
    const missing = [...allNames].filter(n => !covered.has(n));
    expect(missing).toEqual([]);
  });
});
