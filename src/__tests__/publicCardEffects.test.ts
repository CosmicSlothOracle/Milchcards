import { createDefaultEffectFlags, GameState, Player } from '../types/game';
import { Pols, Specials } from '../data/gameData';
import { makePolInstance, makeSpecInstance } from '../utils/cardUtils';
import { resolveQueue } from '../utils/queue';
import { triggerCardEffect } from '../effects/registry';
import { enqueuePublicApStealsOnPlay, enqueuePublicApStealsOnInitiative } from '../utils/publicApSteal';
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

describe('Öffentlichkeitskarten reactive AP steal', () => {
  test('Tim Cook on-play no longer grants AP (aura only)', () => {
    const state = emptyState(1);
    const cook = makeSpecInstance(Specials.find(s => s.name === 'Tim Cook')!);
    state.board[1].innen.push(cook);
    state.actionPoints[1] = 2;

    state.actionPoints[1] -= 1;
    triggerCardEffect(state, 1, cook);
    resolveQueue(state, [...(state._effectQueue || [])]);
    state._effectQueue = [];

    // Cost only — no on-play AP refund
    expect(state.actionPoints[1]).toBe(1);
  });

  test('Elon Musk draws on play; steals AP when opponent plays Einfluss≥7 gov', () => {
    const state = emptyState(2);
    const elon = makeSpecInstance(Specials.find(s => s.name === 'Elon Musk')!);
    state.board[1].innen.push(elon);
    state.decks[1] = [makePolInstance(Pols[0])];
    state.actionPoints = { 1: 1, 2: 2 };

    triggerCardEffect(state, 1, elon);
    resolveQueue(state, [...(state._effectQueue || [])]);
    state._effectQueue = [];
    expect(state.hands[1].length).toBe(1);

    const heavy = makePolInstance(Pols.find(p => p.name === 'Vladimir Putin')!);
    enqueuePublicApStealsOnPlay(state, 2, heavy, (e) => (state._effectQueue ??= []).push(e as any));
    resolveQueue(state, [...(state._effectQueue || [])]);
    expect(state.actionPoints[1]).toBe(2); // stole 1
    expect(state.actionPoints[2]).toBe(1);

    // Once per turn — second heavy gov does not steal again
    state._effectQueue = [];
    enqueuePublicApStealsOnPlay(state, 2, heavy, (e) => (state._effectQueue ??= []).push(e as any));
    resolveQueue(state, [...(state._effectQueue || [])]);
    expect(state.actionPoints[1]).toBe(2);
    expect(state.actionPoints[2]).toBe(1);
  });

  test('George Soros steals on opponent Einfluss≥7; Greta on first gov', () => {
    const state = emptyState(2);
    state.board[1].innen.push(makeSpecInstance(Specials.find(s => s.name === 'George Soros')!));
    state.board[1].innen.push(makeSpecInstance(Specials.find(s => s.name === 'Greta Thunberg')!));
    state.actionPoints = { 1: 0, 2: 2 };

    const heavy = makePolInstance(Pols.find(p => p.name === 'Vladimir Putin')!);
    enqueuePublicApStealsOnPlay(state, 2, heavy, (e) => (state._effectQueue ??= []).push(e as any));
    resolveQueue(state, [...(state._effectQueue || [])]);
    // Soros + Greta both fire on first heavy gov → steal 2 total
    expect(state.actionPoints[1]).toBe(2);
    expect(state.actionPoints[2]).toBe(0);
  });

  test('Mark Zuckerberg steals when opponent activates initiative', () => {
    const state = emptyState(2);
    state.board[1].innen.push(makeSpecInstance(Specials.find(s => s.name === 'Mark Zuckerberg')!));
    state.actionPoints = { 1: 1, 2: 2 };

    enqueuePublicApStealsOnInitiative(state, 2, 'Spin Doctor', (e) => (state._effectQueue ??= []).push(e as any));
    resolveQueue(state, [...(state._effectQueue || [])]);
    expect(state.actionPoints[1]).toBe(2);
    expect(state.actionPoints[2]).toBe(1);
  });

  test('Tim Cook steals when opponent plays a Platform', () => {
    const state = emptyState(2);
    state.board[1].innen.push(makeSpecInstance(Specials.find(s => s.name === 'Tim Cook')!));
    state.actionPoints = { 1: 0, 2: 2 };
    const zuck = makeSpecInstance(Specials.find(s => s.name === 'Mark Zuckerberg')!);

    enqueuePublicApStealsOnPlay(state, 2, zuck, (e) => (state._effectQueue ??= []).push(e as any));
    resolveQueue(state, [...(state._effectQueue || [])]);
    expect(state.actionPoints[1]).toBe(1);
    expect(state.actionPoints[2]).toBe(1);
  });

  test('Opportunist ADD_AP mirror does not recurse', () => {
    const state = emptyState(1);
    state.effectFlags[1].opportunistActive = true;
    state.effectFlags[2].opportunistActive = true;
    state.actionPoints = { 1: 2, 2: 2 };

    resolveQueue(state, [{ type: 'ADD_AP', player: 1, amount: 1 } as any]);
    expect(state.actionPoints[1]).toBe(3);
    expect(state.actionPoints[2]).toBe(3);
  });

  test('STEAL_AP is not mirrored by Opportunist', () => {
    const state = emptyState(1);
    state.effectFlags[1].opportunistActive = true;
    state.effectFlags[2].opportunistActive = true;
    state.actionPoints = { 1: 2, 2: 2 };

    resolveQueue(state, [{ type: 'STEAL_AP', from: 2, to: 1, amount: 1, source: 'Test' } as any]);
    expect(state.actionPoints[1]).toBe(3);
    expect(state.actionPoints[2]).toBe(1);
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
