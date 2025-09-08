import { GameState, Card, Player, BuilderEntry } from '../types/game';
import { buildDeckFromEntries, sumGovernmentInfluenceWithAuras } from '../utils/gameUtils';
import { Pols, Specials } from '../data/gameData';
import { resolveQueue } from '../utils/queue';
import { applyStartOfTurnFlags } from '../utils/startOfTurnHooks';
import { createDefaultEffectFlags } from '../types/game';
import { EffectQueueManager } from '../utils/gameUtils';
import { getCardActionPointCost, getAllowedLaneForCard } from '../utils/cardUtils';

export interface ProperAITestResult {
  winner: Player | null;
  rounds: number;
  roundsWon: { 1: number; 2: number };
  finalInfluence: { player1: number; player2: number };
  gameLog: string[];
  duration: number;
  deck1Name: string;
  deck2Name: string;
  difficulty1: string;
  difficulty2: string;
  validationErrors: string[];
}

export interface ProperBalanceMetrics {
  deckName: string;
  wins: number;
  losses: number;
  totalGames: number;
  winRate: number;
  avgRounds: number;
  avgInfluence: number;
  performance: 'overpowered' | 'balanced' | 'underpowered';
  validationScore: number; // 0-100, higher is better
}

// Preset decks for AI vs AI testing
const AI_TEST_PRESETS: { name: string; cards: string[] }[] = [
  {
    name: 'Tech Oligarchs',
    cards: [
      'Vladimir Putin', 'Xi Jinping', 'Donald Trump', 'Mohammed bin Salman', 'Recep Tayyip Erdoğan',
      'Elon Musk', 'Bill Gates', 'Mark Zuckerberg', 'Tim Cook', 'Sam Altman'
    ]
  },
  {
    name: 'Diplomatic Power',
    cards: [
      'Jens Stoltenberg', 'Olaf Scholz', 'Rishi Sunak', 'Kamala Harris', 'Helmut Schmidt',
      'Greta Thunberg', 'Warren Buffett', 'George Soros', 'Spin Doctor', 'Think-tank'
    ]
  },
  {
    name: 'Activist Movement',
    cards: [
      'Benjamin Netanyahu', 'Volodymyr Zelenskyy', 'Ursula von der Leyen', 'Narendra Modi', 'Luiz Inácio Lula da Silva',
      'Greta Thunberg', 'Malala Yousafzai', 'Ai Weiwei', 'Alexei Navalny', 'Jennifer Doudna'
    ]
  },
  {
    name: 'Initiative Rush',
    cards: [
      'Benjamin Netanyahu', 'Volodymyr Zelenskyy', 'Ursula von der Leyen', 'Olaf Scholz', 'Kamala Harris',
      'Greta Thunberg', 'Verzoegerungsverfahren', 'Symbolpolitik', 'Shadow Lobbying', 'Opportunist'
    ]
  },
  {
    name: 'Media Control',
    cards: [
      'Vladimir Putin', 'Xi Jinping', 'Donald Trump', 'Mohammed bin Salman', 'Recep Tayyip Erdoğan',
      'Oprah Winfrey', 'Mark Zuckerberg', 'Tim Cook', 'Influencer-Kampagne', 'Whataboutism'
    ]
  },
  {
    name: 'Economic Influence',
    cards: [
      'Jens Stoltenberg', 'Olaf Scholz', 'Rishi Sunak', 'Kamala Harris', 'Helmut Schmidt',
      'Warren Buffett', 'George Soros', 'Jeff Bezos', 'Mukesh Ambani', 'Roman Abramovich'
    ]
  }
];

export class ProperAIVsAiTester {
  private results: ProperAITestResult[] = [];
  private balanceMetrics: Map<string, ProperBalanceMetrics> = new Map();

  // Create initial game state for AI vs AI
  private createInitialGameState(deck1: BuilderEntry[], deck2: BuilderEntry[]): GameState {
    const p1Cards = buildDeckFromEntries(deck1);
    const p2Cards = buildDeckFromEntries(deck2);

    const d1 = [...p1Cards];
    const d2 = [...p2Cards];
    const h1 = d1.splice(0, Math.min(5, d1.length));
    const h2 = d2.splice(0, Math.min(5, d2.length));

    return {
      round: 1,
      current: 1,
      passed: { 1: false, 2: false },
      actionPoints: { 1: 2, 2: 2 },
      actionsUsed: { 1: 0, 2: 0 },
      decks: { 1: d1, 2: d2 },
      hands: { 1: h1, 2: h2 },
      board: { 1: { innen: [], aussen: [], sofort: [] }, 2: { innen: [], aussen: [], sofort: [] } },
      traps: { 1: [], 2: [] },
      permanentSlots: {
        1: { government: null, public: null, initiativePermanent: null },
        2: { government: null, public: null, initiativePermanent: null },
      },
      discard: [],
      shields: new Set(),
      effectFlags: {
        1: createDefaultEffectFlags(),
        2: createDefaultEffectFlags()
      },
      roundsWon: { 1: 0, 2: 0 },
      gameWinner: null,
      effectQueue: EffectQueueManager.initializeQueue(),
      activeAbilities: { 1: [], 2: [] },
      pendingAbilitySelect: undefined,
      aiEnabled: { 1: true, 2: true },
      activeRefresh: { 1: 0, 2: 0 },
      log: []
    };
  }

  // Validate game state consistency
  private validateGameState(gameState: GameState, context: string): string[] {
    const errors: string[] = [];

    // Check AP consistency
    if (gameState.actionPoints[1] < 0 || gameState.actionPoints[2] < 0) {
      errors.push(`${context}: Negative AP detected`);
    }

    // Check hand sizes
    if (gameState.hands[1].length > 10 || gameState.hands[2].length > 10) {
      errors.push(`${context}: Hand size exceeds maximum (10 cards)`);
    }

    // Check deck sizes
    if (gameState.decks[1].length < 0 || gameState.decks[2].length < 0) {
      errors.push(`${context}: Negative deck size detected`);
    }

    // Check board consistency
    for (const player of [1, 2] as Player[]) {
      const board = gameState.board[player];
      if (board.aussen.length > 5 || board.innen.length > 5 || board.sofort.length > 5) {
        errors.push(`${context}: Board lane exceeds maximum capacity (5 cards)`);
      }
    }

    // Check rounds won consistency
    if (gameState.roundsWon[1] < 0 || gameState.roundsWon[2] < 0) {
      errors.push(`${context}: Negative rounds won detected`);
    }

    if (gameState.roundsWon[1] > 2 || gameState.roundsWon[2] > 2) {
      errors.push(`${context}: Rounds won exceeds maximum (2)`);
    }

    return errors;
  }

  // Run a single AI vs AI game with proper rules
  private async runSingleGame(
    deck1Name: string,
    deck2Name: string,
    difficulty1: string = 'medium',
    difficulty2: string = 'medium',
    maxRounds: number = 50
  ): Promise<ProperAITestResult> {
    const startTime = Date.now();
    const validationErrors: string[] = [];

    // Get deck entries
    const deck1 = this.getDeckEntries(deck1Name);
    const deck2 = this.getDeckEntries(deck2Name);

    let gameState = this.createInitialGameState(deck1, deck2);
    const gameLog: string[] = [];

    const log = (msg: string) => {
      gameLog.push(`[${new Date().toISOString()}] ${msg}`);
    };

    let rounds = 0;
    let gameEnded = false;

    // Initial validation
    validationErrors.push(...this.validateGameState(gameState, 'Initial state'));

    while (!gameEnded && rounds < 50) { // Increased max rounds to handle tie rounds
      rounds++;

      // Validate before each turn
      validationErrors.push(...this.validateGameState(gameState, `Round ${rounds} start`));

      // Check for game end conditions (Best of 3: first to 2 wins)
      if (gameState.gameWinner) {
        gameEnded = true;
        break;
      }

      // Check for round end (both players passed)
      if (gameState.passed[1] && gameState.passed[2]) {
        log(`🏁 Round ${gameState.round} ended - both players passed`);

        // Calculate round winner based on government influence
        const p1Influence = sumGovernmentInfluenceWithAuras(gameState, 1);
        const p2Influence = sumGovernmentInfluenceWithAuras(gameState, 2);

        // Handle tie case - if both players have equal influence, it's a tie
        let roundWinner: Player | null = null;
        if (p1Influence > p2Influence) {
          roundWinner = 1;
        } else if (p2Influence > p1Influence) {
          roundWinner = 2;
        } else {
          // This should be triggered when both have equal influence (including 0)
          log(`🔍 TIE DETECTED: Round ${gameState.round} - P1=${p1Influence}, P2=${p2Influence}`);
          // Tie - no winner for this round
          log(`🏆 Round ${gameState.round} is a tie (${p1Influence} vs ${p2Influence} influence)`);
          // Start new round with same player going first
          gameState.round++;
          gameState.passed = { 1: false, 2: false };
          gameState.actionPoints = { 1: 2, 2: 2 };
          gameState.actionsUsed = { 1: 0, 2: 0 };
          
          // Draw 5 new cards for each player
          const newP1Hand = gameState.decks[1].splice(0, Math.min(5, gameState.decks[1].length));
          const newP2Hand = gameState.decks[2].splice(0, Math.min(5, gameState.decks[2].length));
          gameState.hands[1] = newP1Hand;
          gameState.hands[2] = newP2Hand;
          
          // Reset effect flags
          gameState.effectFlags = {
            1: createDefaultEffectFlags(),
            2: createDefaultEffectFlags()
          };
          
          // Clear board for new round
          gameState.board = { 1: { innen: [], aussen: [], sofort: [] }, 2: { innen: [], aussen: [], sofort: [] } };
          gameState.traps = { 1: [], 2: [] };
          gameState.permanentSlots = {
            1: { government: null, public: null, initiativePermanent: null },
            2: { government: null, public: null, initiativePermanent: null },
          };
          
          log(`🔄 Starting round ${gameState.round} - Player ${gameState.current} goes first (tie round)`);
          continue;
        }
        
        log(`🏆 Round ${gameState.round} winner: Player ${roundWinner} (${p1Influence} vs ${p2Influence} influence)`);

        // Update rounds won (roundWinner is guaranteed to be non-null here)
        gameState.roundsWon[roundWinner!]++;

        // Check if game should end (Best of 3)
        if (gameState.roundsWon[1] >= 2 || gameState.roundsWon[2] >= 2) {
          gameState.gameWinner = gameState.roundsWon[1] >= 2 ? 1 : 2;
          log(`🎉 Game ended! Player ${gameState.gameWinner} wins the match (${gameState.roundsWon[1]}-${gameState.roundsWon[2]})`);
          gameEnded = true;
          break;
        }

        // Start new round
        gameState.round++;
        gameState.current = roundWinner!; // Winner starts next round
        gameState.passed = { 1: false, 2: false };
        gameState.actionPoints = { 1: 2, 2: 2 };
        gameState.actionsUsed = { 1: 0, 2: 0 };

        // Draw 5 new cards for each player
        const newP1Hand = gameState.decks[1].splice(0, Math.min(5, gameState.decks[1].length));
        const newP2Hand = gameState.decks[2].splice(0, Math.min(5, gameState.decks[2].length));
        gameState.hands[1] = newP1Hand;
        gameState.hands[2] = newP2Hand;

        // Reset effect flags
        gameState.effectFlags = {
          1: createDefaultEffectFlags(),
          2: createDefaultEffectFlags()
        };

        // Clear board for new round
        gameState.board = { 1: { innen: [], aussen: [], sofort: [] }, 2: { innen: [], aussen: [], sofort: [] } };
        gameState.traps = { 1: [], 2: [] };
        gameState.permanentSlots = {
          1: { government: null, public: null, initiativePermanent: null },
          2: { government: null, public: null, initiativePermanent: null },
        };

        log(`🔄 Starting round ${gameState.round} - Player ${gameState.current} goes first`);
        continue;
      }

      // AI turn
      const currentPlayer = gameState.current;
      const difficulty = currentPlayer === 1 ? difficulty1 : difficulty2;

      if (gameState.passed[currentPlayer]) {
        // Player already passed, switch to other player
        gameState.current = currentPlayer === 1 ? 2 : 1;
        continue;
      }

      // AI decision making
      const action = this.decideBestAction(gameState, currentPlayer, difficulty as any);

      if (action.type === 'pass') {
        log(`🤖 AI${currentPlayer}(${difficulty}) passes`);
        gameState.passed[currentPlayer] = true;
        gameState.current = currentPlayer === 1 ? 2 : 1;
        continue;
      }

      // Execute card play
      const playIndex = action.type === 'play' ? action.index : -1;
      const chosenCard = gameState.hands[currentPlayer][playIndex];

      if (!chosenCard) {
        log(`🤖 AI${currentPlayer}(${difficulty}) error: invalid card index, passing`);
        gameState.passed[currentPlayer] = true;
        gameState.current = currentPlayer === 1 ? 2 : 1;
        continue;
      }

      // Check AP cost
      const apCost = getCardActionPointCost(chosenCard, gameState, currentPlayer);
      if (gameState.actionPoints[currentPlayer] < apCost) {
        log(`🤖 AI${currentPlayer}(${difficulty}) insufficient AP (${gameState.actionPoints[currentPlayer]} < ${apCost}), passing`);
        gameState.passed[currentPlayer] = true;
        gameState.current = currentPlayer === 1 ? 2 : 1;
        continue;
      }

      // Determine lane
      const lane = action.type === 'play' ? action.lane || getAllowedLaneForCard(chosenCard) : getAllowedLaneForCard(chosenCard);

      // Handle null lane case - default to 'innen' for special cards
      const targetLane = lane || 'innen';

      // Execute card play
      const newHand = [...gameState.hands[currentPlayer]];
      const playedCard = newHand.splice(playIndex, 1)[0];

      const newLane = [...gameState.board[currentPlayer][targetLane], playedCard];
      const newBoard = { ...gameState.board[currentPlayer], [targetLane]: newLane };

      gameState.hands[currentPlayer] = newHand;
      gameState.board[currentPlayer] = newBoard;
      gameState.actionPoints[currentPlayer] -= apCost;

      log(`🤖 AI${currentPlayer}(${difficulty}) plays ${(chosenCard as any).name || 'Unknown'} in ${targetLane} (AP: ${gameState.actionPoints[currentPlayer]})`);

      // Process effect queue if any
      if (gameState._effectQueue && gameState._effectQueue.length > 0) {
        try {
          resolveQueue(gameState, [...gameState._effectQueue]);
          gameState._effectQueue = [];
        } catch (error) {
          log(`❌ Effect queue processing failed: ${error}`);
          validationErrors.push(`Effect queue processing failed: ${error}`);
        }
      }

      // Draw card if not passed
      if (!gameState.passed[currentPlayer]) {
        const drawnCard = gameState.decks[currentPlayer].shift();
        if (drawnCard) {
          gameState.hands[currentPlayer].push(drawnCard);
          log(`🃏 AI${currentPlayer} draws ${drawnCard.name}`);
        }
      }

      // Switch turns
      gameState.current = currentPlayer === 1 ? 2 : 1;
      gameState.actionPoints[gameState.current] = 2;
      gameState.passed[gameState.current] = false;

      // Apply start of turn hooks
      try {
        applyStartOfTurnFlags(gameState, gameState.current, log);
      } catch (error) {
        log(`❌ Start of turn hooks failed: ${error}`);
        validationErrors.push(`Start of turn hooks failed: ${error}`);
      }
    }

    // Final validation
    validationErrors.push(...this.validateGameState(gameState, 'Final state'));

    const finalInfluence = {
      player1: sumGovernmentInfluenceWithAuras(gameState, 1),
      player2: sumGovernmentInfluenceWithAuras(gameState, 2)
    };

    return {
      winner: gameState.gameWinner || null,
      rounds,
      roundsWon: gameState.roundsWon,
      finalInfluence,
      gameLog,
      duration: Date.now() - startTime,
      deck1Name,
      deck2Name,
      difficulty1,
      difficulty2,
      validationErrors
    };
  }

  // Proper AI decision making based on actual game mechanics
  private decideBestAction(
    gameState: GameState,
    player: Player,
    difficulty: 'easy' | 'medium' | 'hard'
  ): { type: 'pass' } | { type: 'play'; index: number; lane?: 'innen' | 'aussen' } {
    const hand = gameState.hands[player];
    const aiAP = gameState.actionPoints[player];

    if (aiAP <= 0) {
      return { type: 'pass' };
    }

    // Find best card to play based on actual game mechanics
    let bestIndex = -1;
    let bestScore = -1;

    for (let i = 0; i < hand.length; i++) {
      const card = hand[i];
      const apCost = getCardActionPointCost(card, gameState, player);

      // Skip if can't afford
      if (aiAP < apCost) continue;

      const score = this.evaluateCard(card, gameState, player, difficulty);

      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    if (bestIndex === -1 || bestScore < 0) {
      return { type: 'pass' };
    }

    // Determine lane based on card type
    const card = hand[bestIndex];
    const lane = getAllowedLaneForCard(card);

    return { type: 'play', index: bestIndex, lane: (lane as 'innen' | 'aussen') || 'innen' };
  }

  // Evaluate card value based on actual game mechanics
  private evaluateCard(card: any, gameState: GameState, player: Player, difficulty: string): number {
    let score = 0;

    if (card.kind === 'pol') {
      // Government cards - prioritize influence
      score = (card.influence || 0) * 10;

      // Bonus for high-tier cards
      if (card.T >= 3) score *= 1.5;
      else if (card.T >= 2) score *= 1.2;

      // Difficulty-based adjustments
      if (difficulty === 'hard') score *= 1.2;
      else if (difficulty === 'easy') score *= 0.8;
    } else {
      // Special cards - evaluate based on type and effect
      const spec = card;
      if (spec.type === 'Öffentlichkeitskarte') {
        score = 5; // Moderate value for public cards
      } else if (spec.type === 'Sofort-Initiative') {
        score = 8; // High value for instant initiatives
      } else if (spec.type === 'Dauerhaft-Initiative') {
        score = 6; // Good value for permanent initiatives
      } else if (spec.type === 'Intervention') {
        score = 7; // High value for interventions
      } else if (spec.type === 'Falle') {
        score = 4; // Moderate value for traps
      }
    }

    return score;
  }

  // Get deck entries by name
  private getDeckEntries(deckName: string): BuilderEntry[] {
    const preset = AI_TEST_PRESETS.find(p => p.name === deckName);
    if (!preset) {
      throw new Error(`Deck "${deckName}" not found`);
    }

    const entries: BuilderEntry[] = [];
    preset.cards.forEach(name => {
      const pol = Pols.find((p: any) => p.name === name);
      if (pol) {
        entries.push({ kind: 'pol', baseId: pol.id, count: 1 });
        return;
      }
      const spec = Specials.find((s: any) => s.name === name);
      if (spec) {
        entries.push({ kind: 'spec', baseId: spec.id, count: 1 });
        return;
      }
    });

    return entries;
  }

  // Run comprehensive AI vs AI testing with proper validation
  public async runBalanceTest(
    iterations: number = 100,
    difficulties: string[] = ['medium'],
    maxRounds: number = 50
  ): Promise<{
    results: ProperAITestResult[];
    balanceMetrics: ProperBalanceMetrics[];
    recommendations: string[];
    validationSummary: { totalErrors: number; errorTypes: Map<string, number> };
  }> {
    console.log(`🧪 Starting PROPER AI vs AI balance test with ${iterations} iterations...`);

    this.results = [];
    this.balanceMetrics.clear();

    const deckNames = AI_TEST_PRESETS.map(p => p.name);
    let gameCount = 0;
    const allValidationErrors: string[] = [];

    // Test all deck combinations
    for (let i = 0; i < deckNames.length; i++) {
      for (let j = 0; j < deckNames.length; j++) {
        if (i === j) continue; // Skip mirror matches for now

        for (const difficulty1 of difficulties) {
          for (const difficulty2 of difficulties) {
            for (let iter = 0; iter < iterations; iter++) {
              try {
                const result = await this.runSingleGame(
                  deckNames[i],
                  deckNames[j],
                  difficulty1,
                  difficulty2,
                  maxRounds
                );

                this.results.push(result);
                allValidationErrors.push(...result.validationErrors);
                this.updateBalanceMetrics(result);

                gameCount++;
                if (gameCount % 10 === 0) {
                  console.log(`📊 Completed ${gameCount} games...`);
                }
              } catch (error) {
                console.error(`❌ Game failed: ${error}`);
                allValidationErrors.push(`Game failed: ${error}`);
              }
            }
          }
        }
      }
    }

    // Calculate validation summary
    const errorTypes = new Map<string, number>();
    allValidationErrors.forEach(error => {
      const type = error.split(':')[0];
      errorTypes.set(type, (errorTypes.get(type) || 0) + 1);
    });

    const balanceMetricsArray = Array.from(this.balanceMetrics.values());
    const recommendations = this.generateRecommendations(balanceMetricsArray, allValidationErrors);

    console.log(`✅ PROPER Balance test completed! ${gameCount} games played.`);
    console.log(`🔍 Validation: ${allValidationErrors.length} total errors found`);

    return {
      results: this.results,
      balanceMetrics: balanceMetricsArray,
      recommendations,
      validationSummary: {
        totalErrors: allValidationErrors.length,
        errorTypes
      }
    };
  }

  // Update balance metrics for decks
  private updateBalanceMetrics(result: ProperAITestResult): void {
    const updateDeckMetrics = (deckName: string, won: boolean, influence: number, rounds: number, validationErrors: string[]) => {
      const existing = this.balanceMetrics.get(deckName) || {
        deckName,
        wins: 0,
        losses: 0,
        totalGames: 0,
        winRate: 0,
        avgRounds: 0,
        avgInfluence: 0,
        performance: 'balanced' as const,
        validationScore: 100
      };

      existing.totalGames++;
      if (won) existing.wins++;
      else existing.losses++;

      existing.winRate = existing.wins / existing.totalGames;
      existing.avgRounds = (existing.avgRounds * (existing.totalGames - 1) + rounds) / existing.totalGames;
      existing.avgInfluence = (existing.avgInfluence * (existing.totalGames - 1) + influence) / existing.totalGames;

      // Calculate validation score (penalty for errors)
      const errorPenalty = Math.min(validationErrors.length * 5, 50); // Max 50 point penalty
      existing.validationScore = Math.max(0, 100 - errorPenalty);

      // Determine performance category
      if (existing.winRate > 0.6) existing.performance = 'overpowered';
      else if (existing.winRate < 0.4) existing.performance = 'underpowered';
      else existing.performance = 'balanced';

      this.balanceMetrics.set(deckName, existing);
    };

    // Update metrics for both decks
    const deck1Won = result.winner === 1;
    const deck2Won = result.winner === 2;

    updateDeckMetrics(result.deck1Name, deck1Won, result.finalInfluence.player1, result.rounds, result.validationErrors);
    updateDeckMetrics(result.deck2Name, deck2Won, result.finalInfluence.player2, result.rounds, result.validationErrors);
  }

  // Generate balance recommendations
  private generateRecommendations(
    balanceMetrics: ProperBalanceMetrics[],
    validationErrors: string[]
  ): string[] {
    const recommendations: string[] = [];

    // Validation recommendations
    if (validationErrors.length > 0) {
      recommendations.push(`🔧 VALIDATION ISSUES: ${validationErrors.length} errors found - fix game logic before balancing`);

      const errorTypes = new Map<string, number>();
      validationErrors.forEach(error => {
        const type = error.split(':')[0];
        errorTypes.set(type, (errorTypes.get(type) || 0) + 1);
      });

      errorTypes.forEach((count, type) => {
        recommendations.push(`  - ${type}: ${count} occurrences`);
      });
    }

    // Deck balance recommendations
    balanceMetrics.forEach(deck => {
      if (deck.performance === 'overpowered') {
        recommendations.push(`🔴 ${deck.deckName}: Overpowered (${(deck.winRate * 100).toFixed(1)}% win rate) - Consider reducing card quality or increasing costs`);
      } else if (deck.performance === 'underpowered') {
        recommendations.push(`🔵 ${deck.deckName}: Underpowered (${(deck.winRate * 100).toFixed(1)}% win rate) - Consider improving card quality or reducing costs`);
      }

      if (deck.validationScore < 80) {
        recommendations.push(`⚠️ ${deck.deckName}: Low validation score (${deck.validationScore}/100) - Check game logic implementation`);
      }
    });

    return recommendations;
  }

  // Export results to JSON
  public exportResults(filename: string = 'proper_ai_balance_test_results.json'): void {
    const exportData = {
      timestamp: new Date().toISOString(),
      totalGames: this.results.length,
      results: this.results,
      balanceMetrics: Array.from(this.balanceMetrics.values()),
      recommendations: this.generateRecommendations(
        Array.from(this.balanceMetrics.values()),
        this.results.flatMap(r => r.validationErrors)
      )
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = filename;
    link.click();
  }
}
