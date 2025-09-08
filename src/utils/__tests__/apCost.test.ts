import { getCardActionPointCost } from '../cardUtils';
import { getNetApCost } from '../ap';
import { GameState, Card } from '../../types/game';

describe('AP Cost Rules', () => {
  const mockState = {
    current: 1,
    actionPoints: { 1: 2, 2: 2 },
    hands: { 1: [], 2: [] },
    board: { 1: { innen: [], aussen: [], sofort: [] }, 2: { innen: [], aussen: [], sofort: [] } },
    permanentSlots: { 1: { government: null, public: null, initiativePermanent: null }, 2: { government: null, public: null, initiativePermanent: null } },
    traps: { 1: [], 2: [] },
    decks: { 1: [], 2: [] },
    discard: [],
    log: [],
    passed: { 1: false, 2: false },
    effectFlags: { 1: {}, 2: {} }
  } as unknown as GameState;

  const governmentCard: Card = {
    id: 1,
    key: 'test_gov',
    name: 'Test Government',
    kind: 'pol',
    baseId: 1,
    uid: 1,
    tag: 'Staatsoberhaupt',
    T: 1,
    BP: 1,
    influence: 5,
    protected: false,
    protectedUntil: null,
    deactivated: false,
    tempDebuffs: 0,
    tempBuffs: 0,
    _activeUsed: false
  } as any;

  const specialCard: Card = {
    id: 2,
    key: 'test_spec',
    name: 'Test Special',
    kind: 'spec',
    baseId: 2,
    uid: 2,
    type: 'Öffentlichkeitskarte',
    bp: 1
  } as any;

  const initiativeCard: Card = {
    id: 3,
    key: 'test_init',
    name: 'Test Initiative',
    kind: 'spec',
    baseId: 3,
    uid: 3,
    type: 'Sofort-Initiative',
    bp: 2
  } as any;

  test('ALL CARDS COST EXACTLY 1 AP - Government cards', () => {
    const cost = getCardActionPointCost(governmentCard, mockState, 1);
    expect(cost).toBe(1);
  });

  test('ALL CARDS COST EXACTLY 1 AP - Special cards', () => {
    const cost = getCardActionPointCost(specialCard, mockState, 1);
    expect(cost).toBe(1);
  });

  test('ALL CARDS COST EXACTLY 1 AP - Initiative cards', () => {
    const cost = getCardActionPointCost(initiativeCard, mockState, 1);
    expect(cost).toBe(1);
  });

  test('getNetApCost always returns 1 AP cost', () => {
    const result = getNetApCost(mockState, 1, governmentCard);
    expect(result.cost).toBe(1);
    expect(result.refund).toBe(0);
    expect(result.net).toBe(1);
    expect(result.reasons).toEqual([]);
  });

  test('getNetApCost works for all card types', () => {
    const govResult = getNetApCost(mockState, 1, governmentCard);
    const specResult = getNetApCost(mockState, 1, specialCard);
    const initResult = getNetApCost(mockState, 1, initiativeCard);

    expect(govResult.net).toBe(1);
    expect(specResult.net).toBe(1);
    expect(initResult.net).toBe(1);
  });

  test('NO FREE CARDS - wouldBeNetZero always returns false', () => {
    const { wouldBeNetZero } = require('../ap');
    expect(wouldBeNetZero(mockState, 1, governmentCard)).toBe(false);
    expect(wouldBeNetZero(mockState, 1, specialCard)).toBe(false);
    expect(wouldBeNetZero(mockState, 1, initiativeCard)).toBe(false);
  });
});
