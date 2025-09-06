// Animation Registry - Zentrale Quelle der Wahrheit für alle Animationen
// Definiert fps, loop, Frame-Events für jede Aktion

import type { AnimationRegistry, AnimationData, FrameEvent } from '../types/animation';

// Beispiel-Animationen basierend auf deiner Spezifikation
export const ANIMATION_REGISTRY: AnimationRegistry = {
  // === CHARAKTER-ANIMATIONEN ===

  // Idle - Standard-Warteposition
  idle: {
    name: 'idle',
    fps: 8,
    loop: true,
    frames: 4,
    events: []
  },

  // Walk - Gehbewegung
  walk: {
    name: 'walk',
    fps: 12,
    loop: true,
    frames: 8,
    events: []
  },

  // Jump - Sprungbewegung
  jump: {
    name: 'jump',
    fps: 15,
    loop: false,
    frames: 6,
    events: [
      { frame: 0, type: 'playSfx', data: { sound: 'jump' } },
      { frame: 5, type: 'complete' }
    ]
  },

  // Parry - Abwehrbewegung
  parry: {
    name: 'parry',
    fps: 20,
    loop: false,
    frames: 4,
    events: [
      { frame: 1, type: 'playSfx', data: { sound: 'parry' } },
      { frame: 3, type: 'complete' }
    ]
  },

  // Attack - Nahkampf-Angriff
  attack: {
    name: 'attack',
    fps: 15,
    loop: false,
    frames: 6,
    events: [
      { frame: 2, type: 'playSfx', data: { sound: 'swing' } },
      { frame: 3, type: 'dealDamage', data: { amount: 10, knockback: { x: 50, y: -20 }, hitstun: 300 } },
      { frame: 5, type: 'complete' }
    ],
    hitboxes: [
      { frame: 3, type: 'hit', bounds: { x: 20, y: -40, width: 60, height: 40 }, damage: 10, knockback: { x: 50, y: -20 }, hitstun: 300 }
    ]
  },

  // Ranged - Fernkampf-Angriff (Beispiel aus deiner Spezifikation)
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
  },

  // Defeat - Niederlage/Sturz
  defeat: {
    name: 'defeat',
    fps: 12,
    loop: false,
    frames: 8,
    events: [
      { frame: 0, type: 'playSfx', data: { sound: 'defeat' } },
      { frame: 7, type: 'complete' }
    ]
  },

  // Spawn - Erscheinen/Respawn
  spawn: {
    name: 'spawn',
    fps: 10,
    loop: false,
    frames: 5,
    events: [
      { frame: 0, type: 'playSfx', data: { sound: 'spawn' } },
      { frame: 4, type: 'complete' }
    ]
  },

  // === PROJECTILE-ANIMATIONEN ===

  // Projectile - Fliegendes Geschoss
  projectile: {
    name: 'projectile',
    fps: 20,
    loop: true,
    frames: 6,
    events: []
  },

  // === FX/BLAST-ANIMATIONEN ===

  // Blast - Explosion/Treffer-Effekt
  blast: {
    name: 'blast',
    fps: 15,
    loop: false,
    frames: 6,
    events: [
      { frame: 0, type: 'dealDamage', data: { amount: 15, knockback: { x: 30, y: -15 }, hitstun: 200 } },
      { frame: 0, type: 'playSfx', data: { sound: 'explosion' } },
      { frame: 0, type: 'cameraShake', data: { intensity: 0.3, duration: 150 } },
      { frame: 5, type: 'complete' }
    ],
    hitboxes: [
      { frame: 0, type: 'hit', bounds: { x: -30, y: -30, width: 60, height: 60 }, damage: 15, knockback: { x: 30, y: -15 }, hitstun: 200 }
    ]
  },

  // Die - Projectile-Ausblendung
  die: {
    name: 'die',
    fps: 20,
    loop: false,
    frames: 3,
    events: [
      { frame: 2, type: 'complete' }
    ]
  }
};

// Character-spezifische Definitionen
export const CHARACTER_DEFINITIONS = {
  character1: {
    id: 'character1',
    name: 'Character 1',
    assetPrefix: 'character1_',
    pivot: { x: 128, y: 200 }, // Fußmitte bei 256x256
    muzzleOffset: { x: 42, y: -42 }, // Muzzle-Position für Ranged
    animations: ['idle', 'walk', 'jump', 'parry', 'attack', 'ranged', 'defeat', 'spawn']
  },

  character2: {
    id: 'character2',
    name: 'Character 2',
    assetPrefix: 'character2_',
    pivot: { x: 128, y: 200 },
    muzzleOffset: { x: 42, y: -42 },
    animations: ['idle', 'walk', 'jump', 'parry', 'attack', 'ranged', 'defeat', 'spawn']
  }
};

// Animation System Configuration
export const ANIMATION_CONFIG = {
  tileSize: 256,
  targetFPS: 60,
  fixedTimestep: 1000 / 60, // ~16.67ms
  padding: 3
};

// Utility-Funktionen
export function getAnimationData(animationName: string): AnimationData | null {
  return ANIMATION_REGISTRY[animationName] || null;
}

export function getCharacterDefinition(characterId: string) {
  return CHARACTER_DEFINITIONS[characterId as keyof typeof CHARACTER_DEFINITIONS] || null;
}

export function getFrameEvents(animationName: string, frame: number): FrameEvent[] {
  const animation = getAnimationData(animationName);
  if (!animation || !animation.events) return [];

  return animation.events.filter(event => event.frame === frame);
}

export function getFrameHitboxes(animationName: string, frame: number) {
  const animation = getAnimationData(animationName);
  if (!animation || !animation.hitboxes) return [];

  return animation.hitboxes.filter(hitbox => hitbox.frame === frame);
}
