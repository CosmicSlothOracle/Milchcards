const path = require('path');
const fs = require('fs');

const { ALL_CARD_DETAILS } = require('../src/data/cardDetails');
const { CARDS } = require('../src/data/cards');
const { EFFECT_REGISTRY } = require('../src/effects/registry');

function isPureInfluence(effect) {
  if (!effect) return true;
  const lower = effect.toLowerCase();
  return lower.includes('nur einfluss') || lower.includes('only influence') || lower.includes('keine spezielle fähigkeit') || lower.includes('no special ability');
}

function main() {
  const rows = [];
  for (const [name, detail] of Object.entries(ALL_CARD_DETAILS)) {
    const cardDef = CARDS.find(c => c.name === name);
    const effectKey = cardDef && cardDef.effectKey;
    const handlerPresent = effectKey ? Boolean(EFFECT_REGISTRY[effectKey]) : false;
    const hasRealEffect = !isPureInfluence(detail.gameEffect);
    let issue = 'OK';
    if (hasRealEffect && !effectKey) issue = 'MISSING_EFFECT_KEY';
    else if (!hasRealEffect && effectKey) issue = 'UNNEEDED_EFFECT_KEY';
    else if (hasRealEffect && effectKey && !handlerPresent) issue = 'MISSING_HANDLER';

    rows.push({
      name,
      category: detail.category,
      gameEffect: detail.gameEffect,
      effectKey,
      handlerPresent,
      issue,
    });
  }
  const outPath = path.resolve(__dirname, 'crosscheck_report.json');
  fs.writeFileSync(outPath, JSON.stringify(rows, null, 2), 'utf-8');
  console.log(`Crosscheck complete. Report written to ${outPath}`);
}

if (require.main === module) {
  main();
}
