#!/usr/bin/env node
/**
 * Ambivalence Value (AV) metric for Milchcards.
 *
 * Scores how entangled each card's score contribution is with other cards on the board.
 * - Receiver AV: how often this card's influence is rewritten by others.
 * - Emitter AV: how often this card rewrites others.
 * - Conflict AV: mutually exclusive or dead correlations (e.g. Milchglas vs NGO).
 *
 * Outputs docs/ambivalence_report.json.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const gameDataPath = path.join(ROOT, 'src/data/gameData.ts');
const rulesPath = path.join(ROOT, 'docs/ambivalence_rules.json');
const presetDecksPath = path.join(ROOT, 'src/data/presetDecks.ts');
const outPath = path.join(ROOT, 'docs/ambivalence_report.json');

const src = fs.readFileSync(gameDataPath, 'utf8');
const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
const presetSrc = fs.readFileSync(presetDecksPath, 'utf8');

const weights = rules.weights;
const allCards = [];

function extractNamedObjects(arrayName) {
  const start = src.indexOf(`export const ${arrayName}`);
  if (start < 0) return [];
  const open = src.indexOf('= [', start);
  if (open < 0) return [];
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
    const typeM = chunk.match(/type:\s*'([^']+)'/);
    objs.push({
      name: nameM[1],
      influence: infM ? Number(infM[1]) : null,
      bp: bpM ? Number(bpM[1]) : null,
      tier: tierM ? Number(tierM[1]) : null,
      type: typeM ? typeM[1] : null,
    });
  }
  return objs;
}

const pols = extractNamedObjects('Pols').map(p => ({ ...p, kind: 'gov' }));
const specs = extractNamedObjects('Specials').map(s => ({ ...s, kind: 'spec' }));
const cardDb = {};
[...pols, ...specs].forEach(c => { cardDb[c.name] = c; });

function receiverScore(card) {
  let score = 0;
  let touchedBy = [];
  rules.rules.forEach(rule => {
    if (rule.receivers.includes('All Governments') && card.kind === 'gov') {
      score += 1; touchedBy.push(rule.id);
    }
    if (rule.receivers.includes('Tier-2 Government') && card.kind === 'gov' && card.tier === 2) {
      score += 2; touchedBy.push(rule.id);
    }
    if (rule.receivers.includes('Strongest Government') && card.kind === 'gov') {
      score += 2; touchedBy.push(rule.id);
    }
    if (rule.receivers.includes('Strongest Tier-1 Government') && card.kind === 'gov' && card.tier === 1) {
      score += 2; touchedBy.push(rule.id);
    }
    if (rule.receivers.includes('Next Government Played') && card.kind === 'gov') {
      score += 1.5; touchedBy.push(rule.id);
    }
    if (rule.receivers.includes('Joschka Fischer') && card.name === 'Joschka Fischer') {
      score += 2; touchedBy.push(rule.id);
    }
    if (rule.receivers.includes('Deactivated Own Card') && card.kind === 'gov') {
      score += 1; touchedBy.push(rule.id);
    }
    if (rule.receivers.includes('Opponent Strongest Government') && card.kind === 'gov') {
      score += 1; touchedBy.push(rule.id);
    }
    if (rule.receivers.includes('Opponent Next Government') && card.kind === 'gov') {
      score += 1; touchedBy.push(rule.id);
    }
    if (rule.receivers.includes('Opponent Government') && card.kind === 'gov') {
      score += 1; touchedBy.push(rule.id);
    }
    if (rule.receivers.includes('Opponent Weakest Government') && card.kind === 'gov') {
      score += 1; touchedBy.push(rule.id);
    }
  });
  return { score: Math.min(score, 100), touchedBy };
}

// Per-rule intensity: unbounded so toxic P0 cards reach 81+ after weighting.
const RULE_INTENSITY = {
  bestechungsskandal_steal: 220,
  maulwurf_steal: 220,
  jeff_bezos_removal: 220,
  ai_weiwei_ap_steal: 220,
  parlament_geschlossen_lock: 220,
  tunnelvision_tax: 220,
  partei_offensive_deactivate: 150,
  oppositionsblockade_lock: 150,
  cyber_attacke_destroy: 150,
  cancel_culture_public: 150,
  whistleblower_debuff: 60,
  massenproteste_debuff: 60,
  satire_show_debuff: 50,
  algorithmischer_diskurs_debuff: 70,
  aufsichtsmandat_counter: 70,
  whataboutism_reactivate: 60,
  shadow_lobbying_oligarch: 70,
  redaktionskonferenz_media: 40,
  spin_doctor_strongest: 35,
  think_tank_next_gov: 35,
  koalitionszwang_onplay: 45,
  wirtschaftlicher_druck_oligarch: 40,
  konzernalgo_oligarch_capture: 45,
  strassenmandat_movement: 45,
  strassenmandat_ngo_ap: 30,
  zivilgesellschaft_ngo_ap: 30,
  malala_ngo_draw: 25,
  assange_ngo_draw: 30,
  digitaler_wahlkampf_draw: 35,
  bill_gates_ap_steal: 30,
  elon_oligarch_ap_draw: 35,
  mark_zuckerberg_ap_steal: 30,
  doudna_science_init: 25,
  fauci_health_init: 25,
  chomsky_military_penalty: 35,
  buffett_aura_strongest: 35,
  buffett_draw_ap: 40,
  corruption_turn_start_buff: 20,
  oligarch_trio_buff: 25,
  alternative_fakten_dampen: 25,
  opportunist_mirror: 35,
  joschka_ngo: 25,
  koalitionszwang_t2_aura: 25,
  napoleon_strongest_t1: 25,
  zivilgesellschaft_movement: 35,
  milchglas_no_ngo: 25,
};

function emitterScore(card) {
  let score = 0;
  let emits = [];
  rules.rules.forEach(rule => {
    if (rule.emitter === card.name) {
      let intensity = RULE_INTENSITY[rule.id];
      if (intensity == null) {
        if (Math.abs(rule.maxDelta) >= 900) {
          intensity = 80;
        } else {
          intensity = Math.min(Math.abs(rule.maxDelta), 6) * 6;
        }
      }
      const polarityMod = rule.polarity === 'negative' || rule.polarity === 'mixed' ? 1.25 : 1.0;
      score += intensity * polarityMod;
      emits.push(rule.id);
    }
    // Tag-based emitters
    if (rule.emitter === 'Oligarch Trio (Adani/Usmanov/Abramovich)' && ['Gautam Adani', 'Alisher Usmanov', 'Roman Abramovich'].includes(card.name)) {
      score += 15; emits.push(rule.id);
    }
  });
  return { score, emits };
}

function conflictScore(card) {
  let score = 0;
  let conflicts = [];
  rules.conflictPairs.forEach(pair => {
    const isPrimary = pair.cards[0] === card.name;
    if (isPrimary) {
      score += pair.penalty * 1.5;
      conflicts.push(pair.id);
    }
  });
  return { score, conflicts };
}

function bandForScore(score) {
  if (score <= rules.bands.solo[1]) return 'solo';
  if (score <= rules.bands.interactive[1]) return 'interactive';
  if (score <= rules.bands.engineCore[1]) return 'engineCore';
  if (score <= rules.bands.unstable[1]) return 'unstable';
  return 'toxic';
}

const cardScores = Object.values(cardDb).map(card => {
  const r = receiverScore(card);
  const e = emitterScore(card);
  const c = conflictScore(card);
  const av = Math.round(
    Math.min(100, weights.receiver * r.score + weights.emitter * e.score + weights.conflict * c.score)
  );
  return {
    name: card.name,
    kind: card.kind,
    influence: card.influence,
    bp: card.bp,
    tier: card.tier,
    type: card.type,
    receiverAV: Math.round(r.score),
    emitterAV: Math.round(e.score),
    conflictAV: Math.round(c.score),
    av,
    band: bandForScore(av),
    touchedBy: r.touchedBy,
    emits: e.emits,
    conflicts: c.conflicts,
  };
}).sort((a, b) => b.av - a.av);

// Premade deck aggregates
function extractPresets() {
  const decks = [];
  const re = /\{\s*name:\s*'([^']+)',\s*cards:\s*\[([^\]]+)\]/g;
  let m;
  while ((m = re.exec(presetSrc))) {
    const name = m[1];
    const cards = m[2]
      .split('\n')
      .flatMap(line => line.match(/'([^']+)'/g) || [])
      .map(s => s.replace(/'/g, ''));
    decks.push({ name, cards });
  }
  return decks;
}

const presets = extractPresets();
const presetAggregates = presets.map(deck => {
  const scoredCards = deck.cards.map(name => cardScores.find(c => c.name === name)).filter(Boolean);
  const meanAV = scoredCards.length ? scoredCards.reduce((s, c) => s + c.av, 0) / scoredCards.length : 0;
  const maxEmitter = scoredCards.length ? Math.max(...scoredCards.map(c => c.emitterAV)) : 0;
  const conflictLoad = scoredCards.reduce((s, c) => s + c.conflicts.length, 0);
  const toxicCount = scoredCards.filter(c => c.band === 'toxic').length;
  const unstableCount = scoredCards.filter(c => c.band === 'unstable').length;
  const deadCount = scoredCards.filter(c => c.band === 'solo' && c.kind === 'spec').length;
  const stackGroups = new Set();
  scoredCards.forEach(c => c.emits.forEach(id => {
    const rule = rules.rules.find(r => r.id === id);
    if (rule) stackGroups.add(rule.stackGroup);
  }));
  return {
    name: deck.name,
    cardCount: scoredCards.length,
    meanAV: Math.round(meanAV * 10) / 10,
    maxEmitter,
    conflictLoad,
    toxicCount,
    unstableCount,
    deadCount,
    distinctStackGroups: Array.from(stackGroups).sort(),
    silentStackHeight: stackGroups.size,
  };
}).sort((a, b) => a.meanAV - b.meanAV);

const report = {
  generatedAt: new Date().toISOString(),
  method: 'Ambivalence Value = 0.4*Receiver + 0.4*Emitter + 0.2*Conflict, clamped 0-100',
  summary: {
    totalCards: cardScores.length,
    meanAV: Math.round((cardScores.reduce((s, c) => s + c.av, 0) / cardScores.length) * 10) / 10,
    solo: cardScores.filter(c => c.band === 'solo').length,
    interactive: cardScores.filter(c => c.band === 'interactive').length,
    engineCore: cardScores.filter(c => c.band === 'engineCore').length,
    unstable: cardScores.filter(c => c.band === 'unstable').length,
    toxic: cardScores.filter(c => c.band === 'toxic').length,
  },
  cards: cardScores,
  premades: presetAggregates,
  designNotes: {
    healthyTarget: 'premade meanAV in interactive (16-40), maxEmitter < 61, toxicCount 0, silentStackHeight <= 3',
    warnings: presetAggregates
      .filter(d => d.toxicCount > 0 || d.meanAV > 50 || d.silentStackHeight > 3)
      .map(d => d.name),
  },
};

fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(`Ambivalence report written to ${outPath}`);
console.log(`Cards: ${report.summary.totalCards}, meanAV: ${report.summary.meanAV}`);
console.log('Top emitters:', cardScores.filter(c => c.emitterAV > 0).slice(0, 5).map(c => `${c.name}(${c.av})`).join(', '));
console.log('Premade meanAV:', presetAggregates.map(d => `${d.name}=${d.meanAV}`).join(', '));
