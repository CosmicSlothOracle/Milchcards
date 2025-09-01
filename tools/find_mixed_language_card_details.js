const fs = require('fs');
const path = require('path');

const srcPath = path.resolve('src/data/cardDetails.ts');
const outPath = path.resolve('tools/card_details_normalization_report.json');

const content = fs.readFileSync(srcPath, 'utf8');
const lines = content.split(/\r?\n/);

function looksEnglish(text) {
  if (!text) return false;
  const englishWords = [' draw ', ' draw\b', '\\bcard', '\\byour\\b', '\\bopponent\\b', '\\bonce\\b', '\\bper turn\\b', '\\bwhen played\\b', '\\bgain\\b', '\\binitiative\\b', 'When ', 'You ', 'your ', 'example:'];
  const re = new RegExp(englishWords.join('|'), 'i');
  return re.test(text);
}

function looksGerman(text) {
  if (!text) return false;
  const germanWords = ['Ziehe', 'Beim', 'Ausspielen', 'Gegner', 'Wenn', 'Deine', 'Karte', 'Einfluss', 'Beim Ausspielen', 'Ziehe 1 Karte', 'bei', 'Wenn du'];
  return germanWords.some(w => text.indexOf(w) !== -1);
}

const report = {};

let i = 0;
while (i < lines.length) {
  const line = lines[i];
  const m = line.match(/^\s*'([^']+)':\s*{\s*$/);
  if (m) {
    const name = m[1];
    let braceDepth = 1;
    let j = i + 1;
    const blockLines = [];
    while (j < lines.length && braceDepth > 0) {
      const l = lines[j];
      blockLines.push(l);
      for (const ch of l) {
        if (ch === '{') braceDepth++;
        if (ch === '}') braceDepth--;
      }
      j++;
    }

    const block = blockLines.join('\n');
    const fields = ['gameEffect', 'example', 'usage', 'cardType', 'trigger'];
    const flags = [];
    for (const f of fields) {
      const re = new RegExp(f + "\\s*:\\s*(['\"])([\\s\\S]*?)\\\\1", 'i');
      const mf = block.match(re);
      if (mf) {
        const val = mf[2].trim();
        const eng = looksEnglish(val);
        const ger = looksGerman(val);
        if (eng && !ger) flags.push({ field: f, value: val, reason: 'ENGLISH' });
        else if (eng && ger) flags.push({ field: f, value: val, reason: 'MIXED' });
      }
    }
    if (flags.length > 0) report[name] = { name, flags };
    i = j;
    continue;
  }
  i++;
}

fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
console.log('Wrote report to', outPath);



