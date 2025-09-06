import { GameState, Player, Card } from '../types/game';
import { triggerCardEffect } from '../effects/registry';

describe('Koalitionszwang Effect', () => {
  let mockState: GameState;
  let mockLog: jest.Mock;

  beforeEach(() => {
    mockLog = jest.fn();
    mockState = {
      board: {
        1: { innen: [], aussen: [] },
        2: { innen: [], aussen: [] }
      },
      hands: { 1: [], 2: [] },
      actionPoints: { 1: 0, 2: 0 },
      current: 1,
      permanentSlots: {
        1: { government: null, public: null },
        2: { government: null, public: null }
      },
      effectFlags: {},
      _effectQueue: []
    } as any;
  });

  describe('Handler Tests', () => {
    test('should enqueue KOALITIONSZWANG_CALCULATE_BONUS event', () => {
      const koalitionszwangCard: Card = {
        name: 'Koalitionszwang',
        effectKey: 'gov.koalitionszwang.coalition_bonus',
        uid: 1,
        kind: 'spec'
      } as any;

      triggerCardEffect(mockState, 1, koalitionszwangCard);

      expect(mockState._effectQueue).toHaveLength(2);
      expect(mockState._effectQueue?.[0]).toEqual({
        type: 'LOG',
        msg: 'Koalitionszwang: Coalition bonus calculation triggered.'
      });
      expect(mockState._effectQueue?.[1]).toEqual({
        type: 'KOALITIONSZWANG_CALCULATE_BONUS',
        player: 1
      });
    });

    test('should work with legacy name mapping', () => {
      const koalitionszwangCard: Card = {
        name: 'Koalitionszwang',
        uid: 1,
        kind: 'spec'
      } as any;

      triggerCardEffect(mockState, 1, koalitionszwangCard);

      expect(mockState._effectQueue).toHaveLength(2);
      expect(mockState._effectQueue?.[1]?.type).toBe('KOALITIONSZWANG_CALCULATE_BONUS');
    });
  });

  describe('Event Structure Tests', () => {
    test('should have correct event types in queue', () => {
      const koalitionszwangCard: Card = {
        name: 'Koalitionszwang',
        effectKey: 'gov.koalitionszwang.coalition_bonus',
        uid: 1,
        kind: 'spec'
      } as any;

      triggerCardEffect(mockState, 1, koalitionszwangCard);

      const events = mockState._effectQueue;
      expect(events).toHaveLength(2);

      // First event should be LOG
      expect(events?.[0]?.type).toBe('LOG');
      expect((events?.[0] as any)?.msg).toContain('Koalitionszwang: Coalition bonus calculation triggered');

      // Second event should be KOALITIONSZWANG_CALCULATE_BONUS
      expect(events?.[1]?.type).toBe('KOALITIONSZWANG_CALCULATE_BONUS');
      expect((events?.[1] as any)?.player).toBe(1);
    });

    test('should handle multiple card plays correctly', () => {
      const koalitionszwangCard: Card = {
        name: 'Koalitionszwang',
        effectKey: 'gov.koalitionszwang.coalition_bonus',
        uid: 1,
        kind: 'spec'
      } as any;

      // Play card for player 1
      triggerCardEffect(mockState, 1, koalitionszwangCard);
      expect(mockState._effectQueue).toHaveLength(2);
      expect((mockState._effectQueue?.[1] as any)?.player).toBe(1);

      // Play card for player 2
      triggerCardEffect(mockState, 2, koalitionszwangCard);
      expect(mockState._effectQueue).toHaveLength(4);
      expect((mockState._effectQueue?.[3] as any)?.player).toBe(2);
    });
  });

  describe('Registry Integration Tests', () => {
    test('should be registered in EFFECTS registry', () => {
      const { EFFECTS } = require('../effects/registry');
      expect(EFFECTS['gov.koalitionszwang.coalition_bonus']).toBeDefined();
      expect(typeof EFFECTS['gov.koalitionszwang.coalition_bonus']).toBe('function');
    });

    test('should be in LEGACY_NAME_TO_KEY mapping', () => {
      const { LEGACY_NAME_TO_KEY } = require('../effects/registry');
      expect(LEGACY_NAME_TO_KEY['Koalitionszwang']).toBe('gov.koalitionszwang.coalition_bonus');
    });

    test('should have correct effectKey in card definition', () => {
      const { cards } = require('../data/cards');
      const koalitionszwangCard = cards.find((c: any) => c.name && c.name.includes('Koalitionszwang'));
      expect(koalitionszwangCard).toBeDefined();
      expect(koalitionszwangCard.effectKey).toBe('gov.koalitionszwang.coalition_bonus');
    });
  });

  describe('Card Details Tests', () => {
    test('should have updated game effect description', () => {
      const { getCardDetails } = require('../data/cardDetails');
      const details = getCardDetails('Koalitionszwang');

      expect(details).toBeDefined();
      expect(details.gameEffect).toContain('gleichhohen Einflusswert');
      expect(details.gameEffect).toContain('Aktivisten und denker Karte');
      expect(details.gameEffect).toContain('Öffentlichkeitsslots');
    });

    test('should have correct usage and example', () => {
      const { getCardDetails } = require('../data/cardDetails');
      const details = getCardDetails('Koalitionszwang');

      expect(details.usage).toContain('Regierungskarten gleichen Einflusses');
      expect(details.usage).toContain('Aktivisten/Denkern');
      expect(details.example).toContain('Koalition bilden');
    });
  });
});
