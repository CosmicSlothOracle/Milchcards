import React from 'react';
import { GameState, Player } from '../types/game';

interface EndTurnButtonProps {
  gameState: GameState;
  currentPlayer: Player;
  onEndTurn: () => void;
  disabled?: boolean;
}

export const EndTurnButton: React.FC<EndTurnButtonProps> = ({
  gameState,
  currentPlayer,
  onEndTurn,
  disabled = false
}) => {
  // Button ist disabled wenn:
  // - Explizit disabled gesetzt
  // - Zug wird bereits beendet (isEndingTurn)
  // - Nicht der aktuelle Spieler am Zug ist
  const isDisabled = disabled || gameState.isEndingTurn || gameState.current !== currentPlayer;

  const getButtonText = () => {
    if (gameState.isEndingTurn) {
      return 'Ending turn...';
    }
    return 'End turn';
  };

  const getButtonClass = () => {
    const baseClass = "px-4 py-2 rounded-lg font-medium transition-all duration-200";

    if (isDisabled) {
      return `${baseClass} bg-gray-400 text-gray-600 cursor-not-allowed opacity-50`;
    }

    return `${baseClass} bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl`;
  };

  return (
    <button
      onClick={onEndTurn}
      disabled={isDisabled}
      className={getButtonClass()}
      title={isDisabled ? 'Wait for effect resolution or other player is active' : 'End turn and draw card'}
    >
      {getButtonText()}
    </button>
  );
};
