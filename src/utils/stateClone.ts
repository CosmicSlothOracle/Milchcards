import { GameState } from '../types/game';

/** Shallow-safe clone for setState updaters (avoids mutating prev under React Strict Mode double-invoke). */
export function cloneStateForMutation(prev: GameState): GameState {
  return {
    ...prev,
    actionPoints: { ...prev.actionPoints },
    passed: { ...prev.passed },
    hands: { 1: [...prev.hands[1]], 2: [...prev.hands[2]] },
    decks: { 1: [...prev.decks[1]], 2: [...prev.decks[2]] },
    board: {
      1: {
        ...prev.board[1],
        innen: [...prev.board[1].innen],
        aussen: [...prev.board[1].aussen],
        sofort: [...prev.board[1].sofort],
      },
      2: {
        ...prev.board[2],
        innen: [...prev.board[2].innen],
        aussen: [...prev.board[2].aussen],
        sofort: [...prev.board[2].sofort],
      },
    },
    discard: [...prev.discard],
    log: [...prev.log],
    traps: { 1: [...prev.traps[1]], 2: [...prev.traps[2]] },
    pendingWeighing: prev.pendingWeighing
      ? {
          ...prev.pendingWeighing,
          cards: prev.pendingWeighing.cards.map((c) => ({ ...c })),
          confirmed: { ...prev.pendingWeighing.confirmed },
          rollQueue: prev.pendingWeighing.rollQueue
            ? [...prev.pendingWeighing.rollQueue]
            : undefined,
          rollIndex: prev.pendingWeighing.rollIndex,
          results: prev.pendingWeighing.results
            ? prev.pendingWeighing.results.map((c) => ({ ...c }))
            : undefined,
        }
      : undefined,
    korruptionsPegel: prev.korruptionsPegel,
    politicalCapital: prev.politicalCapital
      ? { 1: prev.politicalCapital[1], 2: prev.politicalCapital[2] }
      : { 1: 0, 2: 0 },
    leaders: prev.leaders
      ? {
          1: prev.leaders[1] ? { ...prev.leaders[1] } : null,
          2: prev.leaders[2] ? { ...prev.leaders[2] } : null,
        }
      : prev.leaders,
    effectFlags: {
      1: { ...(prev.effectFlags?.[1] || {}) },
      2: { ...(prev.effectFlags?.[2] || {}) },
    } as GameState['effectFlags'],
    permanentSlots: {
      1: { ...prev.permanentSlots[1] },
      2: { ...prev.permanentSlots[2] },
    },
  };
}
