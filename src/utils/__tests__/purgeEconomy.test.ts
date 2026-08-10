/**
 * Tests for the pass-purge graft economy (corruption system).
 */
import { createDefaultEffectFlags, GameState, Player, PoliticianCard } from '../../types/game';
import { makePolInstance } from '../cardUtils';
import { Pols } from '../../data/gameData';
import {
  applyCorruptionDelta,
  beginInteractivePurge,
  getCorruption,
  getCorruptionInfluenceBonus,
  getCorruptionStart,
  getCorruptionState,
  getPurgeTarget,
  presentPurgeProbe,
  resolveCurrentPurgeProbe,
  runPurgeSequence,
} from '../corruption';
import { activateGovAbility, canActivateGovAbility } from '../govAbilities';
import { resolveQueue } from '../queue';
import { setGlobalRNG } from '../../services/rng';

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

  test('makePolInstance seeds corruption from lore start', () => {
    const putin = polByName('Vladimir Putin');
    expect(putin.corruption).toBe(3);
    expect(putin.corruptionStart).toBe(3);
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
    // No mirror onto P2
    expect(state.board[2].aussen.length).toBe(0);
  });
});

describe('graft economy — purge target math', () => {
  test('base target = corruption + tier, clamped to 5', () => {
    const state = emptyState();
    const putin = polByName('Vladimir Putin'); // corr 3, T 2 → target 5
    state.board[1].aussen.push(putin);
    const info = getPurgeTarget(state, putin, 1);
    expect(info.target).toBe(5);
    expect(info.autoFail).toBe(false);
  });

  test('corruption 6 auto-fails', () => {
    const state = emptyState();
    const putin = polByName('Vladimir Putin');
    putin.corruption = 6;
    state.board[1].aussen.push(putin);
    const info = getPurgeTarget(state, putin, 1);
    expect(info.autoFail).toBe(true);
  });

  test('greedy pass +1, hush money −N, empty hand −1', () => {
    const state = emptyState();
    const scholz = polByName('Olaf Scholz'); // corr 1, T 1 → base 2
    state.board[1].aussen.push(scholz);
    (state.effectFlags[1] as any).passHandSize = 3;
    let info = getPurgeTarget(state, scholz, 1);
    expect(info.target).toBe(3); // 2+1 greedy

    (state.effectFlags[1] as any).passHandSize = 0;
    info = getPurgeTarget(state, scholz, 1);
    expect(info.target).toBe(1); // 2-1 empty

    (state.effectFlags[1] as any).passHandSize = 2;
    (state.effectFlags[1] as any).hushMoneySpent = 2;
    info = getPurgeTarget(state, scholz, 1);
    expect(info.target).toBe(1); // 2+1-2 = 1
  });
});

describe('graft economy — purge sequence', () => {
  test('failed purge removes card from board before scoring', () => {
    // Force rolls of 1 so targets ≥2 always fail
    setGlobalRNG({ random: () => 0, randomInt: () => 0, pick: <T,>(a: T[]) => a[0] });
    const state = emptyState();
    const putin = polByName('Vladimir Putin'); // target 5
    state.board[1].aussen.push(putin);
    const result = runPurgeSequence(state, (m) => state.log.push(m));
    expect(result.removed.length).toBe(1);
    expect(state.board[1].aussen.length).toBe(0);
    expect(state.discard.some(c => c.name === 'Vladimir Putin')).toBe(true);
  });

  test('shield consumes and saves corruption-6 auto-fail', () => {
    setGlobalRNG({ random: () => 0, randomInt: () => 0, pick: <T,>(a: T[]) => a[0] });
    const state = emptyState();
    const putin = polByName('Vladimir Putin');
    putin.corruption = 6;
    putin.protectedOnce = true;
    state.board[1].aussen.push(putin);
    const result = runPurgeSequence(state, (m) => state.log.push(m));
    expect(result.survived.length).toBe(1);
    expect(state.board[1].aussen.length).toBe(1);
  });

  test('interactive purge waits for player roll then removes on fail', () => {
    setGlobalRNG({ random: () => 0, randomInt: () => 0, pick: <T,>(a: T[]) => a[0] });
    const state = emptyState();
    const putin = polByName('Vladimir Putin');
    state.board[1].aussen.push(putin);

    const started = beginInteractivePurge(state, (m) => state.log.push(m));
    expect(started).toBe(true);
    expect(state.pendingPurge?.awaitingRoll).toBe(true);
    expect(state.board[1].aussen.length).toBe(1);

    const status = resolveCurrentPurgeProbe(state, (m) => state.log.push(m), { rawRoll: 1 });
    expect(status).toBe('done');
    expect(state.board[1].aussen.length).toBe(0);
    expect(state.pendingPurge?.removed.length).toBe(1);
  });

  test('interactive purge advances to next probe after a roll', () => {
    setGlobalRNG({ random: () => 0.99, randomInt: () => 5, pick: <T,>(a: T[]) => a[0] });
    const state = emptyState();
    const a = polByName('Olaf Scholz'); // corr 1 T1 target ~2
    const b = polByName('Emmanuel Macron');
    state.board[1].aussen.push(a, b);

    expect(beginInteractivePurge(state, () => {})).toBe(true);
    expect(state.pendingPurge?.queue.length).toBe(2);
    expect(state.pendingPurge?.index).toBe(0);

    const mid = resolveCurrentPurgeProbe(state, () => {}, { rawRoll: 6 });
    expect(mid).toBe('await_next');
    presentPurgeProbe(state, () => {});
    expect(state.pendingPurge?.index).toBe(1);

    const done = resolveCurrentPurgeProbe(state, () => {}, { rawRoll: 6 });
    expect(done).toBe('done');
  });
});

describe('graft economy — government abilities', () => {
  test('unlocks at corruption ≥3 and costs 1 AP', () => {
    const state = emptyState(1);
    const putin = polByName('Vladimir Putin');
    state.board[1].aussen.push(putin);
    state.actionPoints[1] = 2;
    const gate = canActivateGovAbility(state, 1, putin);
    expect(gate.ok).toBe(true);
    const res = activateGovAbility(state, 1, putin.uid);
    expect(res.ok).toBe(true);
    expect(state.actionPoints[1]).toBe(1);
    expect(putin.corruptionAbilityUsed).toBe(1);
  });

  test('blocked below unlock threshold', () => {
    const state = emptyState(1);
    const scholz = polByName('Olaf Scholz'); // corr 1
    state.board[1].aussen.push(scholz);
    expect(canActivateGovAbility(state, 1, scholz).ok).toBe(false);
  });
});
