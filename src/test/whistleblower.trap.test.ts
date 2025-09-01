import { GameState, Player } from '../types/game';
import { makePolInstance, makeSpecInstance } from '../utils/cardUtils';
import { Pols, Specials } from '../data/gameData';
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
    board: {
      1: { innen: [], aussen: [], sofort: [] },
      2: { innen: [], aussen: [], sofort: [] }
    },
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

describe('Whistleblower trap', () => {
  test('applies base -2 debuff when no activists present', () => {
    const state = createTestState();
    const playerWhoSetTrap: Player = 1;
    const opponent: Player = 2;

    // Register trap for player 1
    registerTrap(state, playerWhoSetTrap, 'trap.whistleblower.debuff_next_gov_minus2');

    // Create a government card for opponent (use first pol as government)
    const polDef = Pols.find(p => p.name === 'Joschka Fischer') || Pols[0];
    const govCard = makePolInstance(polDef!);
    govCard.uid = 9999;

    // Place on opponent board aussen
    state.board[opponent].aussen.push(govCard);

    // Simulate playing the card: apply traps
    applyTrapsOnCardPlayed(state, opponent, govCard, (e) => {
      state._effectQueue = state._effectQueue || [];
      state._effectQueue.push(e);
    }, (m) => state._effectQueue!.push({ type: 'LOG', msg: m } as any));

    // Resolve queue to apply debuff
    resolveQueue(state, [...(state._effectQueue || [])]);

    const target = state.board[opponent].aussen.find(c => c.uid === 9999) as any;
    expect(target).toBeDefined();
    expect(target.tempDebuffs).toBe(2); // |-2| => 2 debuff applied
  });

  test('scales and caps debuff with activists across both boards', () => {
    const state = createTestState();
    const playerWhoSetTrap: Player = 1;
    const opponent: Player = 2;

    // Add 5 activist public cards across both boards (should cap at -6)
    const activistDef = Specials.find(s => s.name === 'Ai Weiwei')!;
    // place 3 on player1 and 2 on player2
    for (let i = 0; i < 3; i++) state.board[1].innen.push(makeSpecInstance(activistDef));
    for (let i = 0; i < 2; i++) state.board[2].innen.push(makeSpecInstance(activistDef));

    // Register trap
    registerTrap(state, playerWhoSetTrap, 'trap.whistleblower.debuff_next_gov_minus2');

    // Create opponent government card
    const polDef = Pols.find(p => p.name === 'Joschka Fischer') || Pols[0];
    const govCard = makePolInstance(polDef!);
    govCard.uid = 8888;
    state.board[opponent].aussen.push(govCard);

    // Apply traps and resolve
    applyTrapsOnCardPlayed(state, opponent, govCard, (e) => {
      state._effectQueue = state._effectQueue || [];
      state._effectQueue.push(e);
    }, (m) => state._effectQueue!.push({ type: 'LOG', msg: m } as any));

    resolveQueue(state, [...(state._effectQueue || [])]);

    const target = state.board[opponent].aussen.find(c => c.uid === 8888) as any;
    expect(target).toBeDefined();
    // Base 2 + 5 activists = 7 -> capped to 6 debuff magnitude
    expect(target.tempDebuffs).toBe(6);
  });
});


