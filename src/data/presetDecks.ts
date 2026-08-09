import { BuilderEntry } from '../types/game';
import { Pols, Specials } from './gameData';

export type PresetDeck = { name: string; cards: string[] };

// Shared premade decks: used by the AI opponent and for PvP quick matches.
export const PRESET_DECKS: PresetDeck[] = [
  {
    name: 'Tech Oligarchs',
    cards: [
      'Vladimir Putin', 'Xi Jinping', 'Donald Trump', 'Mohammed bin Salman', 'Recep Tayyip Erdoğan',
      'Elon Musk', 'Bill Gates', 'Mark Zuckerberg', 'Tim Cook', 'Sam Altman'
    ]
  },
  {
    name: 'Diplomatic Power',
    cards: [
      'Jens Stoltenberg', 'Olaf Scholz', 'Rishi Sunak', 'Kamala Harris', 'Helmut Schmidt',
      'Greta Thunberg', 'Warren Buffett', 'George Soros', 'Spin Doctor', 'Think-tank'
    ]
  },
  {
    name: 'Activist Movement',
    cards: [
      'Benjamin Netanyahu', 'Volodymyr Zelenskyy', 'Ursula von der Leyen', 'Narendra Modi', 'Luiz Inácio Lula da Silva',
      'Greta Thunberg', 'Malala Yousafzai', 'Ai Weiwei', 'Alexei Navalny', 'Jennifer Doudna'
    ]
  },
  {
    name: 'Initiative Rush',
    cards: [
      'Benjamin Netanyahu', 'Volodymyr Zelenskyy', 'Ursula von der Leyen', 'Olaf Scholz', 'Kamala Harris',
      'Greta Thunberg', 'Verzögerungsverfahren', 'Symbolpolitik', 'Shadow Lobbying', 'Opportunist'
    ]
  },
  {
    name: 'Media Control',
    cards: [
      'Vladimir Putin', 'Xi Jinping', 'Donald Trump', 'Mohammed bin Salman', 'Recep Tayyip Erdoğan',
      'Oprah Winfrey', 'Mark Zuckerberg', 'Tim Cook', 'Influencer-Kampagne', 'Whataboutism'
    ]
  },
  {
    name: 'Economic Influence',
    cards: [
      'Jens Stoltenberg', 'Olaf Scholz', 'Rishi Sunak', 'Kamala Harris', 'Helmut Schmidt',
      'Warren Buffett', 'George Soros', 'Jeff Bezos', 'Mukesh Ambani', 'Roman Abramovich'
    ]
  }
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
