import React, { useEffect, useState } from 'react';
import { MusicToggle } from './MusicToggle';
import { QuizScoreboard } from './QuizScoreboard';
import { loadLeaderboard, QuizLeaderboardEntry } from '../utils/quiz';
import { fetchLeaderboardRemote } from '../utils/quizLeaderboardApi';

interface MainMenuProps {
  onStartGame: () => void;
  onStartQuiz: () => void;
  onOpenDeckBuilder: () => void;
  onShowCredits: () => void;
  onStartTutorial: () => void;
  onStartPvp?: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartGame,
  onStartQuiz,
  onOpenDeckBuilder,
  onShowCredits,
  onStartTutorial,
  onStartPvp,
}) => {
  const [entries, setEntries] = useState<QuizLeaderboardEntry[]>(() => loadLeaderboard());
  const [source, setSource] = useState<'blobs' | 'local'>('local');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchLeaderboardRemote().then((result) => {
      if (cancelled) return;
      setEntries(result.entries);
      setSource(result.source);
      setLoading(false);
    });
    const onFocus = () => {
      fetchLeaderboardRemote().then((result) => {
        if (cancelled) return;
        setEntries(result.entries);
        setSource(result.source);
      });
    };
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  return (
    <div className="mc-screen mc-screen--enter mc-screen--menu">
      <div className="mc-top-right">
        <MusicToggle size="medium" />
      </div>

      <div className="mc-brand">
        <h1 className="mc-brand__title">MILCHCARDS</h1>
        <p className="mc-brand__subtitle">The Political Deck-Building Engine</p>
      </div>

      <div className="mc-menu-layout">
        <QuizScoreboard
          variant="menu"
          side="left"
          entries={entries}
          source={source}
          loading={loading}
        />

        <div className="mc-menu-layout__main">
          <div className="mc-menu">
            <button type="button" className="mc-btn mc-btn--primary" onClick={onStartGame}>
              Spiel Starten (vs KI)
            </button>

            <button type="button" className="mc-btn mc-btn--secondary" onClick={onStartQuiz}>
              Zitat-Quiz
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
        </div>

        <QuizScoreboard
          variant="menu"
          side="right"
          entries={entries}
          source={source}
          loading={loading}
        />
      </div>

      <div className="mc-footer-note">
        PROUDLY CREATED AS A WEB DEV DESIGN POC • © 2026
      </div>
    </div>
  );
};
