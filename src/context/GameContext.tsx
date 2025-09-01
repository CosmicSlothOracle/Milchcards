import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { GameState, Player, Card } from '../types/game';
import { GameEngine } from '../engine/gameEngine';

// Action types for the reducer
export type GameAction =
  | { type: 'PLAY_CARD'; player: Player; card: Card; targetLane?: 'innen' | 'aussen' | 'sofort' }
  | { type: 'START_TURN'; player: Player }
  | { type: 'DRAW_CARDS'; player: Player; amount: number }
  | { type: 'SET_STATE'; state: GameState }
  | { type: 'RESET_GAME' };

// Initial game state
const createInitialState = (): GameState => ({
  actionPoints: { 1: 2, 2: 2 },
  hands: { 1: [], 2: [] },
  decks: { 1: [], 2: [] },
  board: {
    1: { innen: [], aussen: [], sofort: [] },
    2: { innen: [], aussen: [], sofort: [] }
  },
  discard: [],
  log: [],
  round: 1,
  current: 1,
  passed: { 1: false, 2: false },
  actionsUsed: { 1: 0, 2: 0 },
      permanentSlots: { 1: { government: null, public: null, initiativePermanent: null }, 2: { government: null, public: null, initiativePermanent: null } },
  shields: new Set(),
  traps: { 1: [], 2: [] },
  activeRefresh: { 1: 0, 2: 0 },
  roundsWon: { 1: 0, 2: 0 },
  effectFlags: {
    1: { opportunistActive: false, markZuckerbergUsed: false },
    2: { opportunistActive: false, markZuckerbergUsed: false }
  },
  _effectQueue: []
});

// Game reducer
function gameReducer(state: GameState, action: GameAction): GameState {
  const engine = new GameEngine(state);

  switch (action.type) {
    case 'PLAY_CARD': {
      const success = engine.playCard(action.player, action.card, action.targetLane);
      if (success) {
        return engine.getState();
      }
      // If play failed, return current state unchanged
      return state;
    }

    case 'START_TURN': {
      engine.startTurn(action.player);
      return engine.getState();
    }

    case 'DRAW_CARDS': {
      engine.drawCards(action.player, action.amount);
      return engine.getState();
    }

    case 'SET_STATE': {
      return action.state;
    }

    case 'RESET_GAME': {
      return createInitialState();
    }

    default:
      return state;
  }
}

// Context interface
interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  engine: GameEngine;
}

// Create context
const GameContext = createContext<GameContextType | undefined>(undefined);

// Provider component
interface GameProviderProps {
  children: ReactNode;
  initialState?: GameState;
}

export function GameProvider({ children, initialState }: GameProviderProps) {
  const [state, dispatch] = useReducer(gameReducer, initialState || createInitialState());

  // Create engine instance for the current state
  const engine = new GameEngine(state);

  const value: GameContextType = {
    state,
    dispatch,
    engine
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

// Custom hook to use the game context
export function useGameContext(): GameContextType {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return context;
}

// Convenience hooks for common operations
export function useGameState(): GameState {
  return useGameContext().state;
}

export function useGameDispatch(): React.Dispatch<GameAction> {
  return useGameContext().dispatch;
}

export function useGameEngine(): GameEngine {
  return useGameContext().engine;
}
