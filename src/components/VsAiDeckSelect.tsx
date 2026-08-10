import React, { useMemo, useState } from 'react';
import { PRESET_DECKS, presetToBuilderEntries } from '../data/presetDecks';
import { BuilderEntry } from '../types/game';

interface VsAiDeckSelectProps {
  onStart: (p1Deck: BuilderEntry[], deckName: string) => void;
  onBack: () => void;
}

const fieldStyle: React.CSSProperties = {
  background: 'var(--surface-default)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-md)',
  padding: '10px 14px',
  color: 'var(--content-primary)',
  fontSize: 14,
  fontFamily: 'var(--font-ui)',
  minWidth: 260,
  width: '100%',
};

export const VsAiDeckSelect: React.FC<VsAiDeckSelectProps> = ({ onStart, onBack }) => {
  const [selected, setSelected] = useState<string>('__random__');

  const preview = useMemo(() => {
    const preset =
      selected === '__random__'
        ? null
        : PRESET_DECKS.find((d) => d.name === selected) ?? null;
    if (!preset) {
      return { name: 'Zufällig', count: '—', cards: [] as string[] };
    }
    return { name: preset.name, count: String(preset.cards.length), cards: preset.cards.slice(0, 4) };
  }, [selected]);

  const handleStart = () => {
    const preset =
      selected === '__random__'
        ? PRESET_DECKS[Math.floor(Math.random() * PRESET_DECKS.length)]
        : PRESET_DECKS.find((d) => d.name === selected) ?? PRESET_DECKS[0];
    const entries = presetToBuilderEntries(preset);
    onStart(entries, preset.name);
  };

  return (
    <div className="mc-screen mc-screen--enter" style={{ gap: 'clamp(16px, 4vh, 28px)' }}>
      <h2 className="mc-brand__title" style={{ fontSize: 'clamp(26px, 8vw, 40px)' }}>
        VS KI
      </h2>
      <p style={{ color: 'var(--content-muted)', fontSize: 14, maxWidth: 420, textAlign: 'center', margin: 0 }}>
        Wähle ein Premade-Deck. Die KI erhält automatisch ein anderes.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', width: 'min(360px, 92vw)' }}>
        <label style={{ fontSize: 12, color: 'var(--content-muted)', letterSpacing: 1, width: '100%' }}>
          DEIN DECK
          <div style={{ marginTop: 6 }}>
            <select value={selected} onChange={(e) => setSelected(e.target.value)} style={fieldStyle} aria-label="Premade-Deck wählen">
              <option value="__random__">Zufällig</option>
              {PRESET_DECKS.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name} ({d.cards.length})
                </option>
              ))}
            </select>
          </div>
        </label>

        <div
          className="mc-panel"
          style={{
            width: '100%',
            padding: '14px 16px',
            fontSize: 13,
            color: 'var(--content-secondary)',
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 700, color: 'var(--content-primary)', marginBottom: 4 }}>
            {preview.name}
            {preview.count !== '—' ? ` · ${preview.count} Karten` : ''}
          </div>
          {preview.cards.length > 0 && (
            <div style={{ color: 'var(--content-muted)' }}>
              u. a. {preview.cards.join(', ')}…
            </div>
          )}
        </div>

        <button type="button" className="mc-btn mc-btn--primary" style={{ width: '100%' }} onClick={handleStart}>
          Match starten
        </button>
        <button type="button" className="mc-btn mc-btn--ghost" onClick={onBack}>
          Zurück
        </button>
      </div>
    </div>
  );
};
