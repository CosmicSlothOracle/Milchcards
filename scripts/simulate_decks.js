// Deterministic deck generator and simulator
// Usage: node scripts/simulate_decks.js

const fs = require("fs");
const path = require("path");
const vm = require("vm");

// Read and evaluate the relevant arrays from the TypeScript source deterministically
const gdPath = path.resolve(__dirname, "../src/data/gameData.ts");
const gdText = fs.readFileSync(gdPath, "utf8");

function extractArray(name) {
  const marker = `export const ${name}`;
  const startIdx = gdText.indexOf(marker);
  if (startIdx === -1) throw new Error(`${name} not found in gameData.ts`);
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
  if (i >= gdText.length)
    throw new Error(`could not find end of array for ${name}`);
  const arrText = gdText.slice(openIdx, i + 1);
  return arrText;
}

let specialsText = extractArray("Specials");
let polsText = extractArray("Pols");

// Sanitize references to EK.* (TypeScript constant references) so eval won't fail
specialsText = specialsText.replace(/\bEK\.[A-Za-z0-9_]+\b/g, (m) => `'${m}'`);
polsText = polsText.replace(/\bEK\.[A-Za-z0-9_]+\b/g, (m) => `'${m}'`);

// Some TypeScript-specific tokens may remain; also remove trailing type assertions like as any
specialsText = specialsText.replace(/\s+as\s+[A-Za-z0-9_<>\[\]]+/g, "");
polsText = polsText.replace(/\s+as\s+[A-Za-z0-9_<>\[\]]+/g, "");

// Evaluate arrays in VM and attach to global context
const toEval = `this.Specials = ${specialsText}; this.Pols = ${polsText};`;
const sandbox = {};
vm.createContext(sandbox);
try {
  vm.runInContext(toEval, sandbox, { timeout: 2000 });
} catch (err) {
  console.error("Failed to evaluate gameData arrays:", err.message);
  process.exit(1);
}
const Pols = sandbox.Pols;
const Specials = sandbox.Specials;
console.log(`Loaded Pols: ${Pols.length}, Specials: ${Specials.length}`);

// Disabled list copied from DeckBuilder
const disabledNames = new Set([
  "Malala Yousafzai",
  "Jack Ma",
  "Roman Abramovich",
  "Tim Cook",
  "Mukesh Ambani",
  "Alisher Usmanov",
  "Yuval Noah Harari",
  "Digitaler Wahlkampf",
  "Partei-Offensive",
  "Whataboutism",
  "Influencer-Kampagne",
  "Systemrelevant",
  "Algorithmischer Diskurs",
  "Zivilgesellschaft",
  "Milchglas Transparenz",
  "Alternative Fakten",
  "Konzernfreundlicher Algorithmus",
  "Fake News-Kampagne",
  "Boykott-Kampagne",
  "Deepfake-Skandal",
  "Cyber-Attacke",
  "Grassroots-Widerstand",
  '"Unabhängige" Untersuchung',
  "Soft Power-Kollaps",
  "Cancel Culture",
]);

// Seeded RNG for deterministic runs
function mulberry32(seed) {
  return function () {
    var t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(123456);

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Build list of active government cards (Pols) and active specials
const activePols = Pols.filter((p) => !disabledNames.has(p.name));
const activeSpecials = Specials.filter((s) => !disabledNames.has(s.name));

if (activePols.length < 5) {
  console.error(
    "Not enough active government cards to build decks (need >=5)."
  );
  process.exit(1);
}

// Heuristic power for specials based on tags/impl/effectKey
function specialPower(s) {
  const key = (s.effectKey || "").toLowerCase();
  const tags = (s.tags || []).map((t) => ("" + t).toLowerCase());
  if (
    tags.includes("corruption") ||
    key.includes("corruption") ||
    key.includes("bribery") ||
    (s.tag && s.tag === "Corruption")
  )
    return 3;
  if (tags.includes("buff") || key.includes("buff")) return 3;
  if (key.includes("ap") || tags.includes("ap")) return 2;
  if (key.includes("draw") || tags.includes("draw")) return 2;
  if (
    (s.type || "").toLowerCase().includes("intervention") ||
    (s.type || "").toLowerCase().includes("intervention")
  )
    return 1;
  return 1.5;
}

// Power for pols is their influence
function polPower(p) {
  return p.influence || 1;
}

// Create 10 deterministic decks following simple archetypes
function createDecks() {
  const decks = [];

  // Helper to pick top N pols by influence
  const polsByInfluence = shuffle(activePols).sort(
    (a, b) => b.influence - a.influence
  );
  const specialsByPower = shuffle(activeSpecials).sort(
    (a, b) => specialPower(b) - specialPower(a)
  );

  // 1 Balanced: 5 top pols + 5 top specials
  decks.push({
    name: "Balanced",
    cards: polsByInfluence
      .slice(0, 5)
      .map((p) => p.name)
      .concat(specialsByPower.slice(0, 5).map((s) => s.name)),
  });

  // 2 Gov-Heavy: 8 pols + 2 specials
  decks.push({
    name: "Gov-Heavy",
    cards: polsByInfluence
      .slice(0, 8)
      .map((p) => p.name)
      .concat(specialsByPower.slice(0, 2).map((s) => s.name)),
  });

  // 3 Public-Heavy: 5 pols + 5 public specials (type Öffentlichkeitskarte)
  const publicSpecs = specialsByPower
    .filter((s) => (s.type || "").toLowerCase().includes("öffentlich"))
    .slice(0, 5);
  decks.push({
    name: "Public-Heavy",
    cards: polsByInfluence
      .slice(0, 5)
      .map((p) => p.name)
      .concat(publicSpecs.map((s) => s.name)),
  });

  // 4 Initiative-Focused: 5 pols + 5 instant initiatives
  const instSpecs = specialsByPower
    .filter((s) => (s.type || "").toLowerCase().includes("sofort"))
    .slice(0, 5);
  decks.push({
    name: "Initiative-Focus",
    cards: polsByInfluence
      .slice(0, 5)
      .map((p) => p.name)
      .concat(instSpecs.map((s) => s.name)),
  });

  // 5 Intervention-Focus: 5 pols + 5 interventions
  const intSpecs = specialsByPower
    .filter((s) => (s.type || "").toLowerCase().includes("intervention"))
    .slice(0, 5);
  decks.push({
    name: "Intervention-Focus",
    cards: polsByInfluence
      .slice(0, 5)
      .map((p) => p.name)
      .concat(intSpecs.map((s) => s.name)),
  });

  // 6 Corruption-Focus: 5 pols + 5 corruptions (tagged)
  const corrSpecs = specialsByPower
    .filter(
      (s) =>
        (s.tag || "") === "Corruption" ||
        (s.key || "").toLowerCase().includes("corruption")
    )
    .slice(0, 5);
  decks.push({
    name: "Corruption-Focus",
    cards: polsByInfluence
      .slice(0, 5)
      .map((p) => p.name)
      .concat(corrSpecs.map((s) => s.name)),
  });

  // 7 Low-Cost: 5 lower influence pols + 5 low-bp specials
  const lowPols = shuffle(activePols)
    .sort((a, b) => a.BP - b.BP)
    .slice(0, 5);
  const lowSpecs = shuffle(activeSpecials)
    .sort((a, b) => (a.bp || 0) - (b.bp || 0))
    .slice(0, 5);
  decks.push({
    name: "Low-Cost",
    cards: lowPols.map((p) => p.name).concat(lowSpecs.map((s) => s.name)),
  });

  // 8 High-Value Specials: 5 pols + specials by highest heuristic
  decks.push({
    name: "High-Specials",
    cards: polsByInfluence
      .slice(0, 5)
      .map((p) => p.name)
      .concat(specialsByPower.slice(0, 5).map((s) => s.name)),
  });

  // 9 Defensive: 5 pols + mix of shields/aura (heuristic pick 'shield' in impl or key)
  const defensiveSpecs = specialsByPower
    .filter(
      (s) =>
        (s.impl || "").toLowerCase().includes("shield") ||
        (s.effectKey || "").toLowerCase().includes("shield")
    )
    .slice(0, 5);
  decks.push({
    name: "Defensive",
    cards: polsByInfluence
      .slice(0, 5)
      .map((p) => p.name)
      .concat(defensiveSpecs.map((s) => s.name)),
  });

  // 10 Random Balanced: mix of pols and specials
  const randPols = shuffle(activePols)
    .slice(0, 5)
    .map((p) => p.name);
  const randSpecs = shuffle(activeSpecials)
    .slice(0, 5)
    .map((s) => s.name);
  decks.push({ name: "RandomBalanced", cards: randPols.concat(randSpecs) });

  // Ensure each deck has exactly 10 entries (if some filters returned <5 add fillers)
  const allSpecialNames = activeSpecials.map((s) => s.name);
  const allPolNames = activePols.map((p) => p.name);

  decks.forEach((d) => {
    while (d.cards.length < 10) {
      // fill with next available pols then specials
      const pick =
        allPolNames.concat(allSpecialNames)[
          d.cards.length % (allPolNames.length + allSpecialNames.length)
        ];
      if (!d.cards.includes(pick)) d.cards.push(pick);
    }
    d.cards = d.cards.slice(0, 10);
  });

  return decks;
}

function cardScoreByName(name) {
  const pol = activePols.find((p) => p.name === name);
  if (pol) return polPower(pol);
  const spec = activeSpecials.find((s) => s.name === name);
  if (spec) return specialPower(spec);
  return 0;
}

function deckScore(deck) {
  return deck.cards.reduce((s, c) => s + cardScoreByName(c), 0);
}

function simulateMatch(deckA, deckB, gameIndex) {
  // Deterministic with slight seeded noise
  const baseA = deckScore(deckA);
  const baseB = deckScore(deckB);
  const noiseA = (rng() - 0.5) * 2 * 0.5; // ±0.5
  const noiseB = (rng() - 0.5) * 2 * 0.5;
  const finalA = baseA + noiseA;
  const finalB = baseB + noiseB;
  if (finalA > finalB) return 1;
  if (finalB > finalA) return -1;
  return 0;
}

function evaluateDecks(decks) {
  const results = decks.map((d) => ({
    name: d.name,
    wins: 0,
    draws: 0,
    losses: 0,
  }));

  for (let i = 0; i < decks.length; i++) {
    const deckA = decks[i];
    for (let g = 0; g < 100; g++) {
      // opponent: pick a different deck deterministically
      const oppIndex = (i + 1 + (g % (decks.length - 1))) % decks.length;
      const deckB =
        decks[oppIndex === i ? (oppIndex + 1) % decks.length : oppIndex];
      const res = simulateMatch(deckA, deckB, g);
      const out = results[i];
      if (res === 1) out.wins += 1;
      else if (res === -1) out.losses += 1;
      else out.draws += 1;
    }
  }
  return results;
}

function report(decks, results) {
  console.log("Deck evaluation report (deterministic simulation)");
  console.log("=============================================\n");
  results.forEach((res) => {
    const deck = decks.find((d) => d.name === res.name);
    const winRate = ((res.wins / 100) * 100).toFixed(1);
    console.log(`Deck: ${res.name}`);
    console.log(
      `  Win: ${res.wins} / Draw: ${res.draws} / Loss: ${res.losses} -> WinRate: ${winRate}%`
    );
    console.log("  Cards:");
    deck.cards.forEach((c) =>
      console.log(`    - ${c} (score ${cardScoreByName(c)})`)
    );
    console.log("");
  });
}

// Run
const decks = createDecks();
const results = evaluateDecks(decks);
report(decks, results);
