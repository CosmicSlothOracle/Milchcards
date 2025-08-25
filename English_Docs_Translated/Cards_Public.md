# Public Cards – Personen aus Medien, Wirtschaft und Wissenschaft

**Was sind Public Cards?**
Public Cards sind Personen aus Medien, Wirtschaft, Wissenschaft und Aktivismus, die deine politischen Aktionen unterstuetzen. Du spielst sie in die Oeffentlichkeitsreihe (maximal 5 Karten). Sie geben dir Boni wie Kartenziehen oder Action Points (AP)-Rueckerstattung via Events. AP-Baseline: Jede Karte kostet 1 AP; Start jedes Zuges mit 2 AP; keine Obergrenze.

**Kategorien (aktuelle Terminologie):**

- Oligarch (German: Oligarch)
- Tech (German: Tech; vormals „Plattform“)
- NGO (German: NGO; vormals „NGO/Think-Tank“)
- Medien (German: Medien)
- Opinion Leader (German: Meinungsmacher; vormals „Intelligenz“)
- Bewegung (German: Bewegung)

Hinweis Implementierungsstand:

- Tech: Mark Zuckerberg gibt einmal pro Runde nach einer aktivierten Initiative +1 AP (Queue-Event ADD_AP). Implementiert.
- Opinion Leader / Bewegung: Initiativen-Auren (z. B. Doudna/Fauci +1, Chomsky −1 Opponent) sowie Ai Weiwei (+1 Karte und +1 AP) sind implementiert.
- Historische Rabatte/Refunds (kostenlose Initiative etc.) sind entfernt und ggf. als zukünftige Events gekennzeichnet.

---

## Public Cards-Liste

### **Elon Musk**

- **Unterkategorien:** Oligarch, Tech
- **Effekt im Game:** Ziehe 1 Karte beim Ausspielen. (Historische Initiative-Rabatte wurden entfernt.)
- **Synergie:** Kartenziehen + Initiative-Rabatt = Tempo
- **Deckbuildingkosten:** 8 HP
- **Persoenliche Informationen:**
  - Staatsangehoerigkeit: US-Amerikanisch
  - Geburtsdatum: 28. Juni 1971
  - Hoechste berufliche/oeffentliche Rolle: CEO von Tesla und SpaceX
  - Geschaetztes Vermoegen: ca. 200-300 Milliarden US-Dollar
  - **Rechenweg/Quellen:** Forbes Real-Time Billionaires (2024): Tesla-Aktien (48% Anteil), SpaceX-Bewertung (150 Mrd USD), Twitter/X-Anteil. Schwankt stark mit Tesla-Kurs. Zusaetzliche Quellen: SEC Form 4/13G, Bloomberg Billionaires Index, WSJ, Financial Times.
  - Kontroverseste Aussage: "Funding secured" (7. August 2018, Twitter)

### **Bill Gates**

- **Unterkategorien:** Oligarch, NGO
- **Effekt im Game:** Ziehe 1 Karte beim Ausspielen. (Historischer -1 AP Discount entfällt in Baseline.)
- **Synergie:** Kombinierter Support fuer Gesundheitsdecks
- **Deckbuildingkosten:** 7 HP
- **Persoenliche Informationen:**
  - Staatsangehoerigkeit: US-Amerikanisch
  - Geburtsdatum: 28. Oktober 1955
  - Hoechste berufliche/oeffentliche Rolle: CEO von Microsoft
  - Geschaetztes Vermoegen: ca. 100-150 Milliarden US-Dollar
  - **Rechenweg/Quellen:** Forbes (2024): Microsoft-Aktien (1,3% Anteil), Cascade Investment Portfolio, Philanthropie-Abgaben (50+ Mrd USD gespendet seit 1994). Zusaetzliche Quellen: SEC 13D/13G, Gates Foundation IRS-Form 990-PF, Bloomberg.
  - Kontroverseste Aussage: "Die Armen muessen mehr Kinder bekommen" (2018, Seattle)

### **Mark Zuckerberg**

- **Unterkategorien:** Tech
- **Effekt im Game:** Nach Aktivierung einer Instant-Initiative: +1 AP (einmal pro Runde). Implementiert via Queue.
- **Synergie:** Klassischer Plattform-Support fuer Tempo
- **Deckbuildingkosten:** 5 HP
- **Persoenliche Informationen:**
  - Staatsangehoerigkeit: US-Amerikanisch
  - Geburtsdatum: 14. Mai 1984
  - Hoechste berufliche/oeffentliche Rolle: CEO von Meta (Facebook)
  - Geschaetztes Vermoegen: ca. 80-120 Milliarden US-Dollar
  - **Rechenweg/Quellen:** Forbes (2024): Meta-Aktien (13,5% Anteil), Immobilien-Portfolio, Philanthropie (Chan Zuckerberg Initiative). Schwankt mit Meta-Kurs. Zusaetzliche Quellen: SEC Form 4, Bloomberg, WSJ.
  - Kontroverseste Aussage: "Privacy is no longer a social norm" (2010, San Francisco)

### **Oprah Winfrey**

- **Unterkategorien:** Medien
- **Effekt im Game:** Wenn du eine Initiative spielst, darfst du 1 Karte abwerfen und 1 ziehen.
- **Synergie:** Medienrecycling fuer bessere Kartenqualitaet
- **Deckbuildingkosten:** 5 HP
- **Persoenliche Informationen:**
  - Staatsangehoerigkeit: US-Amerikanisch
  - Geburtsdatum: 29. Januar 1954
  - Hoechste berufliche/oeffentliche Rolle: Talkshow-Moderatorin und Medienunternehmerin
  - Geschaetztes Vermoegen: ca. 2,5-3 Milliarden US-Dollar
  - **Rechenweg/Quellen:** Forbes (2024): OWN Network, Harpo Productions, Immobilien, Investment-Portfolio. Hauptquelle: 25 Jahre "Oprah Winfrey Show" + Medienimperium. Zusaetzliche Quellen: Variety, The Hollywood Reporter, Bloomberg.
  - Kontroverseste Aussage: "Jeder sollte seine eigene Wahrheit finden" (2004, Chicago)

### **Sam Altman**

- **Unterkategorien:** Opinion Leader, Tech
- **Effekt im Game:** Bei einer KI-bezogenen Initiative: ziehe 1 Karte + 1 Action Points (AP) zurueck.
- **Synergie:** KI-Tempo-Support fuer Technologie-Decks
- **Deckbuildingkosten:** 6 HP
- **Persoenliche Informationen:**
  - Staatsangehoerigkeit: US-Amerikanisch
  - Geburtsdatum: 22. April 1985
  - Hoechste berufliche/oeffentliche Rolle: CEO von OpenAI
  - Geschaetztes Vermoegen: ca. 500 Millionen - 1 Milliarde US-Dollar (inkl. OpenAI-Beteiligung)
  - **Rechenweg/Quellen:** Schaetzung basierend auf: OpenAI-Bewertung (80 Mrd USD), Altman's Anteil (ca. 2-3%), Y Combinator-Exit, Loopt-Verkauf. Ungewiss wegen privater Bewertungen. Zusaetzliche Quellen: The Information, Financial Times, Bloomberg, PitchBook-Schaetzungen.
  - Kontroverseste Aussage: "KI koennte die Menschheit ausloeschen" (2023, San Francisco)

### **George Soros**

- **Unterkategorien:** Oligarch, NGO
- **Effekt im Game:** +1 Action Points (AP) wenn der Gegner eine autoritaere Government Cards hat.
- **Synergie:** Anti-Autokratie-Synergie gegen autoritaere Gegner
- **Deckbuildingkosten:** 7 HP
- **Persoenliche Informationen:**
  - Staatsangehoerigkeit: US-Amerikanisch (geboren in Ungarn)
  - Geburtsdatum: 12. August 1930
  - Hoechste berufliche/oeffentliche Rolle: Hedgefonds-Manager und Philanthrop
  - Geschaetztes Vermoegen: ca. 8-10 Milliarden US-Dollar
  - **Rechenweg/Quellen:** Forbes (2024): Quantum Fund, Soros Fund Management, Philanthropie-Abgaben (32+ Mrd USD gespendet). Netto nach Spenden. Zusaetzliche Quellen: Open Society Foundations Finanzberichte, Bloomberg.
  - Kontroverseste Aussage: "Ich bin ein Nazi-Kollaborateur gewesen" (1998, New York)

### **Greta Thunberg**

- **Unterkategorien:** Bewegung
- **Effekt im Game:** Keine pauschale Gratis-Regierungs-Karte mehr. Synergien über laufende Initiativen (z. B. „Zivilgesellschaft“) und thematische Kombinationen.
- **Synergie:** Bewegungstempo fuer schnellen Regierungsaufbau
- **Deckbuildingkosten:** 4 HP
- **Persoenliche Informationen:**
  - Staatsangehoerigkeit: Schwedisch
  - Geburtsdatum: 3. Januar 2003
  - Hoechste berufliche/oeffentliche Rolle: Klimaaktivistin
  - Geschaetztes Vermoegen: ca. 1-2 Millionen US-Dollar
  - **Rechenweg/Quellen:** Schaetzung basierend auf: Buchverkaeufe ("No One Is Too Small"), Dokumentarfilm-Rechte, Spenden an Fridays for Future, Familienvermoegen. Zusaetzliche Quellen: The Guardian, NYT, Verlagsangaben.
  - Kontroverseste Aussage: "Wie koennt ihr es wagen!" (2019, New York)

### **Jack Ma**

- **Unterkategorien:** Tech, Oligarch
- **Effect im Game:** Nach einer Initiative: Ziehe 1 Karte + optional -1 HP auf gegnerische Regierungs-Plattform.
- **Synergie:** Plattform-Gegenkontrolle
- **Deckbuildingkosten:** 7 HP
- **Persoenliche Informationen:**
  - Staatsangehoerigkeit: Chinesisch
  - Geburtsdatum: 10. September 1964
  - Hoechste berufliche/oeffentliche Rolle: Gruender von Alibaba
  - Geschaetztes Vermoegen: ca. 30-50 Milliarden US-Dollar
  - **Rechenweg/Quellen:** Forbes (2024): Alibaba-Aktien (4,8% Anteil), Ant Group-Beteiligung, Immobilien, Investment-Portfolio. Schwankt mit Alibaba-Kurs und politischen Risiken. Zusaetzliche Quellen: Caixin, Financial Times, Wall Street Journal.
  - Kontroverseste Aussage: "996 ist ein Segen" (2019, Hangzhou)

### **Jennifer Doudna**

- **Unterkategorien:** Opinion Leader
- **Effect im Game:** Deine Initiatives mit "Wissenschaft" erhalten +1 Effect.
- **Synergie:** Biotech-Deck-Support fuer Wissenschafts-Strategien
- **Deckbuildingkosten:** 4 HP
- **Persoenliche Informationen:**
  - Staatsangehoerigkeit: US-Amerikanisch
  - Geburtsdatum: 19. Februar 1964
  - Hoechste berufliche/oeffentliche Rolle: Biochemikerin, Nobelpreistraegerin
  - Geschaetztes Vermoegen: ca. 10-20 Millionen US-Dollar
  - **Rechenweg/Quellen:** Schaetzung basierend auf: Nobelpreis-Geld (1,1 Mio USD), CRISPR-Patente, UC Berkeley-Gehalt, Biotech-Beratung, Buchverkaeufe ("A Crack in Creation"). Zusaetzliche Quellen: USPTO-Patente, Nature/Science-Profile.
  - Kontroverseste Aussage: "CRISPR koennte die Menschheit veraendern" (2015, Berkeley)

### **Malala Yousafzai**

- **Unterkategorien:** Bewegung
- **Effect im Game:** Wenn du eine NGO/Think-Tank spielst, ziehe 1 Karte.
- **Synergie:** Frauenrechtsdeck fuer soziale Bewegungen
- **Deckbuildingkosten:** 4 HP
- **Persoenliche Informationen:**
  - Staatsangehoerigkeit: Pakistanisch
  - Geburtsdatum: 12. Juli 1997
  - Hoechste berufliche/oeffentliche Rolle: Bildungsaktivistin, Nobelpreistraegerin
  - Geschaetztes Vermoegen: ca. 1-3 Millionen US-Dollar
  - **Rechenweg/Quellen:** Schaetzung basierend auf: Nobelpreis-Geld (1,1 Mio USD), Malala Fund-Spenden, Buchverkaeufe ("I Am Malala"), Redenhonorare, Oxford-Stipendium. Zusaetzliche Quellen: Charity Filings (UK/US), Verlagsangaben.
  - Kontroverseste Aussage: "Ein Kind, ein Lehrer, ein Buch, ein Stift koennen die Welt veraendern" (2013, New York)

### **Noam Chomsky**

- **Unterkategorien:** Opinion Leader
- **Effect im Game:** Gegner erhalten -1 Effect bei "Militaer"-Initiatives.
- **Synergie:** Anti-Imperialismus gegen Militaerstrategien
- **Deckbuildingkosten:** 5 HP
- **Persoenliche Informationen:**
  - Staatsangehoerigkeit: US-Amerikanisch
  - Geburtsdatum: 7. Dezember 1928
  - Hoechste berufliche/oeffentliche Rolle: Linguist und politischer Aktivist
  - Geschaetztes Vermoegen: ca. 5-10 Millionen US-Dollar
  - **Rechenweg/Quellen:** Schaetzung basierend auf: MIT-Gehalt (emeritiert), Buchverkaeufe (100+ Buecher), Redenhonorare, politische Spenden, bescheidener Lebensstil.
  - Kontroverseste Aussage: "Die USA sind der groeßte Terrorstaat der Welt" (2001, Cambridge)

### **Roman Abramovich**

- **Unterkategorien:** Oligarch
- **Effect im Game:** Ziehe 1 Karte, wenn eine Government Cards mit Power 5 oder weniger ausgespielt wird.
- **Synergie:** Korruptions-Trigger fuer schwache Regierungen
- **Deckbuildingkosten:** 6 HP
- **Persoenliche Informationen:**
  - Staatsangehoerigkeit: Russisch/Israelisch
  - Geburtsdatum: 24. Oktober 1966
  - Hoechste berufliche/oeffentliche Rolle: Unternehmer und Fußballclub-Besitzer
  - Geschaetztes Vermoegen: ca. 10-15 Milliarden US-Dollar
  - **Rechenweg/Quellen:** Forbes (2024): Evraz-Stahl, Chelsea FC-Verkauf (2,5 Mrd USD), Immobilien, Yachten, Kunstsammlung. Reduziert durch Sanktionen und Chelsea-Verkauf. Zusaetzliche Quellen: UK/EU-Sanktionslisten, Companies House, High Court Filings (2022), Bloomberg.
  - Kontroverseste Aussage: "Geld ist nicht das Wichtigste" (2003, London)

### **Tim Cook**

- **Unterkategorien:** Tech
- **Effect im Game:** Deine dauerhaften Initiatives kosten 1 HP weniger (nur beim Deckbuilding).
- **Synergie:** Techoptimierer fuer dauerhafte Strategien
- **Deckbuildingkosten:** 5 HP
- **Persoenliche Informationen:**
  - Staatsangehoerigkeit: US-Amerikanisch
  - Geburtsdatum: 1. November 1960
  - Hoechste berufliche/oeffentliche Rolle: CEO von Apple
  - Geschaetztes Vermoegen: ca. 1-2 Milliarden US-Dollar
  - **Rechenweg/Quellen:** Forbes (2024): Apple-Aktien (0,02% Anteil), CEO-Gehalt + Boni, RSU-Vesting, Philanthropie. Hauptquelle: Apple-Aktien und CEO-Kompensation. Zusaetzliche Quellen: SEC Form 4, Apple 10-K, Bloomberg.
  - Kontroverseste Aussage: "Privatsphaere ist ein Menschenrecht" (2016, Cupertino)

### **Mukesh Ambani**

- **Unterkategorien:** Oligarch
- **Effect im Game:** Ziehe 1 Karte. Gegner darf 1 Karte weniger nachziehen in der Round.
- **Synergie:** Kartenkontrolle durch Kapital
- **Deckbuildingkosten:** 6 HP
- **Persoenliche Informationen:**
  - Staatsangehoerigkeit: Indisch
  - Geburtsdatum: 19. April 1957
  - Hoechste berufliche/oeffentliche Rolle: CEO von Reliance Industries
  - Geschaetztes Vermoegen: ca. 80-100 Milliarden US-Dollar
  - **Rechenweg/Quellen:** Forbes (2024): Reliance Industries-Aktien (50,5% Anteil), Jio Telecom, Reliance Retail, Immobilien, Antilia-Residenz (1 Mrd USD). Hauptquelle: Reliance-Imperium. Zusaetzliche Quellen: Reliance Annual Report, SEBI-Filings, Bloomberg.
  - Kontroverseste Aussage: "Indien wird die digitale Supermacht" (2020, Mumbai)

### **Jeff Bezos**

- **Unterkategorien:** Oligarch
- **Effect im Game:** Ziehe 1 Karte beim Ausspielen. Wenn eine Plattform liegt: +1 Action Points (AP).
- **Synergie:** Dein Bestellknopf zur Power
- **Deckbuildingkosten:** 6 HP
- **Persoenliche Informationen:**
  - Staatsangehoerigkeit: US-Amerikanisch
  - Geburtsdatum: 12. Januar 1964
  - Hoechste berufliche/oeffentliche Rolle: Gruender und CEO von Amazon
  - Geschaetztes Vermoegen: ca. 150-200 Milliarden US-Dollar
  - **Rechenweg/Quellen:** Forbes (2024): Amazon-Aktien (9,6% Anteil), Blue Origin, Washington Post, Immobilien, Scheidung (25% an MacKenzie Scott). Schwankt mit Amazon-Kurs. Zusaetzliche Quellen: SEC Form 4/10-K, Bloomberg Billionaires Index.
  - Kontroverseste Aussage: "Amazon zahlt faire Loehne" (2018, Seattle)

### **Alisher Usmanov**

- **Unterkategorien:** Oligarch
- **Effect im Game:** +1 Schutz fuer eine Government Cards.
- **Synergie:** Russland-Oligarchen-Synergie
- **Deckbuildingkosten:** 6 HP
- **Persoenliche Informationen:**
  - Staatsangehoerigkeit: Russisch
  - Geburtsdatum: 9. September 1953
  - Hoechste berufliche/oeffentliche Rolle: Unternehmer und Investor
  - Geschaetztes Vermoegen: ca. 15-20 Milliarden US-Dollar
  - **Rechenweg/Quellen:** Forbes (2024): Metalloinvest, USM Holdings, Arsenal FC-Anteil, Immobilien, Kunstsammlung. Reduziert durch Sanktionen und Vermoegensverluste. Zusaetzliche Quellen: EU/UK-Sanktionslisten, Bloomberg, Financial Times.
  - Kontroverseste Aussage: "Russland ist ein demokratisches Land" (2012, Moskau)

### **Zhang Yiming (TikTok)**

- **Unterkategorien:** Tech, Oligarch
- **Effect im Game:** Ziehe 1 Karte. Bei Medien auf dem Feld: -1 Action Points (AP) auf deine naechste Initiative.
- **Synergie:** Algorithmus-Synergie
- **Deckbuildingkosten:** 6 HP
- **Persoenliche Informationen:**
  - Staatsangehoerigkeit: Chinesisch
  - Geburtsdatum: 1. April 1983
  - Hoechste berufliche/oeffentliche Rolle: Gruender von ByteDance (TikTok)
  - Geschaetztes Vermoegen: ca. 40-60 Milliarden US-Dollar
  - **Rechenweg/Quellen:** Forbes (2024): ByteDance-Bewertung (300 Mrd USD), TikTok-Anteil (ca. 20%), Douyin, andere Apps. Ungewiss wegen privater Bewertung und politischen Risiken. Zusaetzliche Quellen: Bloomberg, The Information, South China Morning Post.
  - Kontroverseste Aussage: "TikTok ist unabhaengig von China" (2020, Peking)

### **Edward Snowden**

- **Unterkategorien:** Intelligenz
- **Effect im Game:** Gegner verliert 1 Karte (zufaellig). Bei US-Government Cards: -1 Influence dort.
- **Synergie:** Aufklaerung/Transparenz gegen Ueberwachung
- **Deckbuildingkosten:** 5 HP
- **Persoenliche Informationen:**
  - Staatsangehoerigkeit: US-Amerikanisch
  - Geburtsdatum: 21. Juni 1983
  - Hoechste berufliche/oeffentliche Rolle: Whistleblower und ehemaliger NSA-Mitarbeiter
  - Geschaetztes Vermoegen: ca. 1-2 Millionen US-Dollar
  - **Rechenweg/Quellen:** Schaetzung basierend auf: Buchverkaeufe ("Permanent Record"), Dokumentarfilm-Rechte, Redenhonorare, Crowdfunding, russisches Asyl. Begrenzt durch politische Situation. Zusaetzliche Quellen: The Guardian, NYT, Verlagsangaben.
  - Kontroverseste Aussage: "Die NSA ueberwacht jeden" (2013, Hongkong)

### **Julian Assange**

- **Unterkategorien:** Intelligenz
- **Effect im Game:** Beim Ausspielen: +1 Karte, aber auch Gegner zieht 1. Bei NGO auf dem Feld: Ziehe 2 statt 1.
- **Synergie:** Informationsfreiheit fuer Transparenz
- **Deckbuildingkosten:** 5 HP
- **Persoenliche Informationen:**
  - Staatsangehoerigkeit: Australisch
  - Geburtsdatum: 3. Juli 1971
  - Hoechste berufliche/oeffentliche Rolle: Gruender von WikiLeaks
  - Geschaetztes Vermoegen: ca. 1-5 Millionen US-Dollar
  - **Rechenweg/Quellen:** Schaetzung basierend auf: WikiLeaks-Spenden, Buchverkaeufe, Dokumentarfilm-Rechte, Crowdfunding, Rechtskosten. Begrenzt durch politische Verfolgung und Haft. Zusaetzliche Quellen: The Guardian Investigations, Court Filings, Spendenreports.
  - Kontroverseste Aussage: "Die Wahrheit wird frei sein" (2010, London)

### **Yuval Noah Harari**

- **Unterkategorien:** Intelligenz
- **Effect im Game:** Deine naechste dauerhafte Initiative kostet 1 Action Points (AP) weniger. +1 Action Points (AP), wenn auch Plattform liegt.
- **Synergie:** Posthumanismus/Plattform-Kombi
- **Deckbuildingkosten:** 5 HP
- **Persoenliche Informationen:**
  - Staatsangehoerigkeit: Israelisch
  - Geburtsdatum: 24. Februar 1976
  - Hoechste berufliche/oeffentliche Rolle: Historiker und Autor
  - Geschaetztes Vermoegen: ca. 5-10 Millionen US-Dollar
  - **Rechenweg/Quellen:** Schaetzung basierend auf: Buchverkaeufe ("Sapiens", "Homo Deus", "21 Lessons"), Redenhonorare (50.000+ USD pro Vortrag), Hebrew University-Gehalt, internationale Vortraege. Zusaetzliche Quellen: Verlagsangaben, Speaker Bureau Ratecards.
  - Kontroverseste Aussage: "Die Menschen werden ueberfluessig" (2018, Davos)

### **Ai Weiwei**

- **Unterkategorien:** Intelligenz, Bewegung
- **Effect im Game:** Bei einer Kunst/Kultur-Initiative: ziehe 1 Karte + 1 Action Points (AP) zurueck.
- **Synergie:** Kunst-Aktivismus fuer kreative Strategien
- **Deckbuildingkosten:** 5 HP
- **Persoenliche Informationen:**
  - Staatsangehoerigkeit: Chinesisch
  - Geburtsdatum: 28. August 1957
  - Hoechste berufliche/oeffentliche Rolle: Kuenstler und Aktivist
  - Geschaetztes Vermoegen: ca. 10-20 Millionen US-Dollar
  - **Rechenweg/Quellen:** Schaetzung basierend auf: Kunstverkaeufe, Ausstellungen, Dokumentarfilme, Buchverkaeufe, internationale Galerien. Begrenzt durch politische Verfolgung und Vermoegensbeschlagnahmung. Zusaetzliche Quellen: Sotheby's/Christie's Auktionsdaten, Artnet.
  - Kontroverseste Aussage: "Kunst ist ein politischer Akt" (2011, Peking)

### **Alexei Navalny**

- **Unterkategorien:** Bewegung, Intelligenz
- **Effect im Game:** Bei Ausloesen einer gegnerischen Intervention: ziehe 1 Karte.
- **Synergie:** Widerstands-Synergie gegen autoritaere Regime
- **Deckbuildingkosten:** 5 HP
- **Persoenliche Informationen:**
  - Staatsangehoerigkeit: Russisch
  - Geburtsdatum: 4. Juni 1976
  - Hoechste berufliche/oeffentliche Rolle: Oppositioneller und Aktivist
  - Geschaetztes Vermoegen: ca. 1-5 Millionen US-Dollar
  - **Rechenweg/Quellen:** Schaetzung basierend auf: Anti-Corruption Foundation-Spenden, YouTube-Kanal, Buchverkaeufe, internationale Unterstuetzung. Begrenzt durch politische Verfolgung und Haft. Zusaetzliche Quellen: ACF-Finanzberichte, Bellingcat.
  - Kontroverseste Aussage: "Putin ist ein Dieb" (2017, Moskau)

### **Anthony Fauci**

- **Unterkategorien:** Intelligenz, NGO/Think-Tank
- **Effect im Game:** Bei einer Gesundheits-Initiative: +1 Effect.
- **Synergie:** Wissenschaftliche Expertise fuer Gesundheitsstrategien
- **Deckbuildingkosten:** 5 HP
- **Persoenliche Informationen:**
  - Staatsangehoerigkeit: US-Amerikanisch
  - Geburtsdatum: 24. Dezember 1940
  - Hoechste berufliche/oeffentliche Rolle: Direktor des NIAID
  - Geschaetztes Vermoegen: ca. 10-20 Millionen US-Dollar
  - **Rechenweg/Quellen:** Schaetzung basierend auf: NIAID-Gehalt (400.000+ USD/Jahr), Buchverkaeufe, Redenhonorare, Beratungstaetigkeiten, 50+ Jahre Regierungsdienst. Zusaetzliche Quellen: US Office of Government Ethics Disclosures, OpenTheBooks, NIH-Payroll.
  - Kontroverseste Aussage: "Ich bin die Wissenschaft" (2020, Washington)

### **Warren Buffett**

- **Unterkategorien:** Oligarch, Intelligenz
- **Effect im Game:** Ziehe 1 Karte. Bei einer Wirtschafts-Initiative: +1 Effect.
- **Synergie:** Investment-Expertise fuer Wirtschaftsstrategien
- **Deckbuildingkosten:** 7 HP
- **Persoenliche Informationen:**
  - Staatsangehoerigkeit: US-Amerikanisch
  - Geburtsdatum: 30. August 1930
  - Hoechste berufliche/oeffentliche Rolle: CEO von Berkshire Hathaway
  - Geschaetztes Vermoegen: ca. 100-150 Milliarden US-Dollar
  - **Rechenweg/Quellen:** Forbes (2024): Berkshire Hathaway-Aktien (16,2% Anteil), Investment-Portfolio, Philanthropie-Abgaben (50+ Mrd USD gespendet). Hauptquelle: Berkshire-Imperium. Zusaetzliche Quellen: SEC 13F, Berkshire Annual Letter, Bloomberg.
  - Kontroverseste Aussage: "Reiche sollten mehr Steuern zahlen" (2011, Omaha)

### **Gautam Adani**

- **Unterkategorien:** Oligarch
- **Effect im Game:** Ziehe 1 Karte. Bei einer Infrastruktur-Initiative: +1 Effect.
- **Synergie:** Infrastruktur-Expertise fuer Entwicklungsstrategien
- **Deckbuildingkosten:** 6 HP
- **Persoenliche Informationen:**
  - Staatsangehoerigkeit: Indisch
  - Geburtsdatum: 24. Juni 1962
  - Hoechste berufliche/oeffentliche Rolle: CEO der Adani Group
  - Geschaetztes Vermoegen: ca. 50-100 Milliarden US-Dollar
  - **Rechenweg/Quellen:** Forbes (2024): Adani Group-Aktien (74% Anteil), Infrastruktur, Haefen, Energie, Bergbau. Schwankt stark - Hindenburg-Report fuehrte zu 100+ Mrd USD Verlust.
  - Kontroverseste Aussage: "Indien wird die Supermacht des 21. Jahrhunderts" (2022, Mumbai)

---

## Wie funktionieren Oeffentlichkeitskategorien zusammen?

### **Oligarch + Plattform Kombination**

**Example:** Elon Musk (Oligarch + Plattform)

- **Effect:** Beim Ausspielen ziehst du 1 Karte (Oligarch) + nach Initiatives 1 AP zurueck (Plattform)
- **Warum funktioniert das?** Du bekommst mehr Karten UND mehr Action Points = Tempo

### **Bewegung + Government Cards**

**Example:** Greta Thunberg (Bewegung) + jede Government Cards

- **Effekt:** Erste Government Cards kostenlos → schneller Aufbau von Einfluss
- **Warum funktioniert das?** Du sparst Action Points und kannst mehr machen

### **NGO/Think-Tank + Initiatives**

**Example:** Bill Gates (NGO/Think-Tank) + Initiatives

- **Effect:** Naechste Initiative kostet 1 AP weniger
- **Warum funktioniert das?** Du kannst mehr Initiatives spielen = Kontrolle

### **Intelligenz + thematische Boni**

**Example:** Jennifer Doudna (Intelligenz) + Wissenschafts-Initiatives

- **Effect:** Wissenschafts-Initiatives bekommen +1 Effect
- **Warum funktioniert das?** Spezialisierte Decks werden staerker

### **Medien + Kartenfluss**

**Example:** Oprah Winfrey (Medien) + Initiatives

- **Effect:** Bei Initiatives: 1 Karte abwerfen, 1 ziehen
- **Warum funktioniert das?** Du verbesserst deine Handqualitaet

---

## Synergie-Strategien

### **Tempo-Strategie**

- **Karten:** Oligarch + Plattform + Leadership-Government Cards
- **Effect:** Viele Aktionen in wenigen Zuegen
- **Example:** Elon Musk + Mark Zuckerberg + Justin Trudeau

### **Kontroll-Strategie**

- **Karten:** NGO/Think-Tank + Intelligenz + Initiatives
- **Effect:** Gegnerische Aktionen blockieren
- **Example:** Bill Gates + Noam Chomsky + "Oppositionsblockade"

### **Influence-Strategie**

- **Karten:** Bewegung + Government Cards + "Wirtschaftlicher Druck"
- **Effekt:** Schneller Einflussaufbau
- **Example:** Greta Thunberg + Vladimir Putin + "Wirtschaftlicher Druck"
