import React from 'react';
import { MusicToggle } from './MusicToggle';

interface MainMenuProps {
  onStartGame: () => void;
  onOpenDeckBuilder: () => void;
  onShowCredits: () => void;
  onStartTutorial: () => void;
  onStartPvp?: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartGame,
  onOpenDeckBuilder,
  onShowCredits,
  onStartTutorial,
  onStartPvp,
}) => {
  return (
    <div className="mc-screen mc-screen--enter">
      <div className="mc-top-right">
        <MusicToggle size="medium" />
      </div>

      <div className="mc-brand">
        <h1 className="mc-brand__title">MILCHCARDS</h1>
        <p className="mc-brand__subtitle">The Political Deck-Building Engine</p>
      </div>

      <div className="mc-menu">
        <button type="button" className="mc-btn mc-btn--primary" onClick={onStartGame}>
          Spiel Starten (vs KI)
        </button>

        {onStartPvp && (
          <button type="button" className="mc-btn mc-btn--secondary" onClick={onStartPvp}>
            1v1 Online (PvP)
          </button>
        )}

        <button type="button" className="mc-btn mc-btn--outline" onClick={onOpenDeckBuilder}>
          Deck-Manager
        </button>

        <button type="button" className="mc-btn mc-btn--outline" onClick={onStartTutorial}>
          Tutorial
        </button>

        <button type="button" className="mc-btn mc-btn--ghost" onClick={onShowCredits}>
          Credits & Portfolio
        </button>
      </div>

      <div className="mc-footer-note">
        PROUDLY CREATED AS A WEB DEV DESIGN POC • © 2026
      </div>
    </div>
  );
};
