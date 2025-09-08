// Visual Effects Integration
// Bindet das visuelle Effekte System in die App ein

import { triggerVisualEffectsDemo, testAutomaticIntegration, testEffectVariations } from '../examples/visualEffectsDemo';

// Integration mit der App
export function initializeVisualEffects() {
  console.log('🎨 Initialisiere Visual Effects System');

  // Expose demo functions globally for development
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    (window as any).triggerVisualEffectsDemo = triggerVisualEffectsDemo;
    (window as any).testAutomaticIntegration = testAutomaticIntegration;
    (window as any).testEffectVariations = testEffectVariations;

    console.log('🎨 Visual Effects Demo verfügbar:');
    console.log('  - triggerVisualEffectsDemo() - Vollständige Demo');
    console.log('  - testAutomaticIntegration() - Test automatische Integration');
    console.log('  - testEffectVariations() - Test verschiedene Varianten');
  }

  // Setup event listeners for visual effects
  setupVisualEffectsListeners();
}

// Setup event listeners für visuelle Effekte
function setupVisualEffectsListeners() {
  if (typeof window === 'undefined') return;

  // Listen for custom events that might trigger visual effects
  window.addEventListener('pc:visual_effect_trigger', (event: any) => {
    const { type, data } = event.detail;
    console.log('🎨 Custom visual effect triggered:', type, data);

    // Handle custom visual effect events
    if (typeof window !== 'undefined' && (window as any).__pc_visual_effects) {
      const visualEffects = (window as any).__pc_visual_effects;

      switch (type) {
        case 'ap_gain':
          visualEffects.spawnVisualEffect({
            type: 'ap_gain',
            x: data.x || 200,
            y: data.y || 100,
            amount: data.amount || 1,
            text: `+${data.amount || 1}`,
            color: data.color || '#ffd700',
            size: data.size || 24,
            duration: data.duration || 1200
          });
          break;

        case 'influence_buff':
          visualEffects.spawnVisualEffect({
            type: 'influence_buff',
            x: data.x || 400,
            y: data.y || 200,
            amount: data.amount || 1,
            text: data.amount > 0 ? `+${data.amount}` : `${data.amount}`,
            color: data.color || '#4ade80',
            size: data.size || 20,
            duration: data.duration || 1000
          });
          break;

        case 'card_play':
          visualEffects.spawnVisualEffect({
            type: 'card_play',
            x: data.x || 300,
            y: data.y || 600,
            text: data.cardName || 'Card',
            color: data.effectType === 'initiative' ? '#ff6b6b' : '#60a5fa',
            size: data.size || 16,
            duration: data.duration || 800
          });
          break;
      }
    }
  });

  // Listen for reduced motion preferences
  if (window.matchMedia) {
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      if (typeof window !== 'undefined') {
        (window as any).__pc_reduced_motion = e.matches;
        console.log('🎨 Reduced motion preference changed:', e.matches);
      }
    };

    reducedMotionQuery.addEventListener('change', handleReducedMotionChange);

    // Set initial value
    (window as any).__pc_reduced_motion = reducedMotionQuery.matches;
  }
}

// Utility functions for triggering visual effects
export const VisualEffectsUtils = {
  // Trigger AP gain effect
  triggerApGain: (player: number, amount: number, options?: { x?: number; y?: number; color?: string; size?: number }) => {
    if (typeof window !== 'undefined' && (window as any).__pc_visual_effects) {
      const visualEffects = (window as any).__pc_visual_effects;
      visualEffects.spawnVisualEffect({
        type: 'ap_gain',
        x: options?.x || (player === 1 ? 200 : 1720),
        y: options?.y || 100,
        amount: amount,
        text: `+${amount}`,
        color: options?.color || '#ffd700',
        size: options?.size || 24,
        duration: 1200
      });
    }
  },

  // Trigger influence buff effect
  triggerInfluenceBuff: (player: number, amount: number, options?: { x?: number; y?: number; color?: string; size?: number }) => {
    if (typeof window !== 'undefined' && (window as any).__pc_visual_effects) {
      const visualEffects = (window as any).__pc_visual_effects;
      visualEffects.spawnVisualEffect({
        type: 'influence_buff',
        x: options?.x || (player === 1 ? 400 : 1400),
        y: options?.y || 200,
        amount: amount,
        text: amount > 0 ? `+${amount}` : `${amount}`,
        color: options?.color || (amount > 0 ? '#4ade80' : '#ef4444'),
        size: options?.size || 20,
        duration: 1000
      });
    }
  },

  // Trigger card play effect
  triggerCardPlay: (player: number, cardName: string, effectType?: string, options?: { x?: number; y?: number; size?: number }) => {
    if (typeof window !== 'undefined' && (window as any).__pc_visual_effects) {
      const visualEffects = (window as any).__pc_visual_effects;
      visualEffects.spawnVisualEffect({
        type: 'card_play',
        x: options?.x || (player === 1 ? 300 : 1500),
        y: options?.y || 600,
        text: cardName,
        color: effectType === 'initiative' ? '#ff6b6b' : '#60a5fa',
        size: options?.size || 16,
        duration: 800
      });
    }
  },

  // Trigger custom visual effect
  triggerCustomEffect: (type: 'ap_gain' | 'influence_buff' | 'card_play', data: any) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pc:visual_effect_trigger', {
        detail: { type, data }
      }));
    }
  }
};

// Auto-initialize if in browser environment
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeVisualEffects);
  } else {
    initializeVisualEffects();
  }
}
