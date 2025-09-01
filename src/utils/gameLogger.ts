import { GameState, Card, Player, Lane } from '../types/game';

// Comprehensive game logging system
export interface GameLogEntry {
  id: string;
  timestamp: number;
  round: number;
  turn: number;
  player: Player;
  action: GameAction;
  details: ActionDetails;
  mechanicsTriggered: string[];
  gameStateSnapshot: GameStateSnapshot;
}

export interface GameAction {
  type: 'card_play' | 'ability_use' | 'pass' | 'intervention_trigger' | 'round_end' | 'game_end' | 'draw_cards';
  description: string;
}

export interface ActionDetails {
  cardName?: string;
  abilityName?: string;
  interventionName?: string;
  lane?: Lane;
  apCost?: number;
  reason?: string;
  targetCard?: string;
  targetPlayer?: Player;
  cardsDrawn?: string[];
  scores?: { player1: number; player2: number };
  winner?: Player;
}

export interface GameStateSnapshot {
  currentPlayer: Player;
  actionPoints: { 1: number; 2: number };
  boardState: {
    player1: { government: string[]; public: string[]; traps: string[] };
    player2: { government: string[]; public: string[]; traps: string[] };
  };
  handSizes: { player1: number; player2: number };
  deckSizes: { player1: number; player2: number };
  roundsWon: { 1: number; 2: number };
  permanentSlots: {
    player1: { government: string | null; public: string | null; initiativePermanent: string | null };
    player2: { government: string | null; public: string | null; initiativePermanent: string | null };
  };
}

export interface MechanicUsage {
  mechanic: string;
  count: number;
  firstUsed: number;
  lastUsed: number;
  players: Player[];
  contexts: string[];
}

export interface GameAnalysis {
  totalTurns: number;
  totalRounds: number;
  winner: Player | 'draw';
  duration: number;
  mechanicUsage: Record<string, MechanicUsage>;
  playerStats: {
    [key in Player]: {
      cardsPlayed: number;
      abilitiesUsed: number;
      interventionsTriggered: number;
      passes: number;
      cardsDrawn: number;
      finalScore: number;
    };
  };
  keyMoments: GameLogEntry[];
  efficiency: {
    averageAPPerTurn: number;
    cardsPerAP: number;
    interventionsSuccessRate: number;
  };
}

// Main logging system
export class GameLogger {
  private logs: GameLogEntry[] = [];
  private currentTurn = 0;
  private currentRound = 1;
  private gameStartTime = 0;
  private turnStartTime = 0;
  private entryCounter = 0;

  startGame(): void {
    this.gameStartTime = Date.now();
    this.turnStartTime = Date.now();
    this.logGameEvent({
      type: 'game_end',
      description: 'Game started'
    }, {
      // No specific details for game start
    });
  }

  startTurn(player: Player): void {
    this.currentTurn++;
    this.turnStartTime = Date.now();
  }

  startRound(round: number): void {
    this.currentRound = round;
  }

  logCardPlay(
    player: Player,
    card: Card,
    lane: Lane,
    apCost: number,
    reason: string,
    mechanics: string[],
    gameState: GameState
  ): void {
    this.logGameEvent(
      {
        type: 'card_play',
        description: `${player} spielt ${card.name} nach ${lane === 'aussen' ? 'Regierungsreihe' : 'Öffentlichkeitsreihe'}`
      },
      {
        cardName: card.name,
        lane,
        apCost,
        reason
      },
      mechanics,
      gameState
    );
  }

  logAbilityUse(
    player: Player,
    abilityName: string,
    gameState: GameState,
    targetCard?: Card,
    mechanics?: string[]
  ): void {
    this.logGameEvent(
      {
        type: 'ability_use',
        description: `${player} nutzt ${abilityName}${targetCard ? ` auf ${targetCard.name}` : ''}`
      },
      {
        abilityName,
        targetCard: targetCard?.name,
        reason: 'Ability activation'
      },
      mechanics,
      gameState
    );
  }

  logPass(player: Player, gameState: GameState): void {
    this.logGameEvent(
      {
        type: 'pass',
        description: `${player} passt`
      },
      {
        reason: 'No playable actions or AP'
      },
      ['pass'],
      gameState
    );
  }

  logInterventionTrigger(
    player: Player,
    interventionName: string,
    targetPlayer: Player,
    gameState: GameState,
    targetCard?: Card,
    mechanics?: string[]
  ): void {
    this.logGameEvent(
      {
        type: 'intervention_trigger',
        description: `Intervention ${interventionName} von P${player} triggert gegen P${targetPlayer}`
      },
      {
        interventionName,
        targetPlayer,
        targetCard: targetCard?.name,
        reason: 'Intervention effect triggered'
      },
      mechanics,
      gameState
    );
  }

  logDrawCards(
    player: Player,
    cards: Card[],
    reason: string,
    gameState: GameState
  ): void {
    this.logGameEvent(
      {
        type: 'draw_cards',
        description: `${player} zieht ${cards.length} Karten`
      },
      {
        cardsDrawn: cards.map(c => c.name),
        reason
      },
      ['card_draw'],
      gameState
    );
  }

  logRoundEnd(
    round: number,
    scores: { player1: number; player2: number },
    winner: Player,
    gameState: GameState
  ): void {
    this.logGameEvent(
      {
        type: 'round_end',
        description: `Runde ${round} endet: P1 ${scores.player1} - P2 ${scores.player2}, Gewinner P${winner}`
      },
      {
        scores,
        winner,
        reason: 'Round resolution'
      },
      ['round_end', `round_win_p${winner}`],
      gameState
    );
  }

  logGameEnd(
    winner: Player | 'draw',
    roundsWon: { 1: number; 2: number },
    gameState: GameState
  ): void {
    this.logGameEvent(
      {
        type: 'game_end',
        description: `Spiel endet: ${winner === 'draw' ? 'Unentschieden' : `Gewinner P${winner}`}`
      },
      {
        winner: winner !== 'draw' ? winner : undefined,
        reason: 'Game resolution'
      },
      ['game_end', winner === 'draw' ? 'draw' : `game_win_p${winner}`],
      gameState
    );
  }

  private logGameEvent(
    action: GameAction,
    details: ActionDetails,
    mechanics: string[] = [],
    gameState?: GameState
  ): void {
    const entry: GameLogEntry = {
      id: `log_${++this.entryCounter}_${Date.now()}`,
      timestamp: Date.now(),
      round: this.currentRound,
      turn: this.currentTurn,
      player: gameState?.current || 1,
      action,
      details,
      mechanicsTriggered: mechanics,
      gameStateSnapshot: gameState ? this.createGameStateSnapshot(gameState) : this.getEmptySnapshot()
    };

    this.logs.push(entry);

    // Console output for debugging
    this.logToConsole(entry);
  }

  private createGameStateSnapshot(gameState: GameState): GameStateSnapshot {
    return {
      currentPlayer: gameState.current,
      actionPoints: { ...gameState.actionPoints },
      boardState: {
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
      handSizes: {
        player1: gameState.hands[1].length,
        player2: gameState.hands[2].length
      },
      deckSizes: {
        player1: gameState.decks[1].length,
        player2: gameState.decks[2].length
      },
      roundsWon: { ...gameState.roundsWon },
      permanentSlots: {
        player1: {
          government: gameState.permanentSlots[1].government?.name || null,
          public: gameState.permanentSlots[1].public?.name || null,
          initiativePermanent: gameState.permanentSlots[1].initiativePermanent?.name || null
        },
        player2: {
          government: gameState.permanentSlots[2].government?.name || null,
          public: gameState.permanentSlots[2].public?.name || null,
          initiativePermanent: gameState.permanentSlots[2].initiativePermanent?.name || null
        }
      }
    };
  }

  private getEmptySnapshot(): GameStateSnapshot {
    return {
      currentPlayer: 1,
      actionPoints: { 1: 0, 2: 0 },
      boardState: {
        player1: { government: [], public: [], traps: [] },
        player2: { government: [], public: [], traps: [] }
      },
      handSizes: { player1: 0, player2: 0 },
      deckSizes: { player1: 0, player2: 0 },
      roundsWon: { 1: 0, 2: 0 },
      permanentSlots: {
        player1: { government: null, public: null, initiativePermanent: null },
        player2: { government: null, public: null, initiativePermanent: null }
      }
    };
  }

  private logToConsole(entry: GameLogEntry): void {
    const time = new Date(entry.timestamp).toLocaleTimeString();
    const prefix = `[${time}] R${entry.round} T${entry.turn} P${entry.player}`;

    console.log(`${prefix} ${entry.action.description}`);

    if (entry.details.reason) {
      console.log(`  Reason: ${entry.details.reason}`);
    }

    if (entry.mechanicsTriggered.length > 0) {
      console.log(`  Mechanics: ${entry.mechanicsTriggered.join(', ')}`);
    }

    if (entry.details.apCost !== undefined) {
      console.log(`  AP Cost: ${entry.details.apCost}`);
    }
  }

  // Analysis methods
  getAnalysis(): GameAnalysis {
    const endTime = Date.now();
    const duration = endTime - this.gameStartTime;

    const finalLog = this.logs[this.logs.length - 1];
    const winner = finalLog?.details.winner || 'draw';
    const roundsWon = finalLog?.gameStateSnapshot.roundsWon || { 1: 0, 2: 0 };

    // Calculate player stats
    const playerStats = {
      1: { cardsPlayed: 0, abilitiesUsed: 0, interventionsTriggered: 0, passes: 0, cardsDrawn: 0, finalScore: 0 },
      2: { cardsPlayed: 0, abilitiesUsed: 0, interventionsTriggered: 0, passes: 0, cardsDrawn: 0, finalScore: 0 }
    };

    this.logs.forEach(log => {
      const stats = playerStats[log.player];
      switch (log.action.type) {
        case 'card_play':
          stats.cardsPlayed++;
          break;
        case 'ability_use':
          stats.abilitiesUsed++;
          break;
        case 'intervention_trigger':
          stats.interventionsTriggered++;
          break;
        case 'pass':
          stats.passes++;
          break;
        case 'draw_cards':
          stats.cardsDrawn += log.details.cardsDrawn?.length || 0;
          break;
      }
    });

    // Calculate final scores
    const lastSnapshot = finalLog?.gameStateSnapshot;
    if (lastSnapshot) {
      playerStats[1].finalScore = this.calculateBoardScore(lastSnapshot.boardState.player1.government);
      playerStats[2].finalScore = this.calculateBoardScore(lastSnapshot.boardState.player2.government);
    }

    // Calculate mechanic usage
    const mechanicUsage: Record<string, MechanicUsage> = {};
    this.logs.forEach(log => {
      log.mechanicsTriggered.forEach(mechanic => {
        if (!mechanicUsage[mechanic]) {
          mechanicUsage[mechanic] = {
            mechanic,
            count: 0,
            firstUsed: log.timestamp,
            lastUsed: log.timestamp,
            players: [],
            contexts: []
          };
        }

        const usage = mechanicUsage[mechanic];
        usage.count++;
        usage.lastUsed = log.timestamp;
        if (!usage.players.includes(log.player)) {
          usage.players.push(log.player);
        }
        if (!usage.contexts.includes(log.action.type)) {
          usage.contexts.push(log.action.type);
        }
      });
    });

    // Find key moments
    const keyMoments = this.logs.filter(log =>
      log.mechanicsTriggered.includes('intervention_triggered') ||
      log.mechanicsTriggered.includes('ability_used') ||
      log.action.type === 'round_end' ||
      log.action.type === 'game_end'
    );

    // Calculate efficiency metrics
    const totalAPUsed = this.logs
      .filter(log => log.details.apCost !== undefined)
      .reduce((sum, log) => sum + (log.details.apCost || 0), 0);

    const totalCardsPlayed = playerStats[1].cardsPlayed + playerStats[2].cardsPlayed;
    const totalInterventions = playerStats[1].interventionsTriggered + playerStats[2].interventionsTriggered;

    return {
      totalTurns: this.currentTurn,
      totalRounds: this.currentRound,
      winner,
      duration,
      mechanicUsage,
      playerStats,
      keyMoments,
      efficiency: {
        averageAPPerTurn: this.currentTurn > 0 ? totalAPUsed / this.currentTurn : 0,
        cardsPerAP: totalAPUsed > 0 ? totalCardsPlayed / totalAPUsed : 0,
        interventionsSuccessRate: totalInterventions > 0 ? totalInterventions / this.logs.length : 0
      }
    };
  }

  private calculateBoardScore(governmentCards: string[]): number {
    // Simplified scoring - in real implementation, this would calculate actual influence
    return governmentCards.length * 5; // Assume average 5 influence per card
  }

  // Export methods
  getLogs(): GameLogEntry[] {
    return [...this.logs];
  }

  exportToJSON(): string {
    return JSON.stringify({
      logs: this.logs,
      analysis: this.getAnalysis()
    }, null, 2);
  }

  exportSummary(): string {
    const analysis = this.getAnalysis();
    const summary = [
      '=== GAME LOG SUMMARY ===',
      `Duration: ${analysis.duration}ms`,
      `Total Turns: ${analysis.totalTurns}`,
      `Total Rounds: ${analysis.totalRounds}`,
      `Winner: ${analysis.winner}`,
      '',
      '=== PLAYER STATISTICS ===',
      `Player 1: ${analysis.playerStats[1].cardsPlayed} cards, ${analysis.playerStats[1].abilitiesUsed} abilities, ${analysis.playerStats[1].interventionsTriggered} interventions`,
      `Player 2: ${analysis.playerStats[2].cardsPlayed} cards, ${analysis.playerStats[2].abilitiesUsed} abilities, ${analysis.playerStats[2].interventionsTriggered} interventions`,
      '',
      '=== EFFICIENCY METRICS ===',
      `Average AP per turn: ${analysis.efficiency.averageAPPerTurn.toFixed(2)}`,
      `Cards per AP: ${analysis.efficiency.cardsPerAP.toFixed(2)}`,
      `Intervention success rate: ${(analysis.efficiency.interventionsSuccessRate * 100).toFixed(1)}%`,
      '',
      '=== MECHANICS USED ===',
      ...Object.entries(analysis.mechanicUsage).map(([mechanic, usage]) =>
        `${mechanic}: ${usage.count} times (${usage.players.join(', ')})`
      ),
      '',
      '=== KEY MOMENTS ===',
      ...analysis.keyMoments.slice(0, 10).map(moment =>
        `T${moment.turn} P${moment.player}: ${moment.action.description}`
      )
    ];

    return summary.join('\n');
  }
}

// Singleton logger instance
export const gameLogger = new GameLogger();
