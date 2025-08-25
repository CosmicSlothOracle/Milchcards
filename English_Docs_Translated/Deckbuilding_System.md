# Politicard - Vollstaendiges Deckbuilding-System

## Deckbuilding-Grundlagen

Beim Deckbuilding stellst du vor dem Game dein ganz persoenliches Powerinstrument zusammen: ein Deck mit genau 25 Karten. Jede Karte kostet dabei eine bestimmte Anzahl HP (HP (Budget Points)), die dein Budget darstellen. Insgesamt darfst du maximal 108 HP verwenden – nicht mehr!

### 💵 Was sind HP genau?

HP stehen fuer **HP (Budget Points)**, also die symbolischen Cost einer Karte.

- **Dein Budget:** 108 HP entspricht etwa 500 Milliarden USD
- **Jede Karte** hat ihre HP-Cost, abhaengig von:
  - Kartentyp (Regierung, Oeffentlichkeit, Initiative, Intervention)
  - Powerwert (bei Government Cards)
  - Tier (Staerkegrad) oder zusaetzlichen Effecten wie Leadership, Diplomat usw.

---

## 🧮 HP-Berechnung fuer Government Cards

Die Basis fuer die HP-Cost ist der **Powerwert (M)** – das ist der Zahlenwert auf jeder Government Cards, der angibt, wie viel Influence sie bringt.

### **Power (M) → HP-Cost**

| Power (M) | HP-Cost |
| --------- | ------- |
| 1         | 1 HP    |
| 2         | 1 HP    |
| 3         | 2 HP    |
| 4         | 3 HP    |
| 5         | 4 HP    |
| 6         | 5 HP    |
| 7         | 7 HP    |
| 8         | 9 HP    |
| 9         | 11 HP   |
| 10        | 13 HP   |

### **🔸 Zusaetzliche Cost**

- **Tier 2 Karten** → +3 HP
- **Leadership oder Diplomat** → +1 HP
- **Hat sowohl Leadership als auch Diplomat** → +2 HP

### **Example-Berechnung:**

**Vladimir Putin:**

- Power 10 → 13 HP (Basis)
- Tier 2 → +3 HP
- Leadership → +1 HP
- **Gesamt:** 13 + 3 + 1 = **17 HP**

**Justin Trudeau:**

- Power 8 → 9 HP (Basis)
- Tier 2 → +3 HP
- Leadership → +1 HP
- **Gesamt:** 9 + 3 + 1 = **13 HP**

---

## 🧮 HP-Berechnung fuer Public Cards

Der HP-Wert richtet sich nach der **Subklasse** (Oligarch, Bewegung, Plattform etc.):

### **Subklasse → HP (Richtwert)**

| Subklasse      | HP (Richtwert) |
| -------------- | -------------- |
| Oligarch       | 6 HP           |
| Plattform      | 5 HP           |
| Medien         | 5 HP           |
| NGO/Think-Tank | 4 HP           |
| Bewegung       | 4 HP           |
| Intelligenz    | 4–5 HP         |

### **🔹 Zusaetzliche Cost**

- **Hat die Karte eine starke, dauerhafte Aura?** → +1 HP draufrechnen

### **Example-Berechnung:**

**Elon Musk:**

- Oligarch + Plattform → 6 HP (hoeherer Wert)
- Starke Aura → +1 HP
- **Gesamt:** 6 + 1 = **7 HP**

**Greta Thunberg:**

- Bewegung → 4 HP
- **Gesamt:** **4 HP**

---

## 🧮 HP-Cost fuer andere Kartentypen

### **Initiatives**

| Kategorie | HP-Cost |
| --------- | ------- |
| Klein     | 1 HP    |
| Mittel    | 2 HP    |
| Groß      | 3–4 HP  |

### **Interventions**

| Kategorie | HP-Cost |
| --------- | ------- |
| Standard  | 2–3 HP  |

---

## 🎴 Deckbuilding-Begrenzungen

### **Grundregeln**

- **Deckgroeße:** exakt 25 Karten
- **Budget:** maximal 108 HP
- **Hand Limit:** 10 Karten

### **Maximale Kopien pro Karte**

- **Tier 1–2:** max. 2 Kopien
- **Tier 3 (falls erlaubt):** max. 1 Kopie

---

## 📊 Deckbuilding-Strategien

### **Tempo-Strategie (108 HP)**

**Ziel:** Viele Aktionen in wenigen Zuegen

**Example-Deck:**

- **Government Cards (8 Karten, 52 HP):**

  - Justin Trudeau (13 HP) - Leadership
  - Volodymyr Zelenskyy (13 HP) - Leadership
  - Olaf Scholz (7 HP) - Basis
  - Pedro Sánchez (5 HP) - Basis
  - Keir Starmer (5 HP) - Basis
  - Robert Gates (5 HP) - Basis
  - Karl Rove (5 HP) - Basis
  - Shigeru Ishiba (5 HP) - Basis

- **Public Cards (8 Karten, 44 HP):**

  - Elon Musk (8 HP) - Oligarch + Plattform
  - Mark Zuckerberg (5 HP) - Plattform
  - Tim Cook (5 HP) - Plattform
  - Greta Thunberg (4 HP) - Bewegung
  - Malala Yousafzai (4 HP) - Bewegung
  - Jennifer Doudna (4 HP) - Intelligenz
  - Edward Snowden (5 HP) - Intelligenz
  - Julian Assange (5 HP) - Intelligenz

- **Initiatives (9 Karten, 12 HP):**
  - Verzoegerungsverfahren (1 HP) - Klein
  - Symbolpolitik (1 HP) - Klein
  - Shadow Lobbying (2 HP) - Mittel
  - Spin Doctor (2 HP) - Mittel
  - Think-tank (2 HP) - Mittel
  - Influencer-Kampagne (2 HP) - Mittel
  - Systemrelevant (2 HP) - Mittel

**Gesamt:** 25 Karten, 108 HP

### **Kontroll-Strategie (108 HP)**

**Ziel:** Gegnerische Aktionen blockieren

**Example-Deck:**

- **Government Cards (7 Karten, 45 HP):**

  - Vladimir Putin (17 HP) - Leadership
  - Xi Jinping (17 HP) - Leadership
  - Joschka Fischer (11 HP) - Diplomat

- **Public Cards (6 Karten, 30 HP):**

  - Bill Gates (7 HP) - NGO/Think-Tank
  - George Soros (7 HP) - NGO/Think-Tank
  - Noam Chomsky (5 HP) - Intelligenz

- **Initiatives (6 Karten, 18 HP):**

  - Partei-Offensive (3 HP) - Groß
  - Oppositionsblockade (4 HP) - Groß
  - Opportunist (3 HP) - Groß
  - Koalitionszwang (2 HP) - Mittel
  - Wirtschaftlicher Druck (2 HP) - Mittel
  - Napoleon Komplex (2 HP) - Mittel

- **Interventions (6 Karten, 15 HP):**
  - Fake News-Kampagne (2 HP)
  - Whistleblower (3 HP)
  - Strategische Enthuellung (3 HP)
  - Interne Fraktionskaempfe (2 HP)
  - Boykott-Kampagne (2 HP)
  - "Unabhaengige" Untersuchung (2 HP)

**Gesamt:** 25 Karten, 108 HP

### **Influence-Strategie (108 HP)**

**Ziel:** Schneller Aufbau von Influence

**Example-Deck:**

- **Government Cards (10 Karten, 75 HP):**

  - Vladimir Putin (17 HP) - Leadership
  - Xi Jinping (17 HP) - Leadership
  - Recep Tayyip Erdoğan (17 HP) - Leadership
  - Ursula von der Leyen (15 HP) - Leadership + Diplomat
  - Luiz Inácio Lula da Silva (13 HP) - Leadership

- **Public Cards (8 Karten, 47 HP):**

  - Elon Musk (8 HP) - Oligarch + Plattform
  - Bill Gates (7 HP) - NGO/Think-Tank
  - George Soros (7 HP) - NGO/Think-Tank
  - Roman Abramovich (6 HP) - Oligarch
  - Mukesh Ambani (6 HP) - Oligarch
  - Jeff Bezos (6 HP) - Oligarch
  - Alisher Usmanov (6 HP) - Oligarch
  - Zhang Yiming (6 HP) - Oligarch

- **Initiatives (7 Karten, 14 HP):**
  - Spin Doctor (2 HP) - Mittel
  - Think-tank (2 HP) - Mittel
  - Koalitionszwang (2 HP) - Mittel
  - Wirtschaftlicher Druck (2 HP) - Mittel
  - Zivilgesellschaft (2 HP) - Mittel
  - Milchglas Transparenz (2 HP) - Mittel
  - Konzernfreundlicher Algorithmus (2 HP) - Mittel

**Gesamt:** 25 Karten, 108 HP

---

## ⚠️ Haeufige Deckbuilding-Fehler

### **1. Budget ueberschritten**

- **Problem:** Mehr als 108 HP verwendet
- **Loesung:** Teure Karten durch guenstigere ersetzen

### **2. Zu wenig Karten**

- **Problem:** Weniger als 25 Karten
- **Loesung:** Guenstige Karten hinzufuegen

### **3. Zu viele teure Karten**

- **Problem:** Alle HP fuer wenige maechtige Karten ausgegeben
- **Loesung:** Balance zwischen starken und schwachen Karten

### **4. Fehlende Synergien**

- **Problem:** Karten passen nicht zusammen
- **Loesung:** Auf Unterkategorien und Schluesselwoerter achten

---

## 🔧 Deckbuilding-Tipps

### **Costverteilung (Empfehlung)**

- **Government Cards:** 60-70 HP (55-65%)
- **Public Cards:** 25-35 HP (25-35%)
- **Initiatives:** 10-15 HP (10-15%)
- **Interventions:** 5-10 HP (5-10%)

### **Kartenanzahl (Empfehlung)**

- **Government Cards:** 8-12 Karten
- **Public Cards:** 6-10 Karten
- **Initiatives:** 5-8 Karten
- **Interventions:** 3-6 Karten

### **Synergie-Checkliste**

- [ ] Leadership + Plattform fuer Tempo
- [ ] Bewegung + Government Cards fuer Influence
- [ ] Oligarchen + "Wirtschaftlicher Druck" fuer Boni
- [ ] Interventions + Kontroll-Strategien
- [ ] Balance zwischen Tier 1 und Tier 2 Karten

---

## 📈 Deckbuilding-Examplee nach Gamestil

### **Aggressiv (Tempo + Influence)**

- Viele Leadership-Government Cards
- Plattform-Public Cards
- Instant-Initiatives fuer Tempo

### **Defensiv (Kontrolle + Reaktion)**

- Diplomat-Government Cards
- Interventions fuer Fallen
- Dauerhafte Initiatives fuer Schutz

### **Balanced (Allround)**

- Mischung aus allen Kartentypen
- Verschiedene Unterkategorien
- Flexibilitaet in der Strategie

---

## 🎯 Deckbuilding-Checkliste

Vor dem Game:

- [ ] **25 Karten** im Deck?
- [ ] **Maximal 108 HP** verwendet?
- [ ] **Hand Limit 10** eingehalten?
- [ ] **Kopienlimit** eingehalten?
- [ ] **Synergien** vorhanden?
- [ ] **Balance** zwischen Kartentypen?
- [ ] **Strategie** klar definiert?

**Dein Deck ist bereit fuer den politischen Kampf!** 🏛️
