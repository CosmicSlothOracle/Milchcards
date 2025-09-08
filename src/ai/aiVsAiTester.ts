import { GameState, Player, BuilderEntry } from '../types/game';
import { buildDeckFromEntries } from '../utils/gameUtils';
import { Pols, Specials } from '../data/gameData';
import { takeTurn } from './aiPlayer';
import { resolveQueue } from '../utils/queue';
import { applyStartOfTurnFlags } from '../utils/startOfTurnHooks';
import { createDefaultEffectFlags } from '../types/game';
import { EffectQueueManager } from '../utils/gameUtils';

export interface AITestResult {
  winner: Player | null;
  rounds: number;
  finalInfluence: { player1: number; player2: number };
  gameLog: string[];
  duration: number;
  deck1Name: string;
  deck2Name: string;
  difficulty1: string;
  difficulty2: string;
}

export interface BalanceMetrics {
  deckName: string;
  wins: number;
  losses: number;
  totalGames: number;
  winRate: number;
  avgRounds: number;
  avgInfluence: number;
  performance: 'overpowered' | 'balanced' | 'underpowered';
}

export interface CardBalanceData {
  cardName: string;
  appearances: number;
  wins: number;
  winRate: number;
  avgInfluence: number;
  cost: number;
  performance: 'overcosted' | 'balanced' | 'undercosted';
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

export class AIVsAiTester {
  private results: AITestResult[] = [];
  private balanceMetrics: Map<string, BalanceMetrics> = new Map();
  private cardBalanceData: Map<string, CardBalanceData> = new Map();

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

  // Run a single AI vs AI game
  private async runSingleGame(
    deck1Name: string,
    deck2Name: string,
    difficulty1: string = 'medium',
    difficulty2: string = 'medium',
    maxRounds: number = 50
  ): Promise<AITestResult> {
    const startTime = Date.now();

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

    while (!gameEnded && rounds < maxRounds) {
      rounds++;

      // Check for game end conditions
      if (gameState.passed[1] && gameState.passed[2]) {
        const p1Influence = this.calculateInfluence(gameState, 1);
        const p2Influence = this.calculateInfluence(gameState, 2);

        if (p1Influence > p2Influence) {
          gameState.gameWinner = 1;
        } else if (p2Influence > p1Influence) {
          gameState.gameWinner = 2;
        } else {
          gameState.gameWinner = null; // Draw
        }
        gameEnded = true;
        break;
      }

      // AI 1 turn
      if (gameState.current === 1 && !gameState.passed[1]) {
        const prevState = gameState;
        gameState = this.simulateAITurn(gameState, 1, difficulty1 as any, log);

        // Process effect queue
        if (gameState._effectQueue && gameState._effectQueue.length > 0) {
          resolveQueue(gameState, gameState._effectQueue);
          gameState._effectQueue = [];
        }
      }

      // AI 2 turn
      if (gameState.current === 2 && !gameState.passed[2]) {
        const prevState = gameState;
        gameState = this.simulateAITurn(gameState, 2, difficulty2 as any, log);

        // Process effect queue
        if (gameState._effectQueue && gameState._effectQueue.length > 0) {
          resolveQueue(gameState, gameState._effectQueue);
          gameState._effectQueue = [];
        }
      }

      // Switch turns
      if (!gameEnded) {
        const newCurrent: Player = gameState.current === 1 ? 2 : 1;
        gameState.current = newCurrent;
        gameState.actionPoints = { ...gameState.actionPoints, [newCurrent]: 2 };
        gameState.passed = { ...gameState.passed, [newCurrent]: false };

        // Apply start of turn hooks
        applyStartOfTurnFlags(gameState, newCurrent, log);
      }
    }

    const finalInfluence = {
      player1: this.calculateInfluence(gameState, 1),
      player2: this.calculateInfluence(gameState, 2)
    };

    return {
      winner: gameState.gameWinner || null,
      rounds,
      finalInfluence,
      gameLog,
      duration: Date.now() - startTime,
      deck1Name,
      deck2Name,
      difficulty1,
      difficulty2
    };
  }

  // Simulate AI turn without React state updates
  private simulateAITurn(
    gameState: GameState,
    player: Player,
    difficulty: 'easy' | 'medium' | 'hard',
    log: (msg: string) => void
  ): GameState {
    const hand = gameState.hands[player];
    const playerBoard = gameState.board[player];
    const aiAP = gameState.actionPoints[player];

    if (aiAP <= 0) {
      log(`🤖 AI${player}(${difficulty}) passt - keine AP mehr.`);
      return { ...gameState, passed: { ...gameState.passed, [player]: true } };
    }

    // Simple AI decision making
    const action = this.decideBestAction(gameState, player, difficulty);
    if (action.type === 'pass') {
      log(`🤖 AI${player}(${difficulty}) passt - keine guten Aktionen.`);
      return { ...gameState, passed: { ...gameState.passed, [player]: true } };
    }

    // Execute chosen play
    const playIndex = action.type === 'play' ? action.index : -1;
    const chosenCard = hand[playIndex];
    if (!chosenCard) {
      log(`🤖 AI${player}(${difficulty}) Fehler: Ungültiger Kartenindex, passe.`);
      return { ...gameState, passed: { ...gameState.passed, [player]: true } };
    }

    // Simulate card play
    const newHand = [...hand];
    const playedCard = newHand.splice(playIndex, 1)[0];

    const lane = action.type === 'play' ? action.lane || 'aussen' : 'aussen';
    const newLane = [...gameState.board[player][lane], playedCard];
    const newBoard = { ...gameState.board[player], [lane]: newLane };

    const newState = {
      ...gameState,
      hands: { ...gameState.hands, [player]: newHand },
      board: { ...gameState.board, [player]: newBoard },
      actionPoints: { ...gameState.actionPoints, [player]: aiAP - 1 }
    };

    log(`🤖 AI${player}(${difficulty}) spielt ${(chosenCard as any).name || 'Unknown'} in ${lane}`);

    return newState;
  }

  // Simplified AI decision making
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

    // Find best card to play
    let bestIndex = -1;
    let bestScore = -1;

    for (let i = 0; i < hand.length; i++) {
      const card = hand[i];
      const score = this.evaluateCard(card, gameState, player, difficulty);

      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    if (bestIndex === -1 || bestScore < 0) {
      return { type: 'pass' };
    }

    // Determine lane
    const card = hand[bestIndex];
    const lane = this.determineLane(card, gameState, player);

    return { type: 'play', index: bestIndex, lane };
  }

  // Evaluate card value for AI decision
  private evaluateCard(card: any, gameState: GameState, player: Player, difficulty: string): number {
    let score = 0;

    if (card.kind === 'pol') {
      // Government cards - prioritize influence
      score = (card.influence || 0) * 10;

      // Bonus for high-tier cards
      if (card.T >= 3) score *= 1.5;

      // Difficulty-based adjustments
      if (difficulty === 'hard') score *= 1.2;
      else if (difficulty === 'easy') score *= 0.8;
    } else {
      // Special cards - evaluate based on type
      const spec = card;
      if (spec.type === 'Öffentlichkeitskarte') {
        score = 5; // Moderate value for public cards
      } else if (spec.type === 'Sofort-Initiative') {
        score = 8; // High value for instant initiatives
      } else if (spec.type === 'Dauerhaft-Initiative') {
        score = 6; // Good value for permanent initiatives
      } else if (spec.type === 'Intervention') {
        score = 7; // High value for interventions
      }
    }

    return score;
  }

  // Determine which lane to play card in
  private determineLane(card: any, gameState: GameState, player: Player): 'innen' | 'aussen' {
    if (card.kind === 'pol') {
      return 'aussen'; // Government cards go to government lane
    } else {
      // Special cards can go to either lane, prefer public
      return 'innen';
    }
  }

  // Calculate total influence for a player
  private calculateInfluence(gameState: GameState, player: Player): number {
    const governmentCards = gameState.board[player].aussen.filter(card =>
      card.kind === 'pol' && !card.deactivated
    );

    return governmentCards.reduce((sum, card) => {
      return sum + ((card as any).influence || 0);
    }, 0);
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

  // Run comprehensive AI vs AI testing
  public async runBalanceTest(
    iterations: number = 100,
    difficulties: string[] = ['medium'],
    maxRounds: number = 50
  ): Promise<{
    results: AITestResult[];
    balanceMetrics: BalanceMetrics[];
    cardBalanceData: CardBalanceData[];
    recommendations: string[];
  }> {
    console.log(`🧪 Starting AI vs AI balance test with ${iterations} iterations...`);

    this.results = [];
    this.balanceMetrics.clear();
    this.cardBalanceData.clear();

    const deckNames = AI_TEST_PRESETS.map(p => p.name);
    let gameCount = 0;

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
                this.updateBalanceMetrics(result);
                this.updateCardBalanceData(result);

                gameCount++;
                if (gameCount % 10 === 0) {
                  console.log(`📊 Completed ${gameCount} games...`);
                }
              } catch (error) {
                console.error(`❌ Game failed: ${error}`);
              }
            }
          }
        }
      }
    }

    const balanceMetricsArray = Array.from(this.balanceMetrics.values());
    const cardBalanceArray = Array.from(this.cardBalanceData.values());
    const recommendations = this.generateRecommendations(balanceMetricsArray, cardBalanceArray);

    console.log(`✅ Balance test completed! ${gameCount} games played.`);

    return {
      results: this.results,
      balanceMetrics: balanceMetricsArray,
      cardBalanceData: cardBalanceArray,
      recommendations
    };
  }

  // Update balance metrics for decks
  private updateBalanceMetrics(result: AITestResult): void {
    const updateDeckMetrics = (deckName: string, won: boolean, influence: number, rounds: number) => {
      const existing = this.balanceMetrics.get(deckName) || {
        deckName,
        wins: 0,
        losses: 0,
        totalGames: 0,
        winRate: 0,
        avgRounds: 0,
        avgInfluence: 0,
        performance: 'balanced' as const
      };

      existing.totalGames++;
      if (won) existing.wins++;
      else existing.losses++;

      existing.winRate = existing.wins / existing.totalGames;
      existing.avgRounds = (existing.avgRounds * (existing.totalGames - 1) + rounds) / existing.totalGames;
      existing.avgInfluence = (existing.avgInfluence * (existing.totalGames - 1) + influence) / existing.totalGames;

      // Determine performance category
      if (existing.winRate > 0.6) existing.performance = 'overpowered';
      else if (existing.winRate < 0.4) existing.performance = 'underpowered';
      else existing.performance = 'balanced';

      this.balanceMetrics.set(deckName, existing);
    };

    // Update metrics for both decks
    const deck1Won = result.winner === 1;
    const deck2Won = result.winner === 2;

    updateDeckMetrics(result.deck1Name, deck1Won, result.finalInfluence.player1, result.rounds);
    updateDeckMetrics(result.deck2Name, deck2Won, result.finalInfluence.player2, result.rounds);
  }

  // Update card balance data
  private updateCardBalanceData(result: AITestResult): void {
    const updateCardData = (deckName: string, won: boolean, influence: number) => {
      const deck = this.getDeckEntries(deckName);

      deck.forEach(entry => {
        const cardName = this.getCardName(entry);
        if (!cardName) return;

        const existing = this.cardBalanceData.get(cardName) || {
          cardName,
          appearances: 0,
          wins: 0,
          winRate: 0,
          avgInfluence: 0,
          cost: this.getCardCost(entry),
          performance: 'balanced' as const
        };

        existing.appearances++;
        if (won) existing.wins++;
        existing.winRate = existing.wins / existing.appearances;
        existing.avgInfluence = (existing.avgInfluence * (existing.appearances - 1) + influence) / existing.appearances;

        // Determine performance category
        if (existing.winRate > 0.6) existing.performance = 'undercosted';
        else if (existing.winRate < 0.4) existing.performance = 'overcosted';
        else existing.performance = 'balanced';

        this.cardBalanceData.set(cardName, existing);
      });
    };

    const deck1Won = result.winner === 1;
    const deck2Won = result.winner === 2;

    updateCardData(result.deck1Name, deck1Won, result.finalInfluence.player1);
    updateCardData(result.deck2Name, deck2Won, result.finalInfluence.player2);
  }

  // Get card name from entry
  private getCardName(entry: BuilderEntry): string | null {
    if (entry.kind === 'pol') {
      const pol = Pols.find((p: any) => p.id === entry.baseId);
      return pol?.name || null;
    } else {
      const spec = Specials.find((s: any) => s.id === entry.baseId);
      return spec?.name || null;
    }
  }

  // Get card cost from entry
  private getCardCost(entry: BuilderEntry): number {
    if (entry.kind === 'pol') {
      const pol = Pols.find((p: any) => p.id === entry.baseId);
      return pol?.BP || 0;
    } else {
      const spec = Specials.find((s: any) => s.id === entry.baseId);
      return spec?.bp || 0;
    }
  }

  // Generate balance recommendations
  private generateRecommendations(
    balanceMetrics: BalanceMetrics[],
    cardBalanceData: CardBalanceData[]
  ): string[] {
    const recommendations: string[] = [];

    // Deck balance recommendations
    balanceMetrics.forEach(deck => {
      if (deck.performance === 'overpowered') {
        recommendations.push(`🔴 ${deck.deckName}: Overpowered (${(deck.winRate * 100).toFixed(1)}% win rate) - Consider reducing card quality or increasing costs`);
      } else if (deck.performance === 'underpowered') {
        recommendations.push(`🔵 ${deck.deckName}: Underpowered (${(deck.winRate * 100).toFixed(1)}% win rate) - Consider improving card quality or reducing costs`);
      }
    });

    // Card balance recommendations
    cardBalanceData
      .filter(card => card.appearances >= 10) // Only consider cards with sufficient data
      .forEach(card => {
        if (card.performance === 'undercosted') {
          recommendations.push(`💰 ${card.cardName}: Under-costed (${(card.winRate * 100).toFixed(1)}% win rate) - Consider increasing cost from ${card.cost} to ${Math.ceil(card.cost * 1.2)} BP`);
        } else if (card.performance === 'overcosted') {
          recommendations.push(`💸 ${card.cardName}: Over-costed (${(card.winRate * 100).toFixed(1)}% win rate) - Consider decreasing cost from ${card.cost} to ${Math.max(1, Math.floor(card.cost * 0.8))} BP`);
        }
      });

    return recommendations;
  }

  // Export results to JSON
  public exportResults(filename: string = 'ai_balance_test_results.json'): void {
    const exportData = {
      timestamp: new Date().toISOString(),
      totalGames: this.results.length,
      results: this.results,
      balanceMetrics: Array.from(this.balanceMetrics.values()),
      cardBalanceData: Array.from(this.cardBalanceData.values()),
      recommendations: this.generateRecommendations(
        Array.from(this.balanceMetrics.values()),
        Array.from(this.cardBalanceData.values())
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
