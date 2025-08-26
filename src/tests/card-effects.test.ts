import { GameState, Player, Card } from '../types/game';
import { triggerCardEffect } from '../effects/registry';
import { CARDS } from '../data/cards';

// Helper function to create Card objects from CardDef
function createCard(cardDef: any, uid: number): Card {
  return {
    id: uid,
    key: cardDef.id,
    name: cardDef.name,
    kind: 'spec',
    baseId: uid,
    uid: uid,
    effectKey: cardDef.effectKey
  };
}

describe('Card Effects Registry', () => {
  let mockState: GameState;
  let mockPlayer: Player;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    mockState = {
      _effectQueue: [],
      players: {
        1: { id: 1, ap: 2, hand: [], deck: [], influence: 0 },
        2: { id: 2, ap: 2, hand: [], deck: [], influence: 0 }
      },
      government: [],
      public: [],
      initiatives: [],
      interventions: [],
      round: 1,
      current: 1,
      passed: false,
      actionPoints: 2,
      actionsUsed: 0,
      decks: { 1: [], 2: [] },
      hands: { 1: [], 2: [] },
      traps: { 1: [], 2: [] },
      board: {
        1: { innen: [], aussen: [], sofort: [] },
        2: { innen: [], aussen: [], sofort: [] }
      },
      permanentSlots: {
        1: { government: null, public: null },
        2: { government: null, public: null }
      },
      effectFlags: {
        initiativeDiscount: 0,
        initiativeRefund: 0,
        govRefundAvailable: false,
        initiativeInfluenceBonus: 0,
        initiativeInfluencePenaltyForOpponent: 0,
        initiativeOnPlayDraw1Ap1: false
      }
    } as unknown as GameState;
    mockPlayer = 1;
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Public Figures', () => {
    test('Elon Musk should draw 1 card and add 1 AP', () => {
      const cardDef = CARDS.find(c => c.id === 'public.elon_musk')!;
      const card = createCard(cardDef, 1);

      triggerCardEffect(mockState, mockPlayer, card);

      expect(mockState._effectQueue).toHaveLength(3);
      expect(mockState._effectQueue![0]).toEqual({ type: 'DRAW_CARDS', player: 1, amount: 1 });
      expect(mockState._effectQueue![1]).toEqual({ type: 'ADD_AP', player: 1, amount: 1 });
      expect(mockState._effectQueue![2]).toEqual({ type: 'LOG', msg: 'Elon Musk: +1 card, +1 AP.' });
      expect(consoleSpy).toHaveBeenCalledWith('[Effect] 🟢 elon.draw_ap');
    });

    test('Mark Zuckerberg should trigger SoT flag', () => {
      const cardDef = CARDS.find(c => c.id === 'public.mark_zuckerberg')!;
      const card = createCard(cardDef, 2);

      triggerCardEffect(mockState, mockPlayer, card);

      expect(mockState._effectQueue).toHaveLength(0); // No immediate events
      expect(consoleSpy).toHaveBeenCalledWith('[Effect] 🟢 zuck.once_ap_on_activation (SoT flag applied)');
    });

    test('Jennifer Doudna should activate science aura via SoT', () => {
      const cardDef = CARDS.find(c => c.id === 'public.jennifer_doudna')!;
      const card = createCard(cardDef, 3);

      triggerCardEffect(mockState, mockPlayer, card);

      expect(mockState._effectQueue).toHaveLength(0); // No immediate events
      expect(consoleSpy).toHaveBeenCalledWith('[Effect] 🟢 doudna.aura_science (SoT aura)');
    });

    test('Ai Weiwei should trigger SoT hook', () => {
      const cardDef = CARDS.find(c => c.id === 'public.ai_weiwei')!;
      const card = createCard(cardDef, 4);

      triggerCardEffect(mockState, mockPlayer, card);

      expect(mockState._effectQueue).toHaveLength(0); // No immediate events
      expect(consoleSpy).toHaveBeenCalledWith('[Effect] 🟢 aiweiwei.on_activate_draw_ap (SoT hook)');
    });
  });

  describe('Initiatives', () => {
    test('Shadow Lobbying should buff strongest government by 2 and trigger INITIATIVE_ACTIVATED', () => {
      const cardDef = CARDS.find(c => c.id === 'init.shadow_lobbying')!;
      const card = createCard(cardDef, 5);

      triggerCardEffect(mockState, mockPlayer, card);

      expect(mockState._effectQueue).toHaveLength(3);
      expect(mockState._effectQueue![0]).toEqual({ type: 'BUFF_STRONGEST_GOV', player: 1, amount: 2 });
      expect(mockState._effectQueue![1]).toEqual({ type: 'INITIATIVE_ACTIVATED', player: 1 });
      expect(mockState._effectQueue![2]).toEqual({ type: 'LOG', msg: 'Shadow Lobbying: strongest Government +2.' });
      expect(consoleSpy).toHaveBeenCalledWith('[Effect] 🟢 init.shadow_lobbying.buff2');
    });

    test('Digitaler Wahlkampf should draw 2 cards and trigger INITIATIVE_ACTIVATED', () => {
      const cardDef = CARDS.find(c => c.id === 'init.digitaler_wahlkampf')!;
      const card = createCard(cardDef, 6);

      triggerCardEffect(mockState, mockPlayer, card);

      expect(mockState._effectQueue).toHaveLength(3);
      expect(mockState._effectQueue![0]).toEqual({ type: 'DRAW_CARDS', player: 1, amount: 2 });
      expect(mockState._effectQueue![1]).toEqual({ type: 'INITIATIVE_ACTIVATED', player: 1 });
      expect(mockState._effectQueue![2]).toEqual({ type: 'LOG', msg: 'Digitaler Wahlkampf: draw 2.' });
      expect(consoleSpy).toHaveBeenCalledWith('[Effect] 🟢 init.digital_campaign.draw2');
    });

    test('Surprise Funding should add 2 AP and trigger INITIATIVE_ACTIVATED', () => {
      const cardDef = CARDS.find(c => c.id === 'init.surprise_funding')!;
      const card = createCard(cardDef, 7);

      triggerCardEffect(mockState, mockPlayer, card);

      expect(mockState._effectQueue).toHaveLength(3);
      expect(mockState._effectQueue![0]).toEqual({ type: 'ADD_AP', player: 1, amount: 2 });
      expect(mockState._effectQueue![1]).toEqual({ type: 'INITIATIVE_ACTIVATED', player: 1 });
      expect(mockState._effectQueue![2]).toEqual({ type: 'LOG', msg: 'Surprise Funding: +2 AP now.' });
      expect(consoleSpy).toHaveBeenCalledWith('[Effect] 🟢 init.surprise_funding.ap2');
    });
  });

  describe('Traps', () => {
    test('Fake News Campaign should register trap', () => {
      const cardDef = CARDS.find(c => c.id === 'trap.fake_news')!;
      const card = createCard(cardDef, 8);

      triggerCardEffect(mockState, mockPlayer, card);

      expect(mockState._effectQueue).toHaveLength(2);
      expect(mockState._effectQueue![0]).toEqual({ type: 'REGISTER_TRAP', player: 1, key: 'trap.fake_news.deactivate_media' });
      expect(mockState._effectQueue![1]).toEqual({ type: 'LOG', msg: 'Trap set: Fake News (deactivate Media/Platform).' });
      expect(consoleSpy).toHaveBeenCalledWith('[Effect] 🟢 trap.fake_news.deactivate_media');
    });
  });

  describe('Legacy Compatibility', () => {
    test('Legacy cards should still work with old format', () => {
      const legacyCard: Card = {
        id: 9,
        key: 'legacy.elon',
        name: 'Elon Musk',
        kind: 'spec',
        baseId: 9,
        uid: 9,
        effectKey: undefined // No effectKey, should fall back to legacy
      };

      triggerCardEffect(mockState, mockPlayer, legacyCard);

      expect(mockState._effectQueue).toHaveLength(3);
      expect(mockState._effectQueue![0]).toEqual({ type: 'DRAW_CARDS', player: 1, amount: 1 });
      expect(mockState._effectQueue![1]).toEqual({ type: 'ADD_AP', player: 1, amount: 1 });
      expect(mockState._effectQueue![2]).toEqual({ type: 'LOG', msg: 'Elon Musk: +1 card, +1 AP.' });
      expect(consoleSpy).toHaveBeenCalledWith('[Effect] 🟢 elon.draw_ap');
    });

    test('Legacy cards with new effectKeys should use new handlers', () => {
      const legacyCard: Card = {
        id: 10,
        key: 'legacy.mark',
        name: 'Mark Zuckerberg',
        kind: 'spec',
        baseId: 10,
        uid: 10,
        effectKey: undefined // No effectKey, should fall back to legacy
      };

      triggerCardEffect(mockState, mockPlayer, legacyCard);

      expect(mockState._effectQueue).toHaveLength(0); // No immediate events for SoT effects
      expect(consoleSpy).toHaveBeenCalledWith('[Effect] 🟢 zuck.once_ap_on_activation (SoT flag applied)');
    });

    test('Legacy cards without new effectKeys should use legacy handlers', () => {
      const legacyCard: Card = {
        id: 11,
        key: 'legacy.bill',
        name: 'Bill Gates',
        kind: 'spec',
        baseId: 11,
        uid: 11,
        effectKey: undefined // No effectKey, should fall back to legacy
      };

      triggerCardEffect(mockState, mockPlayer, legacyCard);

      expect(mockState._effectQueue).toHaveLength(3);
      expect(mockState._effectQueue![0]).toEqual({ type: 'DRAW_CARDS', player: 1, amount: 1 });
      expect(mockState._effectQueue![1]).toEqual({ type: 'ADD_AP', player: 1, amount: 1 });
      expect(mockState._effectQueue![2]).toEqual({ type: 'LOG', msg: 'Bill Gates: +1 Karte, +1 AP' });
      expect(consoleSpy).toHaveBeenCalledWith('[Effect] 🟢 legacy.bill_gates');
    });
  });

  describe('Edge Cases', () => {
    test('Card without effectKey should log warning', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const card: Card = {
        id: 12,
        key: 'no.effect',
        name: 'No Effect Card',
        kind: 'spec',
        baseId: 12,
        uid: 12,
        effectKey: undefined
      };

      triggerCardEffect(mockState, mockPlayer, card);

      expect(warnSpy).toHaveBeenCalledWith('No effect implementation found for card: No Effect Card (effectKey: undefined)');
      expect(mockState._effectQueue).toHaveLength(0);

      warnSpy.mockRestore();
    });

    test('Card with invalid effectKey should log warning', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const card: Card = {
        id: 13,
        key: 'invalid.effect',
        name: 'Invalid Effect Card',
        kind: 'spec',
        baseId: 13,
        uid: 13,
        effectKey: 'invalid.key'
      };

      triggerCardEffect(mockState, mockPlayer, card);

      expect(warnSpy).toHaveBeenCalledWith('No effect implementation found for card: Invalid Effect Card (effectKey: invalid.key)');
      expect(mockState._effectQueue).toHaveLength(0);

      warnSpy.mockRestore();
    });
  });
});
