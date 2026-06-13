export type PvpRole = 'host' | 'guest' | null;

/**
 * Module-level PvP role flag.
 *
 * Needed outside the React tree (e.g. window-event listeners in
 * useGameActions) to decide whether the local client is allowed to run
 * game logic. Host runs the full engine; guest only renders synced state
 * and forwards actions.
 */
let role: PvpRole = null;

export function setPvpRole(next: PvpRole): void {
  role = next;
}

export function getPvpRole(): PvpRole {
  return role;
}

export function isPvpGuest(): boolean {
  return role === 'guest';
}
