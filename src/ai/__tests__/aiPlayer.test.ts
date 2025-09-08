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
      passed: { 1: false, 2: false },
      effectFlags: { 1: {}, 2: {} } as any
    } as unknown as GameState;

    const action = decideBestAction(state, 2, 'easy');
    expect(action.type).toBe('play');
    expect(typeof (action as any).index).toBe('number');
  });

  test('passes when AI has 20+ influence lead and many cards played', () => {
    const state = {
      current: 2,
      actionPoints: { 1: 2, 2: 3 },
      hands: { 1: [], 2: [] },
      board: {
        1: { innen: [], aussen: [], sofort: [] },
        2: {
          innen: [{ id: 1, key: 'spec1', name: 'Spec1', kind: 'spec', baseId: 1, uid: 1 } as any],
          aussen: [
            { id: 2, key: 'pol1', name: 'Pol1', kind: 'pol', baseId: 2, uid: 2, influence: 10 } as any,
            { id: 3, key: 'pol2', name: 'Pol2', kind: 'pol', baseId: 3, uid: 3, influence: 10 } as any,
            { id: 4, key: 'pol3', name: 'Pol3', kind: 'pol', baseId: 4, uid: 4, influence: 5 } as any
          ],
          sofort: []
        }
      },
      permanentSlots: { 1: { government: null, public: null, initiativePermanent: null }, 2: { government: null, public: null, initiativePermanent: null } },
      traps: { 1: [], 2: [] },
      decks: { 1: [], 2: [] },
      discard: [],
      log: [],
      passed: { 1: false, 2: false },
      effectFlags: { 1: {}, 2: {} } as any
    } as unknown as GameState;

    const action = decideBestAction(state, 2, 'easy');
    expect(action.type).toBe('pass');
  });

  test('plays government cards when opponent passed', () => {
    const govCard1 = { id: 1, key: 'pol1', name: 'Pol1', kind: 'pol', baseId: 1, uid: 1, tag: 'Sonstiges', T: 1, BP: 1, influence: 3 } as any;
    const state = {
      current: 2,
      actionPoints: { 1: 0, 2: 2 },
      hands: { 1: [], 2: [govCard1] },
      board: {
        1: { innen: [], aussen: [], sofort: [] },
        2: { innen: [], aussen: [], sofort: [] }
      },
      permanentSlots: { 1: { government: null, public: null, initiativePermanent: null }, 2: { government: null, public: null, initiativePermanent: null } },
      traps: { 1: [], 2: [] },
      decks: { 1: [], 2: [] },
      discard: [],
      log: [],
      passed: { 1: true, 2: false }, // Opponent passed
      effectFlags: { 1: {}, 2: {} } as any
    } as unknown as GameState;

    const action = decideBestAction(state, 2, 'easy');
    expect(action.type).toBe('play');
    expect((action as any).lane).toBe('aussen');
  });

  test('prioritizes draw effect cards when no government cards in hand', () => {
    const drawCard = {
      id: 1,
      key: 'spec_draw',
      name: 'Draw Card',
      kind: 'spec',
      baseId: 1,
      uid: 1,
      type: 'Öffentlichkeitskarte',
      bp: 2,
      effect: 'Draw 2 cards',
      effectKey: 'public.draw_cards'
    } as any;
    const state = {
      current: 2,
      actionPoints: { 1: 2, 2: 3 },
      hands: { 1: [], 2: [drawCard] },
      board: { 1: { innen: [], aussen: [], sofort: [] }, 2: { innen: [], aussen: [], sofort: [] } },
      permanentSlots: { 1: { government: null, public: null, initiativePermanent: null }, 2: { government: null, public: null, initiativePermanent: null } },
      traps: { 1: [], 2: [] },
      decks: { 1: [], 2: [] },
      discard: [],
      log: [],
      passed: { 1: false, 2: false },
      effectFlags: { 1: {}, 2: {} } as any
    } as unknown as GameState;

    const action = decideBestAction(state, 2, 'easy');
    expect(action.type).toBe('play');
    expect((action as any).index).toBe(0);
  });
});


