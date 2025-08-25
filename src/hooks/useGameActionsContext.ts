import { useCallback } from 'react';
import { Player, Card } from '../types/game';
import { useGameContext, GameAction } from '../context/GameContext';

// Hook that provides game actions through context dispatch
export function useGameActionsContext() {
  const { dispatch, state } = useGameContext();

  // Play a card
  const playCard = useCallback((player: Player, card: Card, targetLane?: 'innen' | 'aussen' | 'sofort') => {
    dispatch({
      type: 'PLAY_CARD',
      player,
      card,
      targetLane
    });
  }, [dispatch]);

  // Start a turn for a player
  const startTurn = useCallback((player: Player) => {
    dispatch({
      type: 'START_TURN',
      player
    });
  }, [dispatch]);

  // Draw cards for a player
  const drawCards = useCallback((player: Player, amount: number) => {
    dispatch({
      type: 'DRAW_CARDS',
      player,
      amount
    });
  }, [dispatch]);

  // Set game state directly
  const setGameState = useCallback((newState: any) => {
    dispatch({
      type: 'SET_STATE',
      state: newState
    });
  }, [dispatch]);

  // Reset the game
  const resetGame = useCallback(() => {
    dispatch({
      type: 'RESET_GAME'
    });
  }, [dispatch]);

  // Convenience methods for common game operations
  const canPlayCard = useCallback((player: Player): boolean => {
    return (state.actionPoints[player] || 0) >= 1;
  }, [state.actionPoints]);

  const getActionPoints = useCallback((player: Player): number => {
    return state.actionPoints[player] || 0;
  }, [state.actionPoints]);

  const getHand = useCallback((player: Player): Card[] => {
    return [...state.hands[player]];
  }, [state.hands]);

  const getBoard = useCallback((player: Player) => {
    return {
      innen: [...state.board[player].innen],
      aussen: [...state.board[player].aussen],
      sofort: [...state.board[player].sofort]
    };
  }, [state.board]);

  return {
    // Actions
    playCard,
    startTurn,
    drawCards,
    setGameState,
    resetGame,

    // State queries
    canPlayCard,
    getActionPoints,
    getHand,
    getBoard,

    // Raw state access
    state
  };
}
