import { recomputeAuraFlags, applyInstantInitiativeInfluenceMods, maybeApplyAiWeiweiInstantBonus } from '../effects';
import { GameState, createDefaultEffectFlags, Card } from '../../types/game';

describe('effects engine', () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = {
      round: 1,
      current: 1,
      passed: { 1: false, 2: false },
      actionPoints: { 1: 3, 2: 3 },
      actionsUsed: { 1: 0, 2: 0 },
      decks: { 1: [], 2: [] },
      hands: { 1: [], 2: [] },
      traps: { 1: [], 2: [] },
      board: {
        1: { innen: [], aussen: [] },
        2: { innen: [], aussen: [] }
      },
      permanentSlots: {
        1: { government: null, public: null },
        2: { government: null, public: null }
      },
      discard: [],
      log: [],
      activeRefresh: { 1: 0, 2: 0 },
      roundsWon: { 1: 0, 2: 0 },
      effectFlags: {
        1: createDefaultEffectFlags(),
        2: createDefaultEffectFlags()
      }
    };
  });

  describe('recomputeAuraFlags', () => {
    it('should reset all aura flags initially', () => {
      // Set some flags manually first
      gameState.effectFlags[1].scienceInitiativeBonus = true;
      gameState.effectFlags[2].healthInitiativeBonus = true;

      recomputeAuraFlags(gameState);

      expect(gameState.effectFlags[1].scienceInitiativeBonus).toBe(false);
      expect(gameState.effectFlags[1].healthInitiativeBonus).toBe(false);
      expect(gameState.effectFlags[1].cultureInitiativeBonus).toBe(false);
      expect(gameState.effectFlags[1].militaryInitiativePenalty).toBe(false);
      expect(gameState.effectFlags[2].scienceInitiativeBonus).toBe(false);
      expect(gameState.effectFlags[2].healthInitiativeBonus).toBe(false);
      expect(gameState.effectFlags[2].cultureInitiativeBonus).toBe(false);
      expect(gameState.effectFlags[2].militaryInitiativePenalty).toBe(false);
    });

    it('should set Jennifer Doudna flag when card is in public', () => {
      const doudnaCard: Card = {
        id: 1,
        key: 'Jennifer_Doudna',
        name: 'Jennifer Doudna',
        kind: 'spec',
        baseId: 1,
        uid: 1,
        type: 'Öffentlichkeitskarte',
        bp: 2,
        impl: 'test'
      };

      gameState.board[1].innen.push(doudnaCard);
      recomputeAuraFlags(gameState);

      expect(gameState.effectFlags[1].scienceInitiativeBonus).toBe(true);
      expect(gameState.effectFlags[2].scienceInitiativeBonus).toBe(false);
    });

    it('should set Noam Chomsky flag for opponent', () => {
      const chomskyCard: Card = {
        id: 1,
        key: 'Noam_Chomsky',
        name: 'Noam Chomsky',
        kind: 'spec',
        baseId: 1,
        uid: 1,
        type: 'Öffentlichkeitskarte',
        bp: 2,
        impl: 'test'
      };

      gameState.board[1].innen.push(chomskyCard);
      recomputeAuraFlags(gameState);

      // Chomsky affects the opponent
      expect(gameState.effectFlags[1].militaryInitiativePenalty).toBe(false);
      expect(gameState.effectFlags[2].militaryInitiativePenalty).toBe(true);
    });
  });

  describe('applyInstantInitiativeInfluenceMods', () => {
    const instantInitiativeCard: Card = {
      id: 1,
      key: 'test_initiative',
      name: 'Test Initiative',
      kind: 'spec',
      baseId: 1,
      uid: 1,
      type: 'Sofort-Initiative',
      bp: 2,
      impl: 'test'
    };

    it('should return base influence for non-instant initiatives', () => {
      const nonInitiativeCard: Card = {
        ...instantInitiativeCard,
        type: 'Dauerhaft-Initiative'
      };

      const result = applyInstantInitiativeInfluenceMods(gameState, 1, 3, nonInitiativeCard);

      expect(result.influence).toBe(3);
      expect(result.reasons).toEqual([]);
    });

    it('should apply Jennifer Doudna bonus', () => {
      gameState.effectFlags[1].scienceInitiativeBonus = true;

      const result = applyInstantInitiativeInfluenceMods(gameState, 1, 2, instantInitiativeCard);

      expect(result.influence).toBe(3);
      expect(result.reasons).toContain('Jennifer Doudna: +1 Einfluss');
    });

    it('should apply Anthony Fauci bonus', () => {
      gameState.effectFlags[1].healthInitiativeBonus = true;

      const result = applyInstantInitiativeInfluenceMods(gameState, 1, 2, instantInitiativeCard);

      expect(result.influence).toBe(3);
      expect(result.reasons).toContain('Anthony Fauci: +1 Einfluss');
    });

    it('should apply Noam Chomsky penalty', () => {
      gameState.effectFlags[1].militaryInitiativePenalty = true;

      const result = applyInstantInitiativeInfluenceMods(gameState, 1, 3, instantInitiativeCard);

      expect(result.influence).toBe(2);
      expect(result.reasons).toContain('Noam Chomsky: −1 Einfluss');
    });

    it('should combine multiple effects', () => {
      gameState.effectFlags[1].scienceInitiativeBonus = true;
      gameState.effectFlags[1].healthInitiativeBonus = true;
      gameState.effectFlags[1].militaryInitiativePenalty = true;

      const result = applyInstantInitiativeInfluenceMods(gameState, 1, 2, instantInitiativeCard);

      expect(result.influence).toBe(3); // 2 + 1 + 1 - 1
      expect(result.reasons).toHaveLength(3);
      expect(result.reasons).toContain('Jennifer Doudna: +1 Einfluss');
      expect(result.reasons).toContain('Anthony Fauci: +1 Einfluss');
      expect(result.reasons).toContain('Noam Chomsky: −1 Einfluss');
    });
  });

  describe('maybeApplyAiWeiweiInstantBonus', () => {
    const instantInitiativeCard: Card = {
      id: 1,
      key: 'test_initiative',
      name: 'Test Initiative',
      kind: 'spec',
      baseId: 1,
      uid: 1,
      type: 'Sofort-Initiative',
      bp: 2,
      impl: 'test'
    };

    const mockLog = jest.fn();

    beforeEach(() => {
      mockLog.mockClear();
    });

    it('should not apply bonus for non-instant initiatives', () => {
      const nonInitiativeCard: Card = {
        ...instantInitiativeCard,
        type: 'Dauerhaft-Initiative'
      };

      maybeApplyAiWeiweiInstantBonus(gameState, 1, nonInitiativeCard, mockLog);

      expect(mockLog).not.toHaveBeenCalled();
    });

    it('should not apply bonus without Ai Weiwei flag', () => {
      maybeApplyAiWeiweiInstantBonus(gameState, 1, instantInitiativeCard, mockLog);

      expect(mockLog).not.toHaveBeenCalled();
    });

    it('should apply bonus with Ai Weiwei flag', () => {
      gameState.effectFlags[1].cultureInitiativeBonus = true;
      gameState.actionPoints[1] = 2;

      const drawnCard: Card = {
        id: 2,
        key: 'drawn_card',
        name: 'Drawn Card',
        kind: 'pol',
        baseId: 2,
        uid: 2,
        tag: 'test',
        T: 1,
        BP: 1,
        influence: 1,
        protected: false,
        deactivated: false,
        tempDebuffs: 0,
        tempBuffs: 0,
        _activeUsed: false
      };

      gameState.decks[1] = [drawnCard];

      maybeApplyAiWeiweiInstantBonus(gameState, 1, instantInitiativeCard, mockLog);

      expect(gameState.actionPoints[1]).toBe(3);
      expect(gameState.hands[1]).toContain(drawnCard);
      expect(mockLog).toHaveBeenCalledWith('🔥 Ai Weiwei: +1 Karte gezogen (Drawn Card)');
      expect(mockLog).toHaveBeenCalledWith('🔥 Ai Weiwei: +1 AP (2→3)');
    });
  });
});
