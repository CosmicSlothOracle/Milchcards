import React from 'react';

interface CreditsProps {
  onBack: () => void;
}

export const Credits: React.FC<CreditsProps> = ({ onBack }) => {
  return (
    <div className="mc-screen mc-screen--enter" style={{ justifyContent: 'flex-start', paddingTop: 48 }}>
      <div className="mc-panel" style={{ maxWidth: 800, width: '100%', padding: '36px 40px', zIndex: 2 }}>
        <h2
          className="mc-brand__title"
          style={{ fontSize: 'clamp(28px, 6vw, 40px)', letterSpacing: '0.06em', textAlign: 'center', marginBottom: 28 }}
        >
          Developer Showcase & Credits
        </h2>

        <div style={{ lineHeight: 1.65, fontSize: 15, color: 'var(--content-secondary)' }}>
          <p style={{ fontSize: 16, color: 'var(--content-primary)', marginBottom: 24 }}>
            Willkommen bei <strong>Milchcards</strong>! Dieses Projekt wurde als interaktiver, hoch-performanter
            Proof-of-Concept (PoC) entwickelt, um moderne Web-Dev, Design- und UI/UX-Qualitäten zu demonstrieren.
            Durch die Reduzierung unnötigen Rauschens liegt der Fokus voll und ganz auf Eleganz, Responsivität und Spielfluss.
          </p>

          <h3 style={sectionTitle}>Technical Stack & Architecture</h3>
          <ul style={{ paddingLeft: 20, margin: '12px 0 24px' }}>
            <li style={listItem}>
              <strong style={{ color: 'var(--content-primary)' }}>React & TypeScript:</strong> Ein robustes, stark typisiertes Fundament für fehlerfreie Zustandsübergänge.
            </li>
            <li style={listItem}>
              <strong style={{ color: 'var(--content-primary)' }}>High Performance CSS-Board Scaling:</strong> Anstatt schwerfälliger Canvas-Systeme nutzt das Board CSS-3D-Transforms, was auf modernen Mobilgeräten und Desktops 60fps-Rendering garantiert.
            </li>
            <li style={listItem}>
              <strong style={{ color: 'var(--content-primary)' }}>GSAP Animation Engine:</strong> Für organische, haptisch ansprechende Übergänge, Card-Flips und Partikeleffekte.
            </li>
            <li style={listItem}>
              <strong style={{ color: 'var(--content-primary)' }}>Advanced Audio Context (Howler):</strong> Nahtlose Musikübergänge, Sound-Veredelung bei Kartenplatzierung und Button-Feedback.
            </li>
          </ul>

          <h3 style={sectionTitle}>Design & UI/UX Highlights</h3>
          <ul style={{ paddingLeft: 20, margin: '12px 0 24px' }}>
            <li style={listItem}>
              <strong style={{ color: 'var(--content-primary)' }}>Vollintegriertes HUD:</strong> Sämtliche Debug-Interfaces und verschiebbaren Dialoge wurden zugunsten eines immersiven, statischen HUDs aufgelöst.
            </li>
            <li style={listItem}>
              <strong style={{ color: 'var(--content-primary)' }}>Sleek Card Gallery:</strong> Ein edler Deckmanager mit flüssigen Filtern, der den Spieler visuell leitet und inaktive Entwicklerkarten ästhetisch ausblendet.
            </li>
            <li style={listItem}>
              <strong style={{ color: 'var(--content-primary)' }}>Immersiver Intelligence Feed:</strong> Spielzüge werden non-intrusiv an der Spielfeldseite geloggt und können einklappt werden.
            </li>
          </ul>

          <h3 style={sectionTitle}>AI-Assisted Content Disclosure</h3>
          <p style={{ marginBottom: 12 }}>
            Portions of this game&apos;s visual assets were created with generative AI tools and were
            reviewed, edited, and integrated by human creators.
          </p>
          <p style={{ marginBottom: 12, fontSize: 14 }}>
            Certain artwork originated from images generated with <strong style={{ color: 'var(--content-primary)' }}>Midjourney</strong> under
            a paid commercial subscription. Assets were subsequently curated, refined, and incorporated
            into the game&apos;s visual design by the developer. Commercial usage is subject to{' '}
            <a
              href="https://docs.midjourney.com/docs/terms-of-service"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--content-link)', textDecoration: 'underline' }}
            >
              Midjourney&apos;s Terms of Service
            </a>{' '}
            and applicable law.
          </p>
          <p style={{ margin: '0 0 24px', fontSize: 13, color: 'var(--content-muted)', fontStyle: 'italic' }}>
            Artwork created with Midjourney and modified by the developer.
          </p>

          <h3 style={sectionTitle}>Spiel-Engine & Balance-Verifikation</h3>
          <p style={{ marginBottom: 8 }}>
            Die zugrundeliegende Spiel-Logik wurde mittels automatisierter KI-Simulatoren (über 600 simulierte Best-of-3-Spiele)
            vollständig balanciert. Alle drei Kernfraktionen (
            <em style={{ color: 'var(--player-strong)' }}>Tech Oligarchs</em>,{' '}
            <em style={{ color: 'var(--teal-700)' }}>Diplomatic Power</em>,{' '}
            <em style={{ color: 'var(--amber-700)' }}>Activist Movement</em>
            ) haben eine exakte Win-Rate von 50%, was eine mathematisch perfekte Balance belegt.
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 36 }}>
          <button type="button" className="mc-btn mc-btn--primary" onClick={onBack}>
            Zurück zum Hauptmenü
          </button>
        </div>
      </div>
    </div>
  );
};

const sectionTitle: React.CSSProperties = {
  color: 'var(--content-primary)',
  fontFamily: 'var(--font-display)',
  fontSize: 18,
  borderBottom: '1px solid var(--border-subtle)',
  paddingBottom: 8,
  marginTop: 30,
  fontWeight: 700,
};

const listItem: React.CSSProperties = {
  marginBottom: 8,
};
