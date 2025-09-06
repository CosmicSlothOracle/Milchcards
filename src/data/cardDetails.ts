// Detailed card information for the modal display
// This data is sourced from Karten_Regierung.md and Karten_Oeffentlichkeit.md

export interface DetailedCardInfo {
  name: string;
  category: 'Regierung' | 'Öffentlichkeit' | 'Sofort-Initiative' | 'Dauerhaft-Initiative' | 'Intervention';

  // Game mechanics (most important)
  gameEffect?: string;
  deckCost: number;
  subcategories?: string[];
  synergy?: string;

  // Special card specific info
  cardType?: string;
  tier?: string;
  speed?: string;
  trigger?: string;
  usage?: string;
  example?: string;
  slot?: 'Regierung' | 'Öffentlichkeit';

  // Personal information (for politicians)
  nationality?: string;
  birthDate?: string;
  highestPosition?: string;
  estimatedWealth?: string;
  controversialQuote?: string;

  // Sources (for dropdown)
  sources?: string[];
  calculation?: string;
}

// Government Cards (Regierung) - from Karten_Regierung.md
export const GOVERNMENT_CARD_DETAILS: Record<string, DetailedCardInfo> = {
  'Vladimir Putin': {
    name: 'Vladimir Putin',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 8,
    subcategories: [],
    nationality: 'Russisch',
    birthDate: '7. Oktober 1952',
    highestPosition: 'Präsident Russlands',
    estimatedWealth: 'ca. 200-400 Milliarden US-Dollar',
    controversialQuote: '"Der Zerfall der Sowjetunion war die größte geopolitische Katastrophe des 20. Jahrhunderts" (2005, Moskau)',
    sources: ['Navalny Investigations', 'Panama Papers', 'Paradise Papers', 'Bellingcat-Recherchen'],
    calculation: 'Offshore-Vermögen, Oligarchen-Anteile, Staatsvermögen-Kontrolle, Immobilien, Yachten'
  },

  'Xi Jinping': {
    name: 'Xi Jinping',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 8,
    subcategories: [],
    nationality: 'Chinesisch',
    birthDate: '15. Juni 1953',
    highestPosition: 'Präsident der Volksrepublik China',
    estimatedWealth: 'ca. 50-150 Milliarden US-Dollar',
    controversialQuote: '"China wird niemals den Weg der Aggression oder Expansion einschlagen" (2017, Peking)',
    sources: ['Bloomberg Investigations (2021)', 'South China Morning Post', 'Hong Kong-Recherchen'],
    calculation: 'Familienvermögen, Parteikontrolle über Staatsvermögen, Verwandte in Wirtschaft, Offshore-Strukturen'
  },

  'Recep Tayyip Erdoğan': {
    name: 'Recep Tayyip Erdoğan',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 8,
    subcategories: [],
    nationality: 'Türkisch',
    birthDate: '26. Februar 1954',
    highestPosition: 'Präsident der Türkei',
    estimatedWealth: 'ca. 50-100 Millionen US-Dollar',
    controversialQuote: '"Frauen und Männer sind nicht gleich" (2014, Istanbul)',
    sources: ['Präsidentengehalt', 'Familienunternehmen', 'Immobilien'],
    calculation: 'Begrenzt durch türkische Wirtschaftskrise und Lira-Abwertung'
  },

  'Justin Trudeau': {
    name: 'Justin Trudeau',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 6,
    subcategories: [],
    nationality: 'Kanadisch',
    birthDate: '25. Dezember 1971',
    highestPosition: 'Premierminister Kanadas',
    estimatedWealth: 'ca. 10-20 Millionen US-Dollar',
    controversialQuote: '"Kanada ist das erste postnationale Land" (2015, New York)',
    sources: ['Premierminister-Gehalt (350.000 CAD/Jahr)', 'Familienvermögen', 'Buchverkäufe'],
    calculation: 'Familienvermögen (Vater Pierre Trudeau), Immobilien, Redenhonorare'
  },

  'Volodymyr Zelenskyy': {
    name: 'Volodymyr Zelenskyy',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 6,
    subcategories: [],
    nationality: 'Ukrainisch',
    birthDate: '25. Januar 1978',
    highestPosition: 'Präsident der Ukraine',
    estimatedWealth: 'ca. 20-30 Millionen US-Dollar',
    controversialQuote: '"Ich brauche Munition, keine Mitfahrgelegenheit" (2022, Kiew)',
    sources: ['Studio Kvartal 95', 'Schauspieler-Karriere', 'Präsidentengehalt'],
    calculation: 'Vor Krieg höher, durch Krieg reduziert'
  },

  'Ursula von der Leyen': {
    name: 'Ursula von der Leyen',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 6,
    subcategories: [],
    nationality: 'Deutsch',
    birthDate: '8. Oktober 1958',
    highestPosition: 'Präsidentin der Europäischen Kommission',
    estimatedWealth: 'ca. 1.2-5.5 Millionen US-Dollar',
    controversialQuote: '"Europa braucht eine gemeinsame Armee" (2018, Brüssel)',
    sources: ['EU-Kommissionspräsidentin-Gehalt', 'Familienvermögen', 'EZB-Umrechnung'],
    calculation: 'Familienvermögen (Vater Ernst Albrecht), Immobilien. 1 EUR ≈ 1,10 USD'
  },

  'Donald Trump': {
    name: 'Donald Trump',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 8,
    subcategories: [],
    nationality: 'US-Amerikanisch',
    birthDate: '14. Juni 1946',
    highestPosition: 'Präsident der USA',
    estimatedWealth: 'ca. 3-5 Milliarden US-Dollar',
    controversialQuote: '"Ich werde die Wahl gewinnen" (2020, Washington)',
    sources: ['New York Times Investigations (2020)', 'Forbes-Korrekturen', 'Deutsche Bank-Recherchen'],
    calculation: 'Trump Organization, Immobilien-Portfolio, Golfplätze, Hotels, Reality-TV'
  },

  'Mohammed bin Salman': {
    name: 'Mohammed bin Salman',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 8,
    subcategories: [],
    nationality: 'Saudisch',
    birthDate: '31. August 1985',
    highestPosition: 'Kronprinz Saudi-Arabiens',
    estimatedWealth: 'ca. 50-100 Milliarden US-Dollar',
    controversialQuote: '"Saudi-Arabien wird modern" (2018, Riad)',
    sources: ['Bloomberg Investigations (2022)', 'Wall Street Journal', 'saudische Opposition'],
    calculation: 'Saudi-Aramco-Anteile, Staatsvermögen-Kontrolle, Vision 2030, Immobilien, Yachten, Kunstsammlung'
  },

  'Benjamin Netanyahu': {
    name: 'Benjamin Netanyahu',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 6,
    subcategories: [],
    nationality: 'Israelisch',
    birthDate: '21. Oktober 1949',
    highestPosition: 'Premierminister Israels',
    estimatedWealth: 'ca. 10-20 Millionen US-Dollar',
    controversialQuote: '"Israel ist die einzige Demokratie im Nahen Osten" (2015, Jerusalem)',
    sources: ['Premierminister-Gehalt', 'Buchverkäufe', 'Redenhonorare'],
    calculation: 'politische Karriere, Korruptionsvorwürfe, Likud-Mitgliedschaft'
  },

  'Helmut Schmidt': {
    name: 'Helmut Schmidt',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 6,
    subcategories: [],
    nationality: 'Deutsch',
    birthDate: '23. Dezember 1918',
    highestPosition: 'Bundeskanzler',
    estimatedWealth: 'ca. 1.1-2.2 Millionen US-Dollar',
    controversialQuote: '"Wer Visionen hat, sollte zum Arzt gehen" (1980, Bonn)',
    sources: ['Bundeskanzler-Pension', 'Buchverkäufe', 'Redenhonorare'],
    calculation: '1 EUR ≈ 1,10 USD (2024, EZB)'
  },

  'Olaf Scholz': {
    name: 'Olaf Scholz',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 6,
    subcategories: [],
    nationality: 'Deutsch',
    birthDate: '14. Juni 1958',
    highestPosition: 'Bundeskanzler',
    estimatedWealth: 'ca. 1.1-2.2 Millionen US-Dollar',
    controversialQuote: '"Die Schuldenbremse ist nicht mehr zeitgemäß" (2023, Berlin)',
    sources: ['Bundeskanzler-Gehalt', 'Anwaltstätigkeit', 'EZB-Umrechnung'],
    calculation: 'Immobilien. 1 EUR ≈ 1,10 USD (2024, EZB)'
  },

  'Rishi Sunak': {
    name: 'Rishi Sunak',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 6,
    subcategories: [],
    nationality: 'Britisch',
    birthDate: '12. Mai 1980',
    highestPosition: 'Premierminister des Vereinigten Königreichs',
    estimatedWealth: 'ca. 800 Millionen - 1,2 Milliarden US-Dollar',
    controversialQuote: '"Brexit bietet enorme Chancen" (2022, London)',
    sources: ['The Guardian-Recherchen (2022)', 'Pandora Papers', 'Infosys-Bewertung'],
    calculation: 'Infosys-Aktien (Ehefrau Akshata Murty), Hedgefonds-Karriere, Goldman Sachs, Offshore-Vermögen'
  },

  'Pedro Sánchez': {
    name: 'Pedro Sánchez',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 5,
    subcategories: [],
    nationality: 'Spanisch',
    birthDate: '29. Februar 1972',
    highestPosition: 'Ministerpräsident Spaniens',
    estimatedWealth: 'ca. 0.55-1.1 Millionen US-Dollar',
    controversialQuote: '"Spanien wird ein feministisches Land" (2018, Madrid)',
    sources: ['Ministerpräsident-Gehalt', 'Immobilien', 'EZB-Umrechnung'],
    calculation: 'bescheidener Lebensstil. 1 EUR ≈ 1,10 USD (2024, EZB)'
  },

  'Keir Starmer': {
    name: 'Keir Starmer',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 5,
    subcategories: [],
    nationality: 'Britisch',
    birthDate: '2. September 1962',
    highestPosition: 'Vorsitzender der Labour Party',
    estimatedWealth: 'ca. 1.25-2.5 Millionen US-Dollar',
    controversialQuote: '"Labour ist die Partei der Law and Order" (2023, London)',
    sources: ['Anwaltstätigkeit (Kronanwalt)', 'Parteivorsitz', 'Immobilien'],
    calculation: '1 GBP ≈ 1,25 USD (Durchschnitt 2024, BoE)'
  },

  'Robert Gates': {
    name: 'Robert Gates',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 5,
    subcategories: [],
    nationality: 'US-Amerikanisch',
    birthDate: '25. September 1943',
    highestPosition: 'Verteidigungsminister',
    estimatedWealth: 'ca. 20-50 Millionen US-Dollar',
    controversialQuote: '"Die NATO ist nicht mehr relevant" (2011, Washington)',
    sources: ['Washington Post Investigations (2021)', 'Beratungstätigkeiten', 'Buchverkäufe'],
    calculation: 'CIA-Direktor, Verteidigungsminister, Texas A&M-Präsident, Investment-Portfolio'
  },

  'Karl Rove': {
    name: 'Karl Rove',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 5,
    subcategories: [],
    nationality: 'US-Amerikanisch',
    birthDate: '25. Dezember 1950',
    highestPosition: 'Senior Advisor des Präsidenten',
    estimatedWealth: 'ca. 50-100 Millionen US-Dollar',
    controversialQuote: '"Wir schaffen unsere eigene Realität" (2004, Washington)',
    sources: ['Washington Post Investigations (2021)', 'Wahlkampfberatung', 'Fox News-Kommentator'],
    calculation: 'politische Beratung, Buchverkäufe, Wahlkampfberatung, politische Strategie-Firma'
  },

  'Narendra Modi': {
    name: 'Narendra Modi',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 13,
    subcategories: ['Leadership'],
    nationality: 'Indisch',
    birthDate: '17. September 1950',
    highestPosition: 'Premierminister Indiens',
    estimatedWealth: 'ca. 2-5 Millionen US-Dollar',
    controversialQuote: '"Ich bin ein Hindu-Nationalist" (2014, Varanasi)',
    sources: ['Premierminister-Gehalt (2.5 Lakh INR/Monat)', 'bescheidener Lebensstil'],
    calculation: 'bescheidener Lebensstil, keine direkten Geschäftsinteressen, politische Karriere seit 2001'
  },

  'Luiz Inácio Lula da Silva': {
    name: 'Luiz Inácio Lula da Silva',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 13,
    subcategories: ['Leadership'],
    nationality: 'Brasilianisch',
    birthDate: '27. Oktober 1945',
    highestPosition: 'Präsident Brasiliens',
    estimatedWealth: 'ca. 1-3 Millionen US-Dollar',
    controversialQuote: '"Die Armen müssen mehr essen" (2003, Brasília)',
    sources: ['Präsidentengehalt', 'Buchverkäufe', 'Redenhonorare'],
    calculation: 'bescheidener Lebensstil, trotz Korruptionsvorwürfen relativ bescheidenes Vermögen'
  },

  'Sergey Lavrov': {
    name: 'Sergey Lavrov',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 13,
    subcategories: ['Diplomat'],
    nationality: 'Russisch',
    birthDate: '21. März 1950',
    highestPosition: 'Außenminister Russlands',
    estimatedWealth: 'ca. 5-15 Millionen US-Dollar',
    controversialQuote: '"Russland ist nicht verpflichtet, sich zu entschuldigen" (2014, Moskau)',
    sources: ['Ministergehalt', 'politische Verbindungen', 'Immobilien'],
    calculation: 'diplomatische Karriere seit 1972, ungewiss wegen russischer Geheimhaltung'
  },

  'Wolfgang Schäuble': {
    name: 'Wolfgang Schäuble',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 13,
    subcategories: ['Leadership'],
    nationality: 'Deutsch',
    birthDate: '18. September 1942',
    highestPosition: 'Bundesfinanzminister',
    estimatedWealth: 'ca. 1.1-3.3 Millionen US-Dollar',
    controversialQuote: '"Griechenland muss sparen" (2010, Berlin)',
    sources: ['Ministergehalt', 'Bundestagsabgeordneter seit 1972', 'Anwaltstätigkeit'],
    calculation: 'Immobilien, 1 EUR ≈ 1,10 USD (2024, EZB)'
  },

  'Jens Stoltenberg': {
    name: 'Jens Stoltenberg',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 12,
    subcategories: ['Diplomat'],
    nationality: 'Norwegisch',
    birthDate: '16. März 1959',
    highestPosition: 'NATO-Generalsekretär',
    estimatedWealth: 'ca. 1-2 Millionen US-Dollar',
    controversialQuote: '"NATO ist die stärkste Allianz der Geschichte" (2014, Brüssel)',
    sources: ['NATO-Generalsekretär-Gehalt', 'norwegischer Premierminister-Pension'],
    calculation: 'politische Karriere, bescheidener Lebensstil'
  },

  'Javier Milei': {
    name: 'Javier Milei',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 11,
    subcategories: ['Leadership'],
    nationality: 'Argentinisch',
    birthDate: '22. Oktober 1970',
    highestPosition: 'Präsident Argentiniens',
    estimatedWealth: 'ca. 500.000-1 Million US-Dollar',
    controversialQuote: '"Der Staat ist ein Dieb" (2023, Buenos Aires)',
    sources: ['Präsidentengehalt', 'Ökonom-Beratung', 'Buchverkäufe'],
    calculation: 'bescheidener Lebensstil, begrenzt durch argentinische Wirtschaftskrise'
  },

  'Joschka Fischer': {
    name: 'Joschka Fischer',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 11,
    subcategories: ['Diplomat'],
    nationality: 'Deutsch',
    birthDate: '12. April 1948',
    highestPosition: 'Außenminister',
    estimatedWealth: 'ca. 1.1-3.3 Millionen US-Dollar',
    controversialQuote: '"Deutschland ist nicht mehr das Land der Dichter und Denker" (2005, Berlin)',
    sources: ['Minister-Pension', 'Buchverkäufe', 'Beratungstätigkeiten'],
    calculation: 'politische Karriere, Redenhonorare, 1 EUR ≈ 1,10 USD (2024, EZB)'
  },

  'Kamala Harris': {
    name: 'Kamala Harris',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 11,
    subcategories: ['Leadership'],
    nationality: 'US-Amerikanisch',
    birthDate: '20. Oktober 1964',
    highestPosition: 'Vizepräsidentin der USA',
    estimatedWealth: 'ca. 2-5 Millionen US-Dollar',
    controversialQuote: '"Ich bin die erste, aber nicht die letzte" (2021, Washington)',
    sources: ['Vizepräsidentin-Gehalt (235.000 USD/Jahr)', 'Kalifornien-Senatorin'],
    calculation: 'Staatsanwältin, Immobilien, politische Karriere'
  },

  'Shigeru Ishiba': {
    name: 'Shigeru Ishiba',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 5,
    subcategories: [],
    nationality: 'Japanisch',
    birthDate: '4. Februar 1957',
    highestPosition: 'Verteidigungsminister',
    estimatedWealth: 'ca. 1-2 Millionen US-Dollar',
    controversialQuote: '"Japan muss seine Verteidigung stärken" (2014, Tokio)',
    sources: ['Ministergehalt', 'politische Karriere', 'Immobilien'],
    calculation: 'bescheidener Lebensstil, japanische Politik-Tradition'
  },

  'Heidemarie Wieczorek-Zeul': {
    name: 'Heidemarie Wieczorek-Zeul',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 4,
    subcategories: [],
    nationality: 'Deutsch',
    birthDate: '21. November 1942',
    highestPosition: 'Bundesministerin für wirtschaftliche Zusammenarbeit',
    estimatedWealth: 'ca. 500.000-1 Million Euro',
    controversialQuote: '"Entwicklungshilfe ist keine Almosen" (2005, Berlin)',
    sources: ['Minister-Pension', 'politische Karriere'],
    calculation: 'bescheidener Lebensstil, SPD-Mitgliedschaft, Entwicklungspolitik'
  },

  'Renate Künast': {
    name: 'Renate Künast',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 4,
    subcategories: [],
    nationality: 'Deutsch',
    birthDate: '15. Dezember 1955',
    highestPosition: 'Bundesministerin für Verbraucherschutz',
    estimatedWealth: 'ca. 500.000-1 Million Euro',
    controversialQuote: '"Die Grünen sind die Partei der Zukunft" (2001, Berlin)',
    sources: ['Minister-Pension', 'politische Karriere'],
    calculation: 'Grünen-Mitgliedschaft, Immobilien, bescheidener Lebensstil'
  },

  'Rudolf Scharping': {
    name: 'Rudolf Scharping',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 4,
    subcategories: [],
    nationality: 'Deutsch',
    birthDate: '2. Dezember 1947',
    highestPosition: 'Bundesverteidigungsminister',
    estimatedWealth: 'ca. 500.000-1 Million Euro',
    controversialQuote: '"Deutschland muss Verantwortung übernehmen" (1999, Berlin)',
    sources: ['Minister-Pension', 'politische Karriere'],
    calculation: 'SPD-Mitgliedschaft, Immobilien, bescheidener Lebensstil'
  },

  'John Ashcroft': {
    name: 'John Ashcroft',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 4,
    subcategories: [],
    nationality: 'US-Amerikanisch',
    birthDate: '9. Mai 1942',
    highestPosition: 'Justizminister',
    estimatedWealth: 'ca. 1-2 Millionen US-Dollar',
    controversialQuote: '"Die Verfassung ist kein Selbstmordpakt" (2001, Washington)',
    sources: ['Justizminister', 'Missouri-Gouverneur', 'Anwaltstätigkeit'],
    calculation: 'politische Karriere, Beratungstätigkeiten'
  },

  'Tedros Adhanom Ghebreyesus': {
    name: 'Tedros Adhanom Ghebreyesus',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 4,
    subcategories: [],
    nationality: 'Äthiopisch',
    birthDate: '3. März 1965',
    highestPosition: 'Generaldirektor der WHO',
    estimatedWealth: 'ca. 500.000-1 Million US-Dollar',
    controversialQuote: '"Die WHO ist nicht politisch" (2020, Genf)',
    sources: ['WHO-Generaldirektor-Gehalt', 'äthiopischer Gesundheitsminister'],
    calculation: 'politische Karriere, bescheidener Lebensstil'
  },

  'Tom Ridge': {
    name: 'Tom Ridge',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 4,
    subcategories: [],
    nationality: 'US-Amerikanisch',
    birthDate: '26. August 1945',
    highestPosition: 'Heimatschutzminister',
    estimatedWealth: 'ca. 1-2 Millionen US-Dollar',
    controversialQuote: '"Terrorismus ist die größte Bedrohung" (2003, Washington)',
    sources: ['Heimatschutzminister', 'Pennsylvania-Gouverneur', 'Anwaltstätigkeit'],
    calculation: 'politische Karriere, Beratungstätigkeiten'
  },

  'Henry Paulson': {
    name: 'Henry Paulson',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 5,
    subcategories: [],
    nationality: 'US-Amerikanisch',
    birthDate: '28. März 1946',
    highestPosition: 'Finanzminister',
    estimatedWealth: 'ca. 1-2 Milliarden US-Dollar',
    controversialQuote: '"Die Banken sind zu groß zum Scheitern" (2008, Washington)',
    sources: ['Bloomberg Investigations (2021)', 'Goldman Sachs CEO (1999-2006)'],
    calculation: 'Goldman Sachs-Boni, Finanzkrise-Profite, private Equity'
  },

  'Horst Köhler': {
    name: 'Horst Köhler',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 6,
    subcategories: ['Diplomat'],
    nationality: 'Deutsch',
    birthDate: '22. Februar 1943',
    highestPosition: 'Bundespräsident',
    estimatedWealth: 'ca. 1.1-2.2 Millionen US-Dollar',
    controversialQuote: '"Militäreinsätze sind im deutschen Interesse" (2010, Berlin)',
    sources: ['Bundespräsident-Pension', 'IWF-Direktor', 'Immobilien'],
    calculation: '1 EUR ≈ 1,10 USD (2024, EZB)'
  },

  'Johannes Rau': {
    name: 'Johannes Rau',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 5,
    subcategories: [],
    nationality: 'Deutsch',
    birthDate: '16. Januar 1931',
    highestPosition: 'Bundespräsident',
    estimatedWealth: 'ca. 0.55-1.1 Millionen US-Dollar',
    controversialQuote: '"Deutschland ist ein christliches Land" (2000, Berlin)',
    sources: ['Bundespräsident-Pension', 'NRW-Ministerpräsident'],
    calculation: 'bescheidener Lebensstil, 1 EUR ≈ 1,10 USD (2024, EZB)'
  },

  'John Snow': {
    name: 'John Snow',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 3,
    subcategories: [],
    nationality: 'US-Amerikanisch',
    birthDate: '2. August 1939',
    highestPosition: 'Finanzminister',
    estimatedWealth: 'ca. 200-500 Millionen US-Dollar',
    controversialQuote: '"Die Wirtschaft ist stark" (2006, Washington)',
    sources: ['Wall Street Journal Investigations (2020)', 'CSX CEO'],
    calculation: 'CSX-Aktien, Investment-Banking-Boni, private Equity'
  },

  'Karl Carstens': {
    name: 'Karl Carstens',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 3,
    subcategories: [],
    nationality: 'Deutsch',
    birthDate: '14. Dezember 1914',
    highestPosition: 'Bundespräsident',
    estimatedWealth: 'ca. 0.55-1.1 Millionen US-Dollar',
    controversialQuote: '"Deutschland braucht Führung" (1979, Bonn)',
    sources: ['Bundespräsident-Pension', 'politische Karriere', 'Anwaltstätigkeit'],
    calculation: 'bescheidener Lebensstil, CDU-Mitgliedschaft, 1 EUR ≈ 1,10 USD (2024, EZB)'
  },

  'Hans Eichel': {
    name: 'Hans Eichel',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 3,
    subcategories: [],
    nationality: 'Deutsch',
    birthDate: '24. Dezember 1941',
    highestPosition: 'Bundesfinanzminister',
    estimatedWealth: 'ca. 0.55-1.1 Millionen US-Dollar',
    controversialQuote: '"Sparen ist notwendig" (2003, Berlin)',
    sources: ['Bundesfinanzminister-Pension', 'Hessen-Ministerpräsident'],
    calculation: 'bescheidener Lebensstil, SPD-Mitgliedschaft, 1 EUR ≈ 1,10 USD (2024, EZB)'
  },

  'Walter Scheel': {
    name: 'Walter Scheel',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 4,
    subcategories: ['Diplomat'],
    nationality: 'Deutsch',
    birthDate: '8. Juli 1919',
    highestPosition: 'Bundespräsident',
    estimatedWealth: 'ca. 0.55-1.1 Millionen US-Dollar',
    controversialQuote: '"Die Ostpolitik ist notwendig" (1970, Bonn)',
    sources: ['Bundespräsident-Pension', 'Außenminister', 'politische Karriere'],
    calculation: 'bescheidener Lebensstil, FDP-Mitgliedschaft, 1 EUR ≈ 1,10 USD (2024, EZB)'
  },

  'Werner Maihofer': {
    name: 'Werner Maihofer',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 2,
    subcategories: [],
    nationality: 'Deutsch',
    birthDate: '20. Oktober 1918',
    highestPosition: 'Bundesinnenminister',
    estimatedWealth: 'ca. 0.55-1.1 Millionen US-Dollar',
    controversialQuote: '"Der Rechtsstaat muss wehrhaft sein" (1974, Bonn)',
    sources: ['Bundesinnenminister-Pension', 'Universitätsprofessor'],
    calculation: 'bescheidener Lebensstil, FDP-Mitgliedschaft, 1 EUR ≈ 1,10 USD (2024, EZB)'
  },

  'Andrzej Duda': {
    name: 'Andrzej Duda',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 13,
    subcategories: ['Leadership'],
    nationality: 'Polnisch',
    birthDate: '16. Mai 1972',
    highestPosition: 'Präsident Polens',
    estimatedWealth: 'ca. 1-2 Millionen US-Dollar',
    controversialQuote: '"Polen ist das Herz Europas" (2015, Warschau)',
    sources: ['Präsidentengehalt', 'Anwaltstätigkeit', 'politische Karriere'],
    calculation: 'Immobilien, bescheidener Lebensstil, PiS-Mitgliedschaft'
  },

  'Anthony Albanese': {
    name: 'Anthony Albanese',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 13,
    subcategories: ['Leadership'],
    nationality: 'Australisch',
    birthDate: '2. März 1963',
    highestPosition: 'Premierminister Australiens',
    estimatedWealth: 'ca. 1-2 Millionen US-Dollar',
    controversialQuote: '"Australien steht an der Seite der Ukraine" (2022, Canberra)',
    sources: ['Premierminister-Gehalt', 'politische Karriere', 'Immobilien'],
    calculation: 'bescheidener Lebensstil, Labor Party-Mitgliedschaft'
  },

  'Dick Cheney': {
    name: 'Dick Cheney',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 13,
    subcategories: ['Leadership'],
    nationality: 'US-Amerikanisch',
    birthDate: '30. Januar 1941',
    highestPosition: 'Vizepräsident der USA',
    estimatedWealth: 'ca. 200-500 Millionen US-Dollar',
    controversialQuote: '"Wir werden im Dunkeln operieren" (2001, Washington)',
    sources: ['Washington Post Investigations (2019)', 'Halliburton CEO'],
    calculation: 'Halliburton-Kontrakte, Irak-Krieg-Profite, private Equity'
  },

  'Ebrahim Raisi': {
    name: 'Ebrahim Raisi',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 15,
    subcategories: ['Leadership'],
    nationality: 'Iranisch',
    birthDate: '14. Dezember 1960',
    highestPosition: 'Präsident des Iran',
    estimatedWealth: 'ca. 1-5 Millionen US-Dollar',
    controversialQuote: '"Der Westen ist der Feind" (2021, Teheran)',
    sources: ['Präsidentengehalt', 'religiöse Positionen', 'politische Karriere'],
    calculation: 'Sanktionen, bescheidener Lebensstil, ungewiss wegen iranischer Geheimhaltung'
  },

  'Emmanuel Macron': {
    name: 'Emmanuel Macron',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 15,
    subcategories: ['Leadership'],
    nationality: 'Französisch',
    birthDate: '21. Dezember 1977',
    highestPosition: 'Präsident Frankreichs',
    estimatedWealth: 'ca. 1.1-2.2 Millionen US-Dollar',
    controversialQuote: '"Frankreich ist zurück" (2017, Paris)',
    sources: ['Präsidentengehalt', 'frühere Tätigkeit bei Rothschild', 'Immobilien'],
    calculation: '1 EUR ≈ 1,10 USD (2024, EZB)'
  },

  'Giorgia Meloni': {
    name: 'Giorgia Meloni',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 15,
    subcategories: ['Leadership'],
    nationality: 'Italienisch',
    birthDate: '15. Januar 1977',
    highestPosition: 'Ministerpräsidentin Italiens',
    estimatedWealth: 'ca. 1.1-2.2 Millionen US-Dollar',
    controversialQuote: '"Italien zuerst" (2022, Rom)',
    sources: ['Ministerpräsidentin-Gehalt', 'journalistische Tätigkeiten', 'Immobilien'],
    calculation: '1 EUR ≈ 1,10 USD (2024, EZB)'
  },

  'King Charles III': {
    name: 'King Charles III',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 12,
    subcategories: ['Leadership'],
    nationality: 'Britisch',
    birthDate: '14. November 1948',
    highestPosition: 'König des Vereinigten Königreichs',
    estimatedWealth: 'ca. 1-2 Milliarden US-Dollar',
    controversialQuote: '"Ich bin kein Politiker" (2022, London)',
    sources: ['The Guardian Investigations (2022)', 'Paradise Papers'],
    calculation: 'Duchy of Cornwall, Crown Estate, persönliches Vermögen, Kunstsammlung'
  },

  'Alberto Gonzales': {
    name: 'Alberto Gonzales',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 4,
    subcategories: [],
    nationality: 'US-Amerikanisch',
    birthDate: '4. August 1955',
    highestPosition: 'Justizminister',
    estimatedWealth: 'ca. 1-2 Millionen US-Dollar',
    controversialQuote: '"Die Genfer Konvention ist veraltet" (2002, Washington)',
    sources: ['Justizminister', 'Anwaltstätigkeit', 'politische Karriere'],
    calculation: 'Beratungstätigkeiten, Immobilien'
  },

  'Annette Schavan': {
    name: 'Annette Schavan',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 4,
    subcategories: [],
    nationality: 'Deutsch',
    birthDate: '10. Juni 1955',
    highestPosition: 'Bundesministerin für Bildung und Forschung',
    estimatedWealth: 'ca. 0.55-1.1 Millionen US-Dollar',
    controversialQuote: '"Plagiat ist kein Verbrechen" (2013, Berlin)',
    sources: ['Minister-Pension', 'politische Karriere'],
    calculation: 'bescheidener Lebensstil, CDU-Mitgliedschaft, Plagiat-Skandal, 1 EUR ≈ 1,10 USD (2024, EZB)'
  },

  'Edelgard Bulmahn': {
    name: 'Edelgard Bulmahn',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 3,
    subcategories: [],
    nationality: 'Deutsch',
    birthDate: '4. März 1951',
    highestPosition: 'Bundesministerin für Bildung und Forschung',
    estimatedWealth: 'ca. 0.55-1.1 Millionen US-Dollar',
    controversialQuote: '"Bildung ist der Schlüssel zur Zukunft" (2002, Berlin)',
    sources: ['Minister-Pension', 'politische Karriere'],
    calculation: 'bescheidener Lebensstil, SPD-Mitgliedschaft, 1 EUR ≈ 1,10 USD (2024, EZB)'
  },

  'Erhard Eppler': {
    name: 'Erhard Eppler',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 5,
    subcategories: [],
    nationality: 'Deutsch',
    birthDate: '9. Dezember 1926',
    highestPosition: 'Bundesminister für wirtschaftliche Zusammenarbeit',
    estimatedWealth: 'ca. 0.55-1.1 Millionen US-Dollar',
    controversialQuote: '"Entwicklungshilfe ist Friedenspolitik" (1974, Bonn)',
    sources: ['Minister-Pension', 'politische Karriere'],
    calculation: 'bescheidener Lebensstil, SPD-Mitgliedschaft, Entwicklungspolitik, 1 EUR ≈ 1,10 USD (2024, EZB)'
  },

  'Franz Josef Jung': {
    name: 'Franz Josef Jung',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 4,
    subcategories: [],
    nationality: 'Deutsch',
    birthDate: '5. März 1949',
    highestPosition: 'Bundesverteidigungsminister',
    estimatedWealth: 'ca. 0.55-1.1 Millionen US-Dollar',
    controversialQuote: '"Der Afghanistan-Einsatz ist erfolgreich" (2009, Berlin)',
    sources: ['Minister-Pension', 'politische Karriere'],
    calculation: 'bescheidener Lebensstil, CDU-Mitgliedschaft, 1 EUR ≈ 1,10 USD (2024, EZB)'
  },

  'Friedrich Merz': {
    name: 'Friedrich Merz',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 5,
    subcategories: [],
    nationality: 'Deutsch',
    birthDate: '11. November 1955',
    highestPosition: 'Vorsitzender der CDU/CSU-Bundestagsfraktion',
    estimatedWealth: 'ca. 55-110 Millionen US-Dollar',
    controversialQuote: '"Deutschland ist ein Einwanderungsland" (2000, Berlin)',
    sources: ['Manager-Magazin (2021)', 'Handelsblatt-Recherchen', 'BlackRock Deutschland-Chef'],
    calculation: 'BlackRock-Gehälter, private Equity-Beteiligungen, 1 EUR ≈ 1,10 USD (2024, EZB)'
  },

  'Georg Leber': {
    name: 'Georg Leber',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 4,
    subcategories: [],
    nationality: 'Deutsch',
    birthDate: '7. Oktober 1920',
    highestPosition: 'Bundesverteidigungsminister',
    estimatedWealth: 'ca. 0.55-1.1 Millionen US-Dollar',
    controversialQuote: '"Die Bundeswehr ist eine Armee der Demokratie" (1972, Bonn)',
    sources: ['Minister-Pension', 'politische Karriere'],
    calculation: 'bescheidener Lebensstil, SPD-Mitgliedschaft, 1 EUR ≈ 1,10 USD (2024, EZB)'
  },

  'Gerhart Baum': {
    name: 'Gerhart Baum',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 3,
    subcategories: [],
    nationality: 'Deutsch',
    birthDate: '28. Oktober 1932',
    highestPosition: 'Bundesinnenminister',
    estimatedWealth: 'ca. 0.55-1.1 Millionen US-Dollar',
    controversialQuote: '"Bürgerrechte sind unveräußerlich" (1978, Bonn)',
    sources: ['Minister-Pension', 'Anwaltstätigkeit', 'politische Karriere'],
    calculation: 'bescheidener Lebensstil, FDP-Mitgliedschaft, 1 EUR ≈ 1,10 USD (2024, EZB)'
  },

  'Hans Apel': {
    name: 'Hans Apel',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 4,
    subcategories: [],
    nationality: 'Deutsch',
    birthDate: '25. Februar 1932',
    highestPosition: 'Bundesverteidigungsminister',
    estimatedWealth: 'ca. 0.55-1.1 Millionen US-Dollar',
    controversialQuote: '"Die NATO ist unverzichtbar" (1978, Bonn)',
    sources: ['Minister-Pension', 'politische Karriere'],
    calculation: 'bescheidener Lebensstil, SPD-Mitgliedschaft, 1 EUR ≈ 1,10 USD (2024, EZB)'
  },

  'Hans Dietrich Genscher': {
    name: 'Hans Dietrich Genscher',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 13,
    subcategories: ['Diplomat'],
    nationality: 'Deutsch',
    birthDate: '21. März 1927',
    highestPosition: 'Außenminister',
    estimatedWealth: 'ca. 1.1-2.2 Millionen US-Dollar',
    controversialQuote: '"Die deutsche Einheit ist vollendet" (1990, Berlin)',
    sources: ['Minister-Pension', 'politische Karriere', 'Buchverkäufe'],
    calculation: 'bescheidener Lebensstil, FDP-Mitgliedschaft, 1 EUR ≈ 1,10 USD (2024, EZB)'
  },

  'Otto Schily': {
    name: 'Otto Schily',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 5,
    subcategories: [],
    nationality: 'Deutsch',
    birthDate: '20. Juli 1932',
    highestPosition: 'Bundesinnenminister',
    estimatedWealth: 'ca. 1.1-2.2 Millionen US-Dollar',
    controversialQuote: '"Sicherheit geht vor Freiheit" (2001, Berlin)',
    sources: ['Minister-Pension', 'Anwaltstätigkeit', 'politische Karriere'],
    calculation: 'Immobilien, SPD-Mitgliedschaft, 1 EUR ≈ 1,10 USD (2024, EZB)'
  },

  'Peter Struck': {
    name: 'Peter Struck',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 4,
    subcategories: [],
    nationality: 'Deutsch',
    birthDate: '24. Januar 1943',
    highestPosition: 'Bundesverteidigungsminister',
    estimatedWealth: 'ca. 0.55-1.1 Millionen US-Dollar',
    controversialQuote: '"Deutschland wird am Hindukusch verteidigt" (2002, Berlin)',
    sources: ['Minister-Pension', 'politische Karriere'],
    calculation: 'bescheidener Lebensstil, SPD-Mitgliedschaft, 1 EUR ≈ 1,10 USD (2024, EZB)'
  },

  'Rainer Offergeld': {
    name: 'Rainer Offergeld',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 3,
    subcategories: [],
    nationality: 'Deutsch',
    birthDate: '20. Januar 1937',
    highestPosition: 'Bundesminister für wirtschaftliche Zusammenarbeit',
    estimatedWealth: 'ca. 0.55-1.1 Millionen US-Dollar',
    controversialQuote: '"Entwicklungshilfe ist Investition in die Zukunft" (1982, Bonn)',
    sources: ['Minister-Pension', 'politische Karriere'],
    calculation: 'bescheidener Lebensstil, SPD-Mitgliedschaft, Entwicklungspolitik, 1 EUR ≈ 1,10 USD (2024, EZB)'
  },

  'Colin Powell': {
    name: 'Colin Powell',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 12,
    subcategories: ['Diplomat'],
    nationality: 'US-Amerikanisch',
    birthDate: '5. April 1937',
    highestPosition: 'Außenminister und General',
    estimatedWealth: 'ca. 50-150 Millionen US-Dollar',
    controversialQuote: '"Irak hat Massenvernichtungswaffen" (2003, New York)',
    sources: ['Washington Post Investigations (2021)', 'General-Pension', 'Außenminister'],
    calculation: 'Buchverkäufe, Redenhonorare, Beratungstätigkeiten'
  },

  'Condoleezza Rice': {
    name: 'Condoleezza Rice',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 12,
    subcategories: ['Diplomat'],
    nationality: 'US-Amerikanisch',
    birthDate: '14. November 1954',
    highestPosition: 'Außenministerin',
    estimatedWealth: 'ca. 50-100 Millionen US-Dollar',
    controversialQuote: '"Wir wissen nicht, wo die Waffen sind" (2003, Washington)',
    sources: ['Bloomberg Investigations (2021)', 'Außenministerin', 'Stanford-Professorin'],
    calculation: 'Buchverkäufe, Redenhonorare (100.000+ USD), Beratungstätigkeiten'
  },

  'Donald Rumsfeld': {
    name: 'Donald Rumsfeld',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 12,
    subcategories: ['Leadership'],
    nationality: 'US-Amerikanisch',
    birthDate: '9. Juli 1932',
    highestPosition: 'Verteidigungsminister',
    estimatedWealth: 'ca. 200-500 Millionen US-Dollar',
    controversialQuote: '"Es gibt bekannte Unbekannte" (2002, Washington)',
    sources: ['Washington Post Investigations (2020)', 'Verteidigungsminister', 'G.D. Searle CEO'],
    calculation: 'Irak-Krieg-Profite, private Equity, Beratungshonorare'
  },

  'Christine Lagarde': {
    name: 'Christine Lagarde',
    category: 'Regierung',
    gameEffect: 'Nur Einfluss - keine weiteren Effekte',
    deckCost: 13,
    subcategories: ['Diplomat'],
    nationality: 'Französisch',
    birthDate: '1. Januar 1956',
    highestPosition: 'Präsidentin der EZB',
    estimatedWealth: 'ca. 22-55 Millionen US-Dollar',
    controversialQuote: '"Die EZB ist nicht politisch" (2019, Frankfurt)',
    sources: ['Le Monde-Recherchen (2019)', 'Panama Papers', 'Baker McKenzie-Partnerin'],
    calculation: 'IWF-Gehälter, internationale Beratungstätigkeiten, 1 EUR ≈ 1,10 USD (2024, EZB)'
  }
};

// Public Cards (Öffentlichkeit) - from Karten_Oeffentlichkeit.md
export const PUBLIC_CARD_DETAILS: Record<string, DetailedCardInfo> = {
  'Elon Musk': {
    name: 'Elon Musk',
    category: 'Öffentlichkeit',
    gameEffect: 'Draw 1 card. Once per turn, after you activate an initiative, gain +1 AP.',
    deckCost: 8,
    subcategories: ['Oligarch', 'Plattform', 'Tech'],
    nationality: 'US-Amerikanisch',
    birthDate: '28. Juni 1971',
    highestPosition: 'CEO von Tesla und SpaceX',
    estimatedWealth: 'ca. 200-300 Milliarden US-Dollar',
    controversialQuote: '"Funding secured" (7. August 2018, Twitter)',
    sources: ['Forbes Real-Time Billionaires (2024)', 'SEC Form 4/13G', 'Bloomberg Billionaires Index'],
    calculation: 'Tesla-Aktien (48% Anteil), SpaceX-Bewertung (150 Mrd USD), Twitter/X-Anteil. Schwankt stark mit Tesla-Kurs'
  },

  'Bill Gates': {
    name: 'Bill Gates',
    category: 'Öffentlichkeit',
    gameEffect: 'Draw 1 card. Your next initiative this turn gives +1 AP.',
    deckCost: 7,
    subcategories: ['Oligarch', 'Tech', 'Aktivist'],
    nationality: 'US-Amerikanisch',
    birthDate: '28. Oktober 1955',
    highestPosition: 'CEO von Microsoft',
    estimatedWealth: 'ca. 100-150 Milliarden US-Dollar',
    controversialQuote: '"Die Armen müssen mehr Kinder bekommen" (2018, Seattle)',
    sources: ['Forbes (2024)', 'SEC 13D/13G', 'Gates Foundation IRS-Form 990-PF'],
    calculation: 'Microsoft-Aktien (1,3% Anteil), Cascade Investment Portfolio, Philanthropie-Abgaben (50+ Mrd USD gespendet seit 1994)'
  },

  'Mark Zuckerberg': {
    name: 'Mark Zuckerberg',
    category: 'Öffentlichkeit',
    gameEffect: 'Once per turn, after you activate an initiative, gain +1 AP.',
    deckCost: 5,
    subcategories: ['Oligarch', 'Tech'],
    nationality: 'US-Amerikanisch',
    birthDate: '14. Mai 1984',
    highestPosition: 'CEO von Meta (Facebook)',
    estimatedWealth: 'ca. 80-120 Milliarden US-Dollar',
    controversialQuote: '"Privacy is no longer a social norm" (2010, San Francisco)',
    sources: ['Forbes (2024)', 'SEC Form 4', 'Bloomberg'],
    calculation: 'Meta-Aktien (13,5% Anteil), Immobilien-Portfolio, Philanthropie (Chan Zuckerberg Initiative). Schwankt mit Meta-Kurs'
  },

  'Greta Thunberg': {
    name: 'Greta Thunberg',
    category: 'Öffentlichkeit',
    gameEffect: 'The first time you play a Government card each turn, gain +1 AP.',
    deckCost: 4,
    subcategories: ['Aktivist'],
    nationality: 'Schwedisch',
    birthDate: '3. Januar 2003',
    highestPosition: 'Klimaaktivistin',
    estimatedWealth: 'ca. 1-2 Millionen US-Dollar',
    controversialQuote: '"Wie könnt ihr es wagen!" (2019, New York)',
    sources: ['The Guardian', 'NYT', 'Verlagsangaben'],
    calculation: 'Buchverkäufe ("No One Is Too Small"), Dokumentarfilm-Rechte, Spenden an Fridays for Future'
  },

  'George Soros': {
    name: 'George Soros',
    category: 'Öffentlichkeit',
    gameEffect: '+1 AP when the opponent has an Regierungskarte.',
    deckCost: 7,
    subcategories: ['Oligarch', 'Tech', 'Aktivist'],
    nationality: 'US-Amerikanisch (geboren in Ungarn)',
    birthDate: '12. August 1930',
    highestPosition: 'Hedgefonds-Manager und Philanthrop',
    estimatedWealth: 'ca. 8-10 Milliarden US-Dollar',
    controversialQuote: '"Ich bin ein Nazi-Kollaborateur gewesen" (1998, New York)',
    sources: ['Forbes (2024)', 'Open Society Foundations Finanzberichte', 'Bloomberg'],
    calculation: 'Quantum Fund, Soros Fund Management, Philanthropie-Abgaben (32+ Mrd USD gespendet). Netto nach Spenden'
  },

  'Sam Altman': {
    name: 'Sam Altman',
    category: 'Öffentlichkeit',
    gameEffect: 'When you play an AI-related initiative: draw 1 card and gain +1 AP.',
    deckCost: 6,
    subcategories: ['Tech'],
    nationality: 'US-Amerikanisch',
    birthDate: '22. April 1985',
    highestPosition: 'CEO von OpenAI',
    estimatedWealth: 'ca. 500 Millionen - 1 Milliarde US-Dollar (inkl. OpenAI-Beteiligung)',
    controversialQuote: '"KI könnte die Menschheit auslöschen" (2023, San Francisco)',
    sources: ['The Information', 'Financial Times', 'Bloomberg', 'PitchBook-Schätzungen'],
    calculation: 'OpenAI-Bewertung (80 Mrd USD), Altman\'s Anteil (ca. 2-3%), Y Combinator-Exit, Loopt-Verkauf. Ungewiss wegen privater Bewertungen'
  },

  'Jack Ma': {
    name: 'Jack Ma',
    category: 'Öffentlichkeit',
    gameEffect: 'Beim Ausspielen: Ziehe 1 Karte. Nach einer Initiative: Optional -1 HP auf gegnerische Regierungs-Plattform.',
    deckCost: 7,
    subcategories: ['Oligarch', 'Tech'],
    nationality: 'Chinesisch',
    birthDate: '10. September 1964',
    highestPosition: 'Gründer von Alibaba',
    estimatedWealth: 'ca. 30-50 Milliarden US-Dollar',
    controversialQuote: '"996 ist ein Segen" (2019, Hangzhou)',
    sources: ['Forbes (2024)', 'Caixin', 'Financial Times'],
    calculation: 'Alibaba-Aktien (4,8% Anteil), Ant Group-Beteiligung, Immobilien, Investment-Portfolio. Schwankt mit Alibaba-Kurs und politischen Risiken'
  },

  'Jennifer Doudna': {
    name: 'Jennifer Doudna',
    category: 'Öffentlichkeit',
    gameEffect: 'Deine Initiativen erhalten +1 Einfluss.',
    deckCost: 4,
    subcategories: ['Tech'],
    nationality: 'US-Amerikanisch',
    birthDate: '19. Februar 1964',
    highestPosition: 'Biochemikerin, Nobelpreisträgerin',
    estimatedWealth: 'ca. 10-20 Millionen US-Dollar',
    controversialQuote: '"CRISPR könnte die Menschheit verändern" (2015, Berkeley)',
    sources: ['USPTO-Patente', 'Nature/Science-Profile'],
    calculation: 'Nobelpreis-Geld (1,1 Mio USD), CRISPR-Patente, UC Berkeley-Gehalt, Biotech-Beratung, Buchverkäufe ("A Crack in Creation")'
  },

  'Oprah Winfrey': {
    name: 'Oprah Winfrey',
    category: 'Öffentlichkeit',
    gameEffect: 'Beim Ausspielen: Beide Spieler verlieren eine zufällige Handkarte.',
    deckCost: 5,
    subcategories: ['Medien'],
    nationality: 'US-Amerikanisch',
    birthDate: '29. Januar 1954',
    highestPosition: 'Talkshow-Moderatorin und Medienunternehmerin',
    estimatedWealth: 'ca. 2,5-3 Milliarden US-Dollar',
    controversialQuote: '"Jeder sollte seine eigene Wahrheit finden" (2004, Chicago)',
    sources: ['Forbes (2024)', 'Variety', 'The Hollywood Reporter'],
    calculation: 'OWN Network, Harpo Productions, Immobilien, Investment-Portfolio. Hauptquelle: 25 Jahre "Oprah Winfrey Show" + Medienimperium'
  },

  'Tim Cook': {
    name: 'Tim Cook',
    category: 'Öffentlichkeit',
    gameEffect: 'Deine dauerhaften Initiativen kosten 1 HP weniger (nur beim Deckbau).',
    deckCost: 5,
    subcategories: ['Tech'],
    nationality: 'US-Amerikanisch',
    birthDate: '1. November 1960',
    highestPosition: 'CEO von Apple',
    estimatedWealth: 'ca. 1-2 Milliarden US-Dollar',
    controversialQuote: '"Privatsphäre ist ein Menschenrecht" (2016, Cupertino)',
    sources: ['Forbes (2024)', 'SEC Form 4', 'Apple 10-K'],
    calculation: 'Apple-Aktien (0,02% Anteil), CEO-Gehalt + Boni, RSU-Vesting, Philanthropie. Hauptquelle: Apple-Aktien und CEO-Kompensation'
  },

  'Warren Buffett': {
    name: 'Warren Buffett',
    category: 'Öffentlichkeit',
    gameEffect: 'Ziehe 1 Karte. Bei einer Initiative: +1 Effekt.',
    deckCost: 7,
    subcategories: ['Oligarch', 'Denker'],
    nationality: 'US-Amerikanisch',
    birthDate: '30. August 1930',
    highestPosition: 'CEO von Berkshire Hathaway',
    estimatedWealth: 'ca. 100-150 Milliarden US-Dollar',
    controversialQuote: '"Reiche sollten mehr Steuern zahlen" (2011, Omaha)',
    sources: ['Forbes (2024)', 'SEC 13F', 'Berkshire Annual Letter'],
    calculation: 'Berkshire Hathaway-Aktien (16,2% Anteil), Investment-Portfolio, Philanthropie-Abgaben (50+ Mrd USD gespendet)'
  },

  'Malala Yousafzai': {
    name: 'Malala Yousafzai',
    category: 'Öffentlichkeit',
    gameEffect: 'Wenn du eine NGO/Think-Tank spielst, ziehe 1 Karte.',
    deckCost: 4,
    subcategories: ['Aktivist'],
    nationality: 'Pakistanisch',
    birthDate: '12. Juli 1997',
    highestPosition: 'Bildungsaktivistin, Nobelpreisträgerin',
    estimatedWealth: 'ca. 1-3 Millionen US-Dollar',
    controversialQuote: '"Ein Kind, ein Lehrer, ein Buch, ein Stift können die Welt verändern" (2013, New York)',
    sources: ['Charity Filings (UK/US)', 'Verlagsangaben'],
    calculation: 'Nobelpreis-Geld (1,1 Mio USD), Malala Fund-Spenden, Buchverkäufe ("I Am Malala"), Redenhonorare, Oxford-Stipendium'
  },

  'Noam Chomsky': {
    name: 'Noam Chomsky',
    category: 'Öffentlichkeit',
    gameEffect: 'Gegner erhalten -1 Einfluss bei Initiativen.',
    deckCost: 5,
    subcategories: ['Denker'],
    nationality: 'US-Amerikanisch',
    birthDate: '7. Dezember 1928',
    highestPosition: 'Linguist und politischer Aktivist',
    estimatedWealth: 'ca. 5-10 Millionen US-Dollar',
    controversialQuote: '"Die USA sind der größte Terrorstaat der Welt" (2001, Cambridge)',
    sources: ['MIT-Gehalt', 'Buchverkäufe (100+ Bücher)', 'Redenhonorare'],
    calculation: 'bescheidener Lebensstil'
  },

  'Roman Abramovich': {
    name: 'Roman Abramovich',
    category: 'Öffentlichkeit',
    gameEffect: 'Ziehe 1 Karte, wenn eine Regierungskarte mit Einfluss 5 oder weniger ausgespielt wird.',
    deckCost: 6,
    subcategories: ['Oligarch'],
    nationality: 'Russisch/Israelisch',
    birthDate: '24. Oktober 1966',
    highestPosition: 'Unternehmer und Fußballclub-Besitzer',
    estimatedWealth: 'ca. 10-15 Milliarden US-Dollar',
    controversialQuote: '"Geld ist nicht das Wichtigste" (2003, London)',
    sources: ['UK/EU-Sanktionslisten', 'Companies House', 'High Court Filings (2022)'],
    calculation: 'Evraz-Stahl, Chelsea FC-Verkauf (2,5 Mrd USD), Immobilien, Yachten, Kunstsammlung. Reduziert durch Sanktionen'
  },

  'Mukesh Ambani': {
    name: 'Mukesh Ambani',
    category: 'Öffentlichkeit',
    gameEffect: 'Ziehe 1 Karte. Gegner darf 1 Karte weniger nachziehen in der Runde.',
    deckCost: 6,
    subcategories: ['Oligarch'],
    nationality: 'Indisch',
    birthDate: '19. April 1957',
    highestPosition: 'CEO von Reliance Industries',
    estimatedWealth: 'ca. 80-100 Milliarden US-Dollar',
    controversialQuote: '"Indien wird die digitale Supermacht" (2020, Mumbai)',
    sources: ['Reliance Annual Report', 'SEBI-Filings', 'Bloomberg'],
    calculation: 'Reliance Industries-Aktien (50,5% Anteil), Jio Telecom, Reliance Retail, Immobilien, Antilia-Residenz (1 Mrd USD)'
  },

  'Jeff Bezos': {
    name: 'Jeff Bezos',
    category: 'Öffentlichkeit',
    gameEffect: 'Draw 1 card when played. When you have a platform: +1 AP.',
    deckCost: 6,
    subcategories: ['Oligarch'],
    nationality: 'US-Amerikanisch',
    birthDate: '12. Januar 1964',
    highestPosition: 'Gründer und CEO von Amazon',
    estimatedWealth: 'ca. 150-200 Milliarden US-Dollar',
    controversialQuote: '"Amazon zahlt faire Löhne" (2018, Seattle)',
    sources: ['SEC Form 4/10-K', 'Bloomberg Billionaires Index'],
    calculation: 'Amazon-Aktien (9,6% Anteil), Blue Origin, Washington Post, Immobilien, Scheidung (25% an MacKenzie Scott)'
  },

  'Alisher Usmanov': {
    name: 'Alisher Usmanov',
    category: 'Öffentlichkeit',
    gameEffect: '+1 Schutz für eine Regierungskarte.',
    deckCost: 6,
    subcategories: ['Oligarch'],
    nationality: 'Russisch',
    birthDate: '9. September 1953',
    highestPosition: 'Unternehmer und Investor',
    estimatedWealth: 'ca. 15-20 Milliarden US-Dollar',
    controversialQuote: '"Russland ist ein demokratisches Land" (2012, Moskau)',
    sources: ['EU/UK-Sanktionslisten', 'Bloomberg', 'Financial Times'],
    calculation: 'Metalloinvest, USM Holdings, Arsenal FC-Anteil, Immobilien, Kunstsammlung. Reduziert durch Sanktionen'
  },

  'Zhang Yiming': {
    name: 'Zhang Yiming',
    category: 'Öffentlichkeit',
    gameEffect: 'Draw 1 card. Your next initiative this turn gives +1 AP.',
    deckCost: 6,
    subcategories: ['Oligarch'],
    nationality: 'Chinesisch',
    birthDate: '1. April 1983',
    highestPosition: 'Gründer von ByteDance (TikTok)',
    estimatedWealth: 'ca. 40-60 Milliarden US-Dollar',
    controversialQuote: '"TikTok ist unabhängig von China" (2020, Peking)',
    sources: ['Bloomberg', 'The Information', 'South China Morning Post'],
    calculation: 'ByteDance-Bewertung (300 Mrd USD), TikTok-Anteil (ca. 20%), Douyin, andere Apps'
  },

  'Edward Snowden': {
    name: 'Edward Snowden',
    category: 'Öffentlichkeit',
    gameEffect: 'Gegner verliert 1 Karte (zufällig). Bei US-Regierungskarte: -1 Einfluss dort.',
    deckCost: 5,
    subcategories: ['Aktivist'],
    nationality: 'US-Amerikanisch',
    birthDate: '21. Juni 1983',
    highestPosition: 'Whistleblower und ehemaliger NSA-Mitarbeiter',
    estimatedWealth: 'ca. 1-2 Millionen US-Dollar',
    controversialQuote: '"Die NSA überwacht jeden" (2013, Hongkong)',
    sources: ['The Guardian', 'NYT', 'Verlagsangaben'],
    calculation: 'Buchverkäufe ("Permanent Record"), Dokumentarfilm-Rechte, Redenhonorare, Crowdfunding, russisches Asyl'
  },

  'Julian Assange': {
    name: 'Julian Assange',
    category: 'Öffentlichkeit',
    gameEffect: 'Beim Ausspielen: +1 Karte, aber auch Gegner zieht 1. Bei NGO auf dem Feld: Ziehe 2 statt 1.',
    deckCost: 5,
    subcategories: ['Aktivist'],
    nationality: 'Australisch',
    birthDate: '3. Juli 1971',
    highestPosition: 'Gründer von WikiLeaks',
    estimatedWealth: 'ca. 1-5 Millionen US-Dollar',
    controversialQuote: '"Die Wahrheit wird frei sein" (2010, London)',
    sources: ['The Guardian Investigations', 'Court Filings', 'Spendenreports'],
    calculation: 'WikiLeaks-Spenden, Buchverkäufe, Dokumentarfilm-Rechte, Crowdfunding, Rechtskosten'
  },

  'Yuval Noah Harari': {
    name: 'Yuval Noah Harari',
    category: 'Öffentlichkeit',
    gameEffect: 'Your next ongoing initiative gives +1 AP. +1 AP if a platform is also present.',
    deckCost: 5,
    subcategories: ['Denker', 'Wissenschaft'],
    nationality: 'Israelisch',
    birthDate: '24. Februar 1976',
    highestPosition: 'Historiker und Autor',
    estimatedWealth: 'ca. 5-10 Millionen US-Dollar',
    controversialQuote: '"Die Menschen werden überflüssig" (2018, Davos)',
    sources: ['Verlagsangaben', 'Speaker Bureau Ratecards'],
    calculation: 'Buchverkäufe ("Sapiens", "Homo Deus", "21 Lessons"), Redenhonorare (50.000+ USD pro Vortrag), Hebrew University-Gehalt'
  },

  'Ai Weiwei': {
    name: 'Ai Weiwei',
    category: 'Öffentlichkeit',
    gameEffect: 'When you activate an initiative: draw 1 card and gain +1 AP.',
    deckCost: 5,
    subcategories: ['Aktivist', 'Medien', 'Denker'],
    nationality: 'Chinesisch',
    birthDate: '28. August 1957',
    highestPosition: 'Künstler und Aktivist',
    estimatedWealth: 'ca. 10-20 Millionen US-Dollar',
    controversialQuote: '"Kunst ist ein politischer Akt" (2011, Peking)',
    sources: ['Sotheby\'s/Christie\'s Auktionsdaten', 'Artnet'],
    calculation: 'Kunstverkäufe, Ausstellungen, Dokumentarfilme, Buchverkäufe, internationale Galerien'
  },

  'Alexei Navalny': {
    name: 'Alexei Navalny',
    category: 'Öffentlichkeit',
    gameEffect: 'Bei Auslösen einer gegnerischen Intervention: ziehe 1 Karte.',
    deckCost: 5,
    subcategories: ['Aktivist', 'Denker'],
    nationality: 'Russisch',
    birthDate: '4. Juni 1976',
    highestPosition: 'Oppositioneller und Aktivist',
    estimatedWealth: 'ca. 1-5 Millionen US-Dollar',
    controversialQuote: '"Putin ist ein Dieb" (2017, Moskau)',
    sources: ['ACF-Finanzberichte', 'Bellingcat'],
    calculation: 'Anti-Corruption Foundation-Spenden, YouTube-Kanal, Buchverkäufe, internationale Unterstützung'
  },

  'Anthony Fauci': {
    name: 'Anthony Fauci',
    category: 'Öffentlichkeit',
    gameEffect: 'Bei einer Initiative: +1 Einfluss.',
    deckCost: 5,
    subcategories: ['NGO/Think-Tank', 'Wissenschaft'],
    nationality: 'US-Amerikanisch',
    birthDate: '24. Dezember 1940',
    highestPosition: 'Direktor des NIAID',
    estimatedWealth: 'ca. 10-20 Millionen US-Dollar',
    controversialQuote: '"Ich bin die Wissenschaft" (2020, Washington)',
    sources: ['US Office of Government Ethics Disclosures', 'OpenTheBooks', 'NIH-Payroll'],
    calculation: 'NIAID-Gehalt (400.000+ USD/Jahr), Buchverkäufe, Redenhonorare, Beratungstätigkeiten, 50+ Jahre Regierungsdienst'
  },

  'Gautam Adani': {
    name: 'Gautam Adani',
    category: 'Öffentlichkeit',
    gameEffect: 'Ziehe 1 Karte. Bei einer Initiative: +1 Effekt.',
    deckCost: 6,
    subcategories: ['Oligarch'],
    nationality: 'Indisch',
    birthDate: '24. Juni 1962',
    highestPosition: 'CEO der Adani Group',
    estimatedWealth: 'ca. 50-100 Milliarden US-Dollar',
    controversialQuote: '"Indien wird die Supermacht des 21. Jahrhunderts" (2022, Mumbai)',
    sources: ['Forbes (2024)'],
    calculation: 'Adani Group-Aktien (74% Anteil), Infrastruktur, Häfen, Energie, Bergbau. Schwankt stark - Hindenburg-Report führte zu 100+ Mrd USD Verlust'
  }
};

// Special Cards (Initiativen & Interventionen) - from Karten_Initiativen_Interventionen.md
export const SPECIAL_CARD_DETAILS: Record<string, DetailedCardInfo> = {
  // Sofort-Initiativen (Immediate Initiatives)
  'Shadow Lobbying': {
    name: 'Shadow Lobbying',
    category: 'Sofort-Initiative',
    gameEffect: '+1 Einfluss auf deine stärkste Regierungskarte für jede eigene [ICON:oligarch] Oligarch-Karte (max. +3, einmalig diese Runde).',
    deckCost: 2,
    subcategories: ['Mittel'],
    cardType: 'Sofort-Initiative',
    tier: 'T2',
    usage: 'Wenn du eine starke Öffentlichkeitskarte hast',
    example: 'Elon Musk liegt → sein Effekt zählt doppelt',
  },

  'Spin Doctor': {
    name: 'Spin Doctor',
    category: 'Sofort-Initiative',
    gameEffect: 'Beim Ausspielen: +1 Einfluss auf deine stärkste Regierungskarte.',
    deckCost: 2,
    subcategories: ['Mittel'],
    cardType: 'Sofort-Initiative',
    tier: 'T2',
    usage: 'Um eine wichtige Regierungskarte zu stärken',
    example: 'Vladimir Putin bekommt +1 Einfluss',
  },

  'Digitaler Wahlkampf': {
    name: 'Digitaler Wahlkampf',
    category: 'Sofort-Initiative',
    gameEffect: 'Ziehe 1 Karte für jede eigene [ICON:medien] Medien-Karte auf dem Feld. (einmalig)',
    deckCost: 3,
    subcategories: ['Groß'],
    cardType: 'Sofort-Initiative',
    tier: 'T3',
    usage: 'For card flow and tempo',
    example: 'You draw 2 cards, next initiative gives +1 AP',
  },

  'Partei-Offensive': {
    name: 'Partei-Offensive',
    category: 'Sofort-Initiative',
    gameEffect: 'Eine Regierungskarte des Gegners wird deaktiviert (bis Rundenende)',
    deckCost: 3,
    subcategories: ['Groß'],
    cardType: 'Sofort-Initiative',
    tier: 'T3',
    usage: 'Gegen starke gegnerische Regierungskarten',
    example: 'Gegnerischer Vladimir Putin ist deaktiviert',
  },

  'Oppositionsblockade': {
    name: 'Oppositionsblockade',
    category: 'Sofort-Initiative',
    gameEffect: 'Gegner kann keine Initiativen mehr spielen (bis Rundenende)',
    deckCost: 4,
    subcategories: ['Groß'],
    cardType: 'Sofort-Initiative',
    tier: 'T3',
    usage: 'Gegen Initiative-basierte Strategien',
    example: 'Gegner kann keine "Partei-Offensive" mehr spielen',
  },

  'Verzögerungsverfahren': {
    name: 'Verzögerungsverfahren',
    category: 'Sofort-Initiative',
    gameEffect: 'When played: +1 AP.',
    deckCost: 1,
    subcategories: ['Klein'],
    cardType: 'Sofort-Initiative',
    tier: 'T1',
    usage: 'For more action points',
    example: 'You immediately gain +1 AP',
  },

  'Opportunist': {
    name: 'Opportunist',
    category: 'Sofort-Initiative',
    gameEffect: 'Beim Ausspielen: Aktiviert Mirror-Effekt. Einfluss-Boni des Gegners werden auf deine stärkste Regierungskarte gespiegelt.',
    deckCost: 3,
    subcategories: ['Groß'],
    cardType: 'Sofort-Initiative',
    tier: 'T3',
    usage: 'Für Mirror-Effekte bei Einfluss-Boni',
    example: 'Gegner spielt Spin Doctor → deine stärkste Regierungskarte bekommt auch +1 Einfluss',
  },

  'Think-tank': {
    name: 'Think-tank',
    category: 'Sofort-Initiative',
    gameEffect: 'Ziehe 1 Karte, nächste Regierungskarte +2 Einfluss',
    deckCost: 2,
    subcategories: ['Mittel'],
    cardType: 'Sofort-Initiative',
    tier: 'T2',
    usage: 'Für Kartenfluss und Regierungsstärkung',
    example: 'Du ziehst 1 Karte, Justin Trudeau bekommt +2 Einfluss',
  },

  'Whataboutism': {
    name: 'Whataboutism',
    category: 'Sofort-Initiative',
    gameEffect: 'Reaktiviere eine Karte; sie erhält -1 Einfluss',
    deckCost: 2,
    subcategories: ['Mittel'],
    cardType: 'Sofort-Initiative',
    tier: 'T2',
    usage: 'Um deaktivierte Karten wieder zu nutzen',
    example: 'Deaktivierte Regierungskarte ist wieder aktiv, aber schwächer',
  },

  'Influencer-Kampagne': {
    name: 'Influencer-Kampagne',
    category: 'Sofort-Initiative',
    gameEffect: 'Öffentlichkeits-Effekt zählt doppelt (einmalig)',
    deckCost: 2,
    subcategories: ['Mittel'],
    cardType: 'Sofort-Initiative',
    tier: 'T2',
    usage: 'Mit starken Öffentlichkeitskarten',
    example: 'Oprah Winfreys Effekt zählt doppelt',
  },

  'Systemrelevant': {
    name: 'Systemrelevant',
    category: 'Sofort-Initiative',
    gameEffect: 'Schützt 1 Karte vor Deaktivierung (einmalig)',
    deckCost: 2,
    subcategories: ['Mittel'],
    cardType: 'Sofort-Initiative',
    tier: 'T2',
    usage: 'Gegen "Partei-Offensive" und ähnliche Effekte',
    example: 'Deine wichtigste Regierungskarte ist geschützt',
  },

  'Symbolpolitik': {
    name: 'Symbolpolitik',
    category: 'Sofort-Initiative',
    gameEffect: 'Ziehe 1 Karte. Effekt: Nichts. Optik: Stark.',
    deckCost: 1,
    subcategories: ['Klein'],
    cardType: 'Sofort-Initiative',
    tier: 'T1',
    usage: 'Für Kartenfluss ohne echten Effekt',
    example: 'Du ziehst 1 Karte, aber nichts passiert sonst',
  },

  // Dauerhaft-Initiativen (Permanent Initiatives)
  'Koalitionszwang': {
    name: 'Koalitionszwang',
    category: 'Dauerhaft-Initiative',
    gameEffect: 'Für jede deiner Regierungskarten welche einen gleichhohen Einflusswert hat wie eine gegnerische Regierungskarte bekommst du +1 Einfluss +1 für jede Aktivisten und denker Karte welche in deinen Öffentlichkeitsslots liegt',
    deckCost: 2,
    subcategories: ['Regierung'],
    cardType: 'Dauerhaft-Initiative',
    tier: 'T2',
    slot: 'Regierung',
    usage: 'Mit Regierungskarten gleichen Einflusses und Aktivisten/Denkern',
    example: 'Koalition bilden: Gleiche Einflusswerte + Aktivisten/Denker = Bonus-Einfluss'
  },

  'Zivilgesellschaft': {
    name: 'Zivilgesellschaft',
    category: 'Dauerhaft-Initiative',
    gameEffect: 'Movement cards +1 influence, NGOs give +1 AP on next initiative',
    deckCost: 2,
    subcategories: ['Öffentlichkeit'],
    cardType: 'Dauerhaft-Initiative',
    tier: 'T2',
    slot: 'Öffentlichkeit',
    usage: 'With movement and NGO strategies',
    example: 'Greta Thunberg +1 influence, Bill Gates gives +1 AP on next initiative'
  },

  'Milchglas Transparenz': {
    name: 'Milchglas Transparenz',
    category: 'Dauerhaft-Initiative',
    gameEffect: '+1 Einfluss wenn keine NGO/Bewegung liegt',
    deckCost: 2,
    subcategories: ['Regierung'],
    cardType: 'Dauerhaft-Initiative',
    tier: 'T2',
    slot: 'Regierung',
    usage: 'Gegen NGO/Bewegungs-Strategien',
    example: 'Bonus-Einfluss wenn Gegner keine Aktivisten hat'
  },

  'Alternative Fakten': {
    name: 'Alternative Fakten',
    category: 'Dauerhaft-Initiative',
    gameEffect: 'Gegner-Interventionen -1 Wirkung (mindestens 0)',
    deckCost: 2,
    subcategories: ['Öffentlichkeit'],
    cardType: 'Dauerhaft-Initiative',
    tier: 'T2',
    slot: 'Öffentlichkeit',
    usage: 'Gegen Interventionen-Strategien',
    example: '"Fake News-Kampagne" ist schwächer'
  },

  'Napoleon Komplex': {
    name: 'Napoleon Komplex',
    category: 'Dauerhaft-Initiative',
    gameEffect: 'Tier 1 Regierungskarten +1 Einfluss, kein Einfluss verschieben erlaubt',
    deckCost: 2,
    subcategories: ['Regierung'],
    cardType: 'Dauerhaft-Initiative',
    tier: 'T2',
    slot: 'Regierung',
    usage: 'Mit vielen Tier 1 Regierungskarten',
    example: 'Alle deine normalen Regierungskarten +1 Einfluss'
  },

  'Konzernfreundlicher Algorithmus': {
    name: 'Konzernfreundlicher Algorithmus',
    category: 'Dauerhaft-Initiative',
    gameEffect: 'Bei Plattform-Karten: ziehe 1 Karte, Oligarchen +1 Einfluss',
    deckCost: 2,
    subcategories: ['Öffentlichkeit'],
    cardType: 'Dauerhaft-Initiative',
    tier: 'T2',
    slot: 'Öffentlichkeit',
    usage: 'Mit Plattform + Oligarchen-Kombinationen',
    example: 'Mark Zuckerberg + Elon Musk = Kartenziehen + Einfluss'
  },

  'Algorithmischer Diskurs': {
    name: 'Algorithmischer Diskurs',
    category: 'Dauerhaft-Initiative',
    gameEffect: 'Beim Ausspielen: Reduziert Einfluss basierend auf Plattform/KI-Karten in der Öffentlichkeit. Für jede Plattform/KI-Karte: -1 Einfluss auf stärkste Regierungskarte.',
    deckCost: 2,
    subcategories: ['Öffentlichkeit'],
    cardType: 'Dauerhaft-Initiative',
    tier: 'T2',
    slot: 'Öffentlichkeit',
    usage: 'Gegen Plattform/KI-Strategien',
    example: '3 Plattform-Karten in Öffentlichkeit → -3 Einfluss auf stärkste Regierungskarte'
  },

  'Wirtschaftlicher Druck': {
    name: 'Wirtschaftlicher Druck',
    category: 'Dauerhaft-Initiative',
    gameEffect: 'Wenn du eine Oligarchen-Karte spielst: +1 Einfluss auf eine Regierungskarte',
    deckCost: 2,
    subcategories: ['Regierung'],
    cardType: 'Dauerhaft-Initiative',
    tier: 'T2',
    slot: 'Regierung',
    usage: 'Mit Oligarchen-Strategien',
    example: 'Elon Musk spielen → Vladimir Putin +1 Einfluss'
  },

  // Interventionen (Trap Cards)
  'Fake News-Kampagne': {
    name: 'Fake News-Kampagne',
    category: 'Intervention',
    gameEffect: 'Die Öffentlichkeitskarte wird deaktiviert',
    deckCost: 2,
    subcategories: ['Standard'],
    cardType: 'Intervention',
    tier: 'T2',
    trigger: 'Gegner spielt eine Öffentlichkeitskarte',
    example: 'Gegner spielt Oprah Winfrey → sie ist deaktiviert'
  },

  'Whistleblower': {
    name: 'Whistleblower',
    category: 'Intervention',
    gameEffect: '-2 Einfluss auf die Regierungskarte',
    deckCost: 3,
    subcategories: ['Standard'],
    cardType: 'Intervention',
    tier: 'T3',
    trigger: 'Gegner spielt eine Regierungskarte',
    example: 'Gegner spielt Vladimir Putin → er verliert 2 Einfluss'
  },

  'Cyber-Attacke': {
    name: 'Cyber-Attacke',
    category: 'Intervention',
    gameEffect: 'Die Öffentlichkeitskarte wird zerstört',
    deckCost: 3,
    subcategories: ['Standard'],
    cardType: 'Intervention',
    tier: 'T3',
    trigger: 'Gegner spielt eine Öffentlichkeitskarte',
    example: 'Gegner spielt Mark Zuckerberg → er ist weg'
  },

  'Strategische Enthüllung': {
    name: 'Strategische Enthüllung',
    category: 'Intervention',
    gameEffect: 'Eine Regierungskarte zurück auf die Hand',
    deckCost: 3,
    subcategories: ['Standard'],
    cardType: 'Intervention',
    tier: 'T3',
    trigger: 'Gegner hat mehr als 2 Regierungskarten',
    example: 'Gegner hat 3 Regierungskarten → eine geht zurück'
  },

  'Interne Fraktionskämpfe': {
    name: 'Interne Fraktionskämpfe',
    category: 'Intervention',
    gameEffect: 'Die Initiative wird annulliert',
    deckCost: 2,
    subcategories: ['Standard'],
    cardType: 'Intervention',
    tier: 'T2',
    trigger: 'Gegner spielt eine große Initiative (3-4 HP)',
    example: 'Gegner spielt "Oppositionsblockade" → sie wird annulliert'
  },

  'Boykott-Kampagne': {
    name: 'Boykott-Kampagne',
    category: 'Intervention',
    gameEffect: 'Die Karte wird deaktiviert',
    deckCost: 2,
    subcategories: ['Standard'],
    cardType: 'Intervention',
    tier: 'T2',
    trigger: 'Gegner spielt eine NGO/Öffentlichkeitskarte',
    example: 'Gegner spielt Greta Thunberg → sie ist deaktiviert'
  },

  'Deepfake-Skandal': {
    name: 'Deepfake-Skandal',
    category: 'Intervention',
    gameEffect: 'Kein Einflusstransfer möglich',
    deckCost: 2,
    subcategories: ['Standard'],
    cardType: 'Intervention',
    tier: 'T2',
    trigger: 'Gegner spielt eine Diplomat-Karte',
    example: 'Gegner spielt Joschka Fischer → er kann nicht verschieben'
  },

  'Bestechungsskandal 2.0': {
    name: 'Bestechungsskandal 2.0',
    category: 'Sofort-Initiative',
    gameEffect: 'Du versuchst eine gegnerische Regierungskarte zu übernehmen. Wähle eine Karte und würfle einen W6. Bei Erfolg wird die Karte übernommen.',
    deckCost: 3,
    subcategories: ['Corruption'],
    cardType: 'Sofort-Initiative',
    tier: 'T3',
    trigger: 'Manuelle Zielauswahl - wähle gegnerische Regierungskarte',
    example: 'Wähle Joschka Fischer → würfle W6 ≥ Einfluss + Oligarch-Bonus'
  },

  'Maulwurf': {
    name: 'Maulwurf',
    category: 'Sofort-Initiative',
    gameEffect: 'Du versuchst die schwächste Regierungskarte deines Gegners zu übernehmen. Probe mit Würfel mindestens eine 2 oder höher würfeln und für jede gegnerische Regierungskarte auf dem Feld +1',
    deckCost: 4,
    subcategories: ['Corruption'],
    cardType: 'Sofort-Initiative',
    tier: 'T3',
    trigger: 'Automatisch - schwächste Regierungskarte wird gewählt',
    example: 'Gegner hat 2 Regierungskarten → du musst mindestens 3 würfeln'
  },

  'Grassroots-Widerstand': {
    name: 'Grassroots-Widerstand',
    category: 'Intervention',
    gameEffect: 'Eine Öffentlichkeitskarte wird deaktiviert',
    deckCost: 2,
    subcategories: ['Standard'],
    cardType: 'Intervention',
    tier: 'T2',
    trigger: 'Gegner hat mehr als 2 Öffentlichkeitskarten',
    example: 'Gegner hat 3 Öffentlichkeitskarten → eine ist deaktiviert'
  },

  'Massenproteste': {
    name: 'Massenproteste',
    category: 'Intervention',
    gameEffect: 'Beide Regierungskarten -1 Einfluss',
    deckCost: 2,
    subcategories: ['Standard'],
    cardType: 'Intervention',
    tier: 'T2',
    trigger: 'Gegner spielt 2 Regierungskarten in der Runde',
    example: 'Gegner spielt 2 Regierungskarten → beide -1 Einfluss'
  },

  'Berater-Affäre': {
    name: 'Berater-Affäre',
    category: 'Intervention',
    gameEffect: '-2 Einfluss auf die Regierungskarte',
    deckCost: 2,
    subcategories: ['Standard'],
    cardType: 'Intervention',
    tier: 'T2',
    trigger: 'Gegner spielt eine Regierungskarte',
    example: 'Gegner spielt schwache Regierung → sie verliert 2 Einfluss'
  },

  'Parlament geschlossen': {
    name: 'Parlament geschlossen',
    category: 'Intervention',
    gameEffect: 'Gegner kann keine weiteren Regierungskarten spielen (diese Runde)',
    deckCost: 3,
    subcategories: ['Standard'],
    cardType: 'Intervention',
    tier: 'T3',
    trigger: 'Gegner hat 2 oder mehr Regierungskarten',
    example: 'Gegner hat 2 Regierungskarten → kann keine mehr spielen'
  },

  '"Unabhängige" Untersuchung': {
    name: '"Unabhängige" Untersuchung',
    category: 'Intervention',
    gameEffect: 'Die Intervention wird annulliert',
    deckCost: 2,
    subcategories: ['Standard'],
    cardType: 'Intervention',
    tier: 'T2',
    trigger: 'Gegner spielt eine Intervention',
    example: 'Gegner spielt "Fake News-Kampagne" → sie wird annulliert'
  },

  'Soft Power-Kollaps': {
    name: 'Soft Power-Kollaps',
    category: 'Intervention',
    gameEffect: '-3 Einfluss auf die Diplomat-Karte',
    deckCost: 2,
    subcategories: ['Standard'],
    cardType: 'Intervention',
    tier: 'T2',
    trigger: 'Gegner spielt eine Diplomat-Karte',
    example: 'Gegner spielt Joschka Fischer → er verliert 3 Einfluss'
  },

  'Cancel Culture': {
    name: 'Cancel Culture',
    category: 'Intervention',
    gameEffect: 'Die Öffentlichkeitskarte wird deaktiviert',
    deckCost: 2,
    subcategories: ['Standard'],
    cardType: 'Intervention',
    tier: 'T2',
    trigger: 'Gegner spielt eine Öffentlichkeitskarte',
    example: 'Gegner spielt Elon Musk → er ist deaktiviert'
  },

  'Lobby Leak': {
    name: 'Lobby Leak',
    category: 'Intervention',
    gameEffect: 'Gegner muss 1 Karte abwerfen',
    deckCost: 2,
    subcategories: ['Standard'],
    cardType: 'Intervention',
    tier: 'T2',
    trigger: 'Gegner spielt eine Öffentlichkeitskarte',
    example: 'Gegner spielt Bill Gates → muss 1 Karte abwerfen'
  },


  'Skandalspirale': {
    name: 'Skandalspirale',
    category: 'Sofort-Initiative',
    gameEffect: 'Bei Aktivierung: Der Spieler mit dem geringeren Gesamt-Einfluss muss einen W6 würfeln. Bei 4-6 passiert nichts; bei 1-3 verliert er entsprechend der Augenzahl -1/-2/-3 Einfluss auf seine stärkste Regierungskarte.',
    deckCost: 2,
    subcategories: ['Standard'],
    cardType: 'Sofort-Initiative',
    tier: 'T2',
    usage: 'Comeback-Chance für den zurückliegenden Spieler',
    example: 'P2 liegt hinten, würfelt eine 2 → stärkste Regierungskarte -2 Einfluss'
  },

  'Tunnelvision': {
    name: 'Tunnelvision',
    category: 'Dauerhaft-Initiative',
    gameEffect: 'Solange Tunnelvision aktiv ist, müssen beide Spieler bei Regierungskarten eine Probe bestehen. W6 ≥4 (≥5 bei Einfluss 9+). Bei Misserfolg: 1-3 Karte bleibt in Hand, 1 kritischer Misserfolg entfernt Karte dauerhaft. 1 AP wird immer abgezogen.',
    deckCost: 2,
    subcategories: ['Control'],
    cardType: 'Dauerhaft-Initiative',
    tier: 'T2',
    trigger: 'Dauerhaft aktiv - bei jeder Regierungskarte',
    example: 'Spieler spielt Regierungskarte → Probe W6 ≥4 → bei Misserfolg Karte bleibt in Hand'
  },

  'Satire-Show': {
    name: 'Satire-Show',
    category: 'Intervention',
    gameEffect: 'Eine Regierungskarte des Gegners -2 Einfluss',
    deckCost: 2,
    subcategories: ['Standard'],
    cardType: 'Intervention',
    tier: 'T2',
    trigger: 'Gegner hat mehr Einfluss als du',
    example: 'Gegner hat mehr Einfluss → eine Regierungskarte -2'
  },
};

// Combine all card details
export const ALL_CARD_DETAILS: Record<string, DetailedCardInfo> = {
  ...GOVERNMENT_CARD_DETAILS,
  ...PUBLIC_CARD_DETAILS,
  ...SPECIAL_CARD_DETAILS
};

// Helper function to get card details
export function getCardDetails(cardName: string): DetailedCardInfo | null {
  return ALL_CARD_DETAILS[cardName] || null;
}

// Helper function to format wealth
export function formatWealth(wealth?: string): string {
  if (!wealth) return 'Unbekannt';
  return wealth;
}

// Helper function to format sources
export function formatSources(sources?: string[]): string {
  if (!sources || sources.length === 0) return 'Keine Quellen verfügbar';
  return sources.join(', ');
}

// Helper function to convert HP to USD according to Deckbau_System.md
// 108 HP = 500 Milliarden USD
export function convertHPToUSD(hp: number): string {
  const usdBillions = (hp / 108) * 500;

  if (usdBillions >= 1) {
    return `${usdBillions.toFixed(1)} Mrd. USD`;
  } else {
    const usdMillions = usdBillions * 1000;
    return `${usdMillions.toFixed(0)} Mio. USD`;
  }
}
