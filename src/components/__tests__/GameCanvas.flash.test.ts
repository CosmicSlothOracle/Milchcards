import { describe, test, expect } from '@jest/globals';

// Mock Flash Animation System for testing
interface FlashAnimation {
  start: number;
  duration: number;
  type: 'buff' | 'debuff';
}

class MockFlashSystem {
  private flashAnimations = new Map<string, FlashAnimation>();

  triggerFlash(uid: string, type: 'buff' | 'debuff', startTime: number = 1000): void {
    this.flashAnimations.set(uid, {
      start: startTime,
      duration: 600,
      type
    });
  }

  updateFlashAnimations(currentTime: number): void {
    this.flashAnimations.forEach((flash, uid) => {
      const elapsed = currentTime - flash.start;
      const progress = Math.min(1, elapsed / flash.duration);

      if (progress >= 1) {
        this.flashAnimations.delete(uid);
      }
    });
  }

  getActiveFlashes(): Array<{ uid: string; flash: FlashAnimation }> {
    return Array.from(this.flashAnimations.entries()).map(([uid, flash]) => ({ uid, flash }));
  }

  isFlashActive(uid: string): boolean {
    return this.flashAnimations.has(uid);
  }

  getFlashProgress(uid: string, currentTime: number): number {
    const flash = this.flashAnimations.get(uid);
    if (!flash) return 0;

    const elapsed = currentTime - flash.start;
    return Math.min(1, elapsed / flash.duration);
  }
}

describe('Flash Animation System', () => {
  let flashSystem: MockFlashSystem;

  beforeEach(() => {
    flashSystem = new MockFlashSystem();
  });

  describe('Flash Animation Triggering', () => {
    test('triggers buff flash animation correctly', () => {
      flashSystem.triggerFlash('card123', 'buff', 1000);

      expect(flashSystem.isFlashActive('card123')).toBe(true);
      const flashes = flashSystem.getActiveFlashes();
      expect(flashes).toHaveLength(1);
      expect(flashes[0].flash.type).toBe('buff');
      expect(flashes[0].flash.duration).toBe(600);
    });

    test('triggers debuff flash animation correctly', () => {
      flashSystem.triggerFlash('card456', 'debuff', 1000);

      expect(flashSystem.isFlashActive('card456')).toBe(true);
      const flashes = flashSystem.getActiveFlashes();
      expect(flashes).toHaveLength(1);
      expect(flashes[0].flash.type).toBe('debuff');
    });

    test('supports multiple simultaneous flash animations', () => {
      flashSystem.triggerFlash('card1', 'buff', 1000);
      flashSystem.triggerFlash('card2', 'debuff', 1000);

      const flashes = flashSystem.getActiveFlashes();
      expect(flashes).toHaveLength(2);
      expect(flashes.some(f => f.uid === 'card1' && f.flash.type === 'buff')).toBe(true);
      expect(flashes.some(f => f.uid === 'card2' && f.flash.type === 'debuff')).toBe(true);
    });
  });

  describe('Flash Animation Progress', () => {
    test('calculates progress correctly at start', () => {
      flashSystem.triggerFlash('card123', 'buff', 1000);

      const progress = flashSystem.getFlashProgress('card123', 1000);
      expect(progress).toBe(0);
    });

    test('calculates progress correctly at half duration', () => {
      flashSystem.triggerFlash('card123', 'buff', 1000);

      const progress = flashSystem.getFlashProgress('card123', 1300); // 300ms elapsed
      expect(progress).toBe(0.5);
    });

    test('calculates progress correctly at end', () => {
      flashSystem.triggerFlash('card123', 'buff', 1000);

      const progress = flashSystem.getFlashProgress('card123', 1600); // 600ms elapsed
      expect(progress).toBe(1);
    });

    test('caps progress at 1.0', () => {
      flashSystem.triggerFlash('card123', 'buff', 1000);

      const progress = flashSystem.getFlashProgress('card123', 2000); // 1000ms elapsed
      expect(progress).toBe(1);
    });
  });

  describe('Flash Animation Cleanup', () => {
    test('removes completed flash animations', () => {
      flashSystem.triggerFlash('card123', 'buff', 1000);

      // Animation should be active initially
      expect(flashSystem.isFlashActive('card123')).toBe(true);

      // Update to past the duration
      flashSystem.updateFlashAnimations(1700); // 700ms elapsed

      // Animation should be removed
      expect(flashSystem.isFlashActive('card123')).toBe(false);
      expect(flashSystem.getActiveFlashes()).toHaveLength(0);
    });

    test('keeps active flash animations', () => {
      flashSystem.triggerFlash('card123', 'buff', 1000);

      // Update to before the duration ends
      flashSystem.updateFlashAnimations(1300); // 300ms elapsed

      // Animation should still be active
      expect(flashSystem.isFlashActive('card123')).toBe(true);
      expect(flashSystem.getActiveFlashes()).toHaveLength(1);
    });
  });

  describe('Flash Animation Alpha Calculation', () => {
    test('calculates alpha using sine wave correctly', () => {
      const calculateFlashAlpha = (progress: number): number => {
        return Math.sin(progress * Math.PI) * 0.3;
      };

      // At start (progress = 0)
      expect(calculateFlashAlpha(0)).toBeCloseTo(0, 5);

      // At quarter (progress = 0.25)
      expect(calculateFlashAlpha(0.25)).toBeCloseTo(0.212, 3);

      // At half (progress = 0.5) - maximum
      expect(calculateFlashAlpha(0.5)).toBeCloseTo(0.3, 5);

      // At three quarters (progress = 0.75)
      expect(calculateFlashAlpha(0.75)).toBeCloseTo(0.212, 3);

      // At end (progress = 1.0)
      expect(calculateFlashAlpha(1.0)).toBeCloseTo(0, 5);
    });
  });

  describe('Flash Animation Color Logic', () => {
    test('determines buff color correctly', () => {
      const getFlashColor = (type: 'buff' | 'debuff'): string => {
        return type === 'buff' ? '#2ecc71' : '#e74c3c';
      };

      expect(getFlashColor('buff')).toBe('#2ecc71'); // Green
    });

    test('determines debuff color correctly', () => {
      const getFlashColor = (type: 'buff' | 'debuff'): string => {
        return type === 'buff' ? '#2ecc71' : '#e74c3c';
      };

      expect(getFlashColor('debuff')).toBe('#e74c3c'); // Red
    });
  });

  describe('Flash Animation Integration', () => {
    test('handles influence change detection correctly', () => {
      const detectInfluenceChange = (prev: number, curr: number, uid: string, startTime: number) => {
        if (curr > prev) {
          // Buff flash
          flashSystem.triggerFlash(uid, 'buff', startTime);
          return { type: 'buff', delta: curr - prev };
        } else if (curr < prev) {
          // Debuff flash
          flashSystem.triggerFlash(uid, 'debuff', startTime);
          return { type: 'debuff', delta: prev - curr };
        }
        return null;
      };

      // Test buff scenario
      const buffResult = detectInfluenceChange(10, 12, 'card123', 1000);
      expect(buffResult).toEqual({ type: 'buff', delta: 2 });
      expect(flashSystem.isFlashActive('card123')).toBe(true);

      // Test debuff scenario
      const debuffResult = detectInfluenceChange(12, 10, 'card456', 1000);
      expect(debuffResult).toEqual({ type: 'debuff', delta: 2 });
      expect(flashSystem.isFlashActive('card456')).toBe(true);

      // Test no change scenario
      const noChangeResult = detectInfluenceChange(10, 10, 'card789', 1000);
      expect(noChangeResult).toBeNull();
      expect(flashSystem.isFlashActive('card789')).toBe(false);
    });
  });
});
