#!/usr/bin/env node
const { spawn } = require('child_process');

const num = process.argv[2] || '20';
const cmd = 'npx';
const args = ['ts-node', 'tools/run_ai_simulations.ts', num];

console.log(`Running AI simulations (${num} games) via: ${cmd} ${args.join(' ')}`);

const child = spawn(cmd, args, { stdio: 'inherit', shell: true });
child.on('close', code => {
  console.log(`Child process exited with code ${code}`);
  process.exit(code);
});

