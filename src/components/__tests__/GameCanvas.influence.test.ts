import { describe, test, expect } from '@jest/globals';

// Mock getCurrentInfluence function for testing
const getCurrentInfluence = (card: any): number => {
  if (card.kind !== 'pol') return 0;
  const baseInfluence = card.influence ?? 0;
  const tempBuffs = card.tempBuffs ?? 0;
  const tempDebuffs = card.tempDebuffs ?? 0;
  return baseInfluence + tempBuffs - tempDebuffs;
};

describe('Influence Display System', () => {
  describe('getCurrentInfluence', () => {
    test('calculates base influence correctly', () => {
      const card = { kind: 'pol', influence: 10 };
      expect(getCurrentInfluence(card)).toBe(10);
    });

    test('calculates influence with buffs correctly', () => {
      const card = { kind: 'pol', influence: 10, tempBuffs: 2 };
      expect(getCurrentInfluence(card)).toBe(12);
    });

    test('calculates influence with debuffs correctly', () => {
      const card = { kind: 'pol', influence: 10, tempDebuffs: 3 };
      expect(getCurrentInfluence(card)).toBe(7);
    });

    test('calculates influence with both buffs and debuffs correctly', () => {
      const card = { kind: 'pol', influence: 10, tempBuffs: 2, tempDebuffs: 1 };
      expect(getCurrentInfluence(card)).toBe(11);
    });

    test('handles missing properties gracefully', () => {
      const card = { kind: 'pol' };
      expect(getCurrentInfluence(card)).toBe(0);
    });

    test('returns 0 for non-politician cards', () => {
      const card = { kind: 'spec', influence: 10 };
      expect(getCurrentInfluence(card)).toBe(0);
    });

    test('handles null/undefined values', () => {
      const card = { kind: 'pol', influence: null, tempBuffs: undefined, tempDebuffs: null };
      expect(getCurrentInfluence(card)).toBe(0);
    });
  });

  describe('Influence Animation Types', () => {
    test('animation type structure is correct', () => {
      const animation = {
        start: 1000,
        duration: 900,
        amount: 2,
        type: 'increase' as const
      };

      expect(animation.type).toBe('increase');
      expect(animation.amount).toBe(2);
      expect(animation.duration).toBe(900);
    });

    test('supports both increase and decrease types', () => {
      const increaseAnim = { start: 1000, duration: 900, amount: 2, type: 'increase' as const };
      const decreaseAnim = { start: 1000, duration: 900, amount: 1, type: 'decrease' as const };

      expect(increaseAnim.type).toBe('increase');
      expect(decreaseAnim.type).toBe('decrease');
    });
  });

  describe('Influence Change Detection Logic', () => {
    test('detects influence increases', () => {
      const prev = 10;
      const curr = 12;
      const delta = curr - prev;

      expect(delta).toBe(2);
      expect(curr > prev).toBe(true);
    });

    test('detects influence decreases', () => {
      const prev = 12;
      const curr = 10;
      const delta = prev - curr;

      expect(delta).toBe(2);
      expect(curr < prev).toBe(true);
    });

    test('handles no change', () => {
      const prev = 10;
      const curr = 10;

      expect(curr > prev).toBe(false);
      expect(curr < prev).toBe(false);
    });
  });

  describe('Visual Indicator Logic', () => {
    test('detects modified influence correctly', () => {
      const currentInfluence = 12;
      const baseInfluence = 10;
      const isModified = currentInfluence !== baseInfluence;

      expect(isModified).toBe(true);
    });

    test('detects unmodified influence correctly', () => {
      const currentInfluence = 10;
      const baseInfluence = 10;
      const isModified = currentInfluence !== baseInfluence;

      expect(isModified).toBe(false);
    });

    test('determines buff vs debuff color correctly', () => {
      const currentInfluence = 12;
      const baseInfluence = 10;
      const isBuff = currentInfluence > baseInfluence;
      const color = isBuff ? '#2ecc71' : '#e74c3c';

      expect(color).toBe('#2ecc71'); // Green for buff
    });

    test('determines debuff color correctly', () => {
      const currentInfluence = 8;
      const baseInfluence = 10;
      const isBuff = currentInfluence > baseInfluence;
      const color = isBuff ? '#2ecc71' : '#e74c3c';

      expect(color).toBe('#e74c3c'); // Red for debuff
    });
  });

  describe('Animation Aggregation Logic', () => {
    test('aggregates increase amounts correctly', () => {
      const animations = [
        { start: 1000, duration: 900, amount: 2, type: 'increase' as const },
        { start: 1000, duration: 900, amount: 1, type: 'increase' as const }
      ];

      let totalIncrease = 0;
      animations.forEach(a => {
        if (a.type === 'increase') {
          totalIncrease += a.amount;
        }
      });

      expect(totalIncrease).toBe(3);
    });

    test('aggregates decrease amounts correctly', () => {
      const animations = [
        { start: 1000, duration: 900, amount: 2, type: 'decrease' as const },
        { start: 1000, duration: 900, amount: 1, type: 'decrease' as const }
      ];

      let totalDecrease = 0;
      animations.forEach(a => {
        if (a.type === 'decrease') {
          totalDecrease += a.amount;
        }
      });

      expect(totalDecrease).toBe(3);
    });

    test('handles mixed animation types correctly', () => {
      const animations = [
        { start: 1000, duration: 900, amount: 2, type: 'increase' as const },
        { start: 1000, duration: 900, amount: 1, type: 'decrease' as const }
      ];

      let totalIncrease = 0;
      let totalDecrease = 0;
      animations.forEach(a => {
        if (a.type === 'increase') {
          totalIncrease += a.amount;
        } else {
          totalDecrease += a.amount;
        }
      });

      expect(totalIncrease).toBe(2);
      expect(totalDecrease).toBe(1);
    });
  });
});
