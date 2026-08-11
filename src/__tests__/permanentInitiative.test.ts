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

  test('Milchglas Transparenz grants +1 to strongest gov when no NGO/movement present', () => {
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
    state.board[1].aussen.push({
      uid: 3,
      kind: 'pol',
      name: 'Olaf Scholz',
      T: 1,
      influence: 5,
      tempBuffs: 0,
      tempDebuffs: 0,
    } as any);

    // Only strongest (7) gets +1 → 8+5 = 13
    expect(sumGovernmentInfluenceWithAuras(state, 1)).toBe(13);
  });

  test('Milchglas Transparenz grants nothing when movement is present', () => {
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
    state.board[1].innen.push({
      uid: 10,
      kind: 'spec',
      name: 'Greta Thunberg',
      type: 'Öffentlichkeitskarte',
      tag: 'Activist',
    } as any);

    expect(sumGovernmentInfluenceWithAuras(state, 1)).toBe(7);
  });

  test('Zivilgesellschaft buffs strongest gov by movement count (cap 2)', () => {
    const state = makeState();
    state.permanentSlots[1].public = {
      uid: 97,
      kind: 'spec',
      name: 'Zivilgesellschaft',
      type: 'Dauerhaft-Initiative',
    } as any;
    state.board[1].aussen.push({
      uid: 1,
      kind: 'pol',
      name: 'Olaf Scholz',
      T: 1,
      influence: 6,
      tempBuffs: 0,
      tempDebuffs: 0,
    } as any);
    state.board[1].aussen.push({
      uid: 2,
      kind: 'pol',
      name: 'Rishi Sunak',
      T: 1,
      influence: 4,
      tempBuffs: 0,
      tempDebuffs: 0,
    } as any);
    state.board[1].innen.push({
      uid: 10,
      kind: 'spec',
      name: 'Greta Thunberg',
      type: 'Öffentlichkeitskarte',
      tag: 'Activist',
    } as any);
    state.board[1].innen.push({
      uid: 11,
      kind: 'spec',
      name: 'Alexei Navalny',
      type: 'Öffentlichkeitskarte',
      tag: 'Activist',
    } as any);
    state.board[1].innen.push({
      uid: 12,
      kind: 'spec',
      name: 'Ai Weiwei',
      type: 'Öffentlichkeitskarte',
      tag: 'Activist',
    } as any);

    // Cap +2 on strongest only: (6+2) + 4 = 12
    expect(sumGovernmentInfluenceWithAuras(state, 1)).toBe(12);
  });
});
