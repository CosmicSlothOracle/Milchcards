// Visual Effects Demo - Zeigt wie visuelle Effekte über die Effect Queue getriggert werden
//
// Dieses Beispiel demonstriert:
// 1. Gelblicher +1 AP Effekt (groß startend, größer werdend, fade out)
// 2. Grüner Einfluss-Buff Effekt
// 3. Karten-Spiel Effekte
//
// Verwendung: Importiere diese Funktion und rufe sie auf, um visuelle Effekte zu testen

import { EffectEvent } from '../types/effects';

export function triggerVisualEffectsDemo() {
  console.log('🎨 Visual Effects Demo gestartet');

  // Simuliere visuelle Effekte über die Effect Queue
  const demoEvents: EffectEvent[] = [
    // 1. Gelblicher +1 AP Effekt (Player 1)
    {
      type: 'VISUAL_AP_GAIN',
      player: 1,
      amount: 1,
      x: 200,
      y: 100,
      color: '#ffd700', // Gelblich
      size: 24
    },

    // 2. Gelblicher +2 AP Effekt (Player 2)
    {
      type: 'VISUAL_AP_GAIN',
      player: 2,
      amount: 2,
      x: 1720,
      y: 100,
      color: '#ffd700',
      size: 28
    },

    // 3. Grüner Einfluss-Buff Effekt
    {
      type: 'VISUAL_INFLUENCE_BUFF',
      player: 1,
      amount: 2,
      x: 400,
      y: 200,
      color: '#4ade80' // Grün
    },

    // 4. Roter Einfluss-Buff Effekt (Debuff)
    {
      type: 'VISUAL_INFLUENCE_BUFF',
      player: 2,
      amount: -1,
      x: 1400,
      y: 200,
      color: '#ef4444' // Rot für Debuff
    },

    // 5. Initiative Karten-Spiel Effekt
    {
      type: 'VISUAL_CARD_PLAY',
      player: 1,
      cardName: 'Symbolpolitik',
      x: 300,
      y: 600,
      effectType: 'initiative'
    },

    // 6. Öffentlichkeitskarte Effekt
    {
      type: 'VISUAL_CARD_PLAY',
      player: 2,
      cardName: 'Bill Gates',
      x: 1500,
      y: 600,
      effectType: 'public'
    }
  ];

  // Trigger visuelle Effekte über VisualEffectsContext
  if (typeof window !== 'undefined' && (window as any).__pc_visual_effects) {
    const visualEffects = (window as any).__pc_visual_effects;

    demoEvents.forEach((event, index) => {
      setTimeout(() => {
        switch (event.type) {
          case 'VISUAL_AP_GAIN':
            visualEffects.spawnVisualEffect({
              type: 'ap_gain',
              x: event.x || 200,
              y: event.y || 100,
              amount: event.amount,
              text: `+${event.amount}`,
              color: event.color || '#ffd700',
              size: event.size || 24,
              duration: 1200
            });
            console.log(`✨ AP Gain Effekt getriggert: +${event.amount} AP`);
            break;

          case 'VISUAL_INFLUENCE_BUFF':
            const influenceText = event.amount > 0 ? `+${event.amount}` : `${event.amount}`;
            visualEffects.spawnVisualEffect({
              type: 'influence_buff',
              x: event.x || 400,
              y: event.y || 200,
              amount: event.amount,
              text: influenceText,
              color: event.color || '#4ade80',
              size: 20,
              duration: 1000
            });
            console.log(`✨ Einfluss-Buff Effekt getriggert: ${influenceText} Einfluss (${event.color || '#4ade80'})`);
            break;

          case 'VISUAL_CARD_PLAY':
            visualEffects.spawnVisualEffect({
              type: 'card_play',
              x: event.x || 300,
              y: event.y || 600,
              text: event.cardName,
              color: event.effectType === 'initiative' ? '#ff6b6b' : '#60a5fa',
              size: 16,
              duration: 800
            });
            console.log(`✨ Karten-Spiel Effekt getriggert: ${event.cardName}`);
            break;
        }
      }, index * 500); // Staggered timing
    });

    console.log('🎨 Alle visuellen Effekte wurden getriggert!');
  } else {
    console.warn('⚠️ VisualEffectsContext nicht verfügbar - stelle sicher, dass die App läuft');
  }
}

// Test der automatischen Integration mit Effect Queue
export function testAutomaticIntegration() {
  console.log('🔄 Teste automatische Integration mit Effect Queue');

  // Simuliere ADD_AP Event (sollte automatisch VISUAL_AP_GAIN triggern)
  const addApEvent: EffectEvent = {
    type: 'ADD_AP',
    player: 1,
    amount: 1
  };

  // Simuliere BUFF_STRONGEST_GOV Event (sollte automatisch VISUAL_INFLUENCE_BUFF triggern)
  const buffEvent: EffectEvent = {
    type: 'BUFF_STRONGEST_GOV',
    player: 1,
    amount: 2
  };

  console.log('📝 ADD_AP Event:', addApEvent);
  console.log('📝 BUFF_STRONGEST_GOV Event:', buffEvent);
  console.log('ℹ️ Diese Events würden automatisch visuelle Effekte triggern, wenn sie über die Queue verarbeitet werden');
}

// Test verschiedener Effekt-Konfigurationen
export function testEffectVariations() {
  console.log('🎭 Teste verschiedene Effekt-Varianten');

  if (typeof window !== 'undefined' && (window as any).__pc_visual_effects) {
    const visualEffects = (window as any).__pc_visual_effects;

    // Test verschiedene Farben für AP Gain
    const colors = ['#ffd700', '#ff6b6b', '#4ade80', '#60a5fa', '#a855f7'];
    colors.forEach((color, index) => {
      setTimeout(() => {
        visualEffects.spawnVisualEffect({
          type: 'ap_gain',
          x: 200 + (index * 100),
          y: 100,
          amount: 1,
          text: '+1',
          color: color,
          size: 24,
          duration: 1200
        });
        console.log(`🎨 AP Gain Effekt mit Farbe: ${color}`);
      }, index * 200);
    });

    // Test verschiedene Größen für Influence Buff
    const sizes = [16, 20, 24, 28, 32];
    sizes.forEach((size, index) => {
      setTimeout(() => {
        visualEffects.spawnVisualEffect({
          type: 'influence_buff',
          x: 400 + (index * 80),
          y: 300,
          amount: 2,
          text: '+2',
          color: '#4ade80',
          size: size,
          duration: 1000
        });
        console.log(`📏 Influence Buff Effekt mit Größe: ${size}px`);
      }, (colors.length * 200) + (index * 200));
    });
  }
}

// Automatischer Test beim Laden (nur in Entwicklung)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Expose demo functions globally for console testing
  (window as any).triggerVisualEffectsDemo = triggerVisualEffectsDemo;
  (window as any).testAutomaticIntegration = testAutomaticIntegration;
  (window as any).testEffectVariations = testEffectVariations;
  console.log('🎨 Visual Effects Demo verfügbar:');
  console.log('  - triggerVisualEffectsDemo() - Vollständige Demo');
  console.log('  - testAutomaticIntegration() - Test automatische Integration');
  console.log('  - testEffectVariations() - Test verschiedene Varianten');
}
