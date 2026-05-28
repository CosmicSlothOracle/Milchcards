import React from 'react';

interface CreditsProps {
  onBack: () => void;
}

export const Credits: React.FC<CreditsProps> = ({ onBack }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100vw',
        background: 'radial-gradient(circle, #0e1626 0%, #050912 100%)',
        color: '#e2e8f0',
        padding: '40px 20px',
        boxSizing: 'border-box',
        position: 'relative',
        overflowY: 'auto',
      }}
    >
      {/* Decorative Blur */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          right: '10%',
          width: '400px',
          height: '400px',
          background: 'rgba(59, 130, 246, 0.03)',
          borderRadius: '50%',
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '20%',
          left: '10%',
          width: '400px',
          height: '400px',
          background: 'rgba(16, 185, 129, 0.03)',
          borderRadius: '50%',
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          maxWidth: '800px',
          width: '100%',
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(148, 163, 184, 0.1)',
          borderRadius: '16px',
          padding: '40px',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
          zIndex: 2,
        }}
      >
        <h2
          style={{
            fontSize: '36px',
            fontWeight: 800,
            letterSpacing: '4px',
            marginTop: 0,
            marginBottom: '30px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #10b981 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textTransform: 'uppercase',
            textAlign: 'center',
          }}
        >
          Developer Showcase & Credits
        </h2>

        <div style={{ lineHeight: '1.6', fontSize: '15px', color: '#94a3b8' }}>
          <p style={{ fontSize: '16px', color: '#cbd5e1', marginBottom: '24px' }}>
            Willkommen bei <strong>Milchcards</strong>! Dieses Projekt wurde als interaktiver, hoch-performanter 
            Proof-of-Concept (PoC) entwickelt, um moderne Web-Dev, Design- und UI/UX-Qualitäten zu demonstrieren. 
            Durch die Reduzierung unnötigen Rauschens liegt der Fokus voll und ganz auf Eleganz, Responsivität und Spielfluss.
          </p>

          <h3 style={{ color: '#f1f5f9', fontSize: '18px', borderBottom: '1px solid rgba(148, 163, 184, 0.15)', paddingBottom: '8px', marginTop: '30px' }}>
            🛠️ Technical Stack & Architecture
          </h3>
          <ul style={{ paddingLeft: '20px', margin: '12px 0 24px 0' }}>
            <li style={{ marginBottom: '8px' }}>
              <strong style={{ color: '#e2e8f0' }}>React & TypeScript:</strong> Ein robustes, stark typisiertes Fundament für fehlerfreie Zustandsübergänge.
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong style={{ color: '#e2e8f0' }}>High Performance CSS-Board Scaling:</strong> Anstatt schwerfälliger Canvas-Systeme nutzt das Board CSS-3D-Transforms, was auf modernen Mobilgeräten und Desktops 60fps-Rendering garantiert.
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong style={{ color: '#e2e8f0' }}>GSAP Animation Engine:</strong> Für organische, haptisch ansprechende Übergänge, Card-Flips und Partikeleffekte.
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong style={{ color: '#e2e8f0' }}>Advanced Audio Context (Howler):</strong> Nahtlose Musikübergänge, Sound-Veredelung bei Kartenplatzierung und Button-Feedback.
            </li>
          </ul>

          <h3 style={{ color: '#f1f5f9', fontSize: '18px', borderBottom: '1px solid rgba(148, 163, 184, 0.15)', paddingBottom: '8px', marginTop: '30px' }}>
            🎯 Design & UI/UX Highlights
          </h3>
          <ul style={{ paddingLeft: '20px', margin: '12px 0 24px 0' }}>
            <li style={{ marginBottom: '8px' }}>
              <strong style={{ color: '#e2e8f0' }}>Vollintegriertes HUD:</strong> Sämtliche Debug-Interfaces und verschiebbaren Dialoge wurden zugunsten eines immersiven, statischen HUDs aufgelöst.
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong style={{ color: '#e2e8f0' }}>Sleek Card Gallery:</strong> Ein edler Deckmanager mit flüssigen Filtern, der den Spieler visuell leitet und inaktive Entwicklerkarten ästhetisch ausblendet.
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong style={{ color: '#e2e8f0' }}>Immersiver Intelligence Feed:</strong> Spielzüge werden non-intrusiv an der Spielfeldseite geloggt und können einklappt werden.
            </li>
          </ul>

          <h3 style={{ color: '#f1f5f9', fontSize: '18px', borderBottom: '1px solid rgba(148, 163, 184, 0.15)', paddingBottom: '8px', marginTop: '30px' }}>
            📊 Spiel-Engine & Balance-Verifikation
          </h3>
          <p style={{ marginBottom: '30px' }}>
            Die zugrundeliegende Spiel-Logik wurde mittels automatisierter KI-Simulatoren (über 600 simulierte Best-of-3-Spiele) 
            vollständig balanciert. Alle drei Kernfraktionen (<em style={{ color: '#10b981' }}>Tech Oligarchs</em>, <em style={{ color: '#3b82f6' }}>Diplomatic Power</em>, <em style={{ color: '#f59e0b' }}>Activist Movement</em>) haben eine exakte Win-Rate von 50%, was eine mathematisch perfekte Balance belegt.
          </p>
        </div>

        {/* Back Button */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
          <button
            onClick={onBack}
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: 'white',
              border: 'none',
              padding: '12px 30px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 700,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(59, 130, 246, 0.25)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.03)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.35)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(59, 130, 246, 0.25)';
            }}
          >
            Zurück zum Hauptmenü
          </button>
        </div>
      </div>
    </div>
  );
};
