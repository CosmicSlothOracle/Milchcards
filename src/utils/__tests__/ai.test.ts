import { decideBestAction } from '../../ai/aiPlayer';
import { GameState } from '../../types/game';

describe('AI decision helper', () => {
  test('passes when no AP', () => {
    const state = {
      current: 2,
      actionPoints: { 1: 2, 2: 0 },
      hands: { 1: [], 2: [] },
      board: { 1: { innen: [], aussen: [] }, 2: { innen: [], aussen: [] } },
      aiEnabled: { 1: false, 2: true },
    } as unknown as GameState;
    const action = decideBestAction(state, 2, 'easy');
    expect(action.type).toBe('pass');
  });

  test('chooses play when has playable card', () => {
    const dummyCard = { kind: 'pol', name: 'Test', influence: 3 } as any;
    const state = {
      current: 2,
      actionPoints: { 1: 2, 2: 2 },
      hands: { 1: [], 2: [dummyCard] },
      board: { 1: { innen: [], aussen: [] }, 2: { innen: [], aussen: [] } },
      aiEnabled: { 1: false, 2: true },
    } as unknown as GameState;
    const action = decideBestAction(state, 2, 'easy');
    expect(action.type).toBe('play');
    expect(typeof (action as any).index).toBe('number');
  });
});



