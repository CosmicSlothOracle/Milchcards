// Integration Tests für Animation System
// Testet das komplette "Ranged Attack" Beispiel aus der Spezifikation

import { AnimationEngine } from '../engine/animationEngine';
import { CharacterSystem } from '../engine/characterSystem';
import { ANIMATION_REGISTRY } from '../data/animationRegistry';

describe('Animation System Integration', () => {
  let animationEngine: AnimationEngine;
  let characterSystem: CharacterSystem;

  beforeEach(() => {
    animationEngine = new AnimationEngine();
    characterSystem = new CharacterSystem();
  });

  afterEach(() => {
    animationEngine.stop();
    characterSystem.clear();
  });

  describe('Ranged Attack Flow', () => {
    test('should complete full ranged attack sequence', async () => {
      // 1) Setup: Create character
      const characterId = 'player1';
      const characterPosition = { x: 100, y: 200 };

      animationEngine.createCharacter(characterId, characterPosition, 1);
      characterSystem.createCharacter(characterId, characterPosition, 1);

      // 2) Start ranged animation
      const playResult = animationEngine.playAnimation(characterId, 'ranged');
      expect(playResult).toBe(true);

      // 3) Verify initial state
      let character = animationEngine.getCharacter(characterId);
      expect(character?.currentAnimation).toBe('ranged');
      expect(character?.animationFrame).toBe(0);

      // 4) Advance through frames
      // ranged: 15 fps, 4 frames = ~66.67ms per frame

      // Frame 0: Initial pose
      animationEngine.update(50);
      character = animationEngine.getCharacter(characterId);
      expect(character?.animationFrame).toBe(0);

      // Frame 1: Aim sound
      animationEngine.update(70); // Total: 120ms
      character = animationEngine.getCharacter(characterId);
      expect(character?.animationFrame).toBe(1);

      // Frame 2: Camera shake
      animationEngine.update(70); // Total: 190ms
      character = animationEngine.getCharacter(characterId);
      expect(character?.animationFrame).toBe(2);

      // Frame 3: Spawn projectile + complete
      animationEngine.update(70); // Total: 260ms
      character = animationEngine.getCharacter(characterId);
      expect(character?.animationFrame).toBe(3);

      // 5) Verify projectile was created
      const projectiles = animationEngine.getProjectiles();
      expect(projectiles).toHaveLength(1);

      const projectile = projectiles[0];
      expect(projectile.owner).toBe(characterId);
      expect(projectile.currentAnimation).toBe('projectile');
      expect(projectile.velocity.x).toBeGreaterThan(0); // Moving right

      // 6) Verify projectile movement
      const initialProjectileX = projectile.position.x;
      animationEngine.update(100); // 100ms later

      const updatedProjectiles = animationEngine.getProjectiles();
      expect(updatedProjectiles).toHaveLength(1);

      const updatedProjectile = updatedProjectiles[0];
      expect(updatedProjectile.position.x).toBeGreaterThan(initialProjectileX);
    });

    test('should handle projectile collision and blast', async () => {
      // Setup: Create attacker and target
      const attackerId = 'player1';
      const targetId = 'player2';

      animationEngine.createCharacter(attackerId, { x: 100, y: 200 }, 1);
      animationEngine.createCharacter(targetId, { x: 300, y: 200 }, -1);

      characterSystem.createCharacter(attackerId, { x: 100, y: 200 }, 1);
      characterSystem.createCharacter(targetId, { x: 300, y: 200 }, -1);

      // Create projectile manually (simulating spawn from ranged animation)
      const projectileId = 'test_projectile';
      animationEngine.createProjectile(
        projectileId,
        { x: 150, y: 200 }, // Near target
        { x: 1000, y: 0 },  // Fast movement
        attackerId,
        15, // damage
        { x: 30, y: -15 }, // knockback
        200 // hitstun
      );

      // Verify projectile exists
      let projectiles = animationEngine.getProjectiles();
      expect(projectiles).toHaveLength(1);

      // Update until collision (projectile at x=150, target at x=300, speed=1000px/s)
      // Distance = 150px, time needed = 150/1000 = 0.15s = 150ms
      animationEngine.update(200); // 200ms should be enough

      // Verify projectile was destroyed and blast was created
      projectiles = animationEngine.getProjectiles();
      expect(projectiles).toHaveLength(0);

      const effects = animationEngine.getEffects();
      expect(effects).toHaveLength(1);

      const blast = effects[0];
      expect(blast.currentAnimation).toBe('blast');
    });

    test('should handle blast animation and damage', async () => {
      // Create blast effect
      const blastId = 'test_blast';
      const blastPosition = { x: 300, y: 200 };

      animationEngine.createEffect(blastId, blastPosition, 'blast');

      // Verify blast was created
      let effects = animationEngine.getEffects();
      expect(effects).toHaveLength(1);

      let blast = effects[0];
      expect(blast.currentAnimation).toBe('blast');
      expect(blast.animationFrame).toBe(0);

      // Update through blast animation
      // blast: 15 fps, 6 frames, non-looping
      // Frame 0: dealDamage event
      animationEngine.update(50);
      blast = animationEngine.getCharacter(blastId);
      expect(blast?.animationFrame).toBe(0);

      // Advance through frames
      animationEngine.update(100); // Total: 150ms
      blast = animationEngine.getCharacter(blastId);
      expect(blast?.animationFrame).toBe(2);

      // Complete blast animation
      animationEngine.update(300); // Total: 450ms (should complete)
      blast = animationEngine.getCharacter(blastId);
      expect(blast?.animationFrame).toBe(5); // Last frame
    });
  });

  describe('Animation Registry Validation', () => {
    test('should have consistent animation data', () => {
      // Verify ranged animation structure
      const ranged = ANIMATION_REGISTRY.ranged;
      expect(ranged.name).toBe('ranged');
      expect(ranged.fps).toBe(15);
      expect(ranged.loop).toBe(false);
      expect(ranged.frames).toBe(4);
      expect(ranged.events).toHaveLength(4);

      // Verify projectile animation structure
      const projectile = ANIMATION_REGISTRY.projectile;
      expect(projectile.name).toBe('projectile');
      expect(projectile.fps).toBe(20);
      expect(projectile.loop).toBe(true);
      expect(projectile.frames).toBe(6);

      // Verify blast animation structure
      const blast = ANIMATION_REGISTRY.blast;
      expect(blast.name).toBe('blast');
      expect(blast.fps).toBe(15);
      expect(blast.loop).toBe(false);
      expect(blast.frames).toBe(6);
    });

    test('should have correct frame events for ranged animation', () => {
      const ranged = ANIMATION_REGISTRY.ranged;

      // Frame 1: playSfx
      const frame1Event = ranged.events?.find(e => e.frame === 1);
      expect(frame1Event?.type).toBe('playSfx');
      expect(frame1Event?.data?.sound).toBe('aim');

      // Frame 2: cameraShake
      const frame2Event = ranged.events?.find(e => e.frame === 2);
      expect(frame2Event?.type).toBe('cameraShake');
      expect(frame2Event?.data?.intensity).toBe(0.2);
      expect(frame2Event?.data?.duration).toBe(100);

      // Frame 3: spawnProjectile + complete
      const frame3Events = ranged.events?.filter(e => e.frame === 3) || [];
      expect(frame3Events).toHaveLength(2);

      const spawnEvent = frame3Events.find(e => e.type === 'spawnProjectile');
      expect(spawnEvent?.data?.actor).toBe('projectile');
      expect(spawnEvent?.data?.at).toBe('muzzle');

      const completeEvent = frame3Events.find(e => e.type === 'complete');
      expect(completeEvent).toBeDefined();
    });

    test('should have correct frame events for blast animation', () => {
      const blast = ANIMATION_REGISTRY.blast;

      // Frame 0: dealDamage + playSfx + cameraShake
      const frame0Events = blast.events?.filter(e => e.frame === 0) || [];
      expect(frame0Events).toHaveLength(3);

      const damageEvent = frame0Events.find(e => e.type === 'dealDamage');
      expect(damageEvent?.data?.amount).toBe(15);
      expect(damageEvent?.data?.knockback).toEqual({ x: 30, y: -15 });
      expect(damageEvent?.data?.hitstun).toBe(200);

      const sfxEvent = frame0Events.find(e => e.type === 'playSfx');
      expect(sfxEvent?.data?.sound).toBe('explosion');

      const shakeEvent = frame0Events.find(e => e.type === 'cameraShake');
      expect(shakeEvent?.data?.intensity).toBe(0.3);
      expect(shakeEvent?.data?.duration).toBe(150);
    });
  });

  describe('Character System Integration', () => {
    test('should handle facing changes correctly', () => {
      const characterId = 'char1';
      characterSystem.createCharacter(characterId, { x: 100, y: 200 }, 1);

      // Move right - should face right
      characterSystem.moveCharacter(characterId, { x: 1, y: 0 }, 50);
      let character = characterSystem.getCharacter(characterId);
      expect(character?.facing).toBe(1);
      expect(character?.position.x).toBe(150);

      // Move left - should face left
      characterSystem.moveCharacter(characterId, { x: -1, y: 0 }, 50);
      character = characterSystem.getCharacter(characterId);
      expect(character?.facing).toBe(-1);
      expect(character?.position.x).toBe(100);
    });

    test('should calculate facing to target correctly', () => {
      const characterId = 'char1';
      characterSystem.createCharacter(characterId, { x: 100, y: 200 });

      // Target to the right
      const facingRight = characterSystem.calculateFacingToTarget(characterId, { x: 200, y: 200 });
      expect(facingRight).toBe(1);

      // Target to the left
      const facingLeft = characterSystem.calculateFacingToTarget(characterId, { x: 50, y: 200 });
      expect(facingLeft).toBe(-1);
    });
  });

  describe('Performance and Timing', () => {
    test('should maintain consistent frame timing', () => {
      const characterId = 'char1';
      animationEngine.createCharacter(characterId, { x: 100, y: 200 });
      animationEngine.playAnimation(characterId, 'ranged');

      // ranged: 15 fps = 66.67ms per frame
      const frameTime = 1000 / 15;

      // Test multiple frame advances
      for (let frame = 0; frame < 4; frame++) {
        const startTime = frame * frameTime;
        const endTime = (frame + 1) * frameTime;

        animationEngine.update(endTime);
        const character = animationEngine.getCharacter(characterId);
        expect(character?.animationFrame).toBe(frame + 1);
      }
    });

    test('should handle multiple characters efficiently', () => {
      // Create multiple characters
      for (let i = 0; i < 10; i++) {
        const characterId = `char${i}`;
        animationEngine.createCharacter(characterId, { x: i * 50, y: 200 });
        animationEngine.playAnimation(characterId, 'idle');
      }

      // Update all characters
      animationEngine.update(100);

      // Verify all characters are updated
      const characters = animationEngine.getCharacters();
      expect(characters).toHaveLength(10);

      // All should be in idle animation
      characters.forEach(character => {
        expect(character.currentAnimation).toBe('idle');
      });
    });
  });
});
