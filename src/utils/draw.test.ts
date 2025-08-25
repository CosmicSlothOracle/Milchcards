import { drawOne, HAND_LIMIT } from './draw';
import { GameState, Card, createDefaultEffectFlags } from '../types/game';
import { makeUid } from '../utils/id';

describe('Draw System', () => {
  const createMockState = (overrides: Partial<GameState> = {}): GameState => ({
    round: 1,
    current: 1,
    passed: { 1: false, 2: false },
    actionPoints: { 1: 2, 2: 2 },
    actionsUsed: { 1: 0, 2: 0 },
    hands: { 1: [], 2: [] },
    decks: { 1: [], 2: [] },
    board: { 1: { innen: [], aussen: [], sofort: [] }, 2: { innen: [], aussen: [], sofort: [] } },

    discard: [],
    log: [],
    activeRefresh: { 1: 0, 2: 0 },
    roundsWon: { 1: 0, 2: 0 },
    effectFlags: { 1: createDefaultEffectFlags(), 2: createDefaultEffectFlags() },
    shields: new Set(),
    // Fehlende Required-Felder hinzufügen
    traps: { 1: [], 2: [] },
    blocked: {},
    _queue: [],
    ...overrides
  } as GameState);

  const createMockCard = (name?: string): Card => ({
    // Minimale Felder für die Tests; unknown-cast deckt unions ab
    kind: 'pol',
    name: name || 'Test Card',
    baseId: 1,
    id: 1,
    key: 'mock',
    influence: 2,
    tag: 'Staatsoberhaupt',
    uid: 1, // number statt UID für Tests
  } as unknown as Card);

  describe('drawOne function', () => {
    it('should draw one card from deck to hand', () => {
      const card = createMockCard('Angela Merkel');
      const state = createMockState({
        hands: { 1: [], 2: [] },
        decks: { 1: [card], 2: [] }
      });
      const logSpy = jest.fn();

      const result = drawOne(state, 1, logSpy);

      expect(result).toBe(true);
      expect(state.hands[1]).toHaveLength(1);
      expect(state.hands[1][0]).toBe(card);
      expect(state.decks[1]).toHaveLength(0);
      expect(logSpy).toHaveBeenCalledWith('🃏 P1 zieht Angela Merkel (1/8).');
    });

    it('should return false when hand is at limit', () => {
      const cards = Array.from({ length: HAND_LIMIT }, (_, i) => createMockCard(`Card ${i}`));
      const extraCard = createMockCard('Extra Card');
      const state = createMockState({
        hands: { 1: [...cards], 2: [] },
        decks: { 1: [extraCard], 2: [] }
      });
      const logSpy = jest.fn();

      const result = drawOne(state, 1, logSpy);

      expect(result).toBe(false);
      expect(state.hands[1]).toHaveLength(HAND_LIMIT);
      expect(state.decks[1]).toHaveLength(1); // Card not drawn
      expect(logSpy).toHaveBeenCalledWith('✋ P1: Handlimit (8) erreicht – keine Karte nachgezogen.');
    });

    it('should return false when deck is empty', () => {
      const state = createMockState({
        hands: { 1: [], 2: [] },
        decks: { 1: [], 2: [] }
      });
      const logSpy = jest.fn();

      const result = drawOne(state, 1, logSpy);

      expect(result).toBe(false);
      expect(state.hands[1]).toHaveLength(0);
      expect(logSpy).toHaveBeenCalledWith('🪙 P1: Deck leer – keine Karte nachgezogen.');
    });

    it('should handle card without name property', () => {
      // Erst gültig erzeugen (mit name), dann zur Fallback-Prüfung name entfernen
      const card = {
        kind: 'pol',
        baseId: 1,
        id: 1,
        key: 'mock',
        influence: 1,
        tag: 'Staatsoberhaupt',
        uid: 1, // number statt UID für Tests
        name: 'Temp',
      } as unknown as Card;
      delete (card as any).name;

      const state = createMockState({ hands: { 1: [], 2: [] }, decks: { 1: [card], 2: [] } });
      const logSpy = jest.fn();

      const result = drawOne(state, 1, logSpy);
      expect(result).toBe(true);
      expect(state.hands[1]).toHaveLength(1);
      // Log sollte Fallback verwenden (kein name → "Unbenannte Karte")
      expect(logSpy).toHaveBeenCalledWith('🃏 P1 zieht mock (1/8).');
    });

    it('should work for both players', () => {
      const card1 = createMockCard('Card for P1');
      const card2 = createMockCard('Card for P2');
      const state = createMockState({
        hands: { 1: [], 2: [] },
        decks: { 1: [card1], 2: [card2] }
      });
      const logSpy = jest.fn();

      const result1 = drawOne(state, 1, logSpy);
      const result2 = drawOne(state, 2, logSpy);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(state.hands[1]).toHaveLength(1);
      expect(state.hands[2]).toHaveLength(1);
      expect(state.hands[1][0]).toBe(card1);
      expect(state.hands[2][0]).toBe(card2);
    });

    it('should draw from end of deck (pop behavior)', () => {
      const card1 = createMockCard('First Card');
      const card2 = createMockCard('Last Card');
      const state = createMockState({
        hands: { 1: [], 2: [] },
        decks: { 1: [card1, card2], 2: [] } // card2 is at the end
      });
      const logSpy = jest.fn();

      const result = drawOne(state, 1, logSpy);

      expect(result).toBe(true);
      expect(state.hands[1][0]).toBe(card2); // Last card should be drawn
      expect(state.decks[1]).toEqual([card1]); // First card remains
    });

    it('should correctly track hand count in log', () => {
      const cards = [createMockCard('Card 1'), createMockCard('Card 2'), createMockCard('Card 3')];
      const state = createMockState({
        hands: { 1: [createMockCard('Existing Card')], 2: [] }, // Hand starts with 1 card
        decks: { 1: [...cards], 2: [] }
      });
      const logSpy = jest.fn();

      drawOne(state, 1, logSpy);
      expect(logSpy).toHaveBeenCalledWith('🃏 P1 zieht Card 3 (2/8).');

      drawOne(state, 1, logSpy);
      expect(logSpy).toHaveBeenCalledWith('🃏 P1 zieht Card 2 (3/8).');
    });
  });

  it('should have correct HAND_LIMIT constant', () => {
    expect(HAND_LIMIT).toBe(8);
  });
});
