import React, { useEffect, useState } from 'react';
import { loadLeaderboard, QuizLeaderboardEntry } from '../utils/quiz';
import { fetchLeaderboardRemote } from '../utils/quizLeaderboardApi';

interface QuizScoreboardProps {
  /** Compact panel for the landing page; default full. */
  variant?: 'menu' | 'inline';
  /** When provided, use this list instead of fetching. */
  entries?: QuizLeaderboardEntry[];
  className?: string;
}

export const QuizScoreboard: React.FC<QuizScoreboardProps> = ({
  variant = 'menu',
  entries: entriesProp,
  className = '',
}) => {
  const [entries, setEntries] = useState<QuizLeaderboardEntry[]>(
    () => entriesProp ?? loadLeaderboard()
  );
  const [source, setSource] = useState<'blobs' | 'local' | 'unknown'>(
    entriesProp ? 'unknown' : 'local'
  );
  const [loading, setLoading] = useState(!entriesProp);

  useEffect(() => {
    if (entriesProp) {
      setEntries(entriesProp);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
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
  }, [entriesProp]);

  return (
    <aside
      className={`quiz-scoreboard quiz-scoreboard--${variant}${className ? ` ${className}` : ''}`}
      aria-label="Zitat-Quiz Bestenliste"
    >
      <header className="quiz-scoreboard__header">
        <span className="quiz-scoreboard__eyebrow">Zitat-Quiz</span>
        <h2 className="quiz-scoreboard__title">Bestenliste</h2>
        {!entriesProp && (
          <p className="quiz-scoreboard__source">
            {loading
              ? 'Lädt…'
              : source === 'blobs'
                ? 'Global · Netlify'
                : 'Lokal (Offline-Cache)'}
          </p>
        )}
      </header>

      {entries.length === 0 ? (
        <p className="quiz-scoreboard__empty">
          {loading ? 'Bestenliste wird geladen…' : 'Noch keine Einträge — spiele das Zitat-Quiz.'}
        </p>
      ) : (
        <ol className="quiz-scoreboard__list">
          {entries.map((row, i) => (
            <li key={`${row.name}-${row.at}-${i}`} className="quiz-scoreboard__row">
              <span className="quiz-scoreboard__rank">{i + 1}</span>
              <span className="quiz-scoreboard__name" title={row.name}>{row.name}</span>
              <span className="quiz-scoreboard__score">{row.score}</span>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
};
