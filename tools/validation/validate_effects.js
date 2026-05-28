#!/usr/bin/env node

/**
 * Simple script to run effect key validation
 * Usage: node validate_effects.js
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Running Effect Key Validation...\n');

// Run the TypeScript validation script
const child = spawn('npx', ['ts-node', 'src/utils/effectKeyValidator.ts'], {
  stdio: 'inherit',
  shell: true
});

child.on('close', (code) => {
  console.log(`\n📋 Validation completed with exit code: ${code}`);

  if (code === 0) {
    console.log('✅ All effect keys are valid!');
  } else {
    console.log('❌ Validation found issues. Please fix them.');
  }

  process.exit(code);
});

child.on('error', (error) => {
  console.error('❌ Error running validation:', error.message);
  console.log('\n💡 Make sure you have ts-node installed:');
  console.log('   npm install -g ts-node');
  process.exit(1);
});
