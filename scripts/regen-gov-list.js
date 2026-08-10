const fs = require('fs');

const src = fs.readFileSync('src/data/gameData.ts', 'utf8');
const AUTOCRAT = new Set([
  'Vladimir Putin', 'Xi Jinping', 'Donald Trump', 'Recep Tayyip Erdoğan',
  'Mohammed bin Salman', 'Benjamin Netanyahu', 'Ebrahim Raisi', 'Giorgia Meloni',
]);

const re = /\{id:(\d+),\s*key:[^,]+,\s*name:'([^']+)',\s*influence:(\d+),\s*T:(\d+)/g;
const cards = [];
let m;
while ((m = re.exec(src))) {
  const name = m[2];
  const T = Number(m[4]);
  const start = AUTOCRAT.has(name) ? 3 : (T >= 2 ? 2 : 1);
  cards.push({ name, T, influence: Number(m[3]), start });
}

const abilities = {
  'Vladimir Putin': 'Aktiv (≥3): Vertikale der Macht — deaktiviere schwächste gegnerische Regierung; Selbst +1 Korruption.',
  'Xi Jinping': 'Aktiv (≥3): Anti-Korruptions-Kampagne — transferiere 2 Korruption auf ein Ziel.',
  'Donald Trump': 'Aktiv (≥3): Alternative Wahrheit — ignoriere gierigen Pass; +1 Einfluss; Selbst +1 Korruption.',
  'Recep Tayyip Erdoğan': 'Aktiv (≥3): Dekret — annulliere gegnerische Dauerhaft-Aura; Selbst +1 Korruption.',
  'Mohammed bin Salman': 'Aktiv (≥3): Ritz-Carlton-Methode — deaktiviere korrupte gegnerische Regierung oder erzwinge Abwurf.',
  'Benjamin Netanyahu': 'Aktiv (≥3): Koalitionsdisziplin — wasche andere eigene Regierungen; absorbiere die Korruption.',
  'Ebrahim Raisi': 'Aktiv (≥3): Schauprozess — Mini-Säuberung (W6 Ziel 3) auf korrupte gegnerische Regierung.',
  'Giorgia Meloni': 'Aktiv (≥3): Rechtsruck — +2 Einfluss; +1 Korruption wenn stärkste.',
  'Emmanuel Macron': 'Aktiv (≥3): Jupiter — kopiere Korruptions-Einflussbonus der korruptesten gegnerischen Regierung.',
  'Justin Trudeau': 'Aktiv (≥3): Sunny Ways — −1 Korruption; nächster Säuberungswurf +1.',
  'Sergey Lavrov': 'Aktiv (≥3): Njet — annulliere nächsten gegnerischen Korruptionszuwachs.',
  'Dick Cheney': 'Aktiv (≥3): Schattenregierung — eigene Interventionen +1 Korruption auf Ziele.',
  'Christine Lagarde': 'Aktiv (≥3): Kreative Buchführung — verschiebe bis zu 2 Korruption auf sich selbst.',
};

let out = 'Regierungskarten (Government) — mit Korruptionswerten\n';
out += '=====================================================\n\n';
out += `Count: ${cards.length}\n\n`;
out += 'Korruptionssystem: Jede Regierung startet mit einem Lore-Wert (1–3),\n';
out += 'steigt/fällt durch Effekte (0–6). Bei Pass beider Spieler: W6-Säuberung\n';
out += 'vor der Wertung (Ziel = Korruption + Tier, Clamp 5; Korruption 6 = Auto-Fail).\n';
out += 'Ab Korruption 3: aktive Fähigkeit freigeschaltet (1 AP).\n\n';

for (const c of cards) {
  const ab = abilities[c.name] ? ` ${abilities[c.name]}` : '';
  out += `- ${c.name} [Start-Korruption ${c.start}, Tier ${c.T}, Einfluss ${c.influence}]${ab}\n`;
}

fs.writeFileSync('docs/card_lists/01_government.txt', out);
console.log('wrote', cards.length, 'gov cards');
