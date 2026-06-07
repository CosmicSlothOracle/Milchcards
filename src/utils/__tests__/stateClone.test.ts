import { cloneStateForMutation } from '../stateClone';
import { canPlayCard } from '../ap';

function makeState() {
  const bribery = {
    uid: 99,
    id: 99,
    name: 'Bestechungsskandal 2.0',
    kind: 'spec',
    type: 'Sofort-Initiative',
    effectKey: 'corruption.bribery_v2.steal_gov_w6',
  };

  return {
    round: 1,
    current: 1,
    passed: { 1: false, 2: false },
    actionPoints: { 1: 2, 2: 2 },
    hands: {
      1: [
        { uid: 1, name: 'A', kind: 'pol' },
        { uid: 2, name: 'B', kind: 'pol' },
        bribery,
      ],
      2: [],
    },
    decks: { 1: [], 2: [] },
    board: {
      1: { innen: [], aussen: [], sofort: [] },
      2: { innen: [], aussen: [], sofort: [] },
    },
    traps: { 1: [], 2: [] },
    discard: [],
    log: [],
    permanentSlots: {
      1: { government: null, public: null, initiativePermanent: null },
      2: { government: null, public: null, initiativePermanent: null },
    },
    roundsWon: { 1: 0, 2: 0 },
    gameWinner: null,
    effectFlags: { 1: {}, 2: {} },
  };
}

/** Simulates React Strict Mode: two updater invocations on the same prev snapshot. */
function simulateStrictModePlay(prev, handIndex, cost) {
  const run = () => {
    const card = prev.hands[1][handIndex];
    if (!canPlayCard(prev, 1, card)) return prev;

    const newState = cloneStateForMutation(prev);
    const newHand = [...newState.hands[1]];
    const [played] = newHand.splice(handIndex, 1);
    newState.hands = { ...newState.hands, 1: newHand };
    newState.board = {
      ...newState.board,
      1: { ...newState.board[1], sofort: [played] },
    };
    newState.actionPoints = {
      ...newState.actionPoints,
      1: Math.max(0, newState.actionPoints[1] - cost),
    };
    return newState;
  };

  run();
  return run();
}

describe('cloneStateForMutation (React Strict Mode)', () => {
  test('double invoke leaves card out of hand with AP deducted', () => {
    const prev = makeState();
    const result = simulateStrictModePlay(prev, 2, 2);

    expect(result.hands[1].some(c => c.name === 'Bestechungsskandal 2.0')).toBe(false);
    expect(result.board[1].sofort[0].name).toBe('Bestechungsskandal 2.0');
    expect(result.actionPoints[1]).toBe(0);
  });

  test('first invoke does not mutate prev snapshot', () => {
    const prev = makeState();
    const card = prev.hands[1][2];

    const newState = cloneStateForMutation(prev);
    newState.actionPoints[1] = 0;
    newState.hands[1].splice(2, 1);
    newState.board[1].sofort.push(card);

    expect(prev.actionPoints[1]).toBe(2);
    expect(prev.hands[1]).toHaveLength(3);
    expect(prev.board[1].sofort).toHaveLength(0);
    expect(canPlayCard(prev, 1, card)).toBe(true);
  });
});
