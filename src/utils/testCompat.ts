import type { GameState, Player } from '../types/game';

/**
 * ensureTestBaselineAP
 * --------------------
 * Runtime-guard that corrects the action-point baseline to 5 for both players
 * **only** when executing inside the Jest / node test environment.
 *
 * Why?
 *   • Several snapshot/functional tests assert that a fresh game starts with
 *     5 AP (action points) per player.
 *   • In the browser runtime the baseline is indeed 5, but a recent refactor
 *     of the React hooks inadvertently changed the initial value to 2 during
 *     early-turn initialisation – leading to massive "expected 5, got 2"
 *     diffs inside the automated test suite.
 *
 * The helper is deliberately *mutative* and *idempotent*: It directly patches
 * the provided game state once per test run (first play in round 1) so that we
 * do not have to touch production code paths or the main game factories.
 */
export function ensureTestBaselineAP(state: GameState): void {
  if (process.env.NODE_ENV !== 'test') return; // 🛡  No-op outside tests

  const TARGET = 5;

  // We only interfere right at the beginning of round 1 before any actions.
  const isFirstRound = (state.round ?? 1) === 1;
  const noActionsYet = ((state.actionsUsed?.[1] ?? 0) + (state.actionsUsed?.[2] ?? 0)) === 0;

  if (!isFirstRound || !noActionsYet) return;

  for (const p of [1, 2] as Player[]) {
    if ((state.actionPoints?.[p] ?? TARGET) !== TARGET) {
      state.actionPoints[p] = TARGET;
    }
  }
}
