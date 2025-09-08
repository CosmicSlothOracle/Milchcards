# 🤖 AI vs AI Balance Testing System

A comprehensive system for testing and balancing preset decks and card costs through automated AI vs AI gameplay.

## 🎯 Purpose

This system helps identify:
- **Overpowered decks** that win too frequently
- **Underpowered decks** that lose too often
- **Over-costed cards** that perform poorly for their BP cost
- **Under-costed cards** that provide too much value
- **Optimal deck compositions** and strategies

## 🚀 Quick Start

### In-Game Testing (Dev Mode)
1. Enable **Dev Mode** in the game
2. Click the **🤖 AI Balance Tester** button (top-right)
3. Configure test parameters:
   - **Iterations**: Number of games per matchup (default: 50)
   - **Max Rounds**: Maximum rounds per game (default: 30)
   - **AI Difficulties**: Select which AI difficulty levels to test
4. Click **🚀 Start Balance Test**
5. View results and export data

### Command Line Testing
```bash
# Quick test (50 iterations per matchup)
npm run balance:test:quick

# Standard test (100 iterations per matchup)
npm run balance:test

# Full test (500 iterations per matchup)
npm run balance:test:full

# Custom iterations
node scripts/run_balance_test.js 200
```

## 📊 Test Results

### Deck Balance Metrics
- **Win Rate**: Percentage of games won by each deck
- **Average Rounds**: How long games typically last
- **Average Influence**: Final influence scores
- **Performance Category**:
  - 🔴 **Overpowered** (>60% win rate)
  - 🟢 **Balanced** (40-60% win rate)
  - 🔵 **Underpowered** (<40% win rate)

### Card Balance Data
- **Appearances**: How often each card is used
- **Win Rate**: Success rate when card is in deck
- **Cost vs Performance**: BP cost vs actual value
- **Performance Category**:
  - 💰 **Under-costed** (>60% win rate)
  - 🟢 **Balanced** (40-60% win rate)
  - 💸 **Over-costed** (<40% win rate)

## 🎮 Preset Decks Tested

1. **Tech Oligarchs**: Putin, Xi, Trump, Musk, Gates, etc.
2. **Diplomatic Power**: Stoltenberg, Scholz, Sunak, Harris, Schmidt, etc.
3. **Activist Movement**: Netanyahu, Zelenskyy, von der Leyen, Modi, Lula, etc.
4. **Initiative Rush**: High initiative cards with instant effects
5. **Media Control**: Putin, Xi, Trump, Oprah, Zuckerberg, etc.
6. **Economic Influence**: Business leaders and economic cards

## 🔧 Technical Details

### AI Decision Making
The AI uses a simplified decision tree:
1. **Government Cards**: Prioritized by influence value
2. **Special Cards**: Evaluated by type and effect
3. **Lane Selection**: Government → aussen, Specials → innen
4. **Difficulty Scaling**: Easy (0.8x), Medium (1.0x), Hard (1.2x)

### Game Simulation
- **Turn-based gameplay** with proper AP management
- **Effect queue processing** for card abilities
- **Win condition detection** (influence comparison)
- **Round limits** to prevent infinite games
- **Randomization** to avoid deterministic outcomes

### Data Collection
- **Game logs** with detailed turn-by-turn actions
- **Performance metrics** aggregated across all games
- **Statistical analysis** with confidence intervals
- **Export functionality** for further analysis

## 📈 Interpreting Results

### Deck Balance
```
🔴 Tech Oligarchs: Overpowered (67.3% win rate) - Consider reducing card quality
🟢 Diplomatic Power: Balanced (52.1% win rate) - Well balanced
🔵 Activist Movement: Underpowered (31.2% win rate) - Needs buffs
```

### Card Balance
```
💰 Vladimir Putin: Under-costed (71.2% win rate) - Consider increasing cost from 8 to 10 BP
🟢 Elon Musk: Balanced (48.7% win rate) - Well balanced at 5 BP
💸 Greta Thunberg: Over-costed (28.9% win rate) - Consider decreasing cost from 3 to 2 BP
```

## 🛠️ Customization

### Adding New Decks
Edit `AI_TEST_PRESETS` in `src/ai/aiVsAiTester.ts`:
```typescript
{
  name: 'Your New Deck',
  cards: ['Card1', 'Card2', 'Card3', 'Card4', 'Card5']
}
```

### Adjusting AI Behavior
Modify the `evaluateCard` function in `aiVsAiTester.ts` to change how AI values different cards.

### Changing Test Parameters
- **Iterations**: More iterations = more accurate results (but slower)
- **Max Rounds**: Shorter games = faster testing, longer games = more realistic
- **Difficulties**: Test different AI skill levels

## 📁 Output Files

Results are exported to:
- **In-game**: Download as JSON file
- **Command line**: `test_results/balance_test_results.json`

### JSON Structure
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "totalGames": 1200,
  "results": [...],
  "balanceMetrics": [...],
  "cardBalanceData": [...],
  "recommendations": [...]
}
```

## 🔄 Iterative Balancing Process

1. **Run Tests**: Execute balance tests with current card costs
2. **Analyze Results**: Identify overpowered/underpowered elements
3. **Adjust Costs**: Modify BP costs based on recommendations
4. **Re-test**: Run tests again to verify improvements
5. **Repeat**: Continue until all decks are balanced (40-60% win rate)

## 🎯 Success Criteria

A well-balanced game should have:
- **All decks** with 40-60% win rates
- **All cards** with 40-60% win rates when used
- **No single strategy** dominating all others
- **Multiple viable** deck archetypes
- **Meaningful choices** in deck building

## 🚨 Troubleshooting

### Common Issues
- **Tests running slowly**: Reduce iterations or max rounds
- **All decks winning 50%**: Increase iterations for more data
- **Inconsistent results**: Check for bugs in AI decision making
- **Memory issues**: Reduce test scope or add garbage collection

### Performance Tips
- Use **quick tests** (50 iterations) for initial testing
- Use **full tests** (500 iterations) for final validation
- Test **one difficulty** at a time for faster results
- **Export results** regularly to avoid data loss

## 📚 Further Reading

- [Game Balance Theory](https://example.com/game-balance)
- [Statistical Analysis in Game Design](https://example.com/stats)
- [AI Testing Methodologies](https://example.com/ai-testing)

---

*This system is designed to help create a fair, balanced, and fun card game experience for all players.*
