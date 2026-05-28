// Neue Premade-Decks mit 40-50 BP Kosten

const NEW_PRESETS = [
  {
    name: "Tech Oligarchs",
    cards: [
      "Vladimir Putin",
      "Xi Jinping",
      "Donald Trump",
      "Mohammed bin Salman",
      "Recep Tayyip Erdoğan",
      "Elon Musk",
      "Bill Gates",
      "Mark Zuckerberg",
      "Tim Cook",
      "Sam Altman",
    ],
  },
  {
    name: "Diplomatic Power",
    cards: [
      "Jens Stoltenberg",
      "Olaf Scholz",
      "Rishi Sunak",
      "Kamala Harris",
      "Helmut Schmidt",
      "Greta Thunberg",
      "Warren Buffett",
      "George Soros",
      "Spin Doctor",
      "Think-tank",
    ],
  },
  {
    name: "Activist Movement",
    cards: [
      "Benjamin Netanyahu",
      "Volodymyr Zelenskyy",
      "Ursula von der Leyen",
      "Narendra Modi",
      "Luiz Inácio Lula da Silva",
      "Greta Thunberg",
      "Malala Yousafzai",
      "Ai Weiwei",
      "Alexei Navalny",
      "Jennifer Doudna",
    ],
  },
  {
    name: "Initiative Rush",
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
  {
    name: "Media Control",
    cards: [
      "Vladimir Putin",
      "Xi Jinping",
      "Donald Trump",
      "Mohammed bin Salman",
      "Recep Tayyip Erdoğan",
      "Oprah Winfrey",
      "Mark Zuckerberg",
      "Tim Cook",
      "Influencer-Kampagne",
      "Whataboutism",
    ],
  },
  {
    name: "Economic Influence",
    cards: [
      "Jens Stoltenberg",
      "Olaf Scholz",
      "Rishi Sunak",
      "Kamala Harris",
      "Helmut Schmidt",
      "Warren Buffett",
      "George Soros",
      "Jeff Bezos",
      "Mukesh Ambani",
      "Roman Abramovich",
    ],
  },
];

// Kostenberechnung (manuell aus cardDetails.ts):
const costs = {
  // Regierungskarten
  "Vladimir Putin": 8,
  "Xi Jinping": 8,
  "Donald Trump": 8,
  "Mohammed bin Salman": 8,
  "Recep Tayyip Erdoğan": 8,
  "Benjamin Netanyahu": 6,
  "Volodymyr Zelenskyy": 6,
  "Ursula von der Leyen": 6,
  "Narendra Modi": 13,
  "Luiz Inácio Lula da Silva": 13,
  "Jens Stoltenberg": 12,
  "Olaf Scholz": 6,
  "Rishi Sunak": 5,
  "Kamala Harris": 5,
  "Helmut Schmidt": 4,
  "Werner Maihofer": 4,
  "John Snow": 4,
  "Karl Carstens": 4,
  "Hans Eichel": 4,
  "Rainer Offergeld": 4,

  // Öffentlichkeitskarten
  "Elon Musk": 8,
  "Bill Gates": 7,
  "Mark Zuckerberg": 5,
  "Tim Cook": 3,
  "Sam Altman": 3,
  "Greta Thunberg": 4,
  "Warren Buffett": 7,
  "George Soros": 4,
  "Malala Yousafzai": 4,
  "Ai Weiwei": 5,
  "Alexei Navalny": 5,
  "Jennifer Doudna": 4,
  "Oprah Winfrey": 5,
  "Jeff Bezos": 4,
  "Mukesh Ambani": 4,
  "Roman Abramovich": 4,

  // Initiativen
  "Spin Doctor": 2,
  "Think-tank": 2,
  Verzoegerungsverfahren: 1,
  Symbolpolitik: 2,
  "Shadow Lobbying": 2,
  Opportunist: 2,
  "Influencer-Kampagne": 2,
  Whataboutism: 2,
};

console.log("=== NEUE PREMADE-DECKS KOSTENBEREchnung ===\n");

NEW_PRESETS.forEach((preset) => {
  let total = 0;
  console.log(`Preset: ${preset.name}`);
  preset.cards.forEach((card) => {
    const cost = costs[card] || 0;
    total += cost;
    console.log(`  - ${card}: ${cost} BP`);
  });
  console.log(`  GESAMT: ${total} BP\n`);
});
