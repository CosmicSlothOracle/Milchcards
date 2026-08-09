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
        1: { innen: [], aussen: [], sofort: [] },
        2: { innen: [], aussen: [], sofort: [] }
      },
      permanentSlots: {
        1: { government: null, public: null, initiativePermanent: null },
        2: { government: null, public: null, initiativePermanent: null }
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
      } as any;

      gameState.board[1].innen.push(doudnaCard);
      recomputeAuraFlags(gameState);

      expect(gameState.effectFlags[1].scienceInitiativeBonus).toBe(true);
      expect(gameState.effectFlags[2].scienceInitiativeBonus).toBe(false);
    });

    it('should set Noam Chomsky penalty flag on the opponent', () => {
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
      } as any;

      gameState.board[1].innen.push(chomskyCard);
      recomputeAuraFlags(gameState);

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
    } as any;

    it('should return base influence for non-instant initiatives', () => {
      const nonInitiativeCard: Card = {
        ...instantInitiativeCard,
        type: 'Dauerhaft-Initiative'
      } as any;

      const result = applyInstantInitiativeInfluenceMods(gameState, 1, 3, nonInitiativeCard);

      expect(result.influence).toBe(3);
      expect(result.reasons).toEqual([]);
    });

    it('should apply Jennifer Doudna bonus from board', () => {
      gameState.board[1].innen.push({
        id: 9, key: 'd', name: 'Jennifer Doudna', kind: 'spec', baseId: 9, uid: 9,
        type: 'Öffentlichkeitskarte', bp: 2, impl: 't'
      } as any);

      const result = applyInstantInitiativeInfluenceMods(gameState, 1, 2, instantInitiativeCard);

      expect(result.influence).toBe(3);
      expect(result.reasons).toContain('Jennifer Doudna: +1 Einfluss');
    });

    it('should apply Anthony Fauci bonus from board', () => {
      gameState.board[1].innen.push({
        id: 9, key: 'f', name: 'Anthony Fauci', kind: 'spec', baseId: 9, uid: 9,
        type: 'Öffentlichkeitskarte', bp: 2, impl: 't'
      } as any);

      const result = applyInstantInitiativeInfluenceMods(gameState, 1, 2, instantInitiativeCard);

      expect(result.influence).toBe(3);
      expect(result.reasons).toContain('Anthony Fauci: +1 Einfluss');
    });

    it('should apply Noam Chomsky penalty from opponent board', () => {
      gameState.board[2].innen.push({
        id: 9, key: 'c', name: 'Noam Chomsky', kind: 'spec', baseId: 9, uid: 9,
        type: 'Öffentlichkeitskarte', bp: 2, impl: 't'
      } as any);

      const result = applyInstantInitiativeInfluenceMods(gameState, 1, 3, instantInitiativeCard);

      expect(result.influence).toBe(2);
      expect(result.reasons).toContain('Noam Chomsky: −1 Einfluss');
    });

    it('should combine multiple effects', () => {
      gameState.board[1].innen.push(
        { id: 1, key: 'd', name: 'Jennifer Doudna', kind: 'spec', baseId: 1, uid: 1, type: 'Öffentlichkeitskarte', bp: 2, impl: 't' } as any,
        { id: 2, key: 'f', name: 'Anthony Fauci', kind: 'spec', baseId: 2, uid: 2, type: 'Öffentlichkeitskarte', bp: 2, impl: 't' } as any,
      );
      gameState.board[2].innen.push(
        { id: 3, key: 'c', name: 'Noam Chomsky', kind: 'spec', baseId: 3, uid: 3, type: 'Öffentlichkeitskarte', bp: 2, impl: 't' } as any,
      );

      const result = applyInstantInitiativeInfluenceMods(gameState, 1, 2, instantInitiativeCard);

      expect(result.influence).toBe(3); // 2 + 1 + 1 - 1
      expect(result.reasons).toHaveLength(3);
    });
  });

  describe('maybeApplyAiWeiweiInstantBonus', () => {
    it('is a deprecated no-op (handled via INITIATIVE_ACTIVATED)', () => {
      const mockLog = jest.fn();
      maybeApplyAiWeiweiInstantBonus(gameState, 1, {
        id: 1, key: 't', name: 'Test', kind: 'spec', baseId: 1, uid: 1,
        type: 'Sofort-Initiative', bp: 2, impl: 't'
      } as any, mockLog);
      expect(mockLog).not.toHaveBeenCalled();
      expect(gameState.actionPoints[1]).toBe(3);
    });
  });
});
