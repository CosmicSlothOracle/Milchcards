import { GameState, PoliticianCard, createDefaultEffectFlags } from '../../types/game';
import { emptyBoard } from '../../state/board';
import { makePolInstance } from '../cardUtils';
import { Pols } from '../../data/gameData';
import {
  beginWeighing,
  computeR,
  getDefaultKl,
  getKl,
  outcomeForR,
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
  collectWeighingResult,
  effectiveRForDecision,
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

describe('weighing KP/KL deterministic bands', () => {
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

  test('deterministic R bands', () => {
    expect(outcomeForR(0)).toBe('safe');
    expect(outcomeForR(-1)).toBe('safe');
    expect(outcomeForR(1)).toBe('scandal');
    expect(outcomeForR(2)).toBe('scandal');
    expect(outcomeForR(3)).toBe('remove');
    expect(outcomeForR(6)).toBe('remove');
    expect(removalThreshold(2)).toBe(0);
    expect(removalThreshold(3)).toBe(10);
    expect(removalProbability(1)).toBe(0);
    expect(removalProbability(4)).toBe(1);
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

  test('Vertuschen costs PK and zeros effective R (full protection)', () => {
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
    expect(snap.effectiveR).toBe(0);
    expect(effectiveRForDecision(snap.baseR, 'cover')).toBe(0);
  });

  test('Vertuschen on already-safe card is rejected', () => {
    const state = blankState();
    state.korruptionsPegel = 5;
    state.politicalCapital = { 1: 2, 2: 0 };
    const weak = polByName('Werner Maihofer');
    state.board[1].aussen = [weak];
    beginWeighing(state, () => {});
    expect(setWeighingDecisionOnState(state, 1, weak.uid, 'cover', () => {})).toBe(false);
  });

  test('Opfern removes card and lowers KP (does not change frozen R of others this round)', () => {
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
    const result = resolveWeighing(state, () => {});
    expect(result.sacrificed.some((s) => s.uid === weak.uid)).toBe(true);
    expect(state.board[1].aussen.find((c) => c.uid === weak.uid)).toBeUndefined();
    expect(state.korruptionsPegel).toBe(kpAtProbe - 1);
  });

  test('Accept at R≥3 removes the card (no dice)', () => {
    const state = blankState();
    state.korruptionsPegel = 1; // after rise KP=2; Putin KL6 → R=4 → remove
    const putin = polByName('Vladimir Putin');
    state.board[1].aussen = [putin];
    beginWeighing(state, () => {});
    confirmWeighingOnState(state, 1, () => {});
    confirmWeighingOnState(state, 2, () => {});
    const result = resolveWeighing(state, () => {});
    expect(result.removed.length).toBe(1);
    expect(state.board[1].aussen.length).toBe(0);
  });

  test('Cover saves a high-R card that would otherwise be removed', () => {
    const state = blankState();
    state.korruptionsPegel = 1;
    state.politicalCapital = { 1: 1, 2: 0 };
    const putin = polByName('Vladimir Putin');
    state.board[1].aussen = [putin];
    beginWeighing(state, () => {});
    setWeighingDecisionOnState(state, 1, putin.uid, 'cover', () => {});
    confirmWeighingOnState(state, 1, () => {});
    confirmWeighingOnState(state, 2, () => {});
    const result = resolveWeighing(state, () => {});
    expect(result.removed.length).toBe(0);
    expect(result.survived.some((s) => s.uid === putin.uid && s.outcome === 'safe')).toBe(true);
    expect(state.board[1].aussen.length).toBe(1);
    expect(state.politicalCapital[1]).toBe(0);
  });

  test('Accept at R 1–2 applies scandal and keeps the card', () => {
    const state = blankState();
    state.korruptionsPegel = 1; // → 2; Scholz KL3 → R=1 → scandal
    const scholz = polByName('Olaf Scholz');
    scholz.tempBuffs = 1; // corruption bonus at 2
    state.board[1].aussen = [scholz];
    const influenceBefore = (scholz.influence || 0) + (scholz.tempBuffs || 0) - (scholz.tempDebuffs || 0);
    beginWeighing(state, () => {});
    confirmWeighingOnState(state, 1, () => {});
    confirmWeighingOnState(state, 2, () => {});
    const result = resolveWeighing(state, () => {});
    expect(result.removed.length).toBe(0);
    expect(result.survived.some((s) => s.uid === scholz.uid && s.outcome === 'scandal')).toBe(true);
    expect(state.board[1].aussen.length).toBe(1);
    const after = (scholz.influence || 0) + (scholz.tempBuffs || 0) - (scholz.tempDebuffs || 0);
    expect(after).toBeLessThan(influenceBefore);
  });

  test('R≤0 is safe without Cover', () => {
    const state = blankState();
    state.korruptionsPegel = 5; // → 6; Maihofer KL1 → R=-5
    const weak = polByName('Werner Maihofer');
    state.board[1].aussen = [weak];
    beginWeighing(state, () => {});
    confirmWeighingOnState(state, 1, () => {});
    confirmWeighingOnState(state, 2, () => {});
    const result = resolveWeighing(state, () => {});
    expect(result.survived.length).toBe(1);
    expect(result.survived[0].outcome).toBe('safe');
    expect(state.board[1].aussen.length).toBe(1);
  });

  test('Kronzeuge converts removal into KP −3 discard', () => {
    const state = blankState();
    state.korruptionsPegel = 0; // → 1; force high R by using a high-KL stand-in name if needed
    const kron = makePolInstance(Pols.find((p) => p.name === 'Kronzeuge')!);
    kron.kl = 6;
    state.board[1].aussen = [kron];
    beginWeighing(state, () => {});
    confirmWeighingOnState(state, 1, () => {});
    confirmWeighingOnState(state, 2, () => {});
    const kpBeforeResolve = state.korruptionsPegel;
    const result = resolveWeighing(state, () => {});
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

  test('confirm resolves immediately (no roll queue)', () => {
    const state = blankState();
    state.korruptionsPegel = 1;
    const putin = polByName('Vladimir Putin');
    state.board[1].aussen = [putin];
    beginWeighing(state, () => {});
    confirmWeighingOnState(state, 1, () => {});
    confirmWeighingOnState(state, 2, () => {});
    expect(startWeighingRolls(state, () => {})).toBe(false);
    expect(state.pendingWeighing?.phase).toBe('done');
    expect(collectWeighingResult(state).removed.length).toBe(1);
  });

  test('CHANGE_KP via changeKp clamps at 0', () => {
    const state = blankState();
    state.korruptionsPegel = 1;
    changeKp(state, -5);
    expect(state.korruptionsPegel).toBe(0);
  });
});
