import React, { useEffect, useState } from 'react';
import { loadLeaderboard, QuizLeaderboardEntry } from '../utils/quiz';
import { fetchLeaderboardRemote } from '../utils/quizLeaderboardApi';

interface QuizScoreboardProps {
  /** Compact panel for the landing page; default full. */
  variant?: 'menu' | 'inline';
  /** Split board flanking the menu: left = ranks 1–5, right = 6–10. */
  side?: 'left' | 'right';
  /** When provided, use this list instead of fetching. */
  entries?: QuizLeaderboardEntry[];
  source?: 'blobs' | 'local' | 'unknown';
  loading?: boolean;
  className?: string;
}

export const QuizScoreboard: React.FC<QuizScoreboardProps> = ({
  variant = 'menu',
  side,
  entries: entriesProp,
  source: sourceProp,
  loading: loadingProp,
  className = '',
}) => {
  const controlled = entriesProp !== undefined;
  const [entries, setEntries] = useState<QuizLeaderboardEntry[]>(
    () => entriesProp ?? loadLeaderboard()
  );
  const [source, setSource] = useState<'blobs' | 'local' | 'unknown'>(
    sourceProp ?? (controlled ? 'unknown' : 'local')
  );
  const [loading, setLoading] = useState(
    loadingProp !== undefined ? loadingProp : !controlled
  );

  useEffect(() => {
    if (controlled) {
      setEntries(entriesProp ?? []);
      if (sourceProp) setSource(sourceProp);
      if (loadingProp !== undefined) setLoading(loadingProp);
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
  }, [controlled, entriesProp, sourceProp, loadingProp]);

  const offset = side === 'right' ? 5 : 0;
  const slice = side ? entries.slice(offset, offset + 5) : entries;
  const title = side === 'right' ? '6–10' : side === 'left' ? 'Top 5' : 'Bestenliste';
  const showSource = !controlled && !side;

  const classes = [
    'quiz-scoreboard',
    `quiz-scoreboard--${variant}`,
    side ? `quiz-scoreboard--${side}` : '',
    variant === 'menu' ? 'quiz-scoreboard--embedded' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <aside className={classes} aria-label={`Zitat-Quiz ${title}`}>
      <header className="quiz-scoreboard__header">
        <span className="quiz-scoreboard__eyebrow">Zitat-Quiz</span>
        <h2 className="quiz-scoreboard__title">{title}</h2>
        {showSource && (
          <p className="quiz-scoreboard__source">
            {loading
              ? 'Lädt…'
              : source === 'blobs'
                ? 'Global · Netlify'
                : 'Lokal (Offline-Cache)'}
          </p>
        )}
        {side === 'left' && !loading && (
          <p className="quiz-scoreboard__source">
            {source === 'blobs' ? 'Global · Netlify' : 'Lokal'}
          </p>
        )}
      </header>

      {slice.length === 0 ? (
        <p className="quiz-scoreboard__empty">
          {loading
            ? '…'
            : side === 'right'
              ? 'Noch frei.'
              : 'Noch keine Einträge.'}
        </p>
      ) : (
        <ol className="quiz-scoreboard__list" start={offset + 1}>
          {slice.map((row, i) => {
            const rank = offset + i + 1;
            return (
              <li key={`${row.name}-${row.at}-${rank}`} className="quiz-scoreboard__row">
                <span className={`quiz-scoreboard__rank quiz-scoreboard__rank--${rank}`}>
                  {rank}
                </span>
                <span className="quiz-scoreboard__name" title={row.name}>{row.name}</span>
                <span className="quiz-scoreboard__score">{row.score}</span>
              </li>
            );
          })}
        </ol>
      )}
    </aside>
  );
};
