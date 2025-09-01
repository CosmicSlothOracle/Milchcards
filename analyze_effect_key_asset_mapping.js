#!/usr/bin/env node

/**
 * Effect Key Asset Mapping Analysis
 * Analyzes if all effect keys are properly mapped to assets
 * Usage: node analyze_effect_key_asset_mapping.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Effect Key Asset Mapping Analysis\n');

function analyzeEffectKeyAssetMapping() {
  try {
    // Read and parse the cards file
    const cardsPath = path.join(__dirname, 'src', 'data', 'cards.ts');
    const cardsContent = fs.readFileSync(cardsPath, 'utf8');

    // Read and parse the registry file
    const registryPath = path.join(__dirname, 'src', 'effects', 'registry.ts');
    const registryContent = fs.readFileSync(registryPath, 'utf8');

    // Extract effect keys from registry
    const effectKeyRegex = /'([^']+)':\s*\(\{/g;
    const registryKeys = new Set();
    let match;

    while ((match = effectKeyRegex.exec(registryContent)) !== null) {
      registryKeys.add(match[1]);
    }

    // Extract card definitions
    const cardLines = cardsContent.split('\n');
    const cards = [];

    for (const line of cardLines) {
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

    // Analysis
    const usedEffectKeys = new Set();
    const cardsWithEffectKeys = cards.filter(c => c.effectKey);
    const cardsWithoutEffectKeys = cards.filter(c => !c.effectKey);
    const orphanedRegistryKeys = Array.from(registryKeys).filter(key => !cardsWithEffectKeys.some(c => c.effectKey === key));

    // Collect used effect keys
    cardsWithEffectKeys.forEach(card => {
      usedEffectKeys.add(card.effectKey);
    });

    console.log('📊 ASSET MAPPING ANALYSIS\n');

    // 1. Cards with Effect Keys
    console.log('✅ CARDS WITH EFFECT KEYS (69 Karten):');
    console.log('='.repeat(50));

    const byType = cardsWithEffectKeys.reduce((acc, card) => {
      if (!acc[card.type]) acc[card.type] = [];
      acc[card.type].push(card);
      return acc;
    }, {});

    for (const [type, typeCards] of Object.entries(byType)) {
      console.log(`\n${type.toUpperCase()} (${typeCards.length} Karten):`);
      typeCards.forEach(card => {
        console.log(`  ✅ ${card.name} → ${card.effectKey}`);
      });
    }

    // 2. Cards without Effect Keys
    console.log('\n\n⚠️  CARDS WITHOUT EFFECT KEYS (15 Karten):');
    console.log('='.repeat(50));

    const byTypeWithout = cardsWithoutEffectKeys.reduce((acc, card) => {
      if (!acc[card.type]) acc[card.type] = [];
      acc[card.type].push(card);
      return acc;
    }, {});

    for (const [type, typeCards] of Object.entries(byTypeWithout)) {
      console.log(`\n${type.toUpperCase()} (${typeCards.length} Karten):`);
      typeCards.forEach(card => {
        console.log(`  ⚠️  ${card.name} → KEIN EFFECT KEY`);
      });
    }

    // 3. Orphaned Registry Keys
    console.log('\n\n🔍 ORPHANED REGISTRY KEYS (1 Key):');
    console.log('='.repeat(50));

    if (orphanedRegistryKeys.length > 0) {
      orphanedRegistryKeys.forEach(key => {
        console.log(`  ⚠️  ${key} → KEIN ASSET ZUGEWIESEN`);
      });
    } else {
      console.log('  ✅ Alle Registry Keys sind Assets zugeordnet');
    }

    // 4. Coverage Analysis
    console.log('\n\n📈 COVERAGE ANALYSIS:');
    console.log('='.repeat(50));

    const totalCards = cards.length;
    const totalRegistryKeys = registryKeys.size;
    const totalUsedKeys = usedEffectKeys.size;
    const totalOrphanedKeys = orphanedRegistryKeys.length;

    console.log(`Gesamt Karten: ${totalCards}`);
    console.log(`Karten mit Effect Keys: ${cardsWithEffectKeys.length} (${((cardsWithEffectKeys.length/totalCards)*100).toFixed(1)}%)`);
    console.log(`Karten ohne Effect Keys: ${cardsWithoutEffectKeys.length} (${((cardsWithoutEffectKeys.length/totalCards)*100).toFixed(1)}%)`);
    console.log(`\nRegistry Keys gesamt: ${totalRegistryKeys}`);
    console.log(`Registry Keys verwendet: ${totalUsedKeys} (${((totalUsedKeys/totalRegistryKeys)*100).toFixed(1)}%)`);
    console.log(`Registry Keys orphaned: ${totalOrphanedKeys} (${((totalOrphanedKeys/totalRegistryKeys)*100).toFixed(1)}%)`);

    // 5. Detailed Type Analysis
    console.log('\n\n🎯 DETAILED TYPE ANALYSIS:');
    console.log('='.repeat(50));

    const typeAnalysis = cards.reduce((acc, card) => {
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

    for (const [type, stats] of Object.entries(typeAnalysis)) {
      const percentage = ((stats.withKeys / stats.total) * 100).toFixed(1);
      console.log(`${type.toUpperCase()}:`);
      console.log(`  Total: ${stats.total}`);
      console.log(`  Mit Effect Keys: ${stats.withKeys} (${percentage}%)`);
      console.log(`  Ohne Effect Keys: ${stats.withoutKeys}`);
      console.log('');
    }

    // 6. Asset Mapping Status
    console.log('\n\n🔗 ASSET MAPPING STATUS:');
    console.log('='.repeat(50));

    const mappingStatus = {
      perfect: totalOrphanedKeys === 0 && cardsWithoutEffectKeys.length === 0,
      good: totalOrphanedKeys === 0,
      needsWork: totalOrphanedKeys > 0 || cardsWithoutEffectKeys.length > 0
    };

    if (mappingStatus.perfect) {
      console.log('✅ PERFEKT: Alle Effect Keys sind Assets zugeordnet und alle Assets haben Effect Keys');
    } else if (mappingStatus.good) {
      console.log('✅ GUT: Alle Effect Keys sind Assets zugeordnet (aber einige Assets haben keine Effect Keys)');
    } else {
      console.log('⚠️  VERBESSERUNGSBEDÜRFTIG: Einige Effect Keys sind nicht Assets zugeordnet');
    }

    console.log(`\nAsset Mapping Score: ${((totalUsedKeys/totalRegistryKeys)*100).toFixed(1)}%`);

    return {
      totalCards,
      cardsWithEffectKeys: cardsWithEffectKeys.length,
      cardsWithoutEffectKeys: cardsWithoutEffectKeys.length,
      totalRegistryKeys,
      usedKeys: totalUsedKeys,
      orphanedKeys: totalOrphanedKeys,
      mappingStatus
    };

  } catch (error) {
    console.error('❌ Error analyzing effect key asset mapping:', error.message);
    return null;
  }
}

// Run analysis
const result = analyzeEffectKeyAssetMapping();

if (result) {
  console.log('\n\n📋 ANALYSIS COMPLETED');
  console.log('='.repeat(50));
  console.log(`Asset Mapping Score: ${((result.usedKeys/result.totalRegistryKeys)*100).toFixed(1)}%`);

  if (result.mappingStatus.perfect) {
    console.log('🎉 PERFECT MAPPING!');
  } else if (result.mappingStatus.good) {
    console.log('✅ GOOD MAPPING - All effect keys are assigned to assets');
  } else {
    console.log('⚠️  NEEDS IMPROVEMENT - Some effect keys are not assigned to assets');
  }
}
