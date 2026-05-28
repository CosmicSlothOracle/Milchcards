# 2D Animation System

Ein event-basiertes, deterministisches 2D-Animation-System mit Fixed-Timestep für das Mandate Kartenspiel.

## 🎯 Überblick

Das Animation-System implementiert deine Spezifikation für ein robustes, event-basiertes System mit folgenden Kernprinzipien:

- **Event-basiert**: Alle Effekte laufen über Events, keine direkte State-Mutation
- **Fixed-Timestep**: 60Hz Update-Loop für deterministische Ergebnisse
- **Registry-first**: Zentrale Quelle der Wahrheit für alle Animationen
- **Frame-genaue Events**: Spawns, Schaden, SFX werden auf spezifischen Frames ausgelöst
- **Kollisionssystem**: Projectiles kollidieren mit Hurtboxen, triggern Blast-Effekte

## 🏗️ Architektur

### Kernkomponenten

```
src/
├── types/animation.ts          # TypeScript-Typen
├── data/animationRegistry.ts   # Animation-Definitionen
├── engine/
│   ├── animationEngine.ts      # Haupt-Engine
│   ├── characterSystem.ts      # Character-Management
│   └── gameEngine.ts           # Integration in Game-Engine
├── examples/animationExample.ts # Verwendungsbeispiele
└── __tests__/                  # Unit-Tests
```

### Event-Flow

```
Input → State Change → Animation → Frame Events → Projectile/Effects → Collision → Blast
```

## 🎮 Verwendung

### Basis-Setup

```typescript
import { AnimationEngine } from './engine/animationEngine';
import { CharacterSystem } from './engine/characterSystem';

const animationEngine = new AnimationEngine();
const characterSystem = new CharacterSystem();

// Character erstellen
animationEngine.createCharacter('player1', { x: 100, y: 200 }, 1);
characterSystem.createCharacter('player1', { x: 100, y: 200 }, 1);

// Animation starten
animationEngine.start();
animationEngine.playAnimation('player1', 'ranged');
```

### Ranged Attack Beispiel

```typescript
// 1. Ranged Animation starten
animationEngine.playAnimation('player1', 'ranged');

// 2. Animation läuft automatisch:
//    Frame 0: Pose aufbauen
//    Frame 1: playSfx('aim')
//    Frame 2: cameraShake(0.2, 100ms)
//    Frame 3: spawnProjectile('projectile', 'muzzle') + complete

// 3. Projectile fliegt automatisch in Blickrichtung
// 4. Bei Kollision: Projectile → Blast-Effekt
// 5. Blast: dealDamage(15) + playSfx('explosion') + cameraShake
```

## 📋 Animation Registry

### Struktur

```typescript
interface AnimationData {
  name: string;              // z.B. "ranged"
  fps: number;               // Frames per second
  loop: boolean;             // Loopende Animation?
  frames: number;            // Anzahl Frames
  events?: FrameEvent[];     // Frame-spezifische Events
  hitboxes?: FrameHitbox[];  // Hit-/Hurtboxen
}
```

### Beispiel: Ranged Animation

```typescript
ranged: {
  name: 'ranged',
  fps: 15,
  loop: false,
  frames: 4,
  events: [
    { frame: 1, type: 'playSfx', data: { sound: 'aim' } },
    { frame: 2, type: 'cameraShake', data: { intensity: 0.2, duration: 100 } },
    { frame: 3, type: 'spawnProjectile', data: { actor: 'projectile', at: 'muzzle' } },
    { frame: 3, type: 'complete' }
  ]
}
```

## 🎯 Frame Events

### Verfügbare Event-Typen

- `spawnProjectile`: Erstellt Projectile an Muzzle-Position
- `playSfx`: Spielt Sound-Effekt ab
- `emitFx`: Erstellt visuellen Effekt
- `dealDamage`: Verursacht Schaden mit Knockback/Hitstun
- `cameraShake`: Kamera-Effekt
- `complete`: Animation beendet

### Event-Daten

```typescript
interface FrameEvent {
  frame: number;
  type: 'spawnProjectile' | 'playSfx' | 'emitFx' | 'dealDamage' | 'complete' | 'cameraShake';
  data?: {
    actor?: string;           // z.B. "projectile", "blast"
    at?: string;             // z.B. "muzzle", "self"
    amount?: number;         // für dealDamage
    knockback?: Vector2;     // für dealDamage
    hitstun?: number;        // für dealDamage
    sound?: string;          // für playSfx
    intensity?: number;      // für cameraShake
    duration?: number;       // für cameraShake
  };
}
```

## 🚀 Projectile System

### Projectile-Lebenszyklus

1. **Spawn**: Durch `spawnProjectile` Event
2. **Movement**: Automatische Bewegung basierend auf Velocity
3. **Collision**: Kollision mit gegnerischen Hurtboxen
4. **Destruction**: Wechsel zu `die` Animation, dann Zerstörung
5. **Blast**: `emitFx` Event erstellt Explosion

### Kollisionslogik

```typescript
// Projectiles kollidieren mit fremden Hurtboxen
// Ignorieren den Owner
// Bei Treffer: sofortige Zerstörung + Blast-Effekt
```

## 🎨 Asset-System

### Dateinamen-Konvention

```
{character}_{animation}_{width}x{height}_f{frame}.png
```

Beispiele:
- `character1_ranged_256x256_f0.png`
- `character1_ranged_256x256_f1.png`
- `character1_ranged_256x256_f2.png`
- `character1_ranged_256x256_f3.png`

### Asset-Eigenschaften

- **Tile-Größe**: 256×256 (global einheitlich)
- **Padding**: 2-4px transparent für Anti-Bleeding
- **Pivot**: Fußmitte (128, 200) bei 256×256
- **Facing**: Automatische Spiegelung über X-Achse
- **Z-Layer**: Background < Character < Projectile < FX/Blast

## 🔧 Integration

### Game Engine Integration

```typescript
// In GameEngine
private animationEngine: AnimationEngine;
private characterSystem: CharacterSystem;

// Animation Events in Effect Queue
| { type: 'ANIMATION_PLAY'; characterId: string; animationName: string }
| { type: 'PROJECTILE_SPAWN'; characterId: string; position: Vector2; velocity: Vector2 }
| { type: 'DAMAGE_DEALT'; targetId: string; amount: number; knockback?: Vector2 }
```

### Event-Queue Integration

Das System integriert nahtlos in die bestehende Event-Queue:

```typescript
// Animation Events werden automatisch verarbeitet
this.resolveQueueWithAnimation(events);
```

## 🧪 Testing

### Unit Tests

```bash
npm test -- animationEngine.test.ts
npm test -- characterSystem.test.ts
npm test -- animationIntegration.test.ts
```

### Test-Coverage

- ✅ Character Management
- ✅ Animation Updates
- ✅ Projectile System
- ✅ Collision Detection
- ✅ Event Processing
- ✅ Fixed Timestep
- ✅ Integration Tests

## 📊 Performance

### Fixed Timestep

- **Target FPS**: 60Hz
- **Timestep**: ~16.67ms
- **Determinismus**: Gleiches Input → Gleiches Ergebnis
- **Keine Delta-Abhängigkeit**: Stabile Performance

### Optimierungen

- **Event-basiert**: Keine direkte State-Mutation
- **Efficient Updates**: Nur aktive Animationen werden verarbeitet
- **Memory Management**: Automatische Cleanup von abgeschlossenen Animationen

## 🎯 Beispiel-Implementierung

Siehe `src/examples/animationExample.ts` für vollständige Verwendungsbeispiele:

```typescript
const example = new AnimationExample();
example.startAnimationSystem();
example.startRangedAttack();
example.simulateCombat();
```

## 🔮 Erweiterungen

### Geplante Features

- **Hitbox-Editor**: Visueller Editor für Hit-/Hurtboxen
- **Animation-Blending**: Smooth Transitions zwischen Animationen
- **Particle System**: Erweiterte FX-Effekte
- **Audio Integration**: Vollständige SFX-Integration
- **Camera System**: Erweiterte Kamera-Effekte

### Anpassungen

Das System ist modular aufgebaut und kann einfach erweitert werden:

- Neue Animation-Typen in Registry hinzufügen
- Neue Frame-Events implementieren
- Erweiterte Kollisionslogik
- Zusätzliche Character-Properties

## 📝 Best Practices

1. **Registry-first**: Alle Animationen in Registry definieren
2. **Event-basiert**: Keine direkte State-Mutation
3. **Frame-genau**: Events auf spezifischen Frames
4. **Determinismus**: Fixed-Timestep verwenden
5. **Cleanup**: Automatische Zerstörung von abgeschlossenen Objekten
6. **Testing**: Unit-Tests für alle Komponenten

---

**Status**: ✅ Implementiert und getestet
**Version**: 1.0.0
**Kompatibilität**: TypeScript 4.9+, React 18+
