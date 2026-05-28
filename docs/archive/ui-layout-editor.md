# UI Layout Editor - Mandate Game

## Übersicht

Der UI Layout Editor ist ein visueller Editor für das Mandate Game, der es ermöglicht, die Position und Größe aller UI-Elemente (Karten-Slots, Hand-Bereiche, etc.) zu bearbeiten und zu exportieren.

## Features

- **Drag & Drop**: Ziehe UI-Elemente mit der Maus
- **Snap-to-Grid**: Automatisches Einrasten an ein konfigurierbares Raster
- **Resize Handles**: Größe von Elementen mit Ziehpunkten ändern
- **Hintergrund-Bilder**: Lade PNG/JPG als Hintergrund für präzise Positionierung
- **JSON Import/Export**: Speichere und lade Layouts
- **PNG Export**: Exportiere Layout als Bild
- **Game Format Export**: Exportiere direkt im Spiel-Format

## Bedienung

### Navigation

- **U-Taste**: Wechsel zwischen Game und UI Editor
- **Maus**: Drag & Drop für Position
- **Ziehpunkte**: Größe ändern (erscheinen bei Auswahl)

### Keyboard Shortcuts

- **Delete/Backspace**: Ausgewähltes Element löschen
- **Ctrl/Cmd + D**: Element duplizieren
- **L**: Element sperren/entsperren

### Toolbar

- **Canvas-Größe**: Breite, Höhe und Raster-Größe einstellen
- **Element-Typen**: Neue Slots hinzufügen (Government, Public, Dauerhaft, Sofort, Other)
- **Anzeige**: Grid und Labels ein-/ausschalten
- **Export**: JSON, PNG oder Game Format exportieren
- **Import**: JSON-Dateien oder Hintergrund-Bilder laden

## Element-Typen

### Government

- Für Regierungskarten
- Standard-Farbe: Grün (#4ade80)

### Public (Öffentlichkeit)

- Für Öffentlichkeitskarten
- Standard-Farbe: Blau (#60a5fa)

### Dauerhaft

- Für permanente Effekte
- Standard-Farbe: Orange (#f59e0b)

### Sofort

- Für sofortige Effekte
- Standard-Farbe: Pink (#f472b6)

### Other

- Für andere Elemente (z.B. Hand-Bereiche)
- Standard-Farbe: Lila (#a78bfa)

## Export-Formate

### JSON (Editor-Format)

```json
{
  "canvas": {
    "width": 1920,
    "height": 1080,
    "grid": 16
  },
  "slots": [
    {
      "id": "government-1",
      "name": "government-1",
      "type": "government",
      "x": 24,
      "y": 300,
      "width": 256,
      "height": 256,
      "color": "#4ade80",
      "locked": false
    }
  ]
}
```

### Game Format

Exportiert im Format, das das Spiel direkt verwenden kann. Wird als `ui_layout_1920x1080.json` gespeichert.

### PNG

Exportiert das Layout als Bild mit Grid und Labels.

## Integration ins Spiel

1. **Layout erstellen**: Verwende den Editor, um dein Layout zu gestalten
2. **Game Format exportieren**: Klicke auf "Export Game Format"
3. **Datei ersetzen**: Ersetze `src/ui/ui_layout_1920x1080.json` mit der exportierten Datei
4. **Spiel neu starten**: Das neue Layout wird automatisch geladen

## Standard-Layout

Das Standard-Layout enthält alle wichtigen UI-Elemente des Mandate Games:

- **Player Government Row**: 5 Slots für Regierungskarten
- **Player Public Row**: 5 Slots für Öffentlichkeitskarten
- **Player Permanent Slots**: Dauerhafte Effekte
- **Opponent Rows**: Gegner-Slots (kleiner)
- **Hand Areas**: Karten-Hand-Bereiche

## Tipps

1. **Hintergrund verwenden**: Lade ein Screenshot der aktuellen UI als Hintergrund für präzise Positionierung
2. **Grid nutzen**: Verwende das Grid für saubere Ausrichtung
3. **Labels aktivieren**: Zeige Namen und Typen für bessere Übersicht
4. **Lock verwenden**: Sperre fertige Elemente gegen versehentliche Änderungen
5. **Regelmäßig speichern**: Exportiere dein Layout regelmäßig als JSON

## Technische Details

- **Framework**: React + TypeScript
- **Keine externen Abhängigkeiten**: Verwendet nur HTML5 Canvas und DOM-APIs
- **Responsive**: Funktioniert auf verschiedenen Bildschirmgrößen
- **Performance**: Optimiert für große Layouts mit vielen Elementen

## Troubleshooting

### Elemente lassen sich nicht bewegen

- Prüfe, ob das Element gesperrt ist (Locked-Checkbox)
- Stelle sicher, dass das Element ausgewählt ist

### Export funktioniert nicht

- Prüfe Browser-Konsole auf Fehler
- Stelle sicher, dass Popup-Blocker deaktiviert sind

### Layout wird nicht geladen

- Prüfe JSON-Format auf Syntax-Fehler
- Stelle sicher, dass alle erforderlichen Felder vorhanden sind

