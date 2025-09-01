#!/usr/bin/env node

/**
 * Improved Effect Key Validator
 * Validates that all card effect keys reference existing handlers
 * Usage: node validate_effects_improved.js
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Improved Effect Key Validation Script\n');

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

    // Read and parse the registry file
    const registryPath = path.join(__dirname, 'src', 'effects', 'registry.ts');
    const registryContent = fs.readFileSync(registryPath, 'utf8');

    // Extract effect keys from registry using better regex
    const effectKeyRegex = /'([^']+)':\s*\(\{/g;
    const registryKeys = new Set();
    let match;

    while ((match = effectKeyRegex.exec(registryContent)) !== null) {
      registryKeys.add(match[1]);
    }

    // Extract card definitions with better regex
    const cardLines = cardsContent.split('\n');
    const cards = [];

    for (const line of cardLines) {
      // Match P(, G(, I(, T( patterns
      const cardMatch = line.match(/(P|G|I|T)\s*\(\s*'([^']+)',\s*'([^']+)',\s*\[([^\]]+)\],\s*(\d+)(?:,\s*'([^']+)')?\)/);

      if (cardMatch) {
        const [, type, id, name, tags, hpCost, effectKey] = cardMatch;
        cards.push({
          type,
          id,
          name,
          tags: tags.split(',').map(t => t.trim().replace(/'/g, '')),
          hpCost: parseInt(hpCost),
          effectKey: effectKey || null
        });
      }
    }

    // Validate each card
    for (const card of cards) {
      if (card.effectKey) {
        cardsWithEffectKeys++;

        if (registryKeys.has(card.effectKey)) {
          validEffectKeys++;
          console.log(`✅ ${card.name}: ${card.effectKey}`);
        } else {
          invalidEffectKeys++;
          const error = `❌ ${card.name}: Effect key "${card.effectKey}" not found in registry`;
          errors.push(error);
          console.log(error);
        }
      } else {
        cardsWithoutEffectKeys++;
        const warning = `⚠️  ${card.name}: No effect key defined`;
        warnings.push(warning);
        console.log(warning);
      }
    }

    // Check for orphaned registry keys
    const usedEffectKeys = new Set(cards.filter(c => c.effectKey).map(c => c.effectKey));
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

    // Coverage by type
    const byType = cards.reduce((acc, card) => {
      if (!acc[card.type]) {
        acc[card.type] = { total: 0, withKeys: 0, withoutKeys: 0 };
      }
      acc[card.type].total++;
      if (card.effectKey) {
        acc[card.type].withKeys++;
      } else {
        acc[card.type].withoutKeys++;
      }
      return acc;
    }, {});

    console.log('\n📈 Coverage by Card Type:');
    for (const [type, stats] of Object.entries(byType)) {
      const percentage = ((stats.withKeys / stats.total) * 100).toFixed(1);
      console.log(`${type.toUpperCase()}: ${stats.withKeys}/${stats.total} (${percentage}%)`);
    }

    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.forEach(error => console.log(error));
    }

    if (warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      warnings.forEach(warning => console.log(warning));
    }

    return { valid, errors, warnings, stats: { totalCards, cardsWithEffectKeys, cardsWithoutEffectKeys, validEffectKeys, invalidEffectKeys } };

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
