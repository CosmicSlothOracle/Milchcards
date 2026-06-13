import { GameState } from '../types/game';

/**
 * GameState <-> JSON string for network sync.
 *
 * The state is almost plain JSON; only `shields` is a Set and the transient
 * `_effectQueue` must not travel (guest never runs the engine).
 */
const SET_MARKER = '__pvp_set__';

export function serializeGameState(state: GameState): string {
  const { _effectQueue, ...rest } = state as any;
  return JSON.stringify(rest, (_key, value) => {
    if (value instanceof Set) {
      return { [SET_MARKER]: Array.from(value) };
    }
    return value;
  });
}

export function deserializeGameState(json: string): GameState {
  const parsed = JSON.parse(json, (_key, value) => {
    if (value && typeof value === 'object' && SET_MARKER in value) {
      return new Set(value[SET_MARKER]);
    }
    return value;
  });
  parsed._effectQueue = [];
  if (!parsed.shields) parsed.shields = new Set();
  return parsed as GameState;
}
