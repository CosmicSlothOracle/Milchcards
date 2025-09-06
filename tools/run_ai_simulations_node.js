#!/usr/bin/env node
// Node wrapper that registers ts-node and runs the TypeScript AITestRunner
const args = process.argv.slice(2);
const num = parseInt(args[0] || '20', 10);

try {
  require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'commonjs' } });
} catch (err) {
  console.error('ts-node not available. Run `npm install ts-node`');
  process.exit(1);
}

(async () => {
  try {
    const mod = require('../src/utils/aiTestRunner.ts');
    const res = await mod.runMultipleSimulations('AUTORITAERER_REALIST','PROGRESSIVER_AKTIVISMUS', num);
    console.log(JSON.stringify(res.map(r => ({ winner: r.winner, totalTurns: r.totalTurns, finalScores: r.finalScores })), null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Simulation error:', err);
    process.exit(1);
  }
})();
