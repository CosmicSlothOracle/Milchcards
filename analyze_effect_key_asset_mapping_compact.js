#!/usr/bin/env node

/**
 * Compact Effect Key Asset Mapping Analysis
 * Analyzes if all effect keys are properly mapped to assets
 * Usage: node analyze_effect_key_asset_mapping_compact.js
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

    // Summary Statistics
    const totalCards = cards.length;
    const totalRegistryKeys = registryKeys.size;
    const totalUsedKeys = usedEffectKeys.size;
    const totalOrphanedKeys = orphanedRegistryKeys.length;

    console.log('📈 SUMMARY STATISTICS:');
    console.log('='.repeat(40));
    console.log(`Gesamt Karten: ${totalCards}`);
    console.log(`Karten mit Effect Keys: ${cardsWithEffectKeys.length} (${((cardsWithEffectKeys.length/totalCards)*100).toFixed(1)}%)`);
    console.log(`Karten ohne Effect Keys: ${cardsWithoutEffectKeys.length} (${((cardsWithoutEffectKeys.length/totalCards)*100).toFixed(1)}%)`);
    console.log(`\nRegistry Keys gesamt: ${totalRegistryKeys}`);
    console.log(`Registry Keys verwendet: ${totalUsedKeys} (${((totalUsedKeys/totalRegistryKeys)*100).toFixed(1)}%)`);
    console.log(`Registry Keys orphaned: ${totalOrphanedKeys} (${((totalOrphanedKeys/totalRegistryKeys)*100).toFixed(1)}%)`);

    // Type Analysis
    console.log('\n🎯 COVERAGE BY TYPE:');
    console.log('='.repeat(40));

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
      console.log(`${type.toUpperCase()}: ${stats.withKeys}/${stats.total} (${percentage}%)`);
    }

    // Asset Mapping Status
    console.log('\n🔗 ASSET MAPPING STATUS:');
    console.log('='.repeat(40));

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

    console.log(`Asset Mapping Score: ${((totalUsedKeys/totalRegistryKeys)*100).toFixed(1)}%`);

    // Orphaned Registry Keys
    if (orphanedRegistryKeys.length > 0) {
      console.log('\n⚠️  ORPHANED REGISTRY KEYS:');
      console.log('='.repeat(40));
      orphanedRegistryKeys.forEach(key => {
        console.log(`  ${key}`);
      });
    }

    // Cards without Effect Keys (first 10)
    if (cardsWithoutEffectKeys.length > 0) {
      console.log('\n⚠️  CARDS WITHOUT EFFECT KEYS (first 10):');
      console.log('='.repeat(40));
      cardsWithoutEffectKeys.slice(0, 10).forEach(card => {
        console.log(`  ${card.name} (${card.type})`);
      });
      if (cardsWithoutEffectKeys.length > 10) {
        console.log(`  ... and ${cardsWithoutEffectKeys.length - 10} more`);
      }
    }

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
  console.log('\n📋 ANALYSIS COMPLETED');
  console.log('='.repeat(40));
  console.log(`Asset Mapping Score: ${((result.usedKeys/result.totalRegistryKeys)*100).toFixed(1)}%`);

  if (result.mappingStatus.perfect) {
    console.log('🎉 PERFECT MAPPING!');
  } else if (result.mappingStatus.good) {
    console.log('✅ GOOD MAPPING - All effect keys are assigned to assets');
  } else {
    console.log('⚠️  NEEDS IMPROVEMENT - Some effect keys are not assigned to assets');
  }
}
