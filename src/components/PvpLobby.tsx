import React, { useState } from 'react';
import { PvpStatus } from '../hooks/usePvpSession';
import { PvpRole } from '../pvp/pvpRole';

interface PvpLobbyProps {
  configured: boolean;
  role: PvpRole;
  status: PvpStatus;
  roomCode: string | null;
  error: string | null;
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  onStartMatch: () => void;
  onBack: () => void;
}

const buttonBase: React.CSSProperties = {
  padding: '14px 28px',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: 700,
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  cursor: 'pointer',
  border: 'none',
  transition: 'all 0.2s',
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
  const isHost = role === 'host';
  const isHostWaiting = isHost && status === 'waiting';
  const isReady = status === 'ready';
  const inRoom = Boolean(roomCode);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100dvh',
        width: '100vw',
        background: 'radial-gradient(circle, #111a2e 0%, #070c16 100%)',
        color: '#e8f0f8',
        gap: 'clamp(16px, 4vh, 24px)',
        overflowY: 'auto',
        padding: '24px 16px',
        boxSizing: 'border-box',
      }}
    >
      <h2 style={{
        fontSize: 'clamp(26px, 8vw, 36px)',
        fontWeight: 900,
        letterSpacing: 'clamp(3px, 1.5vw, 6px)',
        margin: 0,
        background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>
        1v1 ONLINE
      </h2>

      {!configured && (
        <div style={{
          maxWidth: '480px',
          textAlign: 'center',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '10px',
          padding: '20px 24px',
          color: '#fca5a5',
          fontSize: '14px',
          lineHeight: 1.6,
        }}>
          <strong>PvP ist nicht konfiguriert.</strong><br />
          Es fehlen die Firebase-Umgebungsvariablen
          (<code>REACT_APP_FB_API_KEY</code>, <code>REACT_APP_FB_DATABASE_URL</code>).
          Siehe <code>.env.example</code>.
        </div>
      )}

      {configured && !inRoom && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
          <button
            onClick={onCreateRoom}
            style={{
              ...buttonBase,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              minWidth: '300px',
            }}
          >
            🛠️ Raum erstellen (Host)
          </button>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(148, 163, 184, 0.3)',
                borderRadius: '8px',
                padding: '14px 16px',
                color: '#e8f0f8',
                fontSize: '18px',
                fontWeight: 700,
                letterSpacing: '4px',
                width: '170px',
                textAlign: 'center',
                textTransform: 'uppercase',
              }}
            />
            <button
              onClick={() => joinCode.trim() && onJoinRoom(joinCode)}
              disabled={joinCode.trim().length < 4}
              style={{
                ...buttonBase,
                background: joinCode.trim().length >= 4 ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'rgba(51, 65, 85, 0.4)',
                color: joinCode.trim().length >= 4 ? 'white' : '#64748b',
                cursor: joinCode.trim().length >= 4 ? 'pointer' : 'not-allowed',
              }}
            >
              Beitreten
            </button>
          </div>
        </div>
      )}

      {configured && inRoom && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', letterSpacing: '2px', marginBottom: '8px' }}>RAUMCODE</div>
            <div style={{
              fontSize: '42px',
              fontWeight: 900,
              letterSpacing: '10px',
              color: '#10b981',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '12px',
              padding: '12px 28px',
              userSelect: 'all',
            }}>
              {roomCode}
            </div>
          </div>

          {isHostWaiting && (
            <div style={{ color: '#94a3b8', fontSize: '14px' }}>
              ⏳ Warte auf Mitspieler … Teile den Code!
            </div>
          )}

          {isReady && isHost && (
            <div style={{ color: '#10b981', fontSize: '14px', fontWeight: 700 }}>
              ✅ Mitspieler verbunden!
            </div>
          )}

          {isReady && !isHost && (
            <div style={{ color: '#10b981', fontSize: '14px', fontWeight: 700 }}>
              ✅ Verbunden – warte auf Spielstart durch den Host…
            </div>
          )}

          {isHost && (
            <button
              onClick={onStartMatch}
              disabled={!isReady}
              style={{
                ...buttonBase,
                background: isReady ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'rgba(51, 65, 85, 0.4)',
                color: isReady ? 'white' : '#64748b',
                cursor: isReady ? 'pointer' : 'not-allowed',
                minWidth: '300px',
              }}
            >
              🎮 Spiel starten
            </button>
          )}

          {isReady && (
            <div style={{ color: '#64748b', fontSize: '12px', maxWidth: '380px', textAlign: 'center' }}>
              Beide Spieler erhalten ein zufälliges Premade-Deck.
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{ color: '#fca5a5', fontSize: '14px', maxWidth: '420px', textAlign: 'center' }}>
          ❌ {error}
        </div>
      )}

      <button
        onClick={onBack}
        style={{
          ...buttonBase,
          background: 'transparent',
          color: '#94a3b8',
          border: '1px solid rgba(148, 163, 184, 0.2)',
        }}
      >
        ← Zurück
      </button>
    </div>
  );
};
