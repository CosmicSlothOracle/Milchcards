import { useCallback, useState } from 'react';
import { GameState, Player } from '../types/game';
import { takeTurn as aiTakeTurn, Difficulty } from '../ai/aiPlayer';

export function useGameAI(
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  log: (msg: string) => void,
  playCard?: (player: Player, handIndex: number, lane?: 'innen' | 'aussen') => void,
  passTurn?: (player: Player) => void
) {
  const aiEnabled = gameState.aiEnabled?.[2] ?? false;
  const [aiPreset, setAiPreset] = useState<string>('');

  const setAiEnabledWithLog = useCallback((enabled: boolean) => {
    setGameState(prev => ({
      ...prev,
      aiEnabled: {
        1: prev.aiEnabled?.[1] ?? false,
        2: enabled
      }
    }));

    if (enabled) {
      setAiPreset('');
    }
  }, [setGameState]);

  const setAiPresetWithLog = useCallback((preset: string) => {
    if (aiEnabled) {
      setAiPreset(preset);
    }
  }, [aiEnabled]);

  const runAITurn = useCallback(() => {
    const difficulty: Difficulty = 'medium';
    setTimeout(() => {
      try {
        if (!playCard || !passTurn) {
          log('❌ AI: playCard/passTurn handlers missing');
          return;
        }
        aiTakeTurn(gameState, difficulty, log, { playCard, passTurn });
      } catch (err) {
        console.error('AI execution error', err);
        log('❌ AI execution error');
      }
    }, 50);
  }, [log, gameState, playCard, passTurn]);

  const canUsePutinDoubleIntervention = useCallback((player: Player): boolean => {
    const board = gameState.board[player];
    const allCards = [...board.innen, ...board.aussen].filter(c => c.kind === 'pol') as any[];
    const putin = allCards.find(c => c.name === 'Vladimir Putin');

    if (!putin || putin.deactivated || putin._activeUsed) return false;

    const interventions = gameState.hands[player].filter(c => c.kind === 'spec');
    return interventions.length >= 2;
  }, [gameState]);

  const executePutinDoubleIntervention = useCallback((_interventionCardIds: number[]) => {
    setGameState(prev => {
      log(`🤖 Putin setzt doppelte Intervention ein`);
      return prev;
    });
  }, [log, setGameState]);

  return {
    runAITurn,
    canUsePutinDoubleIntervention,
    executePutinDoubleIntervention,
    aiEnabled,
    setAiEnabled: setAiEnabledWithLog,
    aiPreset,
    setAiPreset: setAiPresetWithLog,
  };
}
