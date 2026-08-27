import React, { useState } from 'react';
import { PvpStatus } from '../hooks/usePvpSession';
import { PvpRole } from '../pvp/pvpRole';
import { PRESET_DECKS } from '../data/presetDecks';

interface PvpLobbyProps {
  configured: boolean;
  role: PvpRole;
  status: PvpStatus;
  roomCode: string | null;
  error: string | null;
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  onStartMatch: (p1DeckName: string, p2DeckName: string) => void;
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
  minWidth: 240,
};

export const PvpLobby: React.FC<PvpLobbyProps> = ({
  configured,
  role,
  status,
  roomCode,
  error,
  onCreateRoom,
  onJoinRoom,
  onStartMatch,
  onBack,
}) => {
  const [joinCode, setJoinCode] = useState('');
  const [p1Deck, setP1Deck] = useState<string>('__random__');
  const [p2Deck, setP2Deck] = useState<string>('__random__');
  const isHost = role === 'host';
  const isHostWaiting = isHost && status === 'waiting';
  const isReady = status === 'ready';
  const inRoom = Boolean(roomCode);

  const resolveDeck = (value: string) => {
    if (value === '__random__') {
      return PRESET_DECKS[Math.floor(Math.random() * PRESET_DECKS.length)].name;
    }
    return value;
  };

  return (
    <div className="mc-screen mc-screen--enter" style={{ gap: 'clamp(16px, 4vh, 24px)' }}>
      <h2 className="mc-brand__title" style={{ fontSize: 'clamp(26px, 8vw, 40px)' }}>
        1v1 ONLINE
      </h2>

      {!configured && (
        <div
          className="mc-panel"
          style={{
            maxWidth: 480,
            textAlign: 'center',
            padding: '20px 24px',
            background: 'var(--feedback-negative-subtle)',
            borderColor: 'color-mix(in srgb, var(--rose-500) 40%, transparent)',
            color: 'var(--rose-800)',
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          <strong>PvP ist nicht verfügbar.</strong>
          <br />
          Das Online-Spiel läuft über Netlify Functions + Blobs.
          Lokal funktioniert es mit <code>netlify dev</code>.
        </div>
      )}

      {configured && !inRoom && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center', width: 'min(360px, 92vw)' }}>
          <button type="button" className="mc-btn mc-btn--primary" style={{ width: '100%' }} onClick={onCreateRoom}>
            Raum erstellen (Host)
          </button>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', width: '100%', flexWrap: 'wrap', justifyContent: 'center' }}>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="RAUMCODE"
              maxLength={6}
              aria-label="Raumcode eingeben"
              name="room-code"
              inputMode="text"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              style={{
                ...fieldStyle,
                minWidth: 0,
                width: 170,
                padding: '14px 16px',
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: 4,
                textAlign: 'center',
                textTransform: 'uppercase',
              }}
            />
            <button
              type="button"
              className="mc-btn mc-btn--secondary"
              onClick={() => joinCode.trim() && onJoinRoom(joinCode)}
              disabled={joinCode.trim().length < 4}
            >
              Beitreten
            </button>
          </div>
        </div>
      )}

      {configured && inRoom && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center', width: 'min(360px, 92vw)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--content-muted)', letterSpacing: 2, marginBottom: 8 }}>
              RAUMCODE
            </div>
            <div
              className="mc-panel"
              style={{
                fontSize: 'clamp(28px, 9vw, 42px)',
                fontWeight: 800,
                letterSpacing: '0.22em',
                color: 'var(--player-strong)',
                fontFamily: 'var(--font-display)',
                padding: '12px 28px',
                userSelect: 'all',
                background: 'var(--feedback-positive-subtle)',
                borderColor: 'color-mix(in srgb, var(--sage-500) 45%, transparent)',
              }}
            >
              {roomCode}
            </div>
          </div>

          {isHostWaiting && (
            <div style={{ color: 'var(--content-muted)', fontSize: 14 }}>
              Warte auf Mitspieler … Teile den Code!
            </div>
          )}

          {isReady && isHost && (
            <div style={{ color: 'var(--player-strong)', fontSize: 14, fontWeight: 700 }}>
              Mitspieler verbunden!
            </div>
          )}

          {isReady && !isHost && (
            <div style={{ color: 'var(--player-strong)', fontSize: 14, fontWeight: 700 }}>
              Verbunden – warte auf Spielstart durch den Host…
            </div>
          )}

          {isHost && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
              <label style={{ fontSize: 12, color: 'var(--content-muted)', letterSpacing: 1 }}>
                DECK SPIELER 1 (Host)
                <div style={{ marginTop: 6 }}>
                  <select value={p1Deck} onChange={(e) => setP1Deck(e.target.value)} style={fieldStyle}>
                    <option value="__random__">Zufällig</option>
                    {PRESET_DECKS.map((d) => (
                      <option key={d.name} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </label>
              <label style={{ fontSize: 12, color: 'var(--content-muted)', letterSpacing: 1 }}>
                DECK SPIELER 2 (Gast)
                <div style={{ marginTop: 6 }}>
                  <select value={p2Deck} onChange={(e) => setP2Deck(e.target.value)} style={fieldStyle}>
                    <option value="__random__">Zufällig</option>
                    {PRESET_DECKS.map((d) => (
                      <option key={d.name} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </label>
            </div>
          )}

          {isHost && (
            <button
              type="button"
              className="mc-btn mc-btn--primary"
              style={{ width: 'min(300px, 92vw)' }}
              onClick={() => onStartMatch(resolveDeck(p1Deck), resolveDeck(p2Deck))}
              disabled={!isReady}
            >
              Spiel starten
            </button>
          )}

          {isReady && isHost && (
            <div style={{ color: 'var(--content-muted)', fontSize: 12, maxWidth: 380, textAlign: 'center' }}>
              Wähle Premade-Decks für beide Spieler oder lasse sie zufällig zuweisen.
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{ color: 'var(--feedback-negative)', fontSize: 14, maxWidth: 420, textAlign: 'center' }}>
          {error}
        </div>
      )}

      <button type="button" className="mc-btn mc-btn--ghost" onClick={onBack}>
        Zurück
      </button>
    </div>
  );
};
