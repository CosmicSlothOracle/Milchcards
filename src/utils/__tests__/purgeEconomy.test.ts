/**
 * Tests for the card-corruption graft economy (still used by card effects).
 * Round-end removal is covered by weighing.test.ts (KP/KL bands).
 */
import { createDefaultEffectFlags, GameState, Player, PoliticianCard } from '../../types/game';
import { makePolInstance } from '../cardUtils';
import { Pols } from '../../data/gameData';
import {
  applyCorruptionDelta,
  getCorruption,
  getCorruptionInfluenceBonus,
  getCorruptionStart,
  getCorruptionState,
} from '../corruption';
import { resolveQueue } from '../queue';

function emptyState(current: Player = 1): GameState {
  return {
    round: 1,
    current,
    passed: { 1: false, 2: false },
    actionPoints: { 1: 2, 2: 2 },
    actionsUsed: { 1: 0, 2: 0 },
    hands: { 1: [], 2: [] },
    decks: { 1: [], 2: [] },
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
    korruptionsPegel: 1,
    politicalCapital: { 1: 0, 2: 0 },
    effectFlags: { 1: createDefaultEffectFlags(), 2: createDefaultEffectFlags() },
    shields: new Set(),
  } as GameState;
}

function polByName(name: string): PoliticianCard {
  const base = Pols.find(p => p.name === name)!;
  return makePolInstance(base);
}

describe('graft economy — start values & ladder', () => {
  test('autocrats start at 3, mid-power at 2, tier-1 at 1', () => {
    expect(getCorruptionStart('Vladimir Putin', 2)).toBe(3);
    expect(getCorruptionStart('Donald Trump', 2)).toBe(3);
    expect(getCorruptionStart('Emmanuel Macron', 2)).toBe(2);
    expect(getCorruptionStart('Olaf Scholz', 1)).toBe(1);
  });

  test('makePolInstance seeds corruption and KL', () => {
    const putin = polByName('Vladimir Putin');
    expect(putin.corruption).toBe(3);
    expect(putin.corruptionStart).toBe(3);
    expect(putin.kl).toBe(6);
    const scholz = polByName('Olaf Scholz');
    expect(scholz.corruption).toBe(1);
  });

  test('influence bonus ladder', () => {
    expect(getCorruptionInfluenceBonus(0)).toBe(0);
    expect(getCorruptionInfluenceBonus(1)).toBe(0);
    expect(getCorruptionInfluenceBonus(2)).toBe(1);
    expect(getCorruptionInfluenceBonus(3)).toBe(2);
    expect(getCorruptionInfluenceBonus(4)).toBe(3);
    expect(getCorruptionInfluenceBonus(5)).toBe(3);
    expect(getCorruptionInfluenceBonus(6)).toBe(4);
  });

  test('threshold states', () => {
    expect(getCorruptionState(0)).toBe('sauber');
    expect(getCorruptionState(2)).toBe('verstrickt');
    expect(getCorruptionState(3)).toBe('kompromittiert');
    expect(getCorruptionState(5)).toBe('kleptokrat');
    expect(getCorruptionState(6)).toBe('absolut_korrupt');
  });
});

describe('graft economy — delta floor/cap', () => {
  test('never drops below corruptionStart', () => {
    const state = emptyState();
    const putin = polByName('Vladimir Putin');
    state.board[1].aussen.push(putin);
    applyCorruptionDelta(state, putin, 1, -5, { source: 'test' });
    expect(getCorruption(putin)).toBe(3);
  });

  test('caps at 6', () => {
    const state = emptyState();
    const putin = polByName('Vladimir Putin');
    state.board[1].aussen.push(putin);
    applyCorruptionDelta(state, putin, 1, 10, { source: 'test' });
    expect(getCorruption(putin)).toBe(6);
  });

  test('CHANGE_CORRUPTION is not mirrored by Opportunist', () => {
    const state = emptyState();
    state.effectFlags[2].opportunistActive = true;
    const putin = polByName('Vladimir Putin');
    state.board[1].aussen.push(putin);
    resolveQueue(state, [{
      type: 'CHANGE_CORRUPTION',
      targetUid: putin.uid,
      amount: 1,
      source: 'test',
    } as any]);
    expect(getCorruption(putin)).toBe(4);
    expect(state.board[2].aussen.length).toBe(0);
  });

  test('CHANGE_KP mutates global pegel', () => {
    const state = emptyState();
    resolveQueue(state, [{ type: 'CHANGE_KP', amount: 2, source: 'test' } as any]);
    expect(state.korruptionsPegel).toBe(3);
  });
});
