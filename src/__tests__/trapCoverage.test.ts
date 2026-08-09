import { applyTrapsOnCardPlayed, registerTrap } from '../utils/traps';
import { GameState, createDefaultEffectFlags } from '../types/game';
import { EffectEvent } from '../types/effects';

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

describe('trap coverage', () => {
  test('cyber attack deactivates platform public card', () => {
    const state = makeState();
    registerTrap(state, 2, 'trap.cyber_attack.deactivate_platform');
    const events: EffectEvent[] = [];
    const card = {
      uid: 10,
      kind: 'spec',
      name: 'Mark Zuckerberg',
      type: 'Öffentlichkeitskarte',
      tag: 'Plattform',
    } as any;
    state.board[1].innen.push(card);

    applyTrapsOnCardPlayed(state, 1, card, (e) => events.push(e), () => {});
    expect(events.some(e => e.type === 'DEACTIVATE_CARD')).toBe(true);
    expect(events.some(e => e.type === 'DESTROY_CARD')).toBe(false);
  });

  test('scandal spiral cancels second public card', () => {
    const state = makeState();
    registerTrap(state, 2, 'trap.scandal_spiral.cancel_one_of_two');
    state.board[1].innen.push({ uid: 1, kind: 'spec', name: 'Elon Musk', type: 'Öffentlichkeitskarte' } as any);
    const second = { uid: 2, kind: 'spec', name: 'Tim Cook', type: 'Öffentlichkeitskarte' } as any;
    state.board[1].innen.push(second);
    const events: EffectEvent[] = [];

    const result = applyTrapsOnCardPlayed(state, 1, second, (e) => events.push(e), () => {});
    expect(result.cancelled).toBe(true);
    expect(events.some(e => e.type === 'CANCEL_CARD')).toBe(true);
  });

  test('whataboutism-related big initiative cancelled by faction strife', () => {
    const state = makeState();
    registerTrap(state, 2, 'trap.internal_faction_strife.cancel_big_initiative');
    const card = {
      uid: 33,
      kind: 'spec',
      name: 'Oppositionsblockade',
      type: 'Sofort-Initiative',
      bp: 4,
    } as any;
    const events: EffectEvent[] = [];
    const result = applyTrapsOnCardPlayed(state, 1, card, (e) => events.push(e), () => {});
    expect(result.cancelled).toBe(true);
    expect(events.some(e => e.type === 'CANCEL_CARD')).toBe(true);
  });

  test('advisor scandal debuffs tier-1 government', () => {
    const state = makeState();
    registerTrap(state, 2, 'trap.advisor_scandal.minus2_gov_tier1');
    const card = {
      uid: 44,
      kind: 'pol',
      name: 'Olaf Scholz',
      T: 1,
      influence: 7,
    } as any;
    const events: EffectEvent[] = [];
    applyTrapsOnCardPlayed(state, 1, card, (e) => events.push(e), () => {});
    const debuff = events.find(e => e.type === 'DEBUFF_CARD') as any;
    expect(debuff).toBeTruthy();
    expect(debuff.amount).toBe(2);
  });
});
