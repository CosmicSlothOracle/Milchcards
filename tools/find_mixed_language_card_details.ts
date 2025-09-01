#!/usr/bin/env ts-node
import fs from 'fs';
import path from 'path';
// Load the compiled TS module via ts-node import
import { ALL_CARD_DETAILS } from '../src/data/cardDetails';

type Flag = { field: string; value: string; reason: string };

function looksEnglish(text: string | undefined): boolean {
  if (!text) return false;
  // crude heuristics: common English words that shouldn't appear in German-only text
  const englishWords = [' draw ', ' draw\b', '\bcard', '\byour\b', '\bopponent\b', '\bonce\b', '\bper turn\b', '\bwhen played\b', '\bgain\b', '\binitiative\b', '\bexample\b', 'When ', 'You ', 'your '];
  const re = new RegExp(englishWords.join('|'), 'i');
  return re.test(text);
}

function looksGerman(text: string | undefined): boolean {
  if (!text) return false;
  const germanWords = ['Ziehe', 'Beim', 'Ausspielen', 'Gegner', 'Wenn', 'Deine', 'Karte', 'Einfluss', 'Beim Ausspielen', 'Ziehe 1 Karte', 'versuche'];
  return germanWords.some(w => text.includes(w));
}

const report: Record<string, { name: string; flags: Flag[] }> = {};

for (const [name, details] of Object.entries(ALL_CARD_DETAILS)) {
  const flags: Flag[] = [];
  const fieldsToCheck = ['gameEffect', 'example', 'usage', 'cardType'];
  for (const f of fieldsToCheck) {
    const v = (details as any)[f] as string | undefined;
    if (!v) continue;
    const eng = looksEnglish(v);
    const ger = looksGerman(v);
    if (eng && !ger) {
      flags.push({ field: f, value: v, reason: 'ENGLISH' });
    } else if (eng && ger) {
      flags.push({ field: f, value: v, reason: 'MIXED' });
    }
  }
  if (flags.length > 0) report[name] = { name, flags };
}

const outPath = path.resolve('tools/card_details_normalization_report.json');
fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
console.log('Wrote report to', outPath);



