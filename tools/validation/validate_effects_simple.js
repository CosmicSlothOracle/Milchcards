#!/usr/bin/env node

/**
 * Simple Effect Key Validator
 * Validates that all card effect keys reference existing handlers
 * Usage: node validate_effects_simple.js
 */

// Import the compiled JavaScript files
const fs = require('fs');
const path = require('path');

console.log('🚀 Effect Key Validation Script\n');

// Simple validation function
function validateEffectKeys() {
  const errors = [];
  const warnings = [];
  let validEffectKeys = 0;
  let invalidEffectKeys = 0;
  let cardsWithEffectKeys = 0;
  let cardsWithoutEffectKeys = 0;

  console.log('🔍 Validating Effect Keys...\n');

  try {
    // Read and parse the cards file
    const cardsPath = path.join(__dirname, 'src', 'data', 'cards.ts');
    const cardsContent = fs.readFileSync(cardsPath, 'utf8');

    // Extract card definitions using regex
    const cardRegex = /P\(|G\(|I\(|T\(/g;
    const cards = [];
    let match;

    while ((match = cardRegex.exec(cardsContent)) !== null) {
      const start = match.index;
      let parenCount = 0;
      let end = start;

      for (let i = start; i < cardsContent.length; i++) {
        if (cardsContent[i] === '(') parenCount++;
        if (cardsContent[i] === ')') parenCount--;
        if (parenCount === 0) {
          end = i;
          break;
        }
      }

      const cardDef = cardsContent.substring(start, end + 1);
      cards.push(cardDef);
    }

    // Read and parse the registry file
    const registryPath = path.join(__dirname, 'src', 'effects', 'registry.ts');
    const registryContent = fs.readFileSync(registryPath, 'utf8');

    // Extract effect keys using regex
    const effectKeyRegex = /'([^']+)':\s*\(\{/g;
    const registryKeys = new Set();

    while ((match = effectKeyRegex.exec(registryContent)) !== null) {
      registryKeys.add(match[1]);
    }

    // Validate each card
    for (const cardDef of cards) {
      // Extract card name and effect key
      const nameMatch = cardDef.match(/'([^']+)'/);
      const effectKeyMatch = cardDef.match(/'([^']+)'\)$/);

      if (nameMatch) {
        const cardName = nameMatch[1];

        if (effectKeyMatch) {
          const effectKey = effectKeyMatch[1];
          cardsWithEffectKeys++;

          if (registryKeys.has(effectKey)) {
            validEffectKeys++;
            console.log(`✅ ${cardName}: ${effectKey}`);
          } else {
            invalidEffectKeys++;
            const error = `❌ ${cardName}: Effect key "${effectKey}" not found in registry`;
            errors.push(error);
            console.log(error);
          }
        } else {
          cardsWithoutEffectKeys++;
          const warning = `⚠️  ${cardName}: No effect key defined`;
          warnings.push(warning);
          console.log(warning);
        }
      }
    }

    // Check for orphaned registry keys
    const usedEffectKeys = new Set();
    for (const cardDef of cards) {
      const effectKeyMatch = cardDef.match(/'([^']+)'\)$/);
      if (effectKeyMatch) {
        usedEffectKeys.add(effectKeyMatch[1]);
      }
    }

    const orphanedKeys = Array.from(registryKeys).filter(key => !usedEffectKeys.has(key));

    if (orphanedKeys.length > 0) {
      console.log('\n🔍 Orphaned Registry Keys (exist but not used by any card):');
      orphanedKeys.forEach(key => {
        const warning = `⚠️  Orphaned: ${key}`;
        warnings.push(warning);
        console.log(warning);
      });
    }

    // Summary
    const totalCards = cards.length;
    const valid = errors.length === 0;

    console.log('\n📊 Validation Summary:');
    console.log(`Total Cards: ${totalCards}`);
    console.log(`Cards with Effect Keys: ${cardsWithEffectKeys} (${((cardsWithEffectKeys/totalCards)*100).toFixed(1)}%)`);
    console.log(`Cards without Effect Keys: ${cardsWithoutEffectKeys} (${((cardsWithoutEffectKeys/totalCards)*100).toFixed(1)}%)`);
    console.log(`Valid Effect Keys: ${validEffectKeys}`);
    console.log(`Invalid Effect Keys: ${invalidEffectKeys}`);
    console.log(`Orphaned Registry Keys: ${orphanedKeys.length}`);
    console.log(`\nValidation ${valid ? '✅ PASSED' : '❌ FAILED'}`);

    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.forEach(error => console.log(error));
    }

    if (warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      warnings.forEach(warning => console.log(warning));
    }

    return { valid, errors, warnings };

  } catch (error) {
    console.error('❌ Error reading files:', error.message);
    return { valid: false, errors: [error.message], warnings: [] };
  }
}

// Run validation
const result = validateEffectKeys();

console.log(`\n📋 Validation completed with exit code: ${result.valid ? 0 : 1}`);

if (result.valid) {
  console.log('✅ All effect keys are valid!');
} else {
  console.log('❌ Validation found issues. Please fix them.');
}

process.exit(result.valid ? 0 : 1);
