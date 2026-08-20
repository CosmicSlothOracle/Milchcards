import { makeRNG } from '../../services/rng';
import { GameState, PoliticianCard, createDefaultEffectFlags } from '../../types/game';
import { emptyBoard } from '../../state/board';
import { makePolInstance } from '../cardUtils';
import { Pols } from '../../data/gameData';
import {
  beginWeighing,
  computeR,
  getDefaultKl,
  getKl,
  removalThreshold,
  removalProbability,
  resolveWeighing,
  setWeighingDecisionOnState,
  confirmWeighingOnState,
  bothWeighingConfirmed,
  addPoliticalCapital,
  getPkMax,
  changeKp,
  startWeighingRolls,
  applyWeighingRoll,
  currentWeighingRollTarget,
  collectWeighingResult,
} from '../weighing';

function blankState(): GameState {
  return {
    round: 1,
    current: 1,
    passed: { 1: true, 2: true },
    actionPoints: { 1: 0, 2: 0 },
    actionsUsed: { 1: 0, 2: 0 },
    decks: { 1: [], 2: [] },
    hands: { 1: [], 2: [] },
    traps: { 1: [], 2: [] },
    board: emptyBoard(),
    permanentSlots: {
      1: { government: null, public: null, initiativePermanent: null },
      2: { government: null, public: null, initiativePermanent: null },
    },
    discard: [],
    log: [],
    activeRefresh: { 1: 0, 2: 0 },
    roundsWon: { 1: 0, 2: 0 },
    korruptionsPegel: 1,
    politicalCapital: { 1: 0, 2: 0 },
    effectFlags: {
      1: createDefaultEffectFlags(),
      2: createDefaultEffectFlags(),
    },
  };
}

function polByName(name: string): PoliticianCard {
  const base = Pols.find((p) => p.name === name)!;
  return makePolInstance(base);
}

describe('weighing KP/KL/W10', () => {
  test('default KL ladder', () => {
    expect(getDefaultKl('Vladimir Putin', 2, 10)).toBe(6);
    expect(getDefaultKl('Emmanuel Macron', 2, 9)).toBe(5);
    expect(getDefaultKl('Olaf Scholz', 1, 7)).toBe(3);
    expect(getDefaultKl('Werner Maihofer', 1, 3)).toBe(1);
  });

  test('R = KL − KP', () => {
    expect(computeR(5, 2)).toBe(3);
    expect(computeR(5, 6)).toBe(-1);
  });

  test('W10 removal thresholds', () => {
    expect(removalThreshold(0)).toBe(0);
    expect(removalThreshold(1)).toBe(2);
    expect(removalThreshold(2)).toBe(4);
    expect(removalThreshold(3)).toBe(6);
    expect(removalThreshold(4)).toBe(8);
    expect(removalThreshold(5)).toBe(9);
    expect(removalThreshold(9)).toBe(9);
    expect(removalProbability(1)).toBeCloseTo(0.2);
    expect(removalProbability(4)).toBeCloseTo(0.8);
  });

  test('beginWeighing raises KP and freezes R', () => {
    const state = blankState();
    state.korruptionsPegel = 1;
    const putin = polByName('Vladimir Putin');
    state.board[1].aussen = [putin];
    const logs: string[] = [];
    expect(beginWeighing(state, (m) => logs.push(m))).toBe(true);
    expect(state.korruptionsPegel).toBe(2);
    expect(state.pendingWeighing?.cards.length).toBe(1);
    const snap = state.pendingWeighing!.cards[0];
    expect(snap.kl).toBe(getKl(putin));
    expect(snap.baseR).toBe(computeR(snap.kl, 2));
  });

  test('Vertuschen costs PK and lowers effective R by 2', () => {
    const state = blankState();
    state.korruptionsPegel = 1;
    state.politicalCapital = { 1: 2, 2: 0 };
    const putin = polByName('Vladimir Putin');
    state.board[1].aussen = [putin];
    beginWeighing(state, () => {});
    const uid = putin.uid;
    expect(setWeighingDecisionOnState(state, 1, uid, 'cover', () => {})).toBe(true);
    const snap = state.pendingWeighing!.cards[0];
    expect(snap.decision).toBe('cover');
    expect(snap.effectiveR).toBe(snap.baseR - 2);
  });

  test('Opfern removes card and lowers KP (does not change frozen R of others this round)', () => {
    const rng = makeRNG(42);
    const state = blankState();
    state.korruptionsPegel = 1;
    const weak = polByName('Werner Maihofer');
    const strong = polByName('Vladimir Putin');
    state.board[1].aussen = [weak, strong];
    beginWeighing(state, () => {});
    const kpAtProbe = state.korruptionsPegel;
    setWeighingDecisionOnState(state, 1, weak.uid, 'sacrifice', () => {});
    confirmWeighingOnState(state, 1, () => {});
    confirmWeighingOnState(state, 2, () => {});
    expect(bothWeighingConfirmed(state.pendingWeighing!)).toBe(true);
    const result = resolveWeighing(state, () => {}, rng);
    expect(result.sacrificed.some((s) => s.uid === weak.uid)).toBe(true);
    expect(state.board[1].aussen.find((c) => c.uid === weak.uid)).toBeUndefined();
    // KP rose +1 at start, then −1 for sacrifice
    expect(state.korruptionsPegel).toBe(kpAtProbe - 1);
  });

  test('W10 remove when roll <= threshold', () => {
    // Seeded RNG: force rolls by wrapping
    let forced = 1;
    const rng = {
      random: () => 0,
      randomInt: (_max: number) => forced - 1, // 1 + randomInt(10) => forced
      pick: <T,>(a: T[]) => a[0],
    };
    const state = blankState();
    state.korruptionsPegel = 1; // after rise KP=2; Putin KL6 → R=4 → threshold 8
    const putin = polByName('Vladimir Putin');
    state.board[1].aussen = [putin];
    beginWeighing(state, () => {});
    confirmWeighingOnState(state, 1, () => {});
    confirmWeighingOnState(state, 2, () => {});
    forced = 3; // <= 8 → remove
    const result = resolveWeighing(state, () => {}, rng as any);
    expect(result.removed.length).toBe(1);
    expect(state.board[1].aussen.length).toBe(0);
  });

  test('W10 survive when roll > threshold', () => {
    const rng = {
      random: () => 0,
      randomInt: () => 9, // roll 10
      pick: <T,>(a: T[]) => a[0],
    };
    const state = blankState();
    state.korruptionsPegel = 1;
    const putin = polByName('Vladimir Putin');
    state.board[1].aussen = [putin];
    beginWeighing(state, () => {});
    confirmWeighingOnState(state, 1, () => {});
    confirmWeighingOnState(state, 2, () => {});
    const result = resolveWeighing(state, () => {}, rng as any);
    expect(result.survived.length).toBe(1);
    expect(state.board[1].aussen.length).toBe(1);
  });

  test('Kronzeuge converts removal into KP −3 discard', () => {
    const rng = {
      random: () => 0,
      randomInt: () => 0, // roll 1 — always fails if R>0
      pick: <T,>(a: T[]) => a[0],
    };
    const state = blankState();
    state.korruptionsPegel = 1; // → 2; Kronzeuge KL3 → R=1
    const kron = makePolInstance(Pols.find((p) => p.name === 'Kronzeuge')!);
    state.board[1].aussen = [kron];
    beginWeighing(state, () => {});
    confirmWeighingOnState(state, 1, () => {});
    confirmWeighingOnState(state, 2, () => {});
    const kpBeforeResolve = state.korruptionsPegel;
    const result = resolveWeighing(state, () => {}, rng as any);
    expect(result.removed.length).toBe(0);
    expect(result.sacrificed.some((s) => s.outcome === 'kronzeuge')).toBe(true);
    expect(state.korruptionsPegel).toBe(Math.max(0, kpBeforeResolve - 3));
  });

  test('PK gains and Lobbyist raises max', () => {
    const state = blankState();
    addPoliticalCapital(state, 1, 5);
    expect(state.politicalCapital[1]).toBe(3);
    const lobby = makePolInstance(Pols.find((p) => p.name === 'Lobbyist')!);
    state.board[1].aussen = [lobby];
    expect(getPkMax(state, 1)).toBe(4);
    addPoliticalCapital(state, 1, 2);
    expect(state.politicalCapital[1]).toBe(4);
  });

  test('interactive per-card W10 roll', () => {
    const state = blankState();
    state.korruptionsPegel = 1;
    const putin = polByName('Vladimir Putin');
    state.board[1].aussen = [putin];
    beginWeighing(state, () => {});
    confirmWeighingOnState(state, 1, () => {});
    confirmWeighingOnState(state, 2, () => {});
    expect(startWeighingRolls(state, () => {})).toBe(true);
    expect(state.pendingWeighing?.phase).toBe('rolling');
    const target = currentWeighingRollTarget(state);
    expect(target?.uid).toBe(putin.uid);
    applyWeighingRoll(state, putin.uid, 10, () => {}); // survive
    expect(collectWeighingResult(state).survived.length).toBe(1);
    expect(state.pendingWeighing?.phase).toBe('done');
  });

  test('CHANGE_KP via changeKp clamps at 0', () => {
    const state = blankState();
    state.korruptionsPegel = 1;
    changeKp(state, -5);
    expect(state.korruptionsPegel).toBe(0);
  });
});
