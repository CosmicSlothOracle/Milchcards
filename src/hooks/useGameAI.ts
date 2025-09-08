import { useCallback, useState } from 'react';
import { GameState, Card, Player } from '../types/game';
import { sumRow, getCardActionPointCost } from '../utils/gameUtils';
import { takeTurn as aiTakeTurn, Difficulty } from '../ai/aiPlayer';

export function useGameAI(
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  log: (msg: string) => void
) {
  const aiEnabled = gameState.aiEnabled?.[2] ?? false;
  const [aiPreset, setAiPreset] = useState<string>('');

  // Debug logging for AI state changes (only in development) - disabled to reduce log spam
  // if (process.env.NODE_ENV === 'development') {
  //   console.log('🔧 DEBUG: useGameAI state - aiEnabled:', aiEnabled, 'aiPreset:', aiPreset);
  // }

  // AI enabled state - controlled by game logic
  // const forceAIEnabled = true; // Removed force-enable hack

  // Enhanced setAiEnabled with logging
  const setAiEnabledWithLog = useCallback((enabled: boolean) => {
    setGameState(prev => ({
      ...prev,
      aiEnabled: {
        1: prev.aiEnabled?.[1] ?? false,
        2: enabled
      }
    }));

    // Only set preset when AI is enabled
    if (enabled) {
      setAiPreset('');
    }
  }, [setGameState]);

  // Enhanced setAiPreset with logging - only when AI is enabled
  const setAiPresetWithLog = useCallback((preset: string) => {
    if (aiEnabled) {
      // console.log('🔧 DEBUG: setAiPreset called with:', preset);
      setAiPreset(preset);
    } else {
      // console.log('🔧 DEBUG: setAiPreset ignored - AI not enabled');
    }
  }, [aiEnabled]);

  const runAITurn = useCallback(() => {
    // console.log('🔧 DEBUG: runAITurn called - aiEnabled:', aiEnabled, 'current player:', gameState.current);

    // Determine difficulty mapping (default to medium)
    const difficulty: Difficulty = 'medium';

    // Schedule AI execution to avoid React state update conflicts
    setTimeout(() => {
      try {
        aiTakeTurn(setGameState, difficulty, log);
      } catch (err) {
        console.error('AI execution error', err);
        log('❌ AI execution error');
      }
    }, 50);
  }, [aiEnabled, log, gameState.current, setGameState, aiPreset]);

  const canUsePutinDoubleIntervention = useCallback((player: Player): boolean => {
    const board = gameState.board[player];
    const allCards = [...board.innen, ...board.aussen].filter(c => c.kind === 'pol') as any[];
    const putin = allCards.find(c => c.name === 'Vladimir Putin');

    if (!putin || putin.deactivated || putin._activeUsed) return false;

    const interventions = gameState.hands[player].filter(c => c.kind === 'spec');
    return interventions.length >= 2;
  }, [gameState]);

  const executePutinDoubleIntervention = useCallback((interventionCardIds: number[]) => {
    setGameState(prev => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const player = prev.current;
      // Putin special ability implementation would go here
      log(`🤖 Putin setzt doppelte Intervention ein`);
      return prev;
    });
  }, [log]);

  return {
    runAITurn,
    canUsePutinDoubleIntervention,
    executePutinDoubleIntervention,
    aiEnabled,
    setAiEnabled: setAiEnabledWithLog,
    aiPreset,
    setAiPreset: setAiPreset, // Use original function temporarily
  };
}
