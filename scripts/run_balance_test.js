#!/usr/bin/env node

/**
 * AI vs AI Balance Test Runner
 *
 * This script runs automated balance tests to evaluate deck and card balance.
 * It can be run from the command line or integrated into CI/CD pipelines.
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

// Mock game data
const mockPols = [
  { id: 1, name: "Vladimir Putin", BP: 8, T: 3, influence: 10 },
  { id: 2, name: "Xi Jinping", BP: 7, T: 3, influence: 9 },
  { id: 3, name: "Donald Trump", BP: 6, T: 2, influence: 8 },
  { id: 4, name: "Elon Musk", BP: 5, T: 2, influence: 7 },
  { id: 5, name: "Bill Gates", BP: 4, T: 1, influence: 6 },
];

const mockSpecs = [
  { id: 101, name: "Greta Thunberg", bp: 3, type: "Öffentlichkeitskarte" },
  { id: 102, name: "Spin Doctor", bp: 4, type: "Sofort-Initiative" },
  { id: 103, name: "Think-tank", bp: 5, type: "Dauerhaft-Initiative" },
];

// Mock game utilities
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
};

// Mock other dependencies
global.Pols = mockPols;
global.Specs = mockSpecs;
global.buildDeckFromEntries = mockGameUtils.buildDeckFromEntries;
global.EffectQueueManager = mockGameUtils.EffectQueueManager;

// Simple AI vs AI test runner
class SimpleAITester {
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
          "Vladimir Putin",
          "Xi Jinping",
          "Donald Trump",
          "Greta Thunberg",
          "Spin Doctor",
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

  // Simulate a single game
  async runSingleGame(deck1Name, deck2Name, maxRounds = 20) {
    const startTime = Date.now();

    // Simple game simulation
    const deck1 = this.getDeckEntries(deck1Name);
    const deck2 = this.getDeckEntries(deck2Name);

    // Calculate deck strength (sum of BP costs)
    const deck1Strength = deck1.reduce((sum, entry) => {
      if (entry.kind === "pol") {
        const pol = mockPols.find((p) => p.id === entry.baseId);
        return sum + (pol?.BP || 0);
      } else {
        const spec = mockSpecs.find((s) => s.id === entry.baseId);
        return sum + (spec?.bp || 0);
      }
    }, 0);

    const deck2Strength = deck2.reduce((sum, entry) => {
      if (entry.kind === "pol") {
        const pol = mockPols.find((p) => p.id === entry.baseId);
        return sum + (pol?.BP || 0);
      } else {
        const spec = mockSpecs.find((s) => s.id === entry.baseId);
        return sum + (spec?.bp || 0);
      }
    }, 0);

    // Simple win determination based on deck strength + randomness
    const randomFactor = Math.random() * 0.2 - 0.1; // ±10% randomness
    const deck1WinChance =
      0.5 + (deck1Strength - deck2Strength) / 100 + randomFactor;
    const winner = Math.random() < deck1WinChance ? 1 : 2;

    const rounds = Math.floor(Math.random() * 15) + 10; // 10-25 rounds

    return {
      winner,
      rounds,
      finalInfluence: {
        player1: Math.floor(Math.random() * 50) + 20,
        player2: Math.floor(Math.random() * 50) + 20,
      },
      gameLog: [`Game between ${deck1Name} vs ${deck2Name}`],
      duration: Date.now() - startTime,
      deck1Name,
      deck2Name,
      difficulty1: "medium",
      difficulty2: "medium",
    };
  }

  // Run balance test
  async runBalanceTest(iterations = 100) {
    console.log(
      `🧪 Starting AI vs AI balance test with ${iterations} iterations...`
    );

    this.results = [];
    const deckNames = this.presets.map((p) => p.name);
    let gameCount = 0;

    // Test all deck combinations
    for (let i = 0; i < deckNames.length; i++) {
      for (let j = 0; j < deckNames.length; j++) {
        if (i === j) continue; // Skip mirror matches

        for (let iter = 0; iter < iterations; iter++) {
          try {
            const result = await this.runSingleGame(deckNames[i], deckNames[j]);
            this.results.push(result);

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

    // Calculate balance metrics
    const balanceMetrics = this.calculateBalanceMetrics();
    const recommendations = this.generateRecommendations(balanceMetrics);

    console.log(`✅ Balance test completed! ${gameCount} games played.`);

    return {
      results: this.results,
      balanceMetrics,
      recommendations,
    };
  }

  // Calculate balance metrics
  calculateBalanceMetrics() {
    const metrics = new Map();

    this.results.forEach((result) => {
      const updateDeckMetrics = (deckName, won) => {
        const existing = metrics.get(deckName) || {
          deckName,
          wins: 0,
          losses: 0,
          totalGames: 0,
          winRate: 0,
          avgRounds: 0,
          performance: "balanced",
        };

        existing.totalGames++;
        if (won) existing.wins++;
        else existing.losses++;

        existing.winRate = existing.wins / existing.totalGames;
        existing.avgRounds =
          (existing.avgRounds * (existing.totalGames - 1) + result.rounds) /
          existing.totalGames;

        // Determine performance category
        if (existing.winRate > 0.6) existing.performance = "overpowered";
        else if (existing.winRate < 0.4) existing.performance = "underpowered";
        else existing.performance = "balanced";

        metrics.set(deckName, existing);
      };

      const deck1Won = result.winner === 1;
      const deck2Won = result.winner === 2;

      updateDeckMetrics(result.deck1Name, deck1Won);
      updateDeckMetrics(result.deck2Name, deck2Won);
    });

    return Array.from(metrics.values());
  }

  // Generate recommendations
  generateRecommendations(balanceMetrics) {
    const recommendations = [];

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
    });

    return recommendations;
  }

  // Export results
  exportResults(filename = "balance_test_results.json") {
    const exportData = {
      timestamp: new Date().toISOString(),
      totalGames: this.results.length,
      results: this.results,
      balanceMetrics: this.calculateBalanceMetrics(),
      recommendations: this.generateRecommendations(
        this.calculateBalanceMetrics()
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

  console.log("🤖 AI vs AI Balance Test Runner");
  console.log(`📊 Running ${iterations} iterations per matchup...`);

  const tester = new SimpleAITester();

  try {
    const results = await tester.runBalanceTest(iterations);

    // Display summary
    console.log("\n📈 Balance Test Summary:");
    console.log("========================");

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
        )}% win rate (${deck.wins}/${deck.totalGames})`
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

module.exports = { SimpleAITester };
