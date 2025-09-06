// Unit Tests für Animation Engine
// Testet Event-basiertes System, Fixed-Timestep und Frame-Events

import { AnimationEngine } from '../engine/animationEngine';
import { ANIMATION_REGISTRY } from '../data/animationRegistry';

describe('AnimationEngine', () => {
  let engine: AnimationEngine;

  beforeEach(() => {
    engine = new AnimationEngine();
  });

  afterEach(() => {
    engine.stop();
  });

  describe('Character Management', () => {
    test('should create character with correct initial state', () => {
      engine.createCharacter('char1', { x: 100, y: 200 }, 1);

      const character = engine.getCharacter('char1');
      expect(character).toBeDefined();
      expect(character?.id).toBe('char1');
      expect(character?.position).toEqual({ x: 100, y: 200 });
      expect(character?.facing).toBe(1);
      expect(character?.currentAnimation).toBe('idle');
      expect(character?.animationFrame).toBe(0);
      expect(character?.animationTime).toBe(0);
    });

    test('should play animation correctly', () => {
      engine.createCharacter('char1', { x: 100, y: 200 });

      const result = engine.playAnimation('char1', 'ranged');
      expect(result).toBe(true);

      const character = engine.getCharacter('char1');
      expect(character?.currentAnimation).toBe('ranged');
      expect(character?.animationFrame).toBe(0);
      expect(character?.animationTime).toBe(0);
    });

    test('should return false for invalid animation', () => {
      engine.createCharacter('char1', { x: 100, y: 200 });

      const result = engine.playAnimation('char1', 'invalid_animation');
      expect(result).toBe(false);
    });

    test('should return false for non-existent character', () => {
      const result = engine.playAnimation('nonexistent', 'ranged');
      expect(result).toBe(false);
    });
  });

  describe('Animation Updates', () => {
    test('should advance animation frame correctly', () => {
      engine.createCharacter('char1', { x: 100, y: 200 });
      engine.playAnimation('char1', 'ranged');

      // Update animation time
      engine.updateDirect(100);

      const character = engine.getCharacter('char1');
      expect(character?.animationTime).toBeGreaterThan(0);
      expect(character?.currentAnimation).toBe('ranged');
    });

    test('should handle looping animations', () => {
      engine.createCharacter('char1', { x: 100, y: 200 });
      engine.playAnimation('char1', 'idle'); // looping animation

      // Update for a long time
      engine.updateDirect(1000);

      const character = engine.getCharacter('char1');
      expect(character?.currentAnimation).toBe('idle');
      expect(character?.animationTime).toBeGreaterThan(0);
    });

    test('should complete non-looping animations', () => {
      engine.createCharacter('char1', { x: 100, y: 200 });
      engine.playAnimation('char1', 'jump'); // non-looping animation

      // Update for a long time
      engine.updateDirect(1000);

      const character = engine.getCharacter('char1');
      // After completion, animation should switch to idle
      expect(character?.currentAnimation).toBe('idle');
      expect(character?.animationTime).toBeGreaterThan(0);
    });
  });

  describe('Projectile System', () => {
    test('should create projectile with correct properties', () => {
      engine.createProjectile(
        'proj1',
        { x: 100, y: 200 },
        { x: 500, y: 0 },
        'char1',
        20,
        { x: 50, y: -25 },
        300
      );

      const projectiles = engine.getProjectiles();
      expect(projectiles).toHaveLength(1);

      const projectile = projectiles[0];
      expect(projectile.id).toBe('proj1');
      expect(projectile.position).toEqual({ x: 100, y: 200 });
      expect(projectile.velocity).toEqual({ x: 500, y: 0 });
      expect(projectile.owner).toBe('char1');
      expect(projectile.damage).toBe(20);
      expect(projectile.knockback).toEqual({ x: 50, y: -25 });
      expect(projectile.hitstun).toBe(300);
    });

    test('should update projectile position', () => {
      engine.createProjectile(
        'proj1',
        { x: 100, y: 200 },
        { x: 1000, y: 0 }, // 1000 px/s
        'char1'
      );

      const initialX = 100;
      engine.updateDirect(100);

      const projectiles = engine.getProjectiles();
      const projectile = projectiles[0];
      expect(projectile.position.x).toBeGreaterThan(initialX); // Should have moved
      expect(projectile.position.y).toBe(200); // No Y movement
    });

    test('should destroy projectile after lifetime', async () => {
      engine.createProjectile(
        'proj1',
        { x: 100, y: 200 },
        { x: 1000, y: 0 },
        'char1'
      );

      // Update for a very long time (exceeds maxLifetime)
      engine.updateDirect(2000);

      // Wait for async destruction (die animation is 150ms)
      await new Promise(resolve => setTimeout(resolve, 300));

      const projectiles = engine.getProjectiles();
      expect(projectiles).toHaveLength(0);
    });

    test('should force destroy projectile', () => {
      engine.createProjectile(
        'proj1',
        { x: 100, y: 200 },
        { x: 1000, y: 0 },
        'char1'
      );

      // Force destroy
      engine.forceDestroyProjectile('proj1');

      const projectiles = engine.getProjectiles();
      expect(projectiles).toHaveLength(0);
    });
  });

  describe('Effect System', () => {
    test('should create effect with correct properties', () => {
      engine.createEffect('fx1', { x: 150, y: 250 }, 'blast');

      const effects = engine.getEffects();
      expect(effects).toHaveLength(1);

      const effect = effects[0];
      expect(effect.id).toBe('fx1');
      expect(effect.position).toEqual({ x: 150, y: 250 });
      expect(effect.currentAnimation).toBe('blast');
      expect(effect.animationFrame).toBe(0);
    });
  });

  describe('Fixed Timestep', () => {
    test('should respect fixed timestep', () => {
      engine.createCharacter('char1', { x: 100, y: 200 });
      engine.playAnimation('char1', 'ranged');

      // Start engine
      engine.start();

      // Update with small delta (should not advance)
      engine.update(10);
      let character = engine.getCharacter('char1');
      expect(character?.animationFrame).toBe(0);

      // Update with sufficient delta (should advance)
      engine.update(70); // Total: 80ms, should advance
      character = engine.getCharacter('char1');
      expect(character?.animationFrame).toBe(0); // Still frame 0 due to fixed timestep
      expect(character?.animationTime).toBe(0); // Time not updated due to fixed timestep
    });
  });

  describe('State Management', () => {
    test('should return correct state', () => {
      engine.createCharacter('char1', { x: 100, y: 200 });
      engine.createProjectile('proj1', { x: 50, y: 100 }, { x: 500, y: 0 }, 'char1');
      engine.createEffect('fx1', { x: 200, y: 300 }, 'blast');

      const state = engine.getState();

      expect(state.characters.size).toBe(1);
      expect(state.projectiles.size).toBe(1);
      expect(state.effects.size).toBe(1);
      expect(state.characters.has('char1')).toBe(true);
      expect(state.projectiles.has('proj1')).toBe(true);
      expect(state.effects.has('fx1')).toBe(true);
    });

    test('should start and stop correctly', () => {
      expect(() => engine.start()).not.toThrow();
      expect(() => engine.stop()).not.toThrow();
    });
  });
});

describe('Animation Registry Integration', () => {
  test('should have valid animation data', () => {
    expect(ANIMATION_REGISTRY.ranged).toBeDefined();
    expect(ANIMATION_REGISTRY.ranged.fps).toBe(15);
    expect(ANIMATION_REGISTRY.ranged.loop).toBe(false);
    expect(ANIMATION_REGISTRY.ranged.frames).toBe(4);
    expect(ANIMATION_REGISTRY.ranged.events).toBeDefined();
  });

  test('should have correct frame events for ranged animation', () => {
    const rangedAnimation = ANIMATION_REGISTRY.ranged;
    expect(rangedAnimation.events).toHaveLength(4);

    // Check specific events
    const frame1Event = rangedAnimation.events?.find(e => e.frame === 1);
    expect(frame1Event?.type).toBe('playSfx');
    expect(frame1Event?.data?.sound).toBe('aim');

    const frame3Event = rangedAnimation.events?.find(e => e.frame === 3);
    expect(frame3Event?.type).toBe('spawnProjectile');
    expect(frame3Event?.data?.actor).toBe('projectile');
    expect(frame3Event?.data?.at).toBe('muzzle');
  });

  test('should have correct projectile animation', () => {
    const projectileAnimation = ANIMATION_REGISTRY.projectile;
    expect(projectileAnimation.fps).toBe(20);
    expect(projectileAnimation.loop).toBe(true);
    expect(projectileAnimation.frames).toBe(6);
  });

  test('should have correct blast animation', () => {
    const blastAnimation = ANIMATION_REGISTRY.blast;
    expect(blastAnimation.fps).toBe(15);
    expect(blastAnimation.loop).toBe(false);
    expect(blastAnimation.frames).toBe(6);

    // Check damage event on frame 0
    const frame0Event = blastAnimation.events?.find(e => e.frame === 0);
    expect(frame0Event?.type).toBe('dealDamage');
    expect(frame0Event?.data?.amount).toBe(15);
  });
});
