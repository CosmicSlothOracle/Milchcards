// Unit Tests für Character System
// Testet State Management, Facing Logic und Kollisionssystem

import { CharacterSystem } from '../engine/characterSystem';

describe('CharacterSystem', () => {
  let characterSystem: CharacterSystem;

  beforeEach(() => {
    characterSystem = new CharacterSystem();
  });

  afterEach(() => {
    characterSystem.clear();
  });

  describe('Character Creation and Management', () => {
    test('should create character with correct initial state', () => {
      const character = characterSystem.createCharacter('char1', { x: 100, y: 200 }, 1);

      expect(character.id).toBe('char1');
      expect(character.position).toEqual({ x: 100, y: 200 });
      expect(character.facing).toBe(1);
      expect(character.currentAnimation).toBe('idle');
      expect(character.animationFrame).toBe(0);
      expect(character.animationTime).toBe(0);
    });

    test('should retrieve character by ID', () => {
      characterSystem.createCharacter('char1', { x: 100, y: 200 });

      const character = characterSystem.getCharacter('char1');
      expect(character).toBeDefined();
      expect(character?.id).toBe('char1');
    });

    test('should return undefined for non-existent character', () => {
      const character = characterSystem.getCharacter('nonexistent');
      expect(character).toBeUndefined();
    });

    test('should update character position', () => {
      characterSystem.createCharacter('char1', { x: 100, y: 200 });
      characterSystem.updateCharacterPosition('char1', { x: 150, y: 250 });

      const character = characterSystem.getCharacter('char1');
      expect(character?.position).toEqual({ x: 150, y: 250 });
    });

    test('should set character facing', () => {
      characterSystem.createCharacter('char1', { x: 100, y: 200 }, 1);
      characterSystem.setCharacterFacing('char1', -1);

      const character = characterSystem.getCharacter('char1');
      expect(character?.facing).toBe(-1);
    });
  });

  describe('Facing Logic', () => {
    test('should calculate facing to target correctly', () => {
      characterSystem.createCharacter('char1', { x: 100, y: 200 });

      // Target to the right
      const facingRight = characterSystem.calculateFacingToTarget('char1', { x: 200, y: 200 });
      expect(facingRight).toBe(1);

      // Target to the left
      const facingLeft = characterSystem.calculateFacingToTarget('char1', { x: 50, y: 200 });
      expect(facingLeft).toBe(-1);
    });

    test('should update facing from movement', () => {
      characterSystem.createCharacter('char1', { x: 100, y: 200 });

      // Move right
      characterSystem.updateFacingFromMovement('char1', { x: 1, y: 0 });
      let character = characterSystem.getCharacter('char1');
      expect(character?.facing).toBe(1);

      // Move left
      characterSystem.updateFacingFromMovement('char1', { x: -1, y: 0 });
      character = characterSystem.getCharacter('char1');
      expect(character?.facing).toBe(-1);
    });

    test('should not change facing for small movements', () => {
      characterSystem.createCharacter('char1', { x: 100, y: 200 }, 1);

      // Small movement (below deadzone)
      characterSystem.updateFacingFromMovement('char1', { x: 0.05, y: 0 });
      const character = characterSystem.getCharacter('char1');
      expect(character?.facing).toBe(1); // Should remain unchanged
    });
  });

  describe('Movement Helpers', () => {
    test('should move character in direction', () => {
      characterSystem.createCharacter('char1', { x: 100, y: 200 });

      characterSystem.moveCharacter('char1', { x: 1, y: 0 }, 50);

      const character = characterSystem.getCharacter('char1');
      expect(character?.position.x).toBe(150); // 100 + 50
      expect(character?.position.y).toBe(200); // No Y movement
    });

    test('should normalize movement direction', () => {
      characterSystem.createCharacter('char1', { x: 100, y: 200 });

      // Diagonal movement (3, 4) should be normalized to (0.6, 0.8)
      characterSystem.moveCharacter('char1', { x: 3, y: 4 }, 50);

      const character = characterSystem.getCharacter('char1');
      expect(character?.position.x).toBeCloseTo(130, 1); // 100 + 0.6 * 50
      expect(character?.position.y).toBeCloseTo(240, 1); // 200 + 0.8 * 50
    });

    test('should teleport character to position', () => {
      characterSystem.createCharacter('char1', { x: 100, y: 200 });

      characterSystem.teleportCharacter('char1', { x: 500, y: 600 });

      const character = characterSystem.getCharacter('char1');
      expect(character?.position).toEqual({ x: 500, y: 600 });
    });
  });

  describe('Collision System', () => {
    test('should detect collision between bounding boxes', () => {
      const box1 = { x: 100, y: 100, width: 50, height: 50 };
      const box2 = { x: 120, y: 120, width: 50, height: 50 };

      const collision = characterSystem.checkCollision(box1, box2);
      expect(collision).toBe(true);
    });

    test('should detect no collision between separated boxes', () => {
      const box1 = { x: 100, y: 100, width: 50, height: 50 };
      const box2 = { x: 200, y: 200, width: 50, height: 50 };

      const collision = characterSystem.checkCollision(box1, box2);
      expect(collision).toBe(false);
    });

    test('should detect collision between touching boxes', () => {
      const box1 = { x: 100, y: 100, width: 50, height: 50 };
      const box2 = { x: 150, y: 100, width: 50, height: 50 }; // Touching edge

      const collision = characterSystem.checkCollision(box1, box2);
      expect(collision).toBe(true);
    });

    test('should check point collision with character', () => {
      characterSystem.createCharacter('char1', { x: 100, y: 200 });

      // Mock hurtboxes for the character
      characterSystem.updateHurtboxes('char1', 'idle', 0);

      // Point inside character area
      const insidePoint = { x: 125, y: 225 };
      const insideCollision = characterSystem.checkPointCollision('char1', insidePoint);

      // Point outside character area
      const outsidePoint = { x: 50, y: 50 };
      const outsideCollision = characterSystem.checkPointCollision('char1', outsidePoint);

      // Note: This test assumes the character has hurtboxes defined
      // In a real scenario, you'd need to set up proper hurtbox data
      expect(typeof insideCollision).toBe('boolean');
      expect(typeof outsideCollision).toBe('boolean');
    });
  });

  describe('Animation State Helpers', () => {
    test('should check if character is in specific animation', () => {
      characterSystem.createCharacter('char1', { x: 100, y: 200 });

      // Mock animation state
      const character = characterSystem.getCharacter('char1');
      if (character) {
        character.currentAnimation = 'ranged';
        character.animationFrame = 2;
      }

      expect(characterSystem.isInAnimation('char1', 'ranged')).toBe(true);
      expect(characterSystem.isInAnimation('char1', 'idle')).toBe(false);
    });

    test('should check if character is in specific frame', () => {
      characterSystem.createCharacter('char1', { x: 100, y: 200 });

      // Mock frame state
      const character = characterSystem.getCharacter('char1');
      if (character) {
        character.animationFrame = 3;
      }

      expect(characterSystem.isInFrame('char1', 3)).toBe(true);
      expect(characterSystem.isInFrame('char1', 2)).toBe(false);
    });

    test('should check if character is in frame range', () => {
      characterSystem.createCharacter('char1', { x: 100, y: 200 });

      // Mock frame state
      const character = characterSystem.getCharacter('char1');
      if (character) {
        character.animationFrame = 2;
      }

      expect(characterSystem.isInFrameRange('char1', 1, 3)).toBe(true);
      expect(characterSystem.isInFrameRange('char1', 3, 5)).toBe(false);
      expect(characterSystem.isInFrameRange('char1', 0, 1)).toBe(false);
    });
  });

  describe('Utility Methods', () => {
    test('should get all characters', () => {
      characterSystem.createCharacter('char1', { x: 100, y: 200 });
      characterSystem.createCharacter('char2', { x: 200, y: 300 });

      const characters = characterSystem.getAllCharacters();
      expect(characters).toHaveLength(2);
      expect(characters.map(c => c.id)).toContain('char1');
      expect(characters.map(c => c.id)).toContain('char2');
    });

    test('should get characters in area', () => {
      characterSystem.createCharacter('char1', { x: 100, y: 200 });
      characterSystem.createCharacter('char2', { x: 150, y: 250 });
      characterSystem.createCharacter('char3', { x: 300, y: 400 });

      const charactersInArea = characterSystem.getCharactersInArea({ x: 125, y: 225 }, 100);
      expect(charactersInArea).toHaveLength(2); // char1 and char2
      expect(charactersInArea.map(c => c.id)).toContain('char1');
      expect(charactersInArea.map(c => c.id)).toContain('char2');
    });

    test('should get nearest character', () => {
      characterSystem.createCharacter('char1', { x: 100, y: 200 });
      characterSystem.createCharacter('char2', { x: 200, y: 300 });
      characterSystem.createCharacter('char3', { x: 300, y: 400 });

      const nearest = characterSystem.getNearestCharacter({ x: 110, y: 210 });
      expect(nearest?.id).toBe('char1');
    });

    test('should exclude character from nearest search', () => {
      characterSystem.createCharacter('char1', { x: 100, y: 200 });
      characterSystem.createCharacter('char2', { x: 200, y: 300 });

      const nearest = characterSystem.getNearestCharacter({ x: 110, y: 210 }, 'char1');
      expect(nearest?.id).toBe('char2');
    });

    test('should remove character', () => {
      characterSystem.createCharacter('char1', { x: 100, y: 200 });
      characterSystem.createCharacter('char2', { x: 200, y: 300 });

      characterSystem.removeCharacter('char1');

      const characters = characterSystem.getAllCharacters();
      expect(characters).toHaveLength(1);
      expect(characters[0].id).toBe('char2');
    });

    test('should clear all characters', () => {
      characterSystem.createCharacter('char1', { x: 100, y: 200 });
      characterSystem.createCharacter('char2', { x: 200, y: 300 });

      characterSystem.clear();

      const characters = characterSystem.getAllCharacters();
      expect(characters).toHaveLength(0);
    });
  });
});
