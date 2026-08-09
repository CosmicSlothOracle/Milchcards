import { sumGovernmentInfluenceWithAuras } from '../utils/gameUtils';
import { GameState, createDefaultEffectFlags } from '../types/game';

function makeState(): GameState {
  return {
    round: 1,
    current: 1,
    passed: { 1: false, 2: false },
    actionPoints: { 1: 2, 2: 2 },
    actionsUsed: { 1: 0, 2: 0 },
    decks: { 1: [], 2: [] },
    hands: { 1: [], 2: [] },
    traps: { 1: [], 2: [] },
    board: {
      1: { innen: [], aussen: [], sofort: [] },
      2: { innen: [], aussen: [], sofort: [] },
    },
    permanentSlots: {
      1: { government: null, public: null, initiativePermanent: null },
      2: { government: null, public: null, initiativePermanent: null },
    },
    discard: [],
    log: [],
    activeRefresh: { 1: 0, 2: 0 },
    roundsWon: { 1: 0, 2: 0 },
    effectFlags: { 1: createDefaultEffectFlags(), 2: createDefaultEffectFlags() },
  } as any;
}

describe('permanent initiative auras', () => {
  test('Napoleon Komplex grants +1 only to strongest tier-1 government', () => {
    const state = makeState();
    state.permanentSlots[1].government = {
      uid: 99,
      kind: 'spec',
      name: 'Napoleon Komplex',
      type: 'Dauerhaft-Initiative',
    } as any;
    state.board[1].aussen.push({
      uid: 1,
      kind: 'pol',
      name: 'Olaf Scholz',
      T: 1,
      influence: 7,
      tempBuffs: 0,
      tempDebuffs: 0,
    } as any);
    state.board[1].aussen.push({
      uid: 2,
      kind: 'pol',
      name: 'Rishi Sunak',
      T: 1,
      influence: 5,
      tempBuffs: 0,
      tempDebuffs: 0,
    } as any);

    // 7+1 + 5 = 13 (only strongest T1 buffed)
    expect(sumGovernmentInfluenceWithAuras(state, 1)).toBe(13);
  });

  test('Milchglas Transparenz grants +1 when no NGO/movement present', () => {
    const state = makeState();
    state.permanentSlots[1].government = {
      uid: 98,
      kind: 'spec',
      name: 'Milchglas Transparenz',
      type: 'Dauerhaft-Initiative',
    } as any;
    state.board[1].aussen.push({
      uid: 2,
      kind: 'pol',
      name: 'Rishi Sunak',
      T: 1,
      influence: 7,
      tempBuffs: 0,
      tempDebuffs: 0,
    } as any);

    expect(sumGovernmentInfluenceWithAuras(state, 1)).toBe(8);
  });
});
