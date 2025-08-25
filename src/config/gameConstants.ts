/**
 * Zentrale Spielkonstanten - Single Source of Truth
 * Alle Spiellogik und Tests müssen diese Konstanten importieren
 */

// AP-System
export const AP_START = 2; // Real game starts with 2 AP per player
export const AP_CAP = Number.MAX_SAFE_INTEGER; // Unlimited AP cap in simplified system
export const ACTIONS_PER_TURN = Number.MAX_SAFE_INTEGER; // No action limit per turn

// Initiative-System
export const MAX_DISCOUNT = 2;
export const MAX_REFUND = 2;

// Karten-Limits
export const HAND_SIZE_LIMIT = 10;
export const BOARD_ROW_LIMIT = 5;

// Timing
export const TURN_TIME_LIMIT = 60; // Sekunden

// Debug
export const DEBUG_MODE = process.env.NODE_ENV === 'development';
