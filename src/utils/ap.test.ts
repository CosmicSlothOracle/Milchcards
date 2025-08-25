import { getCardActionPointCost, START_AP, getNetApCost } from './ap';
import { GameState, Card, createDefaultEffectFlags } from '../types/game';

describe('Central AP System', () => {
  const createMockState = (overrides: Partial<GameState> = {}): GameState => ({
    round: 1,
    current: 1,
    passed: { 1: false, 2: false },
    actionPoints: { 1: 2, 2: 2 },
    actionsUsed: { 1: 0, 2: 0 },
    decks: { 1: [], 2: [] },
    hands: { 1: [], 2: [] },
    traps: { 1: [], 2: [] },
    board: { 1: { innen: [], aussen: [], sofort: [] }, 2: { innen: [], aussen: [], sofort: [] } },
    permanentSlots: { 1: { government: null, public: null }, 2: { government: null, public: null } },
    discard: [],
    log: [],
    activeRefresh: { 1: 0, 2: 0 },
    roundsWon: { 1: 0, 2: 0 },
        effectFlags: {
      1: createDefaultEffectFlags(),
      2: createDefaultEffectFlags()
    },
    shields: new Set(),
    ...overrides
  });

  const createMockCard = (kind: 'pol' | 'spec', type?: string, name?: string): Card => ({
    id: 1,
    key: 'test_card',
    name: name || 'Test Card',
    kind,
    baseId: 1,
    uid: 1,
    type
  } as any);

  describe('Basic AP Costs', () => {
    it('should return 1 AP for government cards', () => {
      const state = createMockState();
      const card = createMockCard('pol');

      const result = getCardActionPointCost(state, 1, card);

      expect(result.cost).toBe(1);
    });

    it('should return 1 AP for initiative cards', () => {
      const state = createMockState();
      const card = createMockCard('spec', 'Sofort-Initiative');

      const result = getCardActionPointCost(state, 1, card);

      expect(result.cost).toBe(1);
    });

    it('should return 1 AP for public cards', () => {
      const state = createMockState();
      const card = createMockCard('spec', 'Öffentlichkeitskarte');

      const result = getCardActionPointCost(state, 1, card);

      expect(result.cost).toBe(1);
    });
  });

  describe('Constants', () => {
    it('should have correct AP constants', () => {
      expect(START_AP).toBe(2);
    });
  });
});
