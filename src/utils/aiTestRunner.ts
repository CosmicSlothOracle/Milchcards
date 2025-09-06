import { GameState, Card, Player, createDefaultEffectFlags } from '../types/game';
import { PRESET_DECKS } from '../data/gameData';
import { buildDeckFromEntries, getCardActionPointCost } from './gameUtils';
import { decideBestAction, Difficulty } from '../ai/aiPlayer';
import { emptyBoard } from '../state/board';
import { GameLogger, gameLogger } from './gameLogger';

// Enhanced AI opponent with logging integration
class LoggingAIPlayer {
  private player: Player;
  private opponent: Player;
  private logger: GameLogger;

  constructor(player: Player, logger: GameLogger) {
    this.player = player;
    this.opponent = player === 1 ? 2 : 1;
    this.logger = logger;
  }

  makeTurn(gameState: GameState): GameState {
    const hand = gameState.hands[this.player];
    const availableAP = gameState.actionPoints[this.player];

    // Check if should pass (only based on AP, no action limit)
    if (availableAP <= 0) {
      const newGameState = {
        ...gameState,
        passed: { ...gameState.passed, [this.player]: true },
        _passOrder: [ ...(gameState as any)._passOrder || [], this.player ]
      } as any;

      this.logger.logPass(this.player, gameState);
      return newGameState;
    }

    // Analyze game state
    const myInfluence = this.calculateInfluence(gameState.board[this.player].aussen);
    const opponentInfluence = this.calculateInfluence(gameState.board[this.opponent].aussen);
    const influenceDiff = opponentInfluence - myInfluence;

    // Find best playable card via shared decision helper (keeps AIs consistent)
    const difficulty: Difficulty = 'hard';
    const action = decideBestAction(gameState, this.player, difficulty);

    if (action.type === 'pass') {
      const newGameState = { ...gameState, passed: { ...gameState.passed, [this.player]: true } } as any;
      newGameState._passOrder = [ ...(gameState as any)._passOrder || [], this.player ];
      return newGameState;
    }

    // Map AIAction to LoggingAIPlayer candidate format for playCard
    const index = action.type === 'play' ? action.index : -1;
    const card = hand[index];
    const lane = action.type === 'play' ? action.lane : null;

    const bestCard = { index, card, priority: 0, reason: 'decideBestAction', apCost: getCardActionPointCost(card, gameState, this.player), lane } as any;

    if (!bestCard) {
      // Pass if no playable cards
      const newGameState = {
        ...gameState,
        passed: { ...gameState.passed, [this.player]: true }
      };

      this.logger.logPass(this.player, gameState);
      return newGameState;
    }

    // Play the selected card
    return this.playCard(bestCard, gameState);
  }

  private calculateInfluence(cards: Card[]): number {
    return cards
      .filter(c => c.kind === 'pol')
      .reduce((sum, c) => sum + (c as any).influence, 0);
  }

  private selectBestCard(hand: Card[], gameState: GameState, influenceDiff: number, availableAP: number) {
    const candidates = hand.map((card, index) => {
      let priority = 0;
      let reason = '';
      let apCost = 1;
      let lane: 'innen' | 'aussen' | null = null;

      if (card.kind === 'pol') {
        const polCard = card as any;
        // Determine lane by tag OR tier (T). Tier 2 (T>=2) cards are government by default.
        const isGovByTier = (polCard.T && polCard.T >= 2);
        const isGovByTag = polCard.tag === 'Staatsoberhaupt' || polCard.tag === 'Regierungschef' || polCard.tag === 'Diplomat';
        const allowedLane = (isGovByTier || isGovByTag) ? 'aussen' : 'innen';

        // Check if lane has space
        if (gameState.board[this.player][allowedLane].length >= 5) {
          return null;
        }

        lane = allowedLane;

        // Priority calculation
        if (allowedLane === 'aussen') {
          if (influenceDiff > 5) {
            priority = 100 + polCard.influence;
            reason = 'Catch up on influence';
          } else if (polCard.tag === 'Leadership' || polCard.tag === 'Diplomat') {
            priority = 80 + polCard.influence;
            reason = 'Synergy play';
          } else {
            priority = 60 + polCard.influence;
            reason = 'Government building';
          }
        } else {
          priority = 30 + polCard.influence;
          reason = 'Public support';
        }
      } else if (card.kind === 'spec') {
        const specCard = card as any;

        if (specCard.type === 'Intervention') {
          const opponentHasMedia = gameState.board[this.opponent].innen.some(c =>
            c.name.includes('Oprah') || c.name.includes('Zuckerberg'));
          const opponentHasStrongGov = gameState.board[this.opponent].aussen.some(c =>
            (c as any).T === 2);

          if (specCard.name === 'Fake News-Kampagne' && opponentHasMedia) {
            priority = 95;
            reason = 'Counter media opponent';
          } else if (specCard.name === 'Whistleblower' && opponentHasStrongGov) {
            priority = 90;
            reason = 'Weaken strong government';
          } else {
            priority = 40;
            reason = 'General intervention';
          }
        } else {
          if (influenceDiff > 3) {
            priority = 85;
            reason = 'Boost influence';
          } else {
            priority = 50;
            reason = 'General initiative';
          }
        }
      }

      return {
        index,
        card,
        priority,
        reason,
        apCost,
        lane
      };
    }).filter(Boolean);

    // Sort by priority and return best
    candidates.sort((a, b) => b!.priority - a!.priority);
    return candidates[0];
  }

  private playCard(bestCard: any, gameState: GameState): GameState {
    const { card, index, lane, apCost, reason } = bestCard;
    const newGameState = { ...gameState };

    // Remove from hand
    newGameState.hands = { ...newGameState.hands };
    newGameState.hands[this.player] = [...newGameState.hands[this.player]];
    newGameState.hands[this.player].splice(index, 1);

    // Update AP
    newGameState.actionPoints = { ...newGameState.actionPoints };
    newGameState.actionPoints[this.player] -= apCost;

    // Add to appropriate location
    if (lane) {
      newGameState.board = { ...newGameState.board };
      const playerBoard = { ...newGameState.board[this.player] };
      (playerBoard as any)[lane] = [...(playerBoard as any)[lane], card];
      newGameState.board[this.player] = playerBoard;

      // Log card play
      this.logger.logCardPlay(
        this.player,
        card,
        lane,
        apCost,
        reason,
        this.getMechanicsTriggered(card, lane, gameState),
        gameState
      );
    } else if (card.kind === 'spec') {
      const specCard = card as any;
      if (specCard.type === 'Intervention') {
        newGameState.traps = { ...newGameState.traps };
        newGameState.traps[this.player] = [...newGameState.traps[this.player], card];

        // Log intervention placement
        this.logger.logCardPlay(
          this.player,
          card,
          'innen', // Default lane for logging
          apCost,
          reason,
          ['intervention_placed'],
          gameState
        );
      }
    }

    return newGameState;
  }

  private getMechanicsTriggered(card: Card, lane: 'innen' | 'aussen', gameState: GameState): string[] {
    const mechanics: string[] = ['card_played'];

    if (card.kind === 'pol') {
      const polCard = card as any;
      if (polCard.tag === 'Diplomat') {
        mechanics.push('diplomat_synergy');
      }
      if (polCard.tag === 'Leadership') {
        mechanics.push('leadership_synergy');
      }
      if (lane === 'aussen') {
        mechanics.push('government_card_played');
      } else {
        mechanics.push('public_card_played');
      }
    } else if (card.kind === 'spec') {
      const specCard = card as any;
      if (specCard.type === 'Intervention') {
        mechanics.push('intervention_set');
      } else if (specCard.type === 'Dauerhaft-Initiative') {
        mechanics.push('permanent_initiative');
      } else {
        mechanics.push('immediate_initiative');
      }
    }

    return mechanics;
  }
}

// Main simulation runner with comprehensive logging
export class AITestRunner {
  private logger: GameLogger;
  private ai1: LoggingAIPlayer;
  private ai2: LoggingAIPlayer;

  constructor() {
    this.logger = gameLogger;
    this.ai1 = new LoggingAIPlayer(1, this.logger);
    this.ai2 = new LoggingAIPlayer(2, this.logger);
  }

  async runSimulation(
    p1Preset: keyof typeof PRESET_DECKS,
    p2Preset: keyof typeof PRESET_DECKS,
    maxTurns: number = 200
  ): Promise<SimulationResult> {
    console.log(`🏁 Starting AI vs AI simulation: ${p1Preset} vs ${p2Preset}`);
    console.log('='.repeat(60));

    this.logger.startGame();

    // Randomize starting player to avoid deterministic starter bias
    const gameState = this.initializeGameState(p1Preset, p2Preset);
    if (Math.random() < 0.5) gameState.current = 2; else gameState.current = 1;
    let turnCount = 0;
    let gameEnded = false;

    // Main game loop
    while (!gameEnded && turnCount < maxTurns) {
      turnCount++;
      const currentPlayer = gameState.current;

      this.logger.startTurn(currentPlayer);
      console.log(`\n🔄 Turn ${turnCount}, Round ${gameState.round}, Player ${currentPlayer}`);

      // Get current AI
      const currentAI = currentPlayer === 1 ? this.ai1 : this.ai2;

      // Make AI turn
      const newGameState = currentAI.makeTurn(gameState);

      // Copy all properties to maintain state
      Object.assign(gameState, newGameState);

      // Check for round end
      if (gameState.passed[1] && gameState.passed[2]) {
        gameState.current = gameState.current === 1 ? 2 : 1;
        const resolvedState = this.resolveRound(gameState);
        Object.assign(gameState, resolvedState);

        this.logger.logRoundEnd(
          gameState.round,
          {
            player1: this.calculateScore(gameState.board[1].aussen),
            player2: this.calculateScore(gameState.board[2].aussen)
          },
          gameState.roundsWon[1] > gameState.roundsWon[2] ? 1 : 2,
          gameState
        );

        // Check for game end
        if (gameState.gameWinner) {
          gameEnded = true;
        } else {
          // Reset for next round
          gameState.passed = { 1: false, 2: false };
          gameState.board = emptyBoard();
          gameState.traps = { 1: [], 2: [] };

          // Draw new hands
          this.drawNewHands(gameState);
        }
      } else {
        // Switch to next player
        gameState.current = currentPlayer === 1 ? 2 : 1;
        gameState.actionPoints[gameState.current] = 2;
        // No action limit reset needed
      }
    }

    const result = this.generateResult(gameState, turnCount);

    this.logger.logGameEnd(
      result.winner,
      gameState.roundsWon,
      gameState
    );

    return result;
  }

  private initializeGameState(p1Preset: keyof typeof PRESET_DECKS, p2Preset: keyof typeof PRESET_DECKS): GameState {
    const p1Deck = PRESET_DECKS[p1Preset] as any[];
    const p2Deck = PRESET_DECKS[p2Preset] as any[];

    const p1Cards = buildDeckFromEntries(p1Deck);
    const p2Cards = buildDeckFromEntries(p2Deck);

    // Shuffle decks
    const shuffledP1 = [...p1Cards].sort(() => Math.random() - 0.5);
    const shuffledP2 = [...p2Cards].sort(() => Math.random() - 0.5);

    // Deal starting hands
    const p1Hand = shuffledP1.splice(0, 5);
    const p2Hand = shuffledP2.splice(0, 5);

    return {
      round: 1,
      current: 1,
      passed: { 1: false, 2: false },
              actionPoints: { 1: 2, 2: 2 },
        actionsUsed: { 1: 0, 2: 0 },

        decks: { 1: shuffledP1, 2: shuffledP2 },
      hands: { 1: p1Hand, 2: p2Hand },
      traps: { 1: [], 2: [] },
      board: emptyBoard(),
      permanentSlots: {
        1: { government: null, public: null, initiativePermanent: null },
        2: { government: null, public: null, initiativePermanent: null },
      },
      discard: [],
      log: [],
      activeRefresh: { 1: 0, 2: 0 },
      roundsWon: { 1: 0, 2: 0 },
      gameWinner: null,
      effectFlags: {
        1: createDefaultEffectFlags(),
        2: createDefaultEffectFlags()
      }
    };
  }

  private resolveRound(gameState: GameState): GameState {
    const p1Score = this.calculateScore(gameState.board[1].aussen);
    const p2Score = this.calculateScore(gameState.board[2].aussen);

    // Fair tie-breaker: If equal scores, prefer the player who passed earlier (i.e., conservative play is rewarded),
    // otherwise fallback to first player advantage.
    let winner: Player = 1;
    if (p1Score > p2Score) winner = 1;
    else if (p2Score > p1Score) winner = 2;
    else {
      const passOrder: number[] = (gameState as any)._passOrder || [];
      if (passOrder.length >= 2) {
        // earlier passer wins
        winner = passOrder[0] as Player;
      } else {
        // fallback: first player (player 1) wins ties
        winner = 1;
      }
    }

    gameState.roundsWon[winner]++;
    gameState.round++;

    // Check for game winner
    if (gameState.roundsWon[1] >= 2) {
      gameState.gameWinner = 1;
    } else if (gameState.roundsWon[2] >= 2) {
      gameState.gameWinner = 2;
    }

    return gameState;
  }

  private drawNewHands(gameState: GameState): void {
    [1, 2].forEach(player => {
      const deck = gameState.decks[player as Player];
      const handSize = gameState.hands[player as Player].length;
      const cardsToDraw = Math.min(5 - handSize, deck.length);
      const drawnCards = deck.splice(0, cardsToDraw);
      gameState.hands[player as Player].push(...drawnCards);

      this.logger.logDrawCards(
        player as Player,
        drawnCards,
        `Round ${gameState.round} start`,
        gameState
      );
    });
  }

  private calculateScore(cards: Card[]): number {
    return cards
      .filter(c => c.kind === 'pol')
      .reduce((sum, c) => sum + (c as any).influence, 0);
  }

  private generateResult(gameState: GameState, totalTurns: number): SimulationResult {
    const analysis = this.logger.getAnalysis();

    return {
      gameId: `sim_${Date.now()}`,
      winner: gameState.gameWinner || 'draw',
      totalTurns,
      roundsPlayed: gameState.round,
      finalScores: {
        player1: this.calculateScore(gameState.board[1].aussen),
        player2: this.calculateScore(gameState.board[2].aussen)
      },
      roundsWon: gameState.roundsWon,
      duration: analysis.duration,
      mechanicsUsed: analysis.mechanicUsage,
      moveHistory: this.logger.getLogs(),
      finalBoardState: {
        player1: {
          government: gameState.board[1].aussen.map(c => c.name),
          public: gameState.board[1].innen.map(c => c.name),
          traps: gameState.traps[1].map(c => c.name)
        },
        player2: {
          government: gameState.board[2].aussen.map(c => c.name),
          public: gameState.board[2].innen.map(c => c.name),
          traps: gameState.traps[2].map(c => c.name)
        }
      },
      efficiency: analysis.efficiency
    };
  }

  // Export methods
  exportLogSummary(): string {
    return this.logger.exportSummary();
  }

  exportFullLog(): string {
    return this.logger.exportToJSON();
  }

  runMultipleSimulations(
    p1Preset: keyof typeof PRESET_DECKS,
    p2Preset: keyof typeof PRESET_DECKS,
    numGames: number,
    maxTurns: number = 200
  ): Promise<SimulationResult[]> {
    const results: SimulationResult[] = [];

    return new Promise(async (resolve) => {
      for (let i = 0; i < numGames; i++) {
        console.log(`\n🎮 Starting simulation ${i + 1}/${numGames}`);
        const result = await this.runSimulation(p1Preset, p2Preset, maxTurns);
        results.push(result);
      }

      resolve(results);
    });
  }
}

// Result interface
export interface SimulationResult {
  gameId: string;
  winner: Player | 'draw';
  totalTurns: number;
  roundsPlayed: number;
  finalScores: { player1: number; player2: number };
  roundsWon: { 1: number; 2: number };
  duration: number;
  mechanicsUsed: Record<string, any>;
  moveHistory: any[];
  finalBoardState: {
    player1: { government: string[]; public: string[]; traps: string[] };
    player2: { government: string[]; public: string[]; traps: string[] };
  };
  efficiency: {
    averageAPPerTurn: number;
    cardsPerAP: number;
    interventionsSuccessRate: number;
  };
}

// Test runner functions
export async function runSingleSimulation(
  p1Preset: keyof typeof PRESET_DECKS = 'AUTORITAERER_REALIST',
  p2Preset: keyof typeof PRESET_DECKS = 'PROGRESSIVER_AKTIVISMUS'
): Promise<SimulationResult> {
  const runner = new AITestRunner();
  return await runner.runSimulation(p1Preset, p2Preset);
}

export async function runMultipleSimulations(
  p1Preset: keyof typeof PRESET_DECKS = 'AUTORITAERER_REALIST',
  p2Preset: keyof typeof PRESET_DECKS = 'PROGRESSIVER_AKTIVISMUS',
  numGames: number = 5
): Promise<SimulationResult[]> {
  const runner = new AITestRunner();
  return await runner.runMultipleSimulations(p1Preset, p2Preset, numGames);
}

// Utility function to analyze multiple simulation results
export function analyzeSimulationResults(results: SimulationResult[]) {
  const stats = {
    totalGames: results.length,
    player1Wins: results.filter(r => r.winner === 1).length,
    player2Wins: results.filter(r => r.winner === 2).length,
    draws: results.filter(r => r.winner === 'draw').length,
    averageTurns: results.reduce((sum, r) => sum + r.totalTurns, 0) / results.length,
    averageRounds: results.reduce((sum, r) => sum + r.roundsPlayed, 0) / results.length,
    averageDuration: results.reduce((sum, r) => sum + r.duration, 0) / results.length,
    totalMechanicsUsed: results.reduce((total, r) => {
      Object.entries(r.mechanicsUsed).forEach(([mechanic, usage]) => {
        total[mechanic] = (total[mechanic] || 0) + (usage.count || 0);
      });
      return total;
    }, {} as Record<string, number>),
    winRate: {
      player1: (results.filter(r => r.winner === 1).length / results.length) * 100,
      player2: (results.filter(r => r.winner === 2).length / results.length) * 100,
      draw: (results.filter(r => r.winner === 'draw').length / results.length) * 100
    }
  };

  console.log('\n📊 COMPREHENSIVE SIMULATION ANALYSIS');
  console.log('='.repeat(50));
  console.log(`Games played: ${stats.totalGames}`);
  console.log(`P1 wins: ${stats.player1Wins} (${stats.winRate.player1.toFixed(1)}%)`);
  console.log(`P2 wins: ${stats.player2Wins} (${stats.winRate.player2.toFixed(1)}%)`);
  console.log(`Draws: ${stats.draws} (${stats.winRate.draw.toFixed(1)}%)`);
  console.log(`Average turns: ${stats.averageTurns.toFixed(1)}`);
  console.log(`Average rounds: ${stats.averageRounds.toFixed(1)}`);
  console.log(`Average duration: ${stats.averageDuration.toFixed(0)}ms`);
  console.log('\n🔧 MECHANICS USAGE:');
  Object.entries(stats.totalMechanicsUsed)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([mechanic, count]) => {
      console.log(`  ${mechanic}: ${count} times`);
    });

  return stats;
}
