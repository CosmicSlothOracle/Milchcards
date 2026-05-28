import React from 'react';
import { MusicToggle } from './MusicToggle';

interface MainMenuProps {
  onStartGame: () => void;
  onOpenDeckBuilder: () => void;
  onShowCredits: () => void;
  onStartTutorial: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartGame,
  onOpenDeckBuilder,
  onShowCredits,
  onStartTutorial,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        background: 'radial-gradient(circle, #111a2e 0%, #070c16 100%)',
        color: '#e8f0f8',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Glow Effects */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          left: '20%',
          width: '600px',
          height: '600px',
          background: 'rgba(16, 185, 129, 0.05)',
          borderRadius: '50%',
          filter: 'blur(100px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          right: '20%',
          width: '600px',
          height: '600px',
          background: 'rgba(37, 99, 235, 0.05)',
          borderRadius: '50%',
          filter: 'blur(100px)',
          pointerEvents: 'none',
        }}
      />

      {/* Top Bar with Music Toggle */}
      <div
        style={{
          position: 'absolute',
          top: '30px',
          right: '30px',
          zIndex: 10,
        }}
      >
        <MusicToggle size="large" />
      </div>

      {/* Main Title Container */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: '50px',
          zIndex: 2,
        }}
      >
        <h1
          style={{
            fontSize: '72px',
            fontWeight: 900,
            letterSpacing: '12px',
            margin: 0,
            background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 0 30px rgba(16, 185, 129, 0.2)',
            fontFamily: '"Montserrat", "Arial Black", sans-serif',
          }}
        >
          MILCHCARDS
        </h1>
        <p
          style={{
            fontSize: '18px',
            fontWeight: 500,
            color: '#94a3b8',
            letterSpacing: '4px',
            marginTop: '10px',
            textTransform: 'uppercase',
          }}
        >
          The Political Deck-Building Engine
        </p>
      </div>

      {/* Menu Options */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          minWidth: '280px',
          zIndex: 2,
        }}
      >
        <button
          onClick={onStartGame}
          style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            border: 'none',
            padding: '16px 32px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 700,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.25)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.03)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.35)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.25)';
          }}
        >
          🎮 Spiel Starten (vs KI)
        </button>

        <button
          onClick={onOpenDeckBuilder}
          style={{
            background: 'rgba(30, 41, 59, 0.7)',
            color: '#e2e8f0',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            padding: '16px 32px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 600,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.03)';
            e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.6)';
            e.currentTarget.style.background = 'rgba(30, 41, 59, 0.9)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(59, 130, 246, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.2)';
            e.currentTarget.style.background = 'rgba(30, 41, 59, 0.7)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          🗂️ Deck-Manager
        </button>

        <button
          onClick={onStartTutorial}
          style={{
            background: 'rgba(30, 41, 59, 0.7)',
            color: '#e2e8f0',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            padding: '14px 32px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.03)';
            e.currentTarget.style.borderColor = 'rgba(14, 165, 233, 0.6)';
            e.currentTarget.style.background = 'rgba(30, 41, 59, 0.9)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(14, 165, 233, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.2)';
            e.currentTarget.style.background = 'rgba(30, 41, 59, 0.7)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          📘 Tutorial
        </button>

        <button
          onClick={onShowCredits}
          style={{
            background: 'transparent',
            color: '#94a3b8',
            border: 'none',
            padding: '12px 32px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            letterSpacing: '1px',
            cursor: 'pointer',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#3b82f6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#94a3b8';
          }}
        >
          🎓 Credits & Portfolio
        </button>
      </div>

      {/* Footer Branding */}
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          fontSize: '11px',
          color: '#475569',
          letterSpacing: '1px',
          zIndex: 2,
        }}
      >
        PROUDLY CREATED AS A WEB DEV DESIGN POC • © 2026
      </div>
    </div>
  );
};
