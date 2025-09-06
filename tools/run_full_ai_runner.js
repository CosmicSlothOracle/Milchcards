#!/usr/bin/env node
// Run full TypeScript AITestRunner in Node by stubbing non-code imports
const fs = require('fs');

// Stub common asset extensions to avoid loading binary files during require
['.png', '.jpg', '.jpeg', '.svg', '.css', '.scss'].forEach(ext => {
  require.extensions[ext] = function(module, filename) {
    module.exports = filename; // return path string
  };
});

const args = process.argv.slice(2);
const num = parseInt(args[0] || '200', 10);

try {
  require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'commonjs' } });
} catch (err) {
  console.error('ts-node not available. Run `npm install ts-node`');
  process.exit(1);
}

(async () => {
  try {
    const mod = require('../src/utils/aiTestRunner.ts');
    console.log(`Starting ${num} full-game simulations...`);
    const res = await mod.runMultipleSimulations('AUTORITAERER_REALIST','PROGRESSIVER_AKTIVISMUS', num);
    const path = `./tmp/full_sim_${Date.now()}.json`;
    await fs.promises.mkdir('./tmp', { recursive: true });
    await fs.promises.writeFile(path, JSON.stringify(res, null, 2), 'utf-8');
    console.log(`Saved full simulation results to ${path}`);

    // Summarize
    const total = res.length;
    const p1wins = res.filter(r => r.winner === 1).length;
    const p2wins = res.filter(r => r.winner === 2).length;
    const draws = res.filter(r => r.winner === 'draw').length;
    const avgTurns = res.reduce((s,r) => s + (r.totalTurns || 0), 0) / total;
    const avgRounds = res.reduce((s,r) => s + (r.roundsPlayed || 0), 0) / total;

    console.log('\n--- Summary ---');
    console.log(`Total games: ${total}`);
    console.log(`P1 wins: ${p1wins} (${(p1wins/total*100).toFixed(1)}%)`);
    console.log(`P2 wins: ${p2wins} (${(p2wins/total*100).toFixed(1)}%)`);
    console.log(`Draws: ${draws} (${(draws/total*100).toFixed(1)}%)`);
    console.log(`Avg turns: ${avgTurns.toFixed(1)}`);
    console.log(`Avg rounds: ${avgRounds.toFixed(1)}`);

    process.exit(0);
  } catch (err) {
    console.error('Simulation error:', err);
    process.exit(1);
  }
})();


