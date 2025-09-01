import { CARDS } from '../data/cards';
import { EFFECTS } from '../effects/registry';

/**
 * Validates that all card effect keys reference existing handlers
 */
export function validateEffectKeys(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalCards: number;
    cardsWithEffectKeys: number;
    cardsWithoutEffectKeys: number;
    validEffectKeys: number;
    invalidEffectKeys: number;
  };
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  let validEffectKeys = 0;
  let invalidEffectKeys = 0;
  let cardsWithEffectKeys = 0;
  let cardsWithoutEffectKeys = 0;

  console.log('🔍 Validating Effect Keys...\n');

  // Check each card
  for (const card of CARDS) {
    if (card.effectKey) {
      cardsWithEffectKeys++;

      // Check if effect key exists in registry
      if (EFFECTS[card.effectKey]) {
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

  // Check for orphaned registry keys (keys that exist but aren't used by any card)
  const usedEffectKeys = new Set(CARDS.filter(c => c.effectKey).map(c => c.effectKey!));
  const orphanedKeys: string[] = [];

  for (const registryKey of Object.keys(EFFECTS)) {
    if (!usedEffectKeys.has(registryKey)) {
      orphanedKeys.push(registryKey);
    }
  }

  if (orphanedKeys.length > 0) {
    console.log('\n🔍 Orphaned Registry Keys (exist but not used by any card):');
    orphanedKeys.forEach(key => {
      const warning = `⚠️  Orphaned: ${key}`;
      warnings.push(warning);
      console.log(warning);
    });
  }

  // Summary
  const totalCards = CARDS.length;
  const valid = errors.length === 0;

  const stats = {
    totalCards,
    cardsWithEffectKeys,
    cardsWithoutEffectKeys,
    validEffectKeys,
    invalidEffectKeys
  };

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

  return { valid, errors, warnings, stats };
}

/**
 * Detailed analysis of effect key coverage by card type
 */
export function analyzeEffectKeyCoverage(): void {
  console.log('\n📈 Effect Key Coverage Analysis:\n');

  const byType = CARDS.reduce((acc, card) => {
    const type = card.type;
    if (!acc[type]) {
      acc[type] = { total: 0, withKeys: 0, withoutKeys: 0 };
    }
    acc[type].total++;
    if (card.effectKey) {
      acc[type].withKeys++;
    } else {
      acc[type].withoutKeys++;
    }
    return acc;
  }, {} as Record<string, { total: number; withKeys: number; withoutKeys: number }>);

  for (const [type, stats] of Object.entries(byType)) {
    const percentage = ((stats.withKeys / stats.total) * 100).toFixed(1);
    console.log(`${type.toUpperCase()}:`);
    console.log(`  Total: ${stats.total}`);
    console.log(`  With Effect Keys: ${stats.withKeys} (${percentage}%)`);
    console.log(`  Without Effect Keys: ${stats.withoutKeys}`);
    console.log('');
  }
}

/**
 * Lists all cards without effect keys
 */
export function listCardsWithoutEffectKeys(): void {
  console.log('\n🎯 Cards without Effect Keys:\n');

  const cardsWithoutKeys = CARDS.filter(card => !card.effectKey);

  if (cardsWithoutKeys.length === 0) {
    console.log('✅ All cards have effect keys!');
    return;
  }

  cardsWithoutKeys.forEach(card => {
    console.log(`- ${card.name} (${card.type})`);
  });
}

/**
 * Lists all registry keys that aren't used by any card
 */
export function listOrphanedRegistryKeys(): void {
  console.log('\n🔍 Orphaned Registry Keys:\n');

  const usedEffectKeys = new Set(CARDS.filter(c => c.effectKey).map(c => c.effectKey!));
  const orphanedKeys = Object.keys(EFFECTS).filter(key => !usedEffectKeys.has(key));

  if (orphanedKeys.length === 0) {
    console.log('✅ All registry keys are used by cards!');
    return;
  }

  orphanedKeys.forEach(key => {
    console.log(`- ${key}`);
  });
}

// Run validation if this file is executed directly
if (require.main === module) {
  console.log('🚀 Effect Key Validation Script\n');

  const result = validateEffectKeys();
  analyzeEffectKeyCoverage();
  listCardsWithoutEffectKeys();
  listOrphanedRegistryKeys();

  process.exit(result.valid ? 0 : 1);
}
