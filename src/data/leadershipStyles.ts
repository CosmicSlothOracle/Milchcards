/**
 * Führungsstile + Champions — character depth layer (≤1 pt/round swing).
 * Champion carries the style: passive IS the style passive; active is 1×/match.
 */

export type LeadershipStyleId =
  | 'autokratie'
  | 'diplomatie'
  | 'bewegung'
  | 'technokratie'
  | 'schattenstaat';

export type ChampionActiveId =
  | 'jack_ma_draw_corrupt'
  | 'zuckerberg_aura_tax'
  | 'schmidt_veto_intervention'
  | 'koehler_audit_relief'
  | 'lagarde_shift_corruption'
  | 'zelenskyy_influence_surge'
  | 'greta_clean_bonus'
  | 'macron_ap'
  | 'buffett_cleanse'
  | 'merz_vetting'
  | 'powell_shield'
  | 'snowden_mark'
  | 'adani_power_deal';

export interface LeadershipStyle {
  id: LeadershipStyleId;
  name: string;
  /** German doctrine microcopy for deck dossiers */
  doctrine: string;
  /** Short passive sentence (first impression) */
  passiveSentence: string;
  /** Accent token family (maps to Chamber primitives) */
  accentFamily: 'rose-amber' | 'teal' | 'sage' | 'teal-ink' | 'mauve-ink';
  /** CSS color values for --style-accent / --style-accent-subtle */
  accent: string;
  accentSubtle: string;
}

export interface ChampionDef {
  /** Card name as it appears in catalog / premade lists */
  cardName: string;
  styleId: LeadershipStyleId;
  activeId: ChampionActiveId;
  /** Sealed active name for UI */
  activeName: string;
  /** One-line active description */
  activeDescription: string;
}

export const LEADERSHIP_STYLES: Record<LeadershipStyleId, LeadershipStyle> = {
  autokratie: {
    id: 'autokratie',
    name: 'Autokratie',
    doctrine: 'Macht fragt nicht.',
    passiveSentence: 'Die schmutzigste Regierung zählt +1 bei der Wertung.',
    accentFamily: 'rose-amber',
    accent: 'var(--rose-600)',
    accentSubtle: 'var(--amber-500)',
  },
  diplomatie: {
    id: 'diplomatie',
    name: 'Diplomatie',
    doctrine: 'Der Raum entscheidet, nicht die Bühne.',
    passiveSentence: 'Schweigegeld wirkt stärker (bis 3 AP).',
    accentFamily: 'teal',
    accent: 'var(--teal-600)',
    accentSubtle: 'var(--teal-400)',
  },
  bewegung: {
    id: 'bewegung',
    name: 'Bewegung',
    doctrine: 'Die Straße zählt die Stimmen.',
    passiveSentence: 'Saubere Regierungen zählen +1 bei der Wertung.',
    accentFamily: 'sage',
    accent: 'var(--sage-600)',
    accentSubtle: 'var(--sage-400)',
  },
  technokratie: {
    id: 'technokratie',
    name: 'Technokratie',
    doctrine: 'Effizienz ist die einzige Ideologie.',
    passiveSentence: 'Erste Sofort-Initiative der Runde: +1 auf numerische Effekte.',
    accentFamily: 'teal-ink',
    accent: 'var(--teal-800)',
    accentSubtle: 'var(--ink-500)',
  },
  schattenstaat: {
    id: 'schattenstaat',
    name: 'Schattenstaat',
    doctrine: 'Was du nicht siehst, regiert.',
    passiveSentence: 'Eigene Interventionen bleiben für den Gegner unsichtbar.',
    accentFamily: 'mauve-ink',
    accent: 'var(--mauve-600)',
    accentSubtle: 'var(--ink-500)',
  },
};

/** Premade deck name → champion card + style binding */
export const PRESET_CHAMPIONS: Record<string, ChampionDef> = {
  'Tech Oligarchs': {
    cardName: 'Jack Ma',
    styleId: 'autokratie',
    activeId: 'jack_ma_draw_corrupt',
    activeName: 'Plattform-Deal',
    activeDescription: 'Ziehe 1 Karte; ein eigenes Gov +1 Korruption.',
  },
  'Media Control': {
    cardName: 'Mark Zuckerberg',
    styleId: 'autokratie',
    activeId: 'zuckerberg_aura_tax',
    activeName: 'Algorithmus-Drossel',
    activeDescription: 'Gegnerische Aura-Effekte diesen Zug −1.',
  },
  'Diplomatic Power': {
    cardName: 'Helmut Schmidt',
    styleId: 'diplomatie',
    activeId: 'schmidt_veto_intervention',
    activeName: 'Staatsräson',
    activeDescription: 'Annulliere die nächste gegnerische Intervention diese Runde.',
  },
  'Institutional Core': {
    cardName: 'Horst Köhler',
    styleId: 'diplomatie',
    activeId: 'koehler_audit_relief',
    activeName: 'Institutionsschild',
    activeDescription: 'Ein eigenes Gov: Audit-Stufe diese Runde −2.',
  },
  'Shadow Cabinet': {
    cardName: 'Christine Lagarde',
    styleId: 'diplomatie',
    activeId: 'lagarde_shift_corruption',
    activeName: 'Kreative Buchführung',
    activeDescription: 'Verschiebe 1 Korruption von einem eigenen Gov auf ein gegnerisches.',
  },
  'Activist Movement': {
    cardName: 'Volodymyr Zelenskyy',
    styleId: 'bewegung',
    activeId: 'zelenskyy_influence_surge',
    activeName: 'Kriegsmandat',
    activeDescription: 'Alle eigenen Govs +1 Einfluss für diese Wertung.',
  },
  'Grassroots Surge': {
    cardName: 'Greta Thunberg',
    styleId: 'bewegung',
    activeId: 'greta_clean_bonus',
    activeName: 'Klimastreik',
    activeDescription: 'Alle eigenen K0-Govs +1 Einfluss für diese Wertung.',
  },
  'Initiative Rush': {
    cardName: 'Emmanuel Macron',
    styleId: 'technokratie',
    activeId: 'macron_ap',
    activeName: 'Force de frappe',
    activeDescription: 'Sofort +1 AP.',
  },
  'Economic Influence': {
    cardName: 'Warren Buffett',
    styleId: 'technokratie',
    activeId: 'buffett_cleanse',
    activeName: 'Geduldiges Kapital',
    activeDescription: '−1 Korruption auf ein eigenes Gov (unter Lore-Start erlaubt).',
  },
  'Reform Coalition': {
    cardName: 'Friedrich Merz',
    styleId: 'technokratie',
    activeId: 'merz_vetting',
    activeName: 'Personalreserve',
    activeDescription: 'Nächstes gespieltes Gov kommt mit −1 Korruption.',
  },
  'Security State': {
    cardName: 'Colin Powell',
    styleId: 'schattenstaat',
    activeId: 'powell_shield',
    activeName: 'Doctrine Shield',
    activeDescription: 'Schütze das stärkste eigene Gov einmalig.',
  },
  'Information War': {
    cardName: 'Edward Snowden',
    styleId: 'schattenstaat',
    activeId: 'snowden_mark',
    activeName: 'Leak',
    activeDescription: 'Markiere ein gegnerisches Gov (Audit-Stufe +1).',
  },
  'Corporate Capture': {
    cardName: 'Gautam Adani',
    styleId: 'schattenstaat',
    activeId: 'adani_power_deal',
    activeName: 'Infrastruktur-Deal',
    activeDescription: 'Stärkstes eigenes Gov +2 Einfluss, dafür +1 Korruption.',
  },
};

export function getStyleForPreset(presetName: string): LeadershipStyle | null {
  const champ = PRESET_CHAMPIONS[presetName];
  if (!champ) return null;
  return LEADERSHIP_STYLES[champ.styleId];
}

export function getChampionForPreset(presetName: string): ChampionDef | null {
  return PRESET_CHAMPIONS[presetName] ?? null;
}
