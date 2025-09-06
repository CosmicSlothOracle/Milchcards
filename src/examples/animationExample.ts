// Animation System Example
// Zeigt die Verwendung des kompletten Animation-Systems mit dem "Ranged Attack" Beispiel

import { AnimationEngine } from '../engine/animationEngine';
import { CharacterSystem } from '../engine/characterSystem';
import { GameEngine } from '../engine/gameEngine';
// import { createDefaultGameState } from '../utils/gameStateFactory';

/**
 * Beispiel: Kompletter Ranged Attack Flow
 *
 * 1. Spieler drückt Ranged-Button
 * 2. Character spielt ranged-Animation
 * 3. Auf Frame 3 spawnt Projectile
 * 4. Projectile fliegt in Blickrichtung
 * 5. Bei Kollision: Projectile wird zu Blast
 * 6. Blast spielt Explosion und dealt Schaden
 */
export class AnimationExample {
  private gameEngine: GameEngine;
  private animationEngine: AnimationEngine;
  private characterSystem: CharacterSystem;
  private gameLoopId: number | null = null;

  constructor() {
    // Initialize Game Engine with default state
    // const initialState = createDefaultGameState();
    // this.gameEngine = new GameEngine(initialState);

    // For now, create a minimal game state
    this.gameEngine = new GameEngine({
      round: 1,
      current: 1,
      passed: { 1: false, 2: false },
      actionPoints: { 1: 2, 2: 2 },
      actionsUsed: { 1: 0, 2: 0 },
      decks: { 1: [], 2: [] },
      hands: { 1: [], 2: [] },
      traps: { 1: [], 2: [] },
      board: { 1: { innen: [], aussen: [], sofort: [] }, 2: { innen: [], aussen: [], sofort: [] } },
      permanentSlots: { 1: { government: null, public: null, initiativePermanent: null }, 2: { government: null, public: null, initiativePermanent: null } },
      discard: [],
      log: [],
      activeRefresh: { 1: 0, 2: 0 },
      roundsWon: { 1: 0, 2: 0 },
      effectFlags: { 1: { markZuckerbergUsed: false, opportunistActive: false, zuckOnceAp: false, zuckSpent: false, aiWeiweiOnActivate: false, elonOnceAp: false, elonOnActivate: false, auraScience: 0, auraHealth: 0, auraMilitaryPenalty: 0, initiativesLocked: false, doublePublicAura: false, apBonusInitiativeNext: 0, apBonusInitiativeOnce: 0 }, 2: { markZuckerbergUsed: false, opportunistActive: false, zuckOnceAp: false, zuckSpent: false, aiWeiweiOnActivate: false, elonOnceAp: false, elonOnActivate: false, auraScience: 0, auraHealth: 0, auraMilitaryPenalty: 0, initiativesLocked: false, doublePublicAura: false, apBonusInitiativeNext: 0, apBonusInitiativeOnce: 0 } }
    } as any);

    // Get animation systems from game engine
    this.animationEngine = new AnimationEngine();
    this.characterSystem = new CharacterSystem();

    this.setupExample();
  }

  private setupExample(): void {
    // Create two characters for the example
    const player1Id = 'player1';
    const player2Id = 'player2';

    // Player 1 (left side, facing right)
    this.createCharacter(player1Id, { x: 100, y: 300 }, 1);

    // Player 2 (right side, facing left)
    this.createCharacter(player2Id, { x: 500, y: 300 }, -1);

    console.log('Animation Example Setup Complete');
    console.log('Player 1 at (100, 300) facing right');
    console.log('Player 2 at (500, 300) facing left');
  }

  private createCharacter(id: string, position: { x: number; y: number }, facing: -1 | 1): void {
    // Create in both systems
    this.animationEngine.createCharacter(id, position, facing);
    this.characterSystem.createCharacter(id, position, facing);

    // Start with idle animation
    this.animationEngine.playAnimation(id, 'idle');
  }

  /**
   * Startet einen Ranged Attack von Player 1
   */
  public startRangedAttack(): void {
    console.log('🎯 Starting Ranged Attack...');

    // Play ranged animation on player 1
    const success = this.animationEngine.playAnimation('player1', 'ranged');

    if (success) {
      console.log('✅ Ranged animation started');
      this.logCharacterState('player1');
    } else {
      console.error('❌ Failed to start ranged animation');
    }
  }

  /**
   * Startet das Animation-System
   */
  public startAnimationSystem(): void {
    this.animationEngine.start();
    this.startGameLoop();
    console.log('🚀 Animation System Started');
  }

  /**
   * Stoppt das Animation-System
   */
  public stopAnimationSystem(): void {
    this.animationEngine.stop();
    if (this.gameLoopId) {
      cancelAnimationFrame(this.gameLoopId);
      this.gameLoopId = null;
    }
    console.log('⏹️ Animation System Stopped');
  }

  /**
   * Game Loop für kontinuierliche Updates
   */
  private startGameLoop(): void {
    const gameLoop = (currentTime: number) => {
      this.animationEngine.update(currentTime);
      this.gameLoopId = requestAnimationFrame(gameLoop);
    };

    this.gameLoopId = requestAnimationFrame(gameLoop);
  }

  /**
   * Loggt den aktuellen Zustand eines Characters
   */
  private logCharacterState(characterId: string): void {
    const character = this.animationEngine.getCharacter(characterId);
    if (character) {
      console.log(`📊 ${characterId} State:`, {
        position: character.position,
        facing: character.facing,
        animation: character.currentAnimation,
        frame: character.animationFrame,
        time: character.animationTime
      });
    }
  }

  /**
   * Loggt alle Projectiles
   */
  public logProjectiles(): void {
    const projectiles = this.animationEngine.getProjectiles();
    console.log(`🚀 Active Projectiles: ${projectiles.length}`);

    projectiles.forEach(projectile => {
      const velocity = projectile.velocity ? `vel(${projectile.velocity.x}, ${projectile.velocity.y})` : 'vel(undefined)';
      console.log(`  - ${projectile.id}: pos(${projectile.position.x}, ${projectile.position.y}) ${velocity}`);
    });
  }

  /**
   * Loggt alle Effects
   */
  public logEffects(): void {
    const effects = this.animationEngine.getEffects();
    console.log(`💥 Active Effects: ${effects.length}`);

    effects.forEach(effect => {
      console.log(`  - ${effect.id}: ${effect.currentAnimation} frame ${effect.animationFrame}`);
    });
  }

  /**
   * Loggt den kompletten System-Status
   */
  public logSystemStatus(): void {
    console.log('\n📈 === ANIMATION SYSTEM STATUS ===');

    // Characters
    const characters = this.animationEngine.getCharacters();
    console.log(`👥 Characters: ${characters.length}`);
    characters.forEach(char => {
      console.log(`  - ${char.id}: ${char.currentAnimation} (frame ${char.animationFrame}) at (${char.position.x}, ${char.position.y})`);
    });

    // Projectiles
    this.logProjectiles();

    // Effects
    this.logEffects();

    console.log('================================\n');
  }

  /**
   * Simuliert einen kompletten Kampf
   */
  public simulateCombat(): void {
    console.log('⚔️ Starting Combat Simulation...');

    // Player 1 attacks
    this.startRangedAttack();

    // Wait a bit, then player 2 attacks
    setTimeout(() => {
      this.animationEngine.playAnimation('player2', 'ranged');
      console.log('🎯 Player 2 starts ranged attack');
    }, 1000);

    // Log status every 500ms
    const statusInterval = setInterval(() => {
      this.logSystemStatus();
    }, 500);

    // Stop after 5 seconds
    setTimeout(() => {
      clearInterval(statusInterval);
      console.log('🏁 Combat simulation complete');
    }, 5000);
  }

  /**
   * Testet verschiedene Animationen
   */
  public testAnimations(): void {
    const animations = ['idle', 'walk', 'jump', 'parry', 'attack', 'ranged', 'defeat', 'spawn'];

    console.log('🎬 Testing all animations...');

    animations.forEach((animation, index) => {
      setTimeout(() => {
        this.animationEngine.playAnimation('player1', animation);
        console.log(`▶️ Playing ${animation} animation`);
      }, index * 1000);
    });
  }

  /**
   * Testet das Kollisionssystem
   */
  public testCollisions(): void {
    console.log('💥 Testing collision system...');

    // Create projectile near target
    this.animationEngine.createProjectile(
      'test_projectile',
      { x: 200, y: 300 }, // Near player 2
      { x: 1000, y: 0 },  // Fast movement
      'player1'
    );

    console.log('🚀 Test projectile created');
  }
}

// Export für Verwendung in anderen Modulen
export default AnimationExample;

// Beispiel-Verwendung:
/*
const example = new AnimationExample();
example.startAnimationSystem();

// Start ranged attack
example.startRangedAttack();

// Log status
setTimeout(() => example.logSystemStatus(), 2000);

// Stop after 10 seconds
setTimeout(() => example.stopAnimationSystem(), 10000);
*/
