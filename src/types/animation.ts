// Animation System Types
// Event-basiertes 2D-Animation-System mit Fixed-Timestep

export interface Vector2 {
  x: number;
  y: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Frame Events - werden auf spezifischen Frames ausgelöst
export interface FrameEvent {
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

// Animation Definition - Quelle der Wahrheit für jede Aktion
export interface AnimationData {
  name: string;              // z.B. "ranged", "projectile", "blast"
  fps: number;               // Frames per second
  loop: boolean;             // Loopende Animation?
  frames: number;            // Anzahl Frames (f0 bis f(N-1))
  events?: FrameEvent[];     // Frame-spezifische Events
  hitboxes?: FrameHitbox[];  // Hit-/Hurtboxen pro Frame
}

// Hit-/Hurtbox Definition pro Frame
export interface FrameHitbox {
  frame: number;
  type: 'hit' | 'hurt';
  bounds: BoundingBox;       // Relativ zum Character-Origin
  damage?: number;           // Nur für Hitboxen
  knockback?: Vector2;       // Nur für Hitboxen
  hitstun?: number;          // Nur für Hitboxen
}

// Character State - bestimmt welche Animation läuft
export interface CharacterState {
  id: string;
  position: Vector2;
  facing: -1 | 1;            // -1 = links, +1 = rechts
  currentAnimation: string;  // Aktuelle Animation
  animationFrame: number;    // Aktueller Frame (0-basiert)
  animationTime: number;     // Zeit seit Animation-Start (ms)
  velocity?: Vector2;        // Für Projectiles
  lifetime?: number;         // Für Projectiles (ms)
  owner?: string;            // Für Projectiles (Owner-ID)
}

// Projectile-spezifische Properties
export interface ProjectileState extends CharacterState {
  velocity: Vector2;        // Required for projectiles
  speed: number;
  maxLifetime: number;
  lifetime: number;         // Required for projectiles
  damage: number;
  knockback: Vector2;
  hitstun: number;
}

// Animation Event - wird in die bestehende Event-Queue eingereiht
export interface AnimationEvent {
  type: 'ANIMATION_EVENT';
  characterId: string;
  event: FrameEvent;
  timestamp: number;
}

// Animation System State
export interface AnimationSystemState {
  characters: Map<string, CharacterState>;
  projectiles: Map<string, ProjectileState>;
  effects: Map<string, CharacterState>;  // FX/Blast-Objekte
  globalTime: number;                    // Fixed-Timestep Zeit
  lastUpdate: number;                    // Letztes Update (ms)
}

// Animation Registry - zentrale Quelle der Wahrheit
export interface AnimationRegistry {
  [animationName: string]: AnimationData;
}

// Character Definition - Asset-Mapping
export interface CharacterDefinition {
  id: string;
  name: string;
  assetPrefix: string;       // z.B. "character1_" für character1_ranged_256x256_f4.png
  pivot: Vector2;            // Origin-Point (Standard: Fußmitte)
  muzzleOffset?: Vector2;    // Für Ranged-Attacks
  animations: string[];      // Verfügbare Animationen
}

// Z-Layer Definition
export enum ZLayer {
  BACKGROUND = 0,
  CHARACTER = 1,
  PROJECTILE = 2,
  FX_BLAST = 3
}

// Animation System Configuration
export interface AnimationConfig {
  tileSize: number;          // Standard: 256x256
  targetFPS: number;         // Standard: 60
  fixedTimestep: number;     // 1000 / targetFPS
  padding: number;           // Standard: 2-4px
}
