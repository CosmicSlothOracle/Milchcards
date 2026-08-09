#!/usr/bin/env node
/**
 * Lightweight balance sanity check.
 * Scores cards by influence/bp density and flags obvious outliers.
 */
const fs = require('fs');
const path = require('path');

const gameDataPath = path.join(__dirname, '..', 'src/data/gameData.ts');
const src = fs.readFileSync(gameDataPath, 'utf8');

function extractNamedObjects(arrayName) {
  const start = src.indexOf(`export const ${arrayName}`);
  if (start < 0) return [];
  const open = src.indexOf('= [', start);
  if (open < 0) return [];
  // point at the '['
  const openBracket = open + 2;
  let depth = 0;
  let end = openBracket;
  for (let i = openBracket; i < src.length; i++) {
    if (src[i] === '[') depth++;
    if (src[i] === ']') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  const body = src.slice(openBracket, end + 1);
  const objs = [];
  const re = /\{([\s\S]*?)\}/g;
  let m;
  while ((m = re.exec(body))) {
    const chunk = m[1];
    const nameM = chunk.match(/name:\s*'([^']+)'/);
    if (!nameM) continue;
    const infM = chunk.match(/influence:\s*(\d+)/);
    const bpM = chunk.match(/\bbp:\s*(\d+)/i) || chunk.match(/\bBP:\s*(\d+)/);
    const tierM = chunk.match(/\bT:\s*(\d+)/) || chunk.match(/tier:\s*(\d+)/);
    objs.push({
      name: nameM[1],
      influence: infM ? Number(infM[1]) : null,
      bp: bpM ? Number(bpM[1]) : null,
      tier: tierM ? Number(tierM[1]) : null,
    });
  }
  return objs;
}

const pols = extractNamedObjects('Pols');
const specs = extractNamedObjects('Specials');

const govOutliers = pols.filter(p => p.influence != null && p.bp != null && (p.influence / p.bp > 0.85 || p.influence / p.bp < 0.35));
const expensiveSpecs = specs.filter(s => s.bp != null && s.bp >= 4);

console.log(`Pols: ${pols.length}, Specials: ${specs.length}`);
console.log('Gov density outliers (influence/BP):');
govOutliers.slice(0, 15).forEach(p => {
  console.log(`  ${p.name}: I=${p.influence} BP=${p.bp} dens=${(p.influence / p.bp).toFixed(2)}`);
});
console.log('High-BP specials:');
expensiveSpecs.forEach(s => console.log(`  ${s.name}: bp=${s.bp} tier=${s.tier}`));

// Soft balance nudges already applied in gameData (Maulwurf/Oppositionsblockade bp).
const missingKeys = specs.filter(s => {
  const block = src.includes(`name:'${s.name}'`) || src.includes(`name: '${s.name}'`);
  return block;
});
console.log(`Specials parsed: ${missingKeys.length}`);
console.log('Balance check complete.');
