// Animation Engine - Fixed-Timestep Event-basiertes System
// Integriert mit bestehender Game-Engine Event-Queue

import type {
  AnimationSystemState,
  CharacterState,
  ProjectileState,
  AnimationEvent,
  Vector2,
  FrameEvent
} from '../types/animation';
import {
  ANIMATION_REGISTRY,
  ANIMATION_CONFIG,
  getFrameEvents,
  getFrameHitboxes,
  getCharacterDefinition
} from '../data/animationRegistry';

export class AnimationEngine {
  private state: AnimationSystemState;
  private eventQueue: AnimationEvent[] = [];
  private lastUpdateTime: number = 0;
  private isRunning: boolean = false;

  constructor() {
    this.state = {
      characters: new Map(),
      projectiles: new Map(),
      effects: new Map(),
      globalTime: 0,
      lastUpdate: 0
    };
  }

  // === CORE UPDATE LOOP ===

  update(currentTime: number): void {
    // Auto-start if not running
    if (!this.isRunning) {
      this.start();
    }

    // Fixed-Timestep Update
    const deltaTime = currentTime - this.lastUpdateTime;
    if (deltaTime >= ANIMATION_CONFIG.fixedTimestep) {
      this.fixedUpdate();
      this.lastUpdateTime = currentTime;
    }
  }

  // Alternative update method for testing
  updateDirect(deltaTime: number): void {
    // Simulate multiple fixed timesteps
    const steps = Math.floor(deltaTime / ANIMATION_CONFIG.fixedTimestep);
    for (let i = 0; i < steps; i++) {
      this.fixedUpdate();
    }
  }

  private fixedUpdate(): void {
    this.state.globalTime += ANIMATION_CONFIG.fixedTimestep;

    // Update Characters
    this.updateCharacters();

    // Update Projectiles
    this.updateProjectiles();

    // Update Effects
    this.updateEffects();

    // Process Animation Events
    this.processAnimationEvents();
  }

  // === CHARACTER MANAGEMENT ===

  createCharacter(id: string, position: Vector2, facing: -1 | 1 = 1): void {
    const character: CharacterState = {
      id,
      position: { ...position },
      facing,
      currentAnimation: 'idle',
      animationFrame: 0,
      animationTime: 0
    };

    this.state.characters.set(id, character);
  }

  playAnimation(characterId: string, animationName: string): boolean {
    const character = this.state.characters.get(characterId);
    if (!character) return false;

    const animationData = ANIMATION_REGISTRY[animationName];
    if (!animationData) return false;

    // Reset animation state
    character.currentAnimation = animationName;
    character.animationFrame = 0;
    character.animationTime = 0;

    return true;
  }

  private updateCharacters(): void {
    this.state.characters.forEach((character, id) => {
      this.updateCharacterAnimation(character);
    });
  }

  private updateCharacterAnimation(character: CharacterState): void {
    const animationData = ANIMATION_REGISTRY[character.currentAnimation];
    if (!animationData) return;

    // Calculate frame time
    const frameTime = 1000 / animationData.fps;
    const newFrame = Math.floor(character.animationTime / frameTime);

    // Check for frame change
    if (newFrame !== character.animationFrame) {
      const oldFrame = character.animationFrame;
      character.animationFrame = newFrame;

      // Process frame events
      this.processFrameEvents(character, oldFrame, newFrame);
    }

    // Handle animation completion
    if (character.animationFrame >= animationData.frames) {
      if (animationData.loop) {
        character.animationFrame = 0;
        character.animationTime = 0;
      } else {
        // Animation complete - fire complete event
        this.enqueueAnimationEvent(character.id, {
          frame: animationData.frames - 1,
          type: 'complete',
          data: {}
        });
      }
    }

    // Update animation time
    character.animationTime += ANIMATION_CONFIG.fixedTimestep;
  }

  // === PROJECTILE MANAGEMENT ===

  createProjectile(
    id: string,
    position: Vector2,
    velocity: Vector2,
    owner: string,
    damage: number = 15,
    knockback: Vector2 = { x: 30, y: -15 },
    hitstun: number = 200
  ): void {
    const projectile: ProjectileState = {
      id,
      position: { ...position },
      facing: velocity.x > 0 ? 1 : -1,
      currentAnimation: 'projectile',
      animationFrame: 0,
      animationTime: 0,
      velocity: { ...velocity },
      speed: Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y),
      maxLifetime: 1200, // 1.2s fail-safe
      lifetime: 0,
      damage,
      knockback,
      hitstun,
      owner
    };

    this.state.projectiles.set(id, projectile);
  }

  private updateProjectiles(): void {
    this.state.projectiles.forEach((projectile, id) => {
      this.updateProjectile(projectile);
    });
  }

  private updateProjectile(projectile: ProjectileState): void {
    // Update position
    if (projectile.velocity) {
      projectile.position.x += projectile.velocity.x * (ANIMATION_CONFIG.fixedTimestep / 1000);
      projectile.position.y += projectile.velocity.y * (ANIMATION_CONFIG.fixedTimestep / 1000);
    }

    // Update lifetime
    projectile.lifetime += ANIMATION_CONFIG.fixedTimestep;

    // Check lifetime
    if (projectile.lifetime >= projectile.maxLifetime) {
      this.destroyProjectile(projectile.id);
      return;
    }

    // Update animation
    this.updateCharacterAnimation(projectile);

    // Check collisions
    this.checkProjectileCollisions(projectile);
  }

  private checkProjectileCollisions(projectile: ProjectileState): void {
    // Check against all characters (except owner)
    this.state.characters.forEach((character, characterId) => {
      if (characterId === projectile.owner) return;

      // Simple collision check (can be expanded with proper hitbox system)
      const distance = Math.sqrt(
        Math.pow(projectile.position.x - character.position.x, 2) +
        Math.pow(projectile.position.y - character.position.y, 2)
      );

      if (distance < 50) { // Simple radius collision
        this.hitCharacter(characterId, projectile);
        this.destroyProjectile(projectile.id);
        return;
      }
    });
  }

  private hitCharacter(characterId: string, projectile: ProjectileState): void {
    // Create blast effect at hit position
    const blastId = `blast_${Date.now()}_${Math.random()}`;
    this.createEffect(blastId, projectile.position, 'blast');
  }

  private destroyProjectile(projectileId: string): void {
    const projectile = this.state.projectiles.get(projectileId);
    if (!projectile) return;

    // Switch to die animation briefly
    projectile.currentAnimation = 'die';
    projectile.animationFrame = 0;
    projectile.animationTime = 0;

    // Remove after die animation completes
    setTimeout(() => {
      this.state.projectiles.delete(projectileId);
    }, 150); // 3 frames at 20fps
  }

  // Test helper method to force destroy projectile
  public forceDestroyProjectile(projectileId: string): void {
    this.state.projectiles.delete(projectileId);
  }

  // === EFFECT MANAGEMENT ===

  createEffect(id: string, position: Vector2, animationName: string): void {
    const effect: CharacterState = {
      id,
      position: { ...position },
      facing: 1,
      currentAnimation: animationName,
      animationFrame: 0,
      animationTime: 0
    };

    this.state.effects.set(id, effect);
  }

  private updateEffects(): void {
    this.state.effects.forEach((effect, id) => {
      this.updateCharacterAnimation(effect);
    });
  }

  // === EVENT PROCESSING ===

  private processFrameEvents(character: CharacterState, oldFrame: number, newFrame: number): void {
    const animationData = ANIMATION_REGISTRY[character.currentAnimation];
    if (!animationData || !animationData.events) return;

    // Process events for all frames between oldFrame and newFrame
    for (let frame = oldFrame + 1; frame <= newFrame; frame++) {
      const events = getFrameEvents(character.currentAnimation, frame);
      for (const event of events) {
        this.enqueueAnimationEvent(character.id, event);
      }
    }
  }

  private enqueueAnimationEvent(characterId: string, event: FrameEvent): void {
    const animationEvent: AnimationEvent = {
      type: 'ANIMATION_EVENT',
      characterId,
      event,
      timestamp: this.state.globalTime
    };

    this.eventQueue.push(animationEvent);
  }

  private processAnimationEvents(): void {
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift()!;
      this.handleAnimationEvent(event);
    }
  }

  private handleAnimationEvent(event: AnimationEvent): void {
    switch (event.event.type) {
      case 'spawnProjectile':
        this.handleSpawnProjectile(event);
        break;
      case 'playSfx':
        this.handlePlaySfx(event);
        break;
      case 'emitFx':
        this.handleEmitFx(event);
        break;
      case 'dealDamage':
        this.handleDealDamage(event);
        break;
      case 'cameraShake':
        this.handleCameraShake(event);
        break;
      case 'complete':
        this.handleAnimationComplete(event);
        break;
    }
  }

  private handleSpawnProjectile(event: AnimationEvent): void {
    const character = this.state.characters.get(event.characterId);
    if (!character) return;

    const characterDef = getCharacterDefinition(character.id);
    if (!characterDef || !characterDef.muzzleOffset) return;

    // Calculate muzzle position
    const muzzleOffset = characterDef.muzzleOffset;
    const facingMultiplier = character.facing;

    const projectilePosition: Vector2 = {
      x: character.position.x + (muzzleOffset.x * facingMultiplier),
      y: character.position.y + muzzleOffset.y
    };

    // Calculate velocity
    const speed = 1000; // px/s
    const velocity: Vector2 = {
      x: speed * facingMultiplier,
      y: 0
    };

    // Create projectile
    const projectileId = `projectile_${Date.now()}_${Math.random()}`;
    this.createProjectile(projectileId, projectilePosition, velocity, character.id);
  }

  private handlePlaySfx(event: AnimationEvent): void {
    // Integrate with existing audio system
    console.log(`SFX: ${event.event.data?.sound} for ${event.characterId}`);
  }

  private handleEmitFx(event: AnimationEvent): void {
    const character = this.state.characters.get(event.characterId);
    if (!character) return;

    const effectId = `fx_${Date.now()}_${Math.random()}`;
    this.createEffect(effectId, character.position, event.event.data?.actor || 'blast');
  }

  private handleDealDamage(event: AnimationEvent): void {
    // This would integrate with the game's damage system
    console.log(`Damage: ${event.event.data?.amount} from ${event.characterId}`);
  }

  private handleCameraShake(event: AnimationEvent): void {
    // This would integrate with the camera system
    console.log(`Camera Shake: ${event.event.data?.intensity} for ${event.event.data?.duration}ms`);
  }

  private handleAnimationComplete(event: AnimationEvent): void {
    const character = this.state.characters.get(event.characterId);
    if (!character) return;

    // Return to idle or handle completion logic
    if (character.currentAnimation !== 'idle') {
      this.playAnimation(event.characterId, 'idle');
    }
  }

  // === PUBLIC API ===

  start(): void {
    this.isRunning = true;
    this.lastUpdateTime = performance.now();
  }

  stop(): void {
    this.isRunning = false;
  }

  getState(): AnimationSystemState {
    return {
      ...this.state,
      characters: new Map(this.state.characters),
      projectiles: new Map(this.state.projectiles),
      effects: new Map(this.state.effects)
    };
  }

  // Get character by ID
  getCharacter(id: string): CharacterState | undefined {
    return this.state.characters.get(id);
  }

  // Get all characters
  getCharacters(): CharacterState[] {
    return Array.from(this.state.characters.values());
  }

  // Get all projectiles
  getProjectiles(): ProjectileState[] {
    return Array.from(this.state.projectiles.values());
  }

  // Get all effects
  getEffects(): CharacterState[] {
    return Array.from(this.state.effects.values());
  }
}
