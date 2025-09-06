import { decideBestAction } from '../../ai/aiPlayer';
import { GameState } from '../../types/game';

describe('decideBestAction', () => {
  test('passes with zero AP', () => {
    const state = {
      current: 2,
      actionPoints: { 1: 2, 2: 0 },
      hands: { 1: [], 2: [] },
      board: { 1: { innen: [], aussen: [], sofort: [] }, 2: { innen: [], aussen: [], sofort: [] } },
      permanentSlots: { 1: { government: null, public: null, initiativePermanent: null }, 2: { government: null, public: null, initiativePermanent: null } },
      traps: { 1: [], 2: [] },
      decks: { 1: [], 2: [] },
      discard: [],
      log: [],
      effectFlags: { 1: {}, 2: {} } as any
    } as unknown as GameState;

    const action = decideBestAction(state, 2, 'easy');
    expect(action.type).toBe('pass');
  });

  test('chooses play when card available', () => {
    const dummyCard = { id: 1, key: 'pol_test', name: 'Test Pol', kind: 'pol', baseId: 1, uid: 100, tag: 'Sonstiges', T: 1, BP: 1, influence: 3 } as any;
    const state = {
      current: 2,
      actionPoints: { 1: 2, 2: 2 },
      hands: { 1: [], 2: [dummyCard] },
      board: { 1: { innen: [], aussen: [], sofort: [] }, 2: { innen: [], aussen: [], sofort: [] } },
      permanentSlots: { 1: { government: null, public: null, initiativePermanent: null }, 2: { government: null, public: null, initiativePermanent: null } },
      traps: { 1: [], 2: [] },
      decks: { 1: [], 2: [] },
      discard: [],
      log: [],
      effectFlags: { 1: {}, 2: {} } as any
    } as unknown as GameState;

    const action = decideBestAction(state, 2, 'easy');
    expect(action.type).toBe('play');
    expect(typeof (action as any).index).toBe('number');
  });
});


