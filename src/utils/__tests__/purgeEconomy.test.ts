/**
 * Tests for the pass-audit graft economy (deterministic corruption audit).
 */
import { createDefaultEffectFlags, GameState, Player, PoliticianCard } from '../../types/game';
import { makePolInstance } from '../cardUtils';
import { Pols } from '../../data/gameData';
import {
  applyCorruptionDelta,
  beginInteractivePurge,
  getAuditStage,
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
    expect(state.board[2].aussen.length).toBe(0);
  });
});

describe('graft economy — audit stage math', () => {
  test('base stage = corruption + tier, clamped to 6', () => {
    const state = emptyState();
    const putin = polByName('Vladimir Putin'); // corr 3, T 2 → stage 5
    state.board[1].aussen.push(putin);
    const info = getAuditStage(state, putin, 1);
    expect(info.stage).toBe(5);
    expect(info.outcome).toBe('remove');
    expect(info.autoFail).toBe(false);
  });

  test('corruption 6 auto-fails (remove)', () => {
    const state = emptyState();
    const putin = polByName('Vladimir Putin');
    putin.corruption = 6;
    state.board[1].aussen.push(putin);
    const info = getAuditStage(state, putin, 1);
    expect(info.autoFail).toBe(true);
    expect(info.outcome).toBe('remove');
  });

  test('greedy pass +1, hush money −N, empty hand −1', () => {
    const state = emptyState();
    const scholz = polByName('Olaf Scholz'); // corr 1, T 1 → base 2
    state.board[1].aussen.push(scholz);
    (state.effectFlags[1] as any).passHandSize = 3;
    let info = getAuditStage(state, scholz, 1);
    expect(info.stage).toBe(3); // 2+1 greedy → scandal
    expect(info.outcome).toBe('scandal');

    (state.effectFlags[1] as any).passHandSize = 0;
    info = getAuditStage(state, scholz, 1);
    expect(info.stage).toBe(1); // 2-1 empty → safe
    expect(info.outcome).toBe('safe');

    (state.effectFlags[1] as any).passHandSize = 2;
    (state.effectFlags[1] as any).hushMoneySpent = 2;
    info = getAuditStage(state, scholz, 1);
    expect(info.stage).toBe(1); // 2+1-2 = 1 → safe
  });

  test('getPurgeTarget shim exposes stage as target', () => {
    const state = emptyState();
    const scholz = polByName('Olaf Scholz');
    state.board[1].aussen.push(scholz);
    const info = getPurgeTarget(state, scholz, 1);
    expect(info.target).toBe(2);
    expect(info.rollBonus).toBe(0);
  });
});

describe('graft economy — audit sequence', () => {
  test('stage ≥5 removes card from board before scoring', () => {
    const state = emptyState();
    const putin = polByName('Vladimir Putin'); // stage 5
    state.board[1].aussen.push(putin);
    const result = runPurgeSequence(state, (m) => state.log.push(m));
    expect(result.removed.length).toBe(1);
    expect(state.board[1].aussen.length).toBe(0);
    expect(state.discard.some(c => c.name === 'Vladimir Putin')).toBe(true);
  });

  test('shield downgrades stage-6 removal to scandal', () => {
    const state = emptyState();
    const putin = polByName('Vladimir Putin');
    putin.corruption = 6;
    putin.protectedOnce = true;
    putin.tempBuffs = 4; // corruption bonus at K6
    state.board[1].aussen.push(putin);
    const result = runPurgeSequence(state, (m) => state.log.push(m));
    expect(result.removed.length).toBe(0);
    expect(result.survived.length).toBe(1);
    expect(result.survived[0].outcome).toBe('scandal');
    expect(state.board[1].aussen.length).toBe(1);
    expect((putin as any)._auditScandal).toBe(true);
  });

  test('interactive audit never awaits a roll', () => {
    const state = emptyState();
    const putin = polByName('Vladimir Putin');
    state.board[1].aussen.push(putin);

    const started = beginInteractivePurge(state, (m) => state.log.push(m));
    expect(started).toBe(true);
    expect(state.pendingPurge?.awaitingRoll).toBe(false);
    expect(state.board[1].aussen.length).toBe(1);

    const status = resolveCurrentPurgeProbe(state, (m) => state.log.push(m));
    expect(status).toBe('done');
    expect(state.board[1].aussen.length).toBe(0);
    expect(state.pendingPurge?.removed.length).toBe(1);
  });

  test('interactive audit advances through multiple probes without dice', () => {
    const state = emptyState();
    const a = polByName('Olaf Scholz'); // stage 2 → safe
    const b = polByName('Emmanuel Macron'); // corr 2 T2 → stage 4 → scandal
    b.tempBuffs = 1;
    state.board[1].aussen.push(a, b);

    expect(beginInteractivePurge(state, () => {})).toBe(true);
    expect(state.pendingPurge?.queue.length).toBe(2);
    expect(state.pendingPurge?.index).toBe(0);

    const mid = resolveCurrentPurgeProbe(state, () => {});
    expect(mid).toBe('await_next');
    presentPurgeProbe(state, () => {});
    expect(state.pendingPurge?.index).toBe(1);

    const done = resolveCurrentPurgeProbe(state, () => {});
    expect(done).toBe('done');
    expect(state.board[1].aussen.length).toBe(2);
    expect(state.pendingPurge?.survived.length).toBe(2);
  });

  test('hush money at stage 5 averts removal to scandal', () => {
    const state = emptyState();
    const putin = polByName('Vladimir Putin'); // stage 5
    putin.tempBuffs = 2;
    state.board[1].aussen.push(putin);
    (state.effectFlags[1] as any).hushMoneySpent = 1;
    // hush −1 → stage 4 → scandal directly (not remove)
    const info = getAuditStage(state, putin, 1);
    expect(info.stage).toBe(4);
    expect(info.outcome).toBe('scandal');
  });

  test('no RNG after both players have passed (assertion)', () => {
    const state1 = emptyState();
    state1.board[1].aussen.push(polByName('Vladimir Putin'));
    const state2 = emptyState();
    state2.board[1].aussen.push(polByName('Vladimir Putin'));
    const r1 = runPurgeSequence(state1, () => {});
    const r2 = runPurgeSequence(state2, () => {});
    expect(r1.removed.length).toBe(1);
    expect(r2.removed.length).toBe(1);
    expect(r1.removed[0].target).toBe(r2.removed[0].target);
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
