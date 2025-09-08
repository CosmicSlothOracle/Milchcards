# Visuelle Effekte System - Effect Queue Integration

## Übersicht

Das visuelle Effekte System ermöglicht es, visuelle Animationen direkt über die Effect Queue zu triggern. Dies sorgt für eine saubere Trennung zwischen Spiel-Logik und visueller Darstellung.

## Architektur

### 1. Effect Event Types (`src/types/effects.ts`)

```typescript
// Neue visuelle Effekt Events
| { type: 'VISUAL_AP_GAIN'; player: Player; amount: number; x?: number; y?: number; color?: string; size?: number }
| { type: 'VISUAL_INFLUENCE_BUFF'; player: Player; amount: number; targetUid?: number; x?: number; y?: number }
| { type: 'VISUAL_CARD_PLAY'; player: Player; cardName: string; x?: number; y?: number; effectType?: string }
```

### 2. Visual Effects Context (`src/context/VisualEffectsContext.tsx`)

Erweitert um:

- `visualEffectsRef`: Array von aktiven visuellen Effekten
- `spawnVisualEffect()`: Funktion zum Erstellen neuer visueller Effekte

### 3. Queue Resolver (`src/utils/queue.ts`)

Verarbeitet visuelle Effekt Events:

- `VISUAL_AP_GAIN`: Triggert gelblichen +1 AP Effekt
- `VISUAL_INFLUENCE_BUFF`: Triggert grünen Einfluss-Buff Effekt
- `VISUAL_CARD_PLAY`: Triggert Karten-Spiel Effekt

### 4. Game Canvas (`src/components/GameCanvas.tsx`)

Rendert visuelle Effekte:

- **AP Gain**: Gelblich, groß startend (90% Opacity), größer werdend, fade out
- **Influence Buff**: Grün, mittlere Größe, nach oben bewegend
- **Card Play**: Blau/Rot je nach Typ, kleinere Größe

## Verwendung

### Automatische Integration

Visuelle Effekte werden automatisch getriggert bei:

```typescript
// ADD_AP Events triggern automatisch VISUAL_AP_GAIN
enqueue({ type: 'ADD_AP', player: 1, amount: 1 });

// BUFF_STRONGEST_GOV Events triggern automatisch VISUAL_INFLUENCE_BUFF
enqueue({ type: 'BUFF_STRONGEST_GOV', player: 1, amount: 2 });
```

### Manuelle Triggerung

```typescript
// Direkte visuelle Effekte
enqueue({
  type: 'VISUAL_AP_GAIN',
  player: 1,
  amount: 1,
  x: 200,
  y: 100,
  color: '#ffd700',
  size: 24
});
```

### Karten-Effekte

```typescript
// In registry.ts
'init.symbolic_politics.visual_demo': ({ enqueue, player, log }) => {
  enqueue({ type: 'DRAW_CARDS', player, amount: 1 });
  enqueue({ type: 'ADD_AP', player, amount: 1 }); // Triggert automatisch visuellen Effekt
  enqueue({ type: 'LOG', msg: 'Symbolpolitik: +1 AP mit Animation.' });
  log('🟢 init.symbolic_politics.visual_demo');
}
```

## Effekt-Typen

### 1. AP Gain Effekt

- **Farbe**: Gelblich (#ffd700)
- **Animation**: Startet groß (90% Opacity), wird größer, bewegt sich nach oben, fade out
- **Dauer**: 1200ms
- **Trigger**: Automatisch bei `ADD_AP` Events

### 2. Influence Buff Effekt

- **Farbe**: Grün (#4ade80)
- **Animation**: Mittlere Größe, bewegt sich nach oben, fade out
- **Dauer**: 1000ms
- **Trigger**: Automatisch bei `BUFF_STRONGEST_GOV` Events

### 3. Card Play Effekt

- **Farbe**: Blau (#60a5fa) oder Rot (#ff6b6b) je nach Typ
- **Animation**: Kleine Größe, bewegt sich nach oben, fade out
- **Dauer**: 800ms
- **Trigger**: Manuell bei `VISUAL_CARD_PLAY` Events

## Positionierung

### Automatische Positionierung

- **AP Gain**: Spieler-spezifische AP-Bereiche (Links/Rechts)
- **Influence Buff**: Basierend auf Karten-Position oder Spieler-Zentrum
- **Card Play**: Hand-Bereich des Spielers

### Manuelle Positionierung

```typescript
enqueue({
  type: 'VISUAL_AP_GAIN',
  player: 1,
  amount: 1,
  x: 200,  // Spezifische X-Koordinate
  y: 100   // Spezifische Y-Koordinate
});
```

## Testing

### Demo-Funktionen

```typescript
// In der Browser-Konsole
triggerVisualEffectsDemo();        // Vollständige Demo aller Effekte
testAutomaticIntegration();        // Test automatische Integration
testEffectVariations();            // Test verschiedene Varianten
```

### Manuelle Tests

```typescript
// Über VisualEffectsContext
window.__pc_visual_effects.spawnVisualEffect({
  type: 'ap_gain',
  x: 200,
  y: 100,
  amount: 1,
  text: '+1',
  color: '#ffd700',
  size: 24,
  duration: 1200
});

// Über Utility-Funktionen
VisualEffectsUtils.triggerApGain(1, 1, { color: '#ff6b6b' });
VisualEffectsUtils.triggerInfluenceBuff(1, 2, { color: '#a855f7' });
VisualEffectsUtils.triggerCardPlay(1, 'Symbolpolitik', 'initiative');
```

### Unit Tests

```typescript
// Tests in src/__tests__/visualEffects.test.ts
npm test visualEffects.test.ts
```

## Erweiterung

### Neue Effekt-Typen hinzufügen

1. **EffectEvent Type erweitern** (`src/types/effects.ts`)
2. **VisualEffectsContext erweitern** (`src/context/VisualEffectsContext.tsx`)
3. **Queue Resolver erweitern** (`src/utils/queue.ts`)
4. **Canvas Rendering erweitern** (`src/components/GameCanvas.tsx`)

### Beispiel: Neuer "Damage" Effekt

```typescript
// 1. Type hinzufügen
| { type: 'VISUAL_DAMAGE'; targetUid: number; amount: number; x?: number; y?: number }

// 2. Context erweitern
type VisualEffect = { ... } | { type: 'damage'; ... }

// 3. Resolver hinzufügen
case 'VISUAL_DAMAGE': { ... }

// 4. Canvas Rendering hinzufügen
case 'damage': { ... }
```

## Best Practices

1. **Konsistente Farben**: Verwende die definierten Farben für verschiedene Effekt-Typen
2. **Angemessene Dauer**: 800-1200ms für die meisten Effekte
3. **Positionierung**: Nutze automatische Positionierung wo möglich
4. **Performance**: Effekte werden automatisch nach Ablauf entfernt
5. **Accessibility**: Respektiert `reducedMotion` Einstellungen

## Integration mit bestehenden Systemen

Das System integriert sich nahtlos mit:

- **Effect Queue**: Alle visuellen Effekte laufen über die Queue
- **Registry System**: Karten-Effekte können visuelle Effekte triggern
- **Visual Effects Context**: Bestehende Partikel- und Ripple-Systeme
- **Game Canvas**: Rendering erfolgt im bestehenden Canvas-System

## Utility-Funktionen

### VisualEffectsUtils

```typescript
import { VisualEffectsUtils } from '../integration/visualEffectsIntegration';

// AP Gain Effekt
VisualEffectsUtils.triggerApGain(1, 1, {
  color: '#ff6b6b',
  size: 28
});

// Einfluss-Buff Effekt
VisualEffectsUtils.triggerInfluenceBuff(1, 2, {
  color: '#a855f7'
});

// Karten-Spiel Effekt
VisualEffectsUtils.triggerCardPlay(1, 'Symbolpolitik', 'initiative');

// Custom Effekt über Events
VisualEffectsUtils.triggerCustomEffect('ap_gain', {
  x: 200, y: 100, amount: 1, color: '#ffd700'
});
```

## Automatische Integration

Das System wird automatisch initialisiert:

```typescript
// In src/integration/visualEffectsIntegration.ts
initializeVisualEffects(); // Wird automatisch beim App-Start aufgerufen
```

## Event-System

### Custom Events

```typescript
// Trigger custom visual effect
window.dispatchEvent(new CustomEvent('pc:visual_effect_trigger', {
  detail: {
    type: 'ap_gain',
    data: { x: 200, y: 100, amount: 1, color: '#ffd700' }
  }
}));
```

### Reduced Motion Support

Das System respektiert automatisch `prefers-reduced-motion` Einstellungen:

```typescript
// Automatische Erkennung
window.matchMedia('(prefers-reduced-motion: reduce)').matches
```
