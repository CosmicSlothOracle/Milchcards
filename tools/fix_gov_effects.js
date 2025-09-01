const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '../src/data/cardDetails.ts');
let text = fs.readFileSync(file, 'utf-8');

// Regex: in GOVERNMENT_CARD_DETAILS block lines containing gameEffect: 'xxx'
// Replace with standardized string if not already.
const newText = text.replace(/(category: 'Regierung'[\s\S]*?gameEffect: )'([^']*)'/g, (match, prefix, effect) => {
  if (effect === 'Nur Einfluss - keine weiteren Effekte') return match; // leave as is
  return `${prefix}'Nur Einfluss - keine weiteren Effekte'`;
});

fs.writeFileSync(file, newText, 'utf-8');
console.log('Government card effects standardized.');
