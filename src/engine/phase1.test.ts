import { handleInstantInitiative } from './instant';
import { EK } from '../data/effectKeys';
import { GameState, Card } from '../types/game';

// Mock data helpers
const createMockState = (): GameState => ({
  round: 1,
  current: 1,
  passed: { 1: false, 2: false },
  actionPoints: { 1: 2, 2: 2 },
  actionsUsed: { 1: 0, 2: 0 },
  decks: {
    1: [{ id: 100, key: 'test_card', name: 'Test Card', kind: 'spec', baseId: 100, uid: 100 }],
    2: []
  },
  hands: { 1: [], 2: [] },
  traps: { 1: [], 2: [] },
  board: {
    1: {
      innen: [],
      aussen: [{
        id: 200, key: 'test_pol', name: 'Test Politician', kind: 'pol', baseId: 200, uid: 200,
        influence: 5
      } as any],
      sofort: []
    },
    2: { innen: [], aussen: [], sofort: [] }
  },
  permanentSlots: { 1: { government: null, public: null }, 2: { government: null, public: null } },
  discard: [],
  log: [],
  activeRefresh: { 1: 0, 2: 0 },
  roundsWon: { 1: 0, 2: 0 },
  effectFlags: { 1: {}, 2: {} } as any
});

const createMockCard = (effectKey: string): Card => ({
  id: 1,
  key: 'test_initiative',
  name: 'Test Initiative',
  kind: 'spec',
  baseId: 1,
  uid: 1,
  effectKey
} as any);

describe('Phase 1: Sofort-Initiativen', () => {
  let logs: string[] = [];
  const log = (msg: string) => logs.push(msg);

  beforeEach(() => {
    logs = [];
  });

  describe('Symbolpolitik (DRAW_1)', () => {
    it('should draw 1 card', () => {
      const state = createMockState();
      const card = createMockCard(EK.DRAW_1);

      expect(state.hands[1]).toHaveLength(0);
      expect(state.decks[1]).toHaveLength(1);

      handleInstantInitiative(state, 1, card, log);

      expect(state.hands[1]).toHaveLength(1);
      expect(state.decks[1]).toHaveLength(0);
      expect(logs[0]).toContain('Test Initiative');
      expect(logs[0]).toContain('+1 Karte gezogen');
    });

    it('should handle empty deck gracefully', () => {
      const state = createMockState();
      state.decks[1] = [];
      const card = createMockCard(EK.DRAW_1);

      handleInstantInitiative(state, 1, card, log);

      expect(logs[0]).toContain('Kein Nachziehstapel');
    });
  });

  describe('Verzögerungsverfahren (AP_PLUS_1)', () => {
    it('should add 1 action point', () => {
      const state = createMockState();
      const card = createMockCard(EK.AP_PLUS_1);

      expect(state.actionPoints[1]).toBe(2);

      handleInstantInitiative(state, 1, card, log);

      expect(state.actionPoints[1]).toBe(3);
      expect(logs[0]).toContain('+1 AP');
      expect(logs[0]).toContain('jetzt 3');
    });
  });

  describe('Think-tank (THINK_TANK)', () => {
    it('should draw card and set nextGovPlus2 flag', () => {
      const state = createMockState();
      const card = createMockCard(EK.THINK_TANK);

      handleInstantInitiative(state, 1, card, log);

      expect(state.hands[1]).toHaveLength(1);
      expect(state.effectFlags?.[1]?.nextGovPlus2).toBe(true);
      expect(logs).toHaveLength(2);
      expect(logs[1]).toContain('Nächster Regierungs-Play erhält +2 I');
    });
  });

  describe('Spin Doctor (SPIN_DOCTOR)', () => {
    it('should add +2 influence to strongest government card', () => {
      const state = createMockState();
      const card = createMockCard(EK.SPIN_DOCTOR);
      const govCard = state.board[1].aussen[0] as any;

      expect(govCard.influence).toBe(5);

      handleInstantInitiative(state, 1, card, log);

      expect(govCard.influence).toBe(7);
      expect(logs[0]).toContain('+2 I auf');
      expect(logs[0]).toContain('jetzt 7');
    });

    it('should handle no government cards gracefully', () => {
      const state = createMockState();
      state.board[1].aussen = [];
      const card = createMockCard(EK.SPIN_DOCTOR);

      handleInstantInitiative(state, 1, card, log);

      expect(logs[0]).toContain('Keine Regierungs-Karte im Spiel');
    });
  });

  describe('Unknown effectKey', () => {
    it('should log warning for unknown effectKey', () => {
      const state = createMockState();
      const card = createMockCard('unknown_effect');

      handleInstantInitiative(state, 1, card, log);

      expect(logs[0]).toContain('Unbekannter effectKey: unknown_effect');
    });
  });
});
