const fs = require("fs");
const path = require("path");

const SRC = path.resolve(__dirname, "..", "src", "effects", "registry.ts");
const OUT_DIR = path.resolve(__dirname, "..", "tmp");
const OUT = path.join(OUT_DIR, "effect_categories.json");

if (!fs.existsSync(SRC)) {
  console.error("registry.ts not found at", SRC);
  process.exit(1);
}

const text = fs.readFileSync(SRC, "utf8");

// Regex to capture each effect handler: 'key': ({ ... }) => { body }
const handlerRe =
  /'([^']+)':\s*\(\{[\s\S]*?\}\)\s*=>\s*\{([\s\S]*?)(?=\n\s*'[^']+'\s*:|\n\s*};)/g;

const enqueueTypeRe = /enqueue\(\s*\{\s*type:\s*'([^']+)'([^}]*)\}\s*\)/g;
const registerTrapKeyRe =
  /enqueue\(\s*\{\s*type:\s*'REGISTER_TRAP'[^}]*key:\s*'([^']+)'/g;
const directRegisterRe = /REGISTER_TRAP/;

const results = [];
let m;
while ((m = handlerRe.exec(text)) !== null) {
  const key = m[1];
  if (key.startsWith("gov.")) continue; // skip government cards per user
  const body = m[2];

  const flags = {
    wirkt_auf_regierung_positiv: false,
    wirkt_auf_regierung_negativ: false,
    wirkt_auf_ap_positiv: false,
    wirkt_auf_ap_negativ: false,
    wirkt_auf_handkarten: false,
    wirkt_auf_gegnerische_handkarten: false,
    wirkt_auf_oeffentlichkeitskarten_positiv: false,
    wirkt_auf_oeffentlichkeitskarten_negativ: false,
  };

  // find all enqueue types
  let em;
  const enqueuedTypes = [];
  while ((em = enqueueTypeRe.exec(body)) !== null) {
    enqueuedTypes.push({ type: em[1], rest: em[2] });
  }

  // traps registered with key
  let tm;
  const trapKeys = [];
  while ((tm = registerTrapKeyRe.exec(body)) !== null) {
    trapKeys.push(tm[1]);
  }

  // Heuristics
  enqueuedTypes.forEach((e) => {
    const t = e.type;
    if (t === "BUFF_STRONGEST_GOV" || t === "KOALITIONSZWANG_CALCULATE_BONUS")
      flags.wirkt_auf_regierung_positiv = true;
    if (
      t === "DEACTIVATE_STRONGEST_ENEMY_GOV" ||
      t === "DEACTIVATE_STRONGEST_GOV"
    )
      flags.wirkt_auf_regierung_negativ = true;
    if (t === "ADD_AP") flags.wirkt_auf_ap_positiv = true;
    if (t === "DISCARD_RANDOM_FROM_HAND" || t === "DEACTIVATE_RANDOM_HAND") {
      // if rest contains 'player: opp' or 'player: otherPlayer' -> opponent hand
      if (/player\s*:\s*opp|player\s*:\s*otherPlayer/.test(e.rest)) {
        flags.wirkt_auf_gegnerische_handkarten = true;
      } else if (/player\s*:\s*player/.test(e.rest)) {
        flags.wirkt_auf_handkarten = true;
      } else {
        // ambiguous: check surrounding body for opp/otherPlayer var
        if (/\bconst\s+(opp|otherPlayer)\b/.test(body)) {
          flags.wirkt_auf_gegnerische_handkarten = true;
        } else {
          flags.wirkt_auf_handkarten = true;
        }
      }
    }
    if (t === "GRANT_SHIELD") {
      // could be applied to public per comments; mark as public positive conservatively
      flags.wirkt_auf_oeffentlichkeitskarten_positiv = true;
    }
    if (t === "REMOVE_OTHER_OLIGARCHS") {
      // removal of oligarchs likely affects public row negatively for others; mark public negative
      flags.wirkt_auf_oeffentlichkeitskarten_negativ = true;
    }
    if (t === "LOCK_OPPONENT_INITIATIVES_EOT") {
      // locks opponent initiatives -> negative for opponent AP/initiatives; mark ap_neg
      flags.wirkt_auf_ap_negativ = true;
    }
    if (t === "SET_DOUBLE_PUBLIC_AURA" || t === "VISUAL_INFLUENCE_BUFF") {
      flags.wirkt_auf_oeffentlichkeitskarten_positiv = true;
    }
    if (t === "DEACTIVATE_RANDOM_HAND") {
      // this may affect both players depending on code
      if (/otherPlayer/.test(body) || /otherPlayer/.test(e.rest))
        flags.wirkt_auf_gegnerische_handkarten = true;
      if (
        /player\s*,\s*otherPlayer/.test(body) ||
        /player\s*:\s*player/.test(e.rest)
      )
        flags.wirkt_auf_handkarten = true;
    }

    // traps registered as events may indicate negative effects depending on key
    if (t === "REGISTER_TRAP") {
      // handled below via trapKeys
    }
  });

  trapKeys.forEach((k) => {
    // common patterns
    if (
      /deactivate_gov|debuff_next_gov|minus2_gov|debuff_two_govs|minus2_enemy_gov/.test(
        k
      )
    )
      flags.wirkt_auf_regierung_negativ = true;
    if (
      /deactivate_public|deactivate_media|destroy_platform|cancel_trap|force_discard_on_ngo|deactivate_ngo|cancel_one_of_two/.test(
        k
      )
    )
      flags.wirkt_auf_oeffentlichkeitskarten_negativ = true;
    if (/opp_ap_minus2|opp_ap_minus/.test(k)) flags.wirkt_auf_ap_negativ = true;
    if (/opp_discard|opp_discard2/.test(k))
      flags.wirkt_auf_gegnerische_handkarten = true;
    if (/return_last_played|return_gov/.test(k))
      flags.wirkt_auf_regierung_negativ = true;
    if (/lock_diplomat_transfer|destroy_platform/.test(k))
      flags.wirkt_auf_oeffentlichkeitskarten_negativ = true;
  });

  // Additional heuristics: if key contains certain tokens
  if (/buff|boost|buff_strongest|draw1_buff|ai_boost/.test(key))
    flags.wirkt_auf_regierung_positiv =
      flags.wirkt_auf_regierung_positiv || false;
  if (
    /deactivate|cancel|sabotage|scandal|bribery|maulwurf|corruption|return|steal|mole|mass_protests|advisor_scandal|parliament_closed/.test(
      key
    )
  ) {
    // many of these affect gov or public negatively; try to set flags conservatively
    if (/gov|government|steal|return|deactivate/.test(key))
      flags.wirkt_auf_regierung_negativ =
        flags.wirkt_auf_regierung_negativ || false;
    if (
      /public|media|platform|ngo|movement|platform|destroy|deactivate_public/.test(
        key
      )
    )
      flags.wirkt_auf_oeffentlichkeitskarten_negativ =
        flags.wirkt_auf_oeffentlichkeitskarten_negativ || false;
  }

  results.push({
    key,
    flags,
    enqueuedTypes: enqueuedTypes.map((e) => e.type),
    trapKeys,
  });
}

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);
fs.writeFileSync(OUT, JSON.stringify(results, null, 2), "utf8");
console.log("Wrote", OUT, "with", results.length, "entries");
