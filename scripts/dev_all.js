#!/usr/bin/env node
/**
 * Start CRA client + PvP WebSocket relay together for local development.
 */
const { spawn } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const nodeBin = process.execPath;

function run(label, command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  });
  child.on('exit', (code) => {
    console.log(`[${label}] exited with code ${code}`);
    process.exit(code || 0);
  });
  return child;
}

console.log('[dev:all] starting PvP relay on :8081 and CRA on :3000');
const pvp = run('pvp', nodeBin, ['index.js'], path.join(root, 'server'));
const client = run('client', nodeBin, ['node_modules/react-scripts/bin/react-scripts.js', 'start'], root);

function shutdown() {
  try { pvp.kill('SIGTERM'); } catch (_) {}
  try { client.kill('SIGTERM'); } catch (_) {}
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
