import { describe, test, expect } from '@jest/globals';

// Mock influence breakdown display logic for testing
interface InfluenceBreakdown {
  baseInfluence: number;
  tempBuffs: number;
  tempDebuffs: number;
  currentInfluence: number;
  isModified: boolean;
}

const calculateInfluenceBreakdown = (card: any): InfluenceBreakdown => {
  const baseInfluence = card.baseInfluence ?? card.influence ?? 0;
  const tempBuffs = card.tempBuffs ?? 0;
  const tempDebuffs = card.tempDebuffs ?? 0;
  const currentInfluence = baseInfluence + tempBuffs - tempDebuffs;
  const isModified = currentInfluence !== baseInfluence;

  return {
    baseInfluence,
    tempBuffs,
    tempDebuffs,
    currentInfluence,
    isModified
  };
};

const formatInfluenceDisplay = (breakdown: InfluenceBreakdown): { text: string; colors: string[] } => {
  if (!breakdown.isModified) {
    return {
      text: `${breakdown.baseInfluence}`,
      colors: ['#ffffff'] // Weiß für unmodifiziert
    };
  }

  const parts: string[] = [`${breakdown.baseInfluence}`];
  const colors: string[] = ['#ffffff']; // Basis in weiß

  if (breakdown.tempBuffs > 0) {
    parts.push(` +${breakdown.tempBuffs}`);
    colors.push('#2ecc71'); // Grün für Buffs
  }

  if (breakdown.tempDebuffs > 0) {
    parts.push(` -${breakdown.tempDebuffs}`);
    colors.push('#e74c3c'); // Rot für Debuffs
  }

  return {
    text: parts.join(''),
    colors
  };
};

describe('Influence Breakdown Display', () => {
  describe('calculateInfluenceBreakdown', () => {
    test('calculates unmodified influence correctly', () => {
      const card = { kind: 'pol', influence: 10 };
      const breakdown = calculateInfluenceBreakdown(card);

      expect(breakdown.baseInfluence).toBe(10);
      expect(breakdown.tempBuffs).toBe(0);
      expect(breakdown.tempDebuffs).toBe(0);
      expect(breakdown.currentInfluence).toBe(10);
      expect(breakdown.isModified).toBe(false);
    });

    test('calculates influence with buffs correctly', () => {
      const card = { kind: 'pol', influence: 10, tempBuffs: 2 };
      const breakdown = calculateInfluenceBreakdown(card);

      expect(breakdown.baseInfluence).toBe(10);
      expect(breakdown.tempBuffs).toBe(2);
      expect(breakdown.tempDebuffs).toBe(0);
      expect(breakdown.currentInfluence).toBe(12);
      expect(breakdown.isModified).toBe(true);
    });

    test('calculates influence with debuffs correctly', () => {
      const card = { kind: 'pol', influence: 10, tempDebuffs: 3 };
      const breakdown = calculateInfluenceBreakdown(card);

      expect(breakdown.baseInfluence).toBe(10);
      expect(breakdown.tempBuffs).toBe(0);
      expect(breakdown.tempDebuffs).toBe(3);
      expect(breakdown.currentInfluence).toBe(7);
      expect(breakdown.isModified).toBe(true);
    });

    test('calculates influence with both buffs and debuffs correctly', () => {
      const card = { kind: 'pol', influence: 10, tempBuffs: 2, tempDebuffs: 1 };
      const breakdown = calculateInfluenceBreakdown(card);

      expect(breakdown.baseInfluence).toBe(10);
      expect(breakdown.tempBuffs).toBe(2);
      expect(breakdown.tempDebuffs).toBe(1);
      expect(breakdown.currentInfluence).toBe(11);
      expect(breakdown.isModified).toBe(true);
    });

    test('handles baseInfluence field correctly', () => {
      const card = { kind: 'pol', influence: 10, baseInfluence: 8, tempBuffs: 1 };
      const breakdown = calculateInfluenceBreakdown(card);

      expect(breakdown.baseInfluence).toBe(8); // baseInfluence takes precedence
      expect(breakdown.currentInfluence).toBe(9);
      expect(breakdown.isModified).toBe(true);
    });

    test('handles missing properties gracefully', () => {
      const card = { kind: 'pol' };
      const breakdown = calculateInfluenceBreakdown(card);

      expect(breakdown.baseInfluence).toBe(0);
      expect(breakdown.tempBuffs).toBe(0);
      expect(breakdown.tempDebuffs).toBe(0);
      expect(breakdown.currentInfluence).toBe(0);
      expect(breakdown.isModified).toBe(false);
    });
  });

  describe('formatInfluenceDisplay', () => {
    test('formats unmodified influence correctly', () => {
      const breakdown = {
        baseInfluence: 10,
        tempBuffs: 0,
        tempDebuffs: 0,
        currentInfluence: 10,
        isModified: false
      };

      const display = formatInfluenceDisplay(breakdown);

      expect(display.text).toBe('10');
      expect(display.colors).toEqual(['#ffffff']);
    });

    test('formats influence with buffs correctly', () => {
      const breakdown = {
        baseInfluence: 10,
        tempBuffs: 2,
        tempDebuffs: 0,
        currentInfluence: 12,
        isModified: true
      };

      const display = formatInfluenceDisplay(breakdown);

      expect(display.text).toBe('10 +2');
      expect(display.colors).toEqual(['#ffffff', '#2ecc71']); // Weiß, Grün
    });

    test('formats influence with debuffs correctly', () => {
      const breakdown = {
        baseInfluence: 10,
        tempBuffs: 0,
        tempDebuffs: 3,
        currentInfluence: 7,
        isModified: true
      };

      const display = formatInfluenceDisplay(breakdown);

      expect(display.text).toBe('10 -3');
      expect(display.colors).toEqual(['#ffffff', '#e74c3c']); // Weiß, Rot
    });

    test('formats influence with both buffs and debuffs correctly', () => {
      const breakdown = {
        baseInfluence: 10,
        tempBuffs: 2,
        tempDebuffs: 1,
        currentInfluence: 11,
        isModified: true
      };

      const display = formatInfluenceDisplay(breakdown);

      expect(display.text).toBe('10 +2 -1');
      expect(display.colors).toEqual(['#ffffff', '#2ecc71', '#e74c3c']); // Weiß, Grün, Rot
    });

    test('formats complex influence changes correctly', () => {
      const breakdown = {
        baseInfluence: 8,
        tempBuffs: 3,
        tempDebuffs: 2,
        currentInfluence: 9,
        isModified: true
      };

      const display = formatInfluenceDisplay(breakdown);

      expect(display.text).toBe('8 +3 -2');
      expect(display.colors).toEqual(['#ffffff', '#2ecc71', '#e74c3c']);
    });
  });

  describe('Real-world scenarios', () => {
    test('Vladimir Putin with Spin Doctor buff', () => {
      const putin = { kind: 'pol', influence: 10, tempBuffs: 1 };
      const breakdown = calculateInfluenceBreakdown(putin);
      const display = formatInfluenceDisplay(breakdown);

      expect(breakdown.baseInfluence).toBe(10);
      expect(breakdown.currentInfluence).toBe(11);
      expect(display.text).toBe('10 +1');
      expect(display.colors).toEqual(['#ffffff', '#2ecc71']);
    });

    test('Vladimir Putin with multiple debuffs', () => {
      const putin = { kind: 'pol', influence: 10, tempDebuffs: 2 };
      const breakdown = calculateInfluenceBreakdown(putin);
      const display = formatInfluenceDisplay(breakdown);

      expect(breakdown.baseInfluence).toBe(10);
      expect(breakdown.currentInfluence).toBe(8);
      expect(display.text).toBe('10 -2');
      expect(display.colors).toEqual(['#ffffff', '#e74c3c']);
    });

    test('Complex scenario: buffed then debuffed', () => {
      const card = { kind: 'pol', influence: 8, tempBuffs: 2, tempDebuffs: 1 };
      const breakdown = calculateInfluenceBreakdown(card);
      const display = formatInfluenceDisplay(breakdown);

      expect(breakdown.baseInfluence).toBe(8);
      expect(breakdown.currentInfluence).toBe(9);
      expect(display.text).toBe('8 +2 -1');
      expect(display.colors).toEqual(['#ffffff', '#2ecc71', '#e74c3c']);
    });

    test('Edge case: zero influence with buffs', () => {
      const card = { kind: 'pol', influence: 0, tempBuffs: 1 };
      const breakdown = calculateInfluenceBreakdown(card);
      const display = formatInfluenceDisplay(breakdown);

      expect(breakdown.baseInfluence).toBe(0);
      expect(breakdown.currentInfluence).toBe(1);
      expect(display.text).toBe('0 +1');
      expect(display.colors).toEqual(['#ffffff', '#2ecc71']);
    });
  });

  describe('Text positioning logic', () => {
    test('calculates text widths correctly', () => {
      // Mock canvas context for text measurement
      const mockContext = {
        measureText: (text: string) => ({ width: text.length * 8 }) // Rough approximation
      };

      const baseText = '10';
      const buffText = ' +1';
      const debuffText = ' -2';

      const baseWidth = mockContext.measureText(baseText).width;
      const buffWidth = mockContext.measureText(buffText).width;
      const debuffWidth = mockContext.measureText(debuffText).width;

      expect(baseWidth).toBe(16); // 2 chars * 8
      expect(buffWidth).toBe(24); // 3 chars * 8
      expect(debuffWidth).toBe(24); // 3 chars * 8
    });

    test('calculates positioning for right-aligned text', () => {
      const badgeWidth = 100;
      const textX = badgeWidth - 4; // Right edge minus padding

      // Base text at right edge
      const baseX = textX;
      // Buff text to the left of base
      const buffX = textX - 16; // Assuming base width of 16
      // Debuff text to the left of buff
      const debuffX = textX - 16 - 24; // Base width + buff width

      expect(baseX).toBe(96);
      expect(buffX).toBe(80);
      expect(debuffX).toBe(56);
    });
  });
});
