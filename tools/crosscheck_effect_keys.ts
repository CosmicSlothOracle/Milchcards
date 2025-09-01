import path from 'path';
import fs from 'fs';

// Dynamically import TS modules compiled by ts-node transpile, but here we leverage ts-node register if script is run with ts-node.

import { ALL_CARD_DETAILS } from '../src/data/cardDetails';
import { CARDS } from '../src/data/cards';
import { EFFECT_REGISTRY } from '../src/effects/registry';

interface ReportRow {
  name: string;
  category: string;
  gameEffect?: string;
  effectKey?: string;
  handlerPresent: boolean;
  issue?: 'MISSING_EFFECT_KEY' | 'UNNEEDED_EFFECT_KEY' | 'MISSING_HANDLER' | 'OK';
}

function isPureInfluence(effect?: string): boolean {
  if (!effect) return true; // treat empty as no effect
  const lower = effect.toLowerCase();
  return lower.includes('nur einfluss') || lower.includes('only influence') || lower.includes('keine spezielle fähigkeit') || lower.includes('no special ability');
}

function main() {
  const rows: ReportRow[] = [];

  Object.entries(ALL_CARD_DETAILS).forEach(([name, detail]) => {
    const cardDef = CARDS.find(c => c.name === name);
    const effectKey = cardDef?.effectKey;
    const handlerPresent = effectKey ? Boolean(EFFECT_REGISTRY[effectKey]) : false;

    const hasRealEffect = !isPureInfluence(detail.gameEffect);

    let issue: ReportRow['issue'] = 'OK';
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
  });

  const outPath = path.resolve(__dirname, 'crosscheck_report.json');
  fs.writeFileSync(outPath, JSON.stringify(rows, null, 2), 'utf-8');
  console.log(`Crosscheck complete. Report written to ${outPath}`);
}

if (require.main === module) {
  main();
}
