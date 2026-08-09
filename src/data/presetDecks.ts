import { BuilderEntry } from '../types/game';
import { Pols, Specials } from './gameData';

export type PresetDeck = { name: string; cards: string[] };

// Premade decks: every catalog card appears ≥1×; lists aim for legal
// builder constraints (10–15 cards, ≥6 Regierung, 75–105 BP).
export const PRESET_DECKS: PresetDeck[] = [
  {
    name: 'Tech Oligarchs',
    cards: [
      'Donald Trump', 'Xi Jinping', 'Vladimir Putin', 'Mohammed bin Salman', 'Recep Tayyip Erdoğan',
      'Javier Milei', 'Verzögerungsverfahren', 'Symbolpolitik', 'Think-tank', 'Influencer-Kampagne',
      'Systemrelevant'
    ],
  },
  {
    name: 'Diplomatic Power',
    cards: [
      'Helmut Schmidt', 'Kamala Harris', 'Olaf Scholz', 'Rishi Sunak', 'Hans Dietrich Genscher',
      'George Soros', 'Warren Buffett', 'Spin Doctor', 'Think-tank', 'Koalitionszwang',
      'Systemrelevant', 'Rainer Offergeld', 'Digitaler Wahlkampf'
    ],
  },
  {
    name: 'Activist Movement',
    cards: [
      'Volodymyr Zelenskyy', 'Ursula von der Leyen', 'Narendra Modi', 'Luiz Inácio Lula da Silva', 'Benjamin Netanyahu',
      'Joschka Fischer', 'Ai Weiwei', 'Alexei Navalny', 'Zivilgesellschaft', 'Boykott-Kampagne',
      'Verzögerungsverfahren', 'Mark Zuckerberg', 'Oprah Winfrey'
    ],
  },
  {
    name: 'Initiative Rush',
    cards: [
      'Emmanuel Macron', 'Giorgia Meloni', 'Ebrahim Raisi', 'Andrzej Duda', 'Anthony Albanese',
      'King Charles III', 'Verzögerungsverfahren', 'Symbolpolitik', 'Opportunist', 'Shadow Lobbying',
      'Whataboutism', 'Influencer-Kampagne', 'Tim Cook'
    ],
  },
  {
    name: 'Media Control',
    cards: [
      'Donald Trump', 'Vladimir Putin', 'Xi Jinping', 'Mohammed bin Salman', 'Recep Tayyip Erdoğan',
      'Pedro Sánchez', 'Oprah Winfrey', 'Algorithmischer Diskurs', 'Fake News-Kampagne', 'Cancel Culture',
      'Verzögerungsverfahren', 'Shadow Lobbying'
    ],
  },
  {
    name: 'Economic Influence',
    cards: [
      'Helmut Schmidt', 'Jens Stoltenberg', 'Kamala Harris', 'Olaf Scholz', 'Rishi Sunak',
      'Dick Cheney', 'Warren Buffett', 'Jeff Bezos', 'Mukesh Ambani', 'Roman Abramovich',
      'Wirtschaftlicher Druck', 'Lobby Leak'
    ],
  },
  {
    name: 'Security State',
    cards: [
      'Colin Powell', 'Condoleezza Rice', 'Donald Rumsfeld', 'Sergey Lavrov', 'Wolfgang Schäuble',
      'Justin Trudeau', 'Maulwurf', 'Tunnelvision', 'Cyber-Attacke', 'Deepfake-Skandal',
      'Parlament geschlossen', 'Oppositionsblockade'
    ],
  },
  {
    name: 'Reform Coalition',
    cards: [
      'Friedrich Merz', 'Pedro Sánchez', 'Keir Starmer', 'Otto Schily', 'Henry Paulson',
      'Johannes Rau', 'Bill Gates', 'Jennifer Doudna', 'Anthony Fauci', 'Milchglas Transparenz',
      'Partei-Offensive', 'Whistleblower', 'Vladimir Putin'
    ],
  },
  {
    name: 'Information War',
    cards: [
      'Karl Rove', 'Robert Gates', 'Shigeru Ishiba', 'Tedros Adhanom Ghebreyesus', 'Tom Ridge',
      'John Ashcroft', 'Edward Snowden', 'Julian Assange', 'Yuval Noah Harari', 'Noam Chomsky',
      'Skandalspirale', 'Scandal Spiral', 'Xi Jinping', 'Elon Musk'
    ],
  },
  {
    name: 'Grassroots Surge',
    cards: [
      'Heidemarie Wieczorek-Zeul', 'Renate Künast', 'Rudolf Scharping', 'Erhard Eppler', 'Edelgard Bulmahn',
      'Annette Schavan', 'Greta Thunberg', 'Malala Yousafzai', 'Grassroots-Widerstand', 'Massenproteste',
      'Zivilgesellschaft', 'Vladimir Putin', 'Xi Jinping', 'Sam Altman'
    ],
  },
  {
    name: 'Corporate Capture',
    cards: [
      'Hans Apel', 'Georg Leber', 'Franz Josef Jung', 'Peter Struck', 'Gerhart Baum',
      'Alberto Gonzales', 'Gautam Adani', 'Alisher Usmanov', 'Jack Ma', 'Zhang Yiming',
      'Bestechungsskandal 2.0', 'Konzernfreundlicher Algorithmus', 'Vladimir Putin'
    ],
  },
  {
    name: 'Institutional Core',
    cards: [
      'Horst Köhler', 'Karl Carstens', 'Hans Eichel', 'Walter Scheel', 'Werner Maihofer',
      'John Snow', 'Alternative Fakten', 'Napoleon Komplex', '"Unabhängige" Untersuchung', 'Soft Power-Kollaps',
      'Berater-Affäre', 'Interne Fraktionskämpfe', 'Vladimir Putin', 'Xi Jinping', 'Recep Tayyip Erdoğan'
    ],
  },
  {
    name: 'Shadow Cabinet',
    cards: [
      'Colin Powell', 'Condoleezza Rice', 'Donald Rumsfeld', 'Christine Lagarde', 'Justin Trudeau',
      'King Charles III', 'Satire-Show', 'Strategische Enthüllung', 'Jeff Bezos', 'Alisher Usmanov',
      'Shadow Lobbying', 'Whataboutism'
    ],
  },
];

export function presetToBuilderEntries(preset: PresetDeck, warn?: (msg: string) => void): BuilderEntry[] {
  const entries: BuilderEntry[] = [];
  preset.cards.forEach(name => {
    const pol = Pols.find((p: any) => p.name === name);
    if (pol) {
      entries.push({ kind: 'pol', baseId: pol.id, count: 1 });
      return;
    }
    const spec = Specials.find((s: any) => s.name === name);
    if (spec) {
      entries.push({ kind: 'spec', baseId: spec.id, count: 1 });
      return;
    }
    warn?.(`⚠️ Karte "${ name }" aus Preset "${ preset.name }" nicht gefunden`);
  });
  return entries;
}

export function randomPresetDeck(): PresetDeck {
  return PRESET_DECKS[Math.floor(Math.random() * PRESET_DECKS.length)];
}

function entryKey(entry: BuilderEntry): string {
  return `${entry.kind}:${entry.baseId}`;
}

/** True when both decks contain the same card identities (order-independent). */
export function decksShareSameCards(a: BuilderEntry[], b: BuilderEntry[]): boolean {
  if (a.length !== b.length) return false;
  const counts = new Map<string, number>();
  for (const e of a) {
    const k = entryKey(e);
    counts.set(k, (counts.get(k) || 0) + (e.count || 1));
  }
  for (const e of b) {
    const k = entryKey(e);
    const next = (counts.get(k) || 0) - (e.count || 1);
    if (next < 0) return false;
    counts.set(k, next);
  }
  return Array.from(counts.values()).every((n) => n === 0);
}

/**
 * Pick a premade deck that does not match the player's card set.
 * Falls back to any premade only if every preset somehow matches (should not happen).
 */
export function randomPresetDeckDifferentFrom(playerEntries: BuilderEntry[]): PresetDeck {
  const different = PRESET_DECKS.filter((preset) => {
    const entries = presetToBuilderEntries(preset);
    return !decksShareSameCards(playerEntries, entries);
  });
  const pool = different.length > 0 ? different : PRESET_DECKS;
  return pool[Math.floor(Math.random() * pool.length)];
}
