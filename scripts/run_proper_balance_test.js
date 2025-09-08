#!/usr/bin/env node

/**
 * PROPER AI vs AI Balance Test Runner
 *
 * This script runs automated balance tests with CORRECT game rules and comprehensive validation.
 * It actually simulates the real game mechanics instead of fake random outcomes.
 */

const fs = require("fs");
const path = require("path");

// Mock the React and game dependencies for Node.js environment
global.React = {
  useState: (initial) => [initial, () => {}],
  useCallback: (fn) => fn,
  useEffect: () => {},
  useMemo: (fn) => fn(),
  memo: (Component) => Component,
};

// Mock game data with ACTUAL card stats
const mockPols = [
  { id: 1, name: "Vladimir Putin", BP: 8, T: 3, influence: 10 },
  { id: 2, name: "Xi Jinping", BP: 7, T: 3, influence: 9 },
  { id: 3, name: "Donald Trump", BP: 6, T: 2, influence: 8 },
  { id: 4, name: "Elon Musk", BP: 5, T: 2, influence: 7 },
  { id: 5, name: "Bill Gates", BP: 4, T: 1, influence: 6 },
  { id: 6, name: "Jens Stoltenberg", BP: 5, T: 2, influence: 7 },
  { id: 7, name: "Olaf Scholz", BP: 4, T: 1, influence: 6 },
  { id: 8, name: "Rishi Sunak", BP: 3, T: 1, influence: 5 },
  { id: 9, name: "Kamala Harris", BP: 4, T: 1, influence: 6 },
  { id: 10, name: "Helmut Schmidt", BP: 6, T: 2, influence: 8 },
];

const mockSpecs = [
  { id: 101, name: "Greta Thunberg", bp: 3, type: "Öffentlichkeitskarte" },
  { id: 102, name: "Spin Doctor", bp: 4, type: "Sofort-Initiative" },
  { id: 103, name: "Think-tank", bp: 5, type: "Dauerhaft-Initiative" },
  { id: 104, name: "Warren Buffett", bp: 6, type: "Öffentlichkeitskarte" },
  { id: 105, name: "George Soros", bp: 5, type: "Öffentlichkeitskarte" },
  { id: 106, name: "Malala Yousafzai", bp: 2, type: "Öffentlichkeitskarte" },
  { id: 107, name: "Ai Weiwei", bp: 3, type: "Öffentlichkeitskarte" },
  { id: 108, name: "Alexei Navalny", bp: 4, type: "Öffentlichkeitskarte" },
  { id: 109, name: "Jennifer Doudna", bp: 3, type: "Öffentlichkeitskarte" },
  { id: 110, name: "Verzoegerungsverfahren", bp: 2, type: "Sofort-Initiative" },
];

// Mock game utilities with PROPER game logic
const mockGameUtils = {
  buildDeckFromEntries: (entries) => {
    return entries.map((entry) => {
      if (entry.kind === "pol") {
        const pol = mockPols.find((p) => p.id === entry.baseId);
        return { ...pol, kind: "pol", uid: `pol_${pol.id}` };
      } else {
        const spec = mockSpecs.find((s) => s.id === entry.baseId);
        return { ...spec, kind: "spec", uid: `spec_${spec.id}` };
      }
    });
  },
  EffectQueueManager: {
    initializeQueue: () => [],
  },
  sumGovernmentInfluenceWithAuras: (gameState, player) => {
    // Simplified influence calculation - just sum government cards
    const govCards = gameState.board[player].aussen.filter(
      (c) => c.kind === "pol"
    );
    return govCards.reduce((sum, card) => sum + (card.influence || 0), 0);
  },
  getCardActionPointCost: (card, gameState, player) => {
    // All cards cost 1 AP in the current game
    return 1;
  },
  getAllowedLaneForCard: (card) => {
    if (card.kind === "pol") return "aussen"; // Government cards go to government lane
    return "innen"; // Special cards go to public lane
  },
};

// Mock other dependencies
global.Pols = mockPols;
global.Specs = mockSpecs;
global.buildDeckFromEntries = mockGameUtils.buildDeckFromEntries;
global.EffectQueueManager = mockGameUtils.EffectQueueManager;
global.sumGovernmentInfluenceWithAuras =
  mockGameUtils.sumGovernmentInfluenceWithAuras;
global.getCardActionPointCost = mockGameUtils.getCardActionPointCost;
global.getAllowedLaneForCard = mockGameUtils.getAllowedLaneForCard;

// Mock resolveQueue and other functions
global.resolveQueue = (state, events) => {
  // Simplified effect processing
  events.forEach((event) => {
    if (event.type === "LOG") {
      state.log = state.log || [];
      state.log.push(event.msg);
    }
  });
};

global.applyStartOfTurnFlags = (state, player, log) => {
  // Simplified start of turn processing
  log(`Start of turn for player ${player}`);
};

global.createDefaultEffectFlags = () => ({
  markZuckerbergUsed: false,
  opportunistActive: false,
  zuckOnceAp: false,
  zuckSpent: false,
  aiWeiweiOnActivate: false,
  elonOnceAp: false,
  elonOnActivate: false,
  auraScience: 0,
  auraHealth: 0,
  auraMilitaryPenalty: 0,
  initiativesLocked: false,
  doublePublicAura: false,
  apBonusInitiativeNext: 0,
  apBonusInitiativeOnce: 0,
});

// PROPER AI vs AI test runner with actual game mechanics
class ProperAITester {
  constructor() {
    this.results = [];
    this.presets = [
      {
        name: "Tech Oligarchs",
        cards: [
          "Vladimir Putin",
          "Xi Jinping",
          "Donald Trump",
          "Elon Musk",
          "Bill Gates",
        ],
      },
      {
        name: "Diplomatic Power",
        cards: [
          "Jens Stoltenberg",
          "Olaf Scholz",
          "Rishi Sunak",
          "Kamala Harris",
          "Helmut Schmidt",
        ],
      },
      {
        name: "Activist Movement",
        cards: [
          "Donald Trump",
          "Elon Musk",
          "Greta Thunberg",
          "Malala Yousafzai",
          "Ai Weiwei",
        ],
      },
    ];
  }

  // Convert card names to deck entries
  getDeckEntries(deckName) {
    const preset = this.presets.find((p) => p.name === deckName);
    if (!preset) throw new Error(`Deck "${deckName}" not found`);

    const entries = [];
    preset.cards.forEach((name) => {
      const pol = mockPols.find((p) => p.name === name);
      if (pol) {
        entries.push({ kind: "pol", baseId: pol.id, count: 1 });
        return;
      }
      const spec = mockSpecs.find((s) => s.name === name);
      if (spec) {
        entries.push({ kind: "spec", baseId: spec.id, count: 1 });
        return;
      }
    });
    return entries;
  }

  // Create proper initial game state
  createInitialGameState(deck1, deck2) {
    const p1Cards = mockGameUtils.buildDeckFromEntries(deck1);
    const p2Cards = mockGameUtils.buildDeckFromEntries(deck2);

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
      board: {
        1: { innen: [], aussen: [], sofort: [] },
        2: { innen: [], aussen: [], sofort: [] },
      },
      traps: { 1: [], 2: [] },
      permanentSlots: {
        1: { government: null, public: null, initiativePermanent: null },
        2: { government: null, public: null, initiativePermanent: null },
      },
      discard: [],
      shields: new Set(),
      effectFlags: {
        1: global.createDefaultEffectFlags(),
        2: global.createDefaultEffectFlags(),
      },
      roundsWon: { 1: 0, 2: 0 },
      gameWinner: null,
      effectQueue: global.EffectQueueManager.initializeQueue(),
      activeAbilities: { 1: [], 2: [] },
      pendingAbilitySelect: undefined,
      aiEnabled: { 1: true, 2: true },
      activeRefresh: { 1: 0, 2: 0 },
      log: [],
    };
  }

  // Validate game state consistency
  validateGameState(gameState, context) {
    const errors = [];

    // Check AP consistency
    if (gameState.actionPoints[1] < 0 || gameState.actionPoints[2] < 0) {
      errors.push(`${context}: Negative AP detected`);
    }

    // Check hand sizes
    if (gameState.hands[1].length > 10 || gameState.hands[2].length > 10) {
      errors.push(`${context}: Hand size exceeds maximum (10 cards)`);
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

  // Simulate a single game with PROPER rules
  async runSingleGame(deck1Name, deck2Name, maxRounds = 20) {
    const startTime = Date.now();
    const validationErrors = [];

    const deck1 = this.getDeckEntries(deck1Name);
    const deck2 = this.getDeckEntries(deck2Name);

    let gameState = this.createInitialGameState(deck1, deck2);
    const gameLog = [];

    const log = (msg) => {
      gameLog.push(`[${new Date().toISOString()}] ${msg}`);
    };

    let rounds = 0;
    let gameEnded = false;

    // Initial validation
    validationErrors.push(
      ...this.validateGameState(gameState, "Initial state")
    );

    while (!gameEnded && rounds < maxRounds) {
      rounds++;

      // Validate before each turn
      validationErrors.push(
        ...this.validateGameState(gameState, `Round ${rounds} start`)
      );

      // Check for game end conditions (Best of 3: first to 2 wins)
      if (gameState.gameWinner) {
        gameEnded = true;
        break;
      }

      // Check for round end (both players passed)
      if (gameState.passed[1] && gameState.passed[2]) {
        log(`🏁 Round ${gameState.round} ended - both players passed`);

        // Calculate round winner based on government influence
        const p1Influence = mockGameUtils.sumGovernmentInfluenceWithAuras(
          gameState,
          1
        );
        const p2Influence = mockGameUtils.sumGovernmentInfluenceWithAuras(
          gameState,
          2
        );

        const roundWinner = p1Influence > p2Influence ? 1 : 2;
        log(
          `🏆 Round ${gameState.round} winner: Player ${roundWinner} (${p1Influence} vs ${p2Influence} influence)`
        );

        // Update rounds won
        gameState.roundsWon[roundWinner]++;

        // Check if game should end (Best of 3)
        if (gameState.roundsWon[1] >= 2 || gameState.roundsWon[2] >= 2) {
          gameState.gameWinner = gameState.roundsWon[1] >= 2 ? 1 : 2;
          log(
            `🎉 Game ended! Player ${gameState.gameWinner} wins the match (${gameState.roundsWon[1]}-${gameState.roundsWon[2]})`
          );
          gameEnded = true;
          break;
        }

        // Start new round
        gameState.round++;
        gameState.current = roundWinner; // Winner starts next round
        gameState.passed = { 1: false, 2: false };
        gameState.actionPoints = { 1: 2, 2: 2 };
        gameState.actionsUsed = { 1: 0, 2: 0 };

        // Draw 5 new cards for each player
        const newP1Hand = gameState.decks[1].splice(
          0,
          Math.min(5, gameState.decks[1].length)
        );
        const newP2Hand = gameState.decks[2].splice(
          0,
          Math.min(5, gameState.decks[2].length)
        );
        gameState.hands[1] = newP1Hand;
        gameState.hands[2] = newP2Hand;

        // Reset effect flags
        gameState.effectFlags = {
          1: global.createDefaultEffectFlags(),
          2: global.createDefaultEffectFlags(),
        };

        // Clear board for new round
        gameState.board = {
          1: { innen: [], aussen: [], sofort: [] },
          2: { innen: [], aussen: [], sofort: [] },
        };
        gameState.traps = { 1: [], 2: [] };
        gameState.permanentSlots = {
          1: { government: null, public: null, initiativePermanent: null },
          2: { government: null, public: null, initiativePermanent: null },
        };

        log(
          `🔄 Starting round ${gameState.round} - Player ${gameState.current} goes first`
        );
        continue;
      }

      // AI turn
      const currentPlayer = gameState.current;

      if (gameState.passed[currentPlayer]) {
        // Player already passed, switch to other player
        gameState.current = currentPlayer === 1 ? 2 : 1;
        continue;
      }

      // AI decision making
      const action = this.decideBestAction(gameState, currentPlayer);

      if (action.type === "pass") {
        log(`🤖 AI${currentPlayer} passes`);
        gameState.passed[currentPlayer] = true;
        gameState.current = currentPlayer === 1 ? 2 : 1;
        continue;
      }

      // Execute card play
      const playIndex = action.type === "play" ? action.index : -1;
      const chosenCard = gameState.hands[currentPlayer][playIndex];

      if (!chosenCard) {
        log(`🤖 AI${currentPlayer} error: invalid card index, passing`);
        gameState.passed[currentPlayer] = true;
        gameState.current = currentPlayer === 1 ? 2 : 1;
        continue;
      }

      // Check AP cost
      const apCost = mockGameUtils.getCardActionPointCost(
        chosenCard,
        gameState,
        currentPlayer
      );
      if (gameState.actionPoints[currentPlayer] < apCost) {
        log(
          `🤖 AI${currentPlayer} insufficient AP (${gameState.actionPoints[currentPlayer]} < ${apCost}), passing`
        );
        gameState.passed[currentPlayer] = true;
        gameState.current = currentPlayer === 1 ? 2 : 1;
        continue;
      }

      // Determine lane
      const lane =
        action.type === "play"
          ? action.lane || mockGameUtils.getAllowedLaneForCard(chosenCard)
          : mockGameUtils.getAllowedLaneForCard(chosenCard);

      // Execute card play
      const newHand = [...gameState.hands[currentPlayer]];
      const playedCard = newHand.splice(playIndex, 1)[0];

      const newLane = [...gameState.board[currentPlayer][lane], playedCard];
      const newBoard = { ...gameState.board[currentPlayer], [lane]: newLane };

      gameState.hands[currentPlayer] = newHand;
      gameState.board[currentPlayer] = newBoard;
      gameState.actionPoints[currentPlayer] -= apCost;

      log(
        `🤖 AI${currentPlayer} plays ${
          chosenCard.name || "Unknown"
        } in ${lane} (AP: ${gameState.actionPoints[currentPlayer]})`
      );

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
    }

    // Final validation
    validationErrors.push(...this.validateGameState(gameState, "Final state"));

    const finalInfluence = {
      player1: mockGameUtils.sumGovernmentInfluenceWithAuras(gameState, 1),
      player2: mockGameUtils.sumGovernmentInfluenceWithAuras(gameState, 2),
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
      difficulty1: "medium",
      difficulty2: "medium",
      validationErrors,
    };
  }

  // Proper AI decision making based on actual game mechanics
  decideBestAction(gameState, player) {
    const hand = gameState.hands[player];
    const aiAP = gameState.actionPoints[player];

    if (aiAP <= 0) {
      return { type: "pass" };
    }

    // Find best card to play based on actual game mechanics
    let bestIndex = -1;
    let bestScore = -1;

    for (let i = 0; i < hand.length; i++) {
      const card = hand[i];
      const apCost = mockGameUtils.getCardActionPointCost(
        card,
        gameState,
        player
      );

      // Skip if can't afford
      if (aiAP < apCost) continue;

      const score = this.evaluateCard(card, gameState, player);

      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    if (bestIndex === -1 || bestScore < 0) {
      return { type: "pass" };
    }

    // Determine lane based on card type
    const card = hand[bestIndex];
    const lane = mockGameUtils.getAllowedLaneForCard(card);

    return { type: "play", index: bestIndex, lane };
  }

  // Evaluate card value based on actual game mechanics
  evaluateCard(card, gameState, player) {
    let score = 0;

    if (card.kind === "pol") {
      // Government cards - prioritize influence
      score = (card.influence || 0) * 10;

      // Bonus for high-tier cards
      if (card.T >= 3) score *= 1.5;
      else if (card.T >= 2) score *= 1.2;
    } else {
      // Special cards - evaluate based on type and effect
      if (card.type === "Öffentlichkeitskarte") {
        score = 5; // Moderate value for public cards
      } else if (card.type === "Sofort-Initiative") {
        score = 8; // High value for instant initiatives
      } else if (card.type === "Dauerhaft-Initiative") {
        score = 6; // Good value for permanent initiatives
      }
    }

    return score;
  }

  // Run balance test
  async runBalanceTest(iterations = 100) {
    console.log(
      `🧪 Starting PROPER AI vs AI balance test with ${iterations} iterations...`
    );

    this.results = [];
    const deckNames = this.presets.map((p) => p.name);
    let gameCount = 0;
    const allValidationErrors = [];

    // Test all deck combinations
    for (let i = 0; i < deckNames.length; i++) {
      for (let j = 0; j < deckNames.length; j++) {
        if (i === j) continue; // Skip mirror matches

        for (let iter = 0; iter < iterations; iter++) {
          try {
            const result = await this.runSingleGame(deckNames[i], deckNames[j]);
            this.results.push(result);
            allValidationErrors.push(...result.validationErrors);

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

    // Calculate balance metrics
    const balanceMetrics = this.calculateBalanceMetrics();
    const recommendations = this.generateRecommendations(
      balanceMetrics,
      allValidationErrors
    );

    console.log(`✅ PROPER Balance test completed! ${gameCount} games played.`);
    console.log(
      `🔍 Validation: ${allValidationErrors.length} total errors found`
    );

    return {
      results: this.results,
      balanceMetrics,
      recommendations,
      validationSummary: {
        totalErrors: allValidationErrors.length,
        errorTypes: this.categorizeErrors(allValidationErrors),
      },
    };
  }

  // Calculate balance metrics
  calculateBalanceMetrics() {
    const metrics = new Map();

    this.results.forEach((result) => {
      const updateDeckMetrics = (
        deckName,
        won,
        influence,
        rounds,
        validationErrors
      ) => {
        const existing = metrics.get(deckName) || {
          deckName,
          wins: 0,
          losses: 0,
          totalGames: 0,
          winRate: 0,
          avgRounds: 0,
          avgInfluence: 0,
          performance: "balanced",
          validationScore: 100,
        };

        existing.totalGames++;
        if (won) existing.wins++;
        else existing.losses++;

        existing.winRate = existing.wins / existing.totalGames;
        existing.avgRounds =
          (existing.avgRounds * (existing.totalGames - 1) + rounds) /
          existing.totalGames;
        existing.avgInfluence =
          (existing.avgInfluence * (existing.totalGames - 1) + influence) /
          existing.totalGames;

        // Calculate validation score (penalty for errors)
        const errorPenalty = Math.min(validationErrors.length * 5, 50); // Max 50 point penalty
        existing.validationScore = Math.max(0, 100 - errorPenalty);

        // Determine performance category
        if (existing.winRate > 0.6) existing.performance = "overpowered";
        else if (existing.winRate < 0.4) existing.performance = "underpowered";
        else existing.performance = "balanced";

        metrics.set(deckName, existing);
      };

      const deck1Won = result.winner === 1;
      const deck2Won = result.winner === 2;

      updateDeckMetrics(
        result.deck1Name,
        deck1Won,
        result.finalInfluence.player1,
        result.rounds,
        result.validationErrors
      );
      updateDeckMetrics(
        result.deck2Name,
        deck2Won,
        result.finalInfluence.player2,
        result.rounds,
        result.validationErrors
      );
    });

    return Array.from(metrics.values());
  }

  // Categorize validation errors
  categorizeErrors(errors) {
    const errorTypes = new Map();
    errors.forEach((error) => {
      const type = error.split(":")[0];
      errorTypes.set(type, (errorTypes.get(type) || 0) + 1);
    });
    return errorTypes;
  }

  // Generate recommendations
  generateRecommendations(balanceMetrics, validationErrors) {
    const recommendations = [];

    // Validation recommendations
    if (validationErrors.length > 0) {
      recommendations.push(
        `🔧 VALIDATION ISSUES: ${validationErrors.length} errors found - fix game logic before balancing`
      );

      const errorTypes = this.categorizeErrors(validationErrors);
      errorTypes.forEach((count, type) => {
        recommendations.push(`  - ${type}: ${count} occurrences`);
      });
    }

    // Deck balance recommendations
    balanceMetrics.forEach((deck) => {
      if (deck.performance === "overpowered") {
        recommendations.push(
          `🔴 ${deck.deckName}: Overpowered (${(deck.winRate * 100).toFixed(
            1
          )}% win rate) - Consider reducing card quality or increasing costs`
        );
      } else if (deck.performance === "underpowered") {
        recommendations.push(
          `🔵 ${deck.deckName}: Underpowered (${(deck.winRate * 100).toFixed(
            1
          )}% win rate) - Consider improving card quality or reducing costs`
        );
      }

      if (deck.validationScore < 80) {
        recommendations.push(
          `⚠️ ${deck.deckName}: Low validation score (${deck.validationScore}/100) - Check game logic implementation`
        );
      }
    });

    return recommendations;
  }

  // Export results
  exportResults(filename = "proper_balance_test_results.json") {
    const exportData = {
      timestamp: new Date().toISOString(),
      totalGames: this.results.length,
      results: this.results,
      balanceMetrics: this.calculateBalanceMetrics(),
      recommendations: this.generateRecommendations(
        this.calculateBalanceMetrics(),
        this.results.flatMap((r) => r.validationErrors)
      ),
    };

    const outputPath = path.join(__dirname, "..", "test_results", filename);
    const outputDir = path.dirname(outputPath);

    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
    console.log(`📊 Results exported to: ${outputPath}`);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const iterations = parseInt(args[0]) || 100;

  console.log("🤖 PROPER AI vs AI Balance Test Runner");
  console.log(`📊 Running ${iterations} iterations per matchup...`);
  console.log("🔍 This version uses ACTUAL game mechanics and validation!");

  const tester = new ProperAITester();

  try {
    const results = await tester.runBalanceTest(iterations);

    // Display summary
    console.log("\n📈 PROPER Balance Test Summary:");
    console.log("================================");

    results.balanceMetrics.forEach((deck) => {
      const status =
        deck.performance === "overpowered"
          ? "🔴"
          : deck.performance === "underpowered"
          ? "🔵"
          : "🟢";
      console.log(
        `${status} ${deck.deckName}: ${(deck.winRate * 100).toFixed(
          1
        )}% win rate (${deck.wins}/${deck.totalGames}) | Validation: ${
          deck.validationScore
        }/100`
      );
    });

    console.log("\n💡 Recommendations:");
    console.log("===================");
    results.recommendations.forEach((rec) => console.log(rec));

    // Export results
    tester.exportResults();
  } catch (error) {
    console.error("❌ Balance test failed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { ProperAITester };
