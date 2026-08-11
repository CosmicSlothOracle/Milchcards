import { GameState, Player } from '../types/game';
import { makePolInstance } from '../utils/cardUtils';
import { Pols } from '../data/gameData';
import { registerTrap, applyTrapsOnCardPlayed } from '../utils/traps';
import { resolveQueue } from '../utils/queue';

function createTestState(): GameState {
  return {
    round: 1,
    current: 1,
    passed: { 1: false, 2: false },
    actionPoints: { 1: 2, 2: 2 },
    actionsUsed: { 1: 0, 2: 0 },
    hands: { 1: [], 2: [] },
    decks: { 1: [], 2: [] },
    board: { 1: { innen: [], aussen: [], sofort: [] }, 2: { innen: [], aussen: [], sofort: [] } },
    permanentSlots: { 1: { government: null, public: null, initiativePermanent: null }, 2: { government: null, public: null, initiativePermanent: null } },
    traps: { 1: [], 2: [] },
    discard: [],
    log: [],
    activeRefresh: { 1: 0, 2: 0 },
    roundsWon: { 1: 0, 2: 0 },
    shields: new Set(),
    effectFlags: { 1: { }, 2: { } } as any,
    _effectQueue: []
  } as any;
}

describe('Strategic Disclosure trap', () => {
  test('returns played government to hand if projected total influence >= opponent', () => {
    const state = createTestState();
    const trapSetter: Player = 1;
    const playedBy: Player = 2;

    // Prepare board: P1 has total influence 5
    const p1Pol = makePolInstance(Pols[0]);
    (p1Pol as any).influence = 5;
    (p1Pol as any).corruption = 1;
    (p1Pol as any).corruptionStart = 1;
    p1Pol.uid = 1111;
    state.board[1].aussen.push(p1Pol);

    // Trap set by P1
    registerTrap(state, trapSetter, 'trap.strategic_disclosure.return_gov');

    // Opponent plays a government card with influence 5 → ties P1 → bounce
    const polDef = Pols.find(p => p.name === 'Joschka Fischer') || Pols[0];
    const govCard = makePolInstance(polDef!);
    govCard.uid = 2222;
    govCard.influence = 5;
    state.board[playedBy].aussen.push(govCard);

    applyTrapsOnCardPlayed(state, playedBy, govCard, (e) => {
      state._effectQueue = state._effectQueue || [];
      state._effectQueue.push(e);
    }, (m) => state._effectQueue!.push({ type: 'LOG', msg: m } as any));

    resolveQueue(state, [...(state._effectQueue || [])]);

    expect(state.board[playedBy].aussen.find(c => c.uid === 2222)).toBeUndefined();
    expect(state.hands[playedBy].some(c => c.uid === 2222)).toBe(true);
    // Blowback: discloser's strongest gov gains corruption
    expect(Number((state.board[1].aussen[0] as any).corruption)).toBeGreaterThanOrEqual(2);
  });

  test('does not trigger when projected influence < opponent', () => {
    const state = createTestState();
    const trapSetter: Player = 1;
    const playedBy: Player = 2;

    // Prepare board: P1 has total influence 10
    const p1Pol = makePolInstance(Pols[0]);
    (p1Pol as any).influence = 10;
    p1Pol.uid = 3333;
    state.board[1].aussen.push(p1Pol);

    registerTrap(state, trapSetter, 'trap.strategic_disclosure.return_gov');

    const polDef = Pols.find(p => p.name === 'Joschka Fischer') || Pols[0];
    const govCard = makePolInstance(polDef!);
    govCard.uid = 4444;
    govCard.influence = 2;
    state.board[playedBy].aussen.push(govCard);

    applyTrapsOnCardPlayed(state, playedBy, govCard, (e) => {
      state._effectQueue = state._effectQueue || [];
      state._effectQueue.push(e);
    }, (m) => state._effectQueue!.push({ type: 'LOG', msg: m } as any));

    resolveQueue(state, [...(state._effectQueue || [])]);

    const target = state.board[playedBy].aussen.find(c => c.uid === 4444) as any;
    expect(target).toBeDefined();
    expect(state.hands[playedBy].some(c => c.uid === 4444)).toBe(false);
  });
});
