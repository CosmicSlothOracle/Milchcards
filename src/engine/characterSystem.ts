// Character System - State Management und Facing Logic
// Erweitert die Animation Engine um Character-spezifische Logik

import type {
  CharacterState,
  Vector2,
  BoundingBox,
  FrameHitbox
} from '../types/animation';
import { getFrameHitboxes } from '../data/animationRegistry';

export class CharacterSystem {
  private characters: Map<string, CharacterState> = new Map();
  private hurtboxes: Map<string, BoundingBox[]> = new Map();

  // === CHARACTER STATE MANAGEMENT ===

  createCharacter(id: string, position: Vector2, facing: -1 | 1 = 1): CharacterState {
    const character: CharacterState = {
      id,
      position: { ...position },
      facing,
      currentAnimation: 'idle',
      animationFrame: 0,
      animationTime: 0
    };

    this.characters.set(id, character);
    return character;
  }

  getCharacter(id: string): CharacterState | undefined {
    return this.characters.get(id);
  }

  updateCharacterPosition(id: string, position: Vector2): void {
    const character = this.characters.get(id);
    if (character) {
      character.position = { ...position };
    }
  }

  setCharacterFacing(id: string, facing: -1 | 1): void {
    const character = this.characters.get(id);
    if (character) {
      character.facing = facing;
    }
  }

  // === FACING LOGIC ===

  // Berechnet Facing basierend auf Position relativ zu einem Ziel
  calculateFacingToTarget(characterId: string, targetPosition: Vector2): -1 | 1 {
    const character = this.characters.get(characterId);
    if (!character) return 1;

    return targetPosition.x > character.position.x ? 1 : -1;
  }

  // Setzt Facing automatisch basierend auf Bewegung
  updateFacingFromMovement(characterId: string, velocity: Vector2): void {
    if (Math.abs(velocity.x) > 0.1) { // Deadzone für kleine Bewegungen
      this.setCharacterFacing(characterId, velocity.x > 0 ? 1 : -1);
    }
  }

  // === HITBOX/HURTBOX SYSTEM ===

  // Aktualisiert Hurtboxen basierend auf aktueller Animation und Frame
  updateHurtboxes(characterId: string, animationName: string, frame: number): void {
    const hitboxes = getFrameHitboxes(animationName, frame);
    const hurtboxes = hitboxes
      .filter(hitbox => hitbox.type === 'hurt')
      .map(hitbox => this.transformHitboxToWorldSpace(characterId, hitbox.bounds));

    this.hurtboxes.set(characterId, hurtboxes);
  }

  // Transformiert Hitbox von Sprite-Space zu World-Space
  private transformHitboxToWorldSpace(characterId: string, bounds: BoundingBox): BoundingBox {
    const character = this.characters.get(characterId);
    if (!character) return bounds;

    // Berücksichtigt Facing für X-Koordinaten
    const facingMultiplier = character.facing;

    return {
      x: character.position.x + (bounds.x * facingMultiplier),
      y: character.position.y + bounds.y,
      width: bounds.width,
      height: bounds.height
    };
  }

  // Prüft Kollision zwischen zwei BoundingBoxen
  checkCollision(box1: BoundingBox, box2: BoundingBox): boolean {
    return !(
      box1.x + box1.width < box2.x ||
      box2.x + box2.width < box1.x ||
      box1.y + box1.height < box2.y ||
      box2.y + box2.height < box1.y
    );
  }

  // Prüft Kollision zwischen Character und einem Punkt
  checkPointCollision(characterId: string, point: Vector2): boolean {
    const hurtboxes = this.hurtboxes.get(characterId) || [];

    return hurtboxes.some(hurtbox =>
      point.x >= hurtbox.x &&
      point.x <= hurtbox.x + hurtbox.width &&
      point.y >= hurtbox.y &&
      point.y <= hurtbox.y + hurtbox.height
    );
  }

  // Prüft Kollision zwischen zwei Characters
  checkCharacterCollision(characterId1: string, characterId2: string): boolean {
    const hurtboxes1 = this.hurtboxes.get(characterId1) || [];
    const hurtboxes2 = this.hurtboxes.get(characterId2) || [];

    for (const box1 of hurtboxes1) {
      for (const box2 of hurtboxes2) {
        if (this.checkCollision(box1, box2)) {
          return true;
        }
      }
    }

    return false;
  }

  // === ANIMATION STATE HELPERS ===

  // Prüft ob Character in einer bestimmten Animation ist
  isInAnimation(characterId: string, animationName: string): boolean {
    const character = this.characters.get(characterId);
    return character?.currentAnimation === animationName;
  }

  // Prüft ob Character in einem bestimmten Frame ist
  isInFrame(characterId: string, frame: number): boolean {
    const character = this.characters.get(characterId);
    return character?.animationFrame === frame;
  }

  // Prüft ob Character in einem Frame-Bereich ist
  isInFrameRange(characterId: string, startFrame: number, endFrame: number): boolean {
    const character = this.characters.get(characterId);
    if (!character) return false;

    return character.animationFrame >= startFrame && character.animationFrame <= endFrame;
  }

  // === MOVEMENT HELPERS ===

  // Bewegt Character in eine Richtung
  moveCharacter(characterId: string, direction: Vector2, speed: number): void {
    const character = this.characters.get(characterId);
    if (!character) return;

    // Normalisiere Richtung
    const length = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
    if (length === 0) return;

    const normalizedDirection = {
      x: direction.x / length,
      y: direction.y / length
    };

    // Update Position
    character.position.x += normalizedDirection.x * speed;
    character.position.y += normalizedDirection.y * speed;

    // Update Facing basierend auf Bewegung
    this.updateFacingFromMovement(characterId, normalizedDirection);
  }

  // Teleportiert Character zu einer Position
  teleportCharacter(characterId: string, position: Vector2): void {
    const character = this.characters.get(characterId);
    if (character) {
      character.position = { ...position };
    }
  }

  // === UTILITY METHODS ===

  // Gibt alle Characters zurück
  getAllCharacters(): CharacterState[] {
    return Array.from(this.characters.values());
  }

  // Gibt Characters in einem bestimmten Bereich zurück
  getCharactersInArea(center: Vector2, radius: number): CharacterState[] {
    return this.getAllCharacters().filter(character => {
      const distance = Math.sqrt(
        Math.pow(character.position.x - center.x, 2) +
        Math.pow(character.position.y - center.y, 2)
      );
      return distance <= radius;
    });
  }

  // Gibt den nächsten Character zu einer Position zurück
  getNearestCharacter(position: Vector2, excludeId?: string): CharacterState | null {
    let nearest: CharacterState | null = null;
    let nearestDistance = Infinity;

    for (const character of this.getAllCharacters()) {
      if (excludeId && character.id === excludeId) continue;

      const distance = Math.sqrt(
        Math.pow(character.position.x - position.x, 2) +
        Math.pow(character.position.y - position.y, 2)
      );

      if (distance < nearestDistance) {
        nearest = character;
        nearestDistance = distance;
      }
    }

    return nearest;
  }

  // Entfernt Character aus dem System
  removeCharacter(characterId: string): void {
    this.characters.delete(characterId);
    this.hurtboxes.delete(characterId);
  }

  // Leert das gesamte System
  clear(): void {
    this.characters.clear();
    this.hurtboxes.clear();
  }
}
