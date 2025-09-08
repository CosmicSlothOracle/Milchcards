const fs = require("fs");
const path = require("path");
const vm = require("vm");

const gdPath = path.resolve(__dirname, "../src/data/gameData.ts");
const gdText = fs.readFileSync(gdPath, "utf8");

function extractArray(name) {
  const marker = `export const ${name}`;
  const startIdx = gdText.indexOf(marker);
  if (startIdx === -1) throw new Error(`${name} not found`);
  const eqIdx = gdText.indexOf("=", startIdx);
  const openIdx = gdText.indexOf("[", eqIdx);
  if (openIdx === -1) throw new Error(`array start for ${name} not found`);
  let i = openIdx;
  let depth = 0;
  for (; i < gdText.length; i++) {
    const ch = gdText[i];
    if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) break;
    }
  }
  const arrText = gdText.slice(openIdx, i + 1);
  return arrText;
}

let specialsText = extractArray("Specials");
let polsText = extractArray("Pols");
specialsText = specialsText.replace(/\bEK\.[A-Za-z0-9_]+\b/g, (m) => `'${m}'`);
polsText = polsText.replace(/\bEK\.[A-Za-z0-9_]+\b/g, (m) => `'${m}'`);
specialsText = specialsText.replace(/\s+as\s+[A-Za-z0-9_<>\\[\]]+/g, "");
polsText = polsText.replace(/\s+as\s+[A-Za-z0-9_<>\\[\]]+/g, "");

const toEval = `this.Specials = ${specialsText}; this.Pols = ${polsText};`;
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(toEval, sandbox);
const Pols = sandbox.Pols;
const Specials = sandbox.Specials;

const PRESETS = [
  {
    name: "Balanced A",
    cards: [
      "Vladimir Putin",
      "Xi Jinping",
      "Donald Trump",
      "Mohammed bin Salman",
      "Recep Tayyip Erdoğan",
      "Elon Musk",
      "Bill Gates",
      "Spin Doctor",
      "Think-tank",
      "Shadow Lobbying",
    ],
  },
  {
    name: "Balanced B",
    cards: [
      "Benjamin Netanyahu",
      "Volodymyr Zelenskyy",
      "Ursula von der Leyen",
      "Narendra Modi",
      "Luiz Inácio Lula da Silva",
      "Elon Musk",
      "Bill Gates",
      "Jeff Bezos",
      "Warren Buffett",
      "Mark Zuckerberg",
    ],
  },
  {
    name: "Balanced C",
    cards: [
      "Jens Stoltenberg",
      "Olaf Scholz",
      "Rishi Sunak",
      "Kamala Harris",
      "Helmut Schmidt",
      "Spin Doctor",
      "Think-tank",
      "Whataboutism",
      "Influencer-Kampagne",
      "Symbolpolitik",
    ],
  },
  {
    name: "Balanced D",
    cards: [
      "Werner Maihofer",
      "John Snow",
      "Karl Carstens",
      "Hans Eichel",
      "Rainer Offergeld",
      "Verzoegerungsverfahren",
      "Symbolpolitik",
      "Shadow Lobbying",
      "Opportunist",
      "Think-tank",
    ],
  },
];

function findPolByName(name) {
  return Pols.find((p) => p.name === name);
}
function findSpecByName(name) {
  return Specials.find((s) => s.name === name);
}

PRESETS.forEach((preset) => {
  let total = 0;
  console.log(`Preset: ${preset.name}`);
  preset.cards.forEach((c) => {
    const pol = findPolByName(c);
    if (pol) {
      total += pol.BP || 0;
      console.log(`  - ${c}: BP ${pol.BP || 0}`);
      return;
    }
    const spec = findSpecByName(c);
    if (spec) {
      total += spec.bp || 0;
      console.log(`  - ${c}: bp ${spec.bp || 0}`);
      return;
    }
    console.log(`  - ${c}: NOT FOUND`);
  });
  console.log(`  TOTAL BP: ${total}\n`);
});
