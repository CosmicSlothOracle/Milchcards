export {};

// run: npx ts-node tools/run_ai_simulations.ts [numGames]
async function main(){
  try {
    const num = parseInt(process.argv[2] || '20', 10);
    const mod = await import('../src/utils/aiTestRunner');
    const res = await mod.runMultipleSimulations('AUTORITAERER_REALIST','PROGRESSIVER_AKTIVISMUS', num);
    const summary = res.map(r=>({winner:r.winner,totalTurns:r.totalTurns,finalScores:r.finalScores}));
    console.log(JSON.stringify(summary, null, 2));
    // Persist full results for offline analysis
    const fs = await import('fs');
    const path = `./tmp/sim-results-${Date.now()}.json`;
    try {
      await fs.promises.mkdir('./tmp', { recursive: true });
      await fs.promises.writeFile(path, JSON.stringify(res, null, 2), 'utf-8');
      console.log(`Full simulation results saved to ${path}`);
    } catch (err) {
      console.warn('Could not write simulation output to disk:', err);
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
