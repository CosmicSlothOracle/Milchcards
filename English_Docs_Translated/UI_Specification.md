# Politicard – UI-Spezifikation

Diese Datei beschreibt die Nutzeroberflaeche (UI) normativ und regelkonform. Begriffe und Regeln verweisen auf `Ruleset_und_Examplee.md` und `Gamebegriffe_Glossary.md` und muessen mit diesen Dokumenten uebereinstimmen.

---

## In-Rounds UI (waehrend der Round/Gamezug)

### Interaktion

-
- Hover/Fokus: Kontextaktionen oeffnen
-
- Aktionenlimit: Pro Zug maximal 2 Kartenaktionen; UI blockiert weitere Kartenaktionen (auch bei mehr AP)

### Gamefeld-Layout

- Gameer (16:9 Layout `ui_layout_1920x1080.json`)
  - Regierungsreihe: mittlerer Bereich (5 Slots)
  - Oeffentlichkeitsreihe: darunter (5 Slots)
  - Spezial-Slots (Dauerhaft): rechts (1 fuer Regierung, 1 fuer Oeffentlichkeit)
  - Initiatives (Instant) – Aktivierungsfeld: rechts oben (neben den Spezial-Slots)
  - Interventions: unten als schmale Leiste (verdeckte Karten)
  - Hand: unten, einzige Zone mit ueberlappender Darstellung
- Gegner (16:9 Layout `ui_layout_1920x1080.json`)
  - Reihen: oberer Bereich, 5 Slots pro Reihe (Regierung oben ueber der Gameer-Regierungsreihe; Oeffentlichkeit darueber)
  - Spezial-Slots (eine Reihe oben rechts): Oeffentlichkeit → Regierung → Initiatives (Instant)
  - Hand: wird nicht angezeigt
  - Darstellung: Karten um 180° gedreht (Labels/Overlays ungedreht)

### Gesten und Shortcuts

- R: Government Cards spielen
- O: Public Cards spielen
- I: Gamestatus-Modal ein-/ausblenden
- D: Initiatives (Ongoing) spielen
- F: Intervention setzen
- P: Passen

### Skalierung und Feedback

- Responsive Grid: Passt sich an Bildschirmgroeße an
- Karten stapeln: Mit Badges fuer Boni/Mali
- Stack-Log: Rechts (deterministische Aufloesung)
- Undo/Redo: Als Zeitstrahl (AP-sicher)

### Aufloesungsreihenfolge (UI-Abbildung)

- Reihenfolge: Interventions → Initiatives (Instant) → Passive Effecte → Aktive Effecte
- Darstellung: Stack-Log zeigt Quelle, Effect, Zeitpunkt in dieser Reihenfolge

### UI-Begriffe

- Stack-Log: Chronologisches Protokoll aller ausgeloesten/aufgeloesten Effecte mit Quelle und Reihenfolge.
- Undo/Redo (AP-sicher): Rueckgaengig/Wiederholen von Gameschritten, ohne das Aktionenlimit zu verletzen; AP- und Zustandssynchronitaet garantiert.

### Visuelle Elemente

- Action Points (AP): Große Zahl oben
- Influence: Summe unter der Regierungsreihe
- Hand Cards: Unten mit Costanzeige
- Hand Limit (10): Visuelles Feedback bei Erreichen/Ueberschreiten
- Deck: Kleiner Stapel rechts
- Ablagestapel: Offen sichtbar

### Komponenten (Minimum)

- Handbereich: Scroll-/Kachel-Ansicht mit Karten, zeigt Cost/Typ klar an
- Reihen (Anzeige im 16:9 Layout): Gameer 5 Slots; Gegner 5 Slots
- Spezial-Slots: Zwei dedizierte Slots (Regierung/Oeffentlichkeit) fuer den Gameer rechts; Gegner-Spezial oben rechts in einer Reihe (Oeffentlichkeit → Regierung → Initiatives (Instant))
- Interventions-Zone: Verdeckte Karten mit Zaehler (x verdeckt)
- AP-Anzeige und Aktionenlimit-Indikator (0/2, 1/2, 2/2)
- Stack-Log-Panel rechts
- Layout-Map: `UI Mapping/ui_layout_1920x1080.json` definiert Zonen (Rects, Slots, Z-Order) fuer 16:9

### Interaktionsregeln (normativ)

- Nach Erreichen von 2 Kartenaktionen ist Drag-and-Drop fuer weitere Kartenaktionen gesperrt; nicht-kartenbezogene Aktionen (Passen) bleiben moeglich
- `Initiatives (Instant)` loesen unmittelbar Effecte aus und erscheinen im Stack-Log
- `Initiatives (Ongoing)` duerfen nur in ihren jeweiligen `Spezial-Slot` gelegt werden; Belegen ersetzt existierende Karte im selben Slot
- Reihenfolge der Aufloesung wird im Stack-Log vollstaendig protokolliert
- **Hand Cards-Modal:** Doppelklick auf ausgewaehlte Hand Cards oeffnet Detailansicht mit automatischer Platzierungsfunktion

### Fehler- und Randzustaende

- Hand Limit erreicht: Neue Zieh-Effecte zeigen Hinweis; Ueberschreitung wird durch Regeln verhindert/abgefangen
- Deaktivierte Karten: Sichtbarer Statusmarker; passive/aktive Effecte als deaktiviert markiert, Influence bleibt gezaehlt
- Schutz: Marker „Schutz"; naechster negativer Effect wird im Stack-Log als „verhindert" ausgewiesen

### Gamestatus-Modal (GameInfoModal)

- **Sichtbarkeit:** Nur waehrend des Games (nicht im Deckbuilder)
- **Erscheinung:** Halbtransparentes, verschieb- und groeßenveraenderbares Modal
- **Position:** Frei positionierbar per Drag & Drop
- **Groeßenaenderung:** Ueber Resize-Handle in der unteren rechten Ecke
- **Transparenz:** Fast vollstaendig transparent (5% Deckkraft) mit duennem weißen Rand (1px solid)
- **Keyboard-Shortcut:** 'I'-Taste zum Ein-/Ausblenden

#### Angezeigte Informationen:

- **Gamephase:** Aktuelle Round oder "Roundnauswertung"
- **Gameer-Zug:** Live-Status mit AP-Anzeige ("Dein Zug - 2 AP uebrig (0/2 Aktionen)" oder "Gegner am Zug")
- **Influencepunkte:**
  - Eigene und gegnerische Punkte prominent dargestellt (32px, fett, zentriert)
  - Animationen bei Punkteaenderungen:
    - Gruen + Skalierung 1.2x bei Zuwachs (success)
    - Rot + Skalierung 0.9x bei Verlust (loss)
    - Gold bei Fuehrung (winning), Grau bei Rueckstand (losing)
    - Leuchteffekt (Text-Shadow) entsprechend der Animation
- **Ereignis-Log:**
  - Scrollbares Feld fuer Gameereignisse (max. 120px Hoehe)
  - Auto-Scroll zum neuesten Eintrag
  - Timestamped entries ([HH:MM:SS] Format)
  - Live-Updates bei Gameaktionen und Zustandsaenderungen
  - Chronologische Auflistung aller Effecte und Synergien

#### Technische Spezifikation:

- Mindestgroeße: 250px × 300px
- Standardgroeße: 320px × 400px
- Z-Index: 1000 (ueber Gamefeld, unter Deckbuilder)
- Backdrop-Filter: blur(2px)
- Hintergrund: rgba(13, 22, 33, 0.05)
- Border: 1px solid rgba(255, 255, 255, 1)
- Border-Radius: 12px
- Box-Shadow: 0 20px 60px rgba(0, 0, 0, 0.4)

### Hand Cards-Detailmodal (HandCardModal)

- **Aktivierung:** Doppelklick auf bereits ausgewaehlte Hand Cards
- **Sichtbarkeit:** Nur waehrend des Games (nicht im Deckbuilder)
- **Groeße:** 50% der Deckbuilder-Modalansicht (35vw × 45vh)
- **Z-Index:** 1500 (ueber allem anderen)

#### Darstellung:

- **Kartenbild:** 512×512px (50% von 1024px) mit Deckbuilder-Styling
- **Navigation:** Pfeilbuttons links/rechts fuer Hand Cards-Navigation
- **Karteninformationen:** Kompakte Darstellung mit Typ, Cost, Gameeffekt
- **Kartenzaehler:** "Karte X von Y" Anzeige

#### Interaktion:

- **Pfeiltasten:** Links/Rechts fuer Navigation durch sortierte Hand
- **Enter-Taste:** Aktiviert automatisches Gameen
- **Escape-Taste:** Schließt Modal
- **Gruener Button:** "Automatisch spielen" (pulsierender Effect)

#### Automatische Platzierung:

- **Freie Slots:** Karte wird automatisch in passenden Slot gelegt
- **Volle Slots:** Button wird orange, Text aendert sich zu "Karte zum Tauschen waehlen"
- **Ersetzung:** Gameer muss auf zu ersetzende Karte klicken
- **Nach Platzierung:** Modal schließt sich automatisch

#### Slot-Zuordnung:

- **Government Cards:** Automatisch in `aussen` (Regierung) oder `innen` (Oeffentlichkeit)
- **Dauerhaft-Initiatives:** In entsprechende permanente Slots
- **Instant-Initiatives:** In Instant-Slot
- **Interventions:** In Interventions-Strip

#### Technische Spezifikation:

- Backdrop: rgba(0,0,0,0.8)
- Weißer Border: 3px solid #ffffff
- Border-Radius: 16px
- Pulse Animation: 2s infinite fuer Button
- Keyboard Event Handling: Arrow keys, Enter, Escape

---

## Deckbuilder UI (vor Gamebeginn – Deckerstellung)

Muss u. a. sicherstellen/anzeigen:

- Deckgroeße: 25 Karten
- Budget: 108 HP gesamt (Summe der HP aller Karten)
- Karten-HP pro Karte sichtbar
- Validierung und Feedback bei Regelverstoeßen (z. B. Budget- oder Groeßenueberschreitung)

### Deckbuilder-Interaktion und Feedback

- Zaehler: Live-Anzeige fuer Deckgroeße (x/25) und Budget (verbraucht/108 HP)
- Filter/Sortierung: Nach Kartentyp (Regierung/Oeffentlichkeit/Initiatives/Interventions), Unterkategorie, Keyword, Tier, HP, Power
- Fehlerzustaende: Deutliches, persistentes Banner bei Regelverstoeßen; Start/Export nur moeglich, wenn gueltig
- Aktionen: Deck speichern/laden, Deck leeren, Karte hinzufuegen/entfernen mit sofortigem Budget-/Zaehler-Update

### Validierungsregeln (normativ)

- Deckgroeße muss exakt 25 Karten betragen
- Summe der HP aller Karten ≤ 108 HP; UI verhindert Start/Export bei Ueberschreitung
- Karten zeigen HP und relevante Schluesselwoerter (z. B. `Leadership`, `Plattform`, `Oligarch`) an
- Spezial-Slots sind nicht Teil der Deckgroeße; `Initiatives (Ongoing)` sind normale Deckkarten, werden aber im Game in Spezial-Slots gelegt
