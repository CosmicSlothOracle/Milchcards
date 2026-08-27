import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { MusicToggle } from './MusicToggle';
import { QuizCardChoice } from './QuizCardChoice';
import { useQuizState } from '../hooks/useQuizState';
import { getCardImagePath } from '../data/gameData';
import {
  QUIZ_LEADERBOARD_LIMIT,
  QUIZ_NAME_MAX,
  QUIZ_NAME_MIN,
  isValidQuizName,
  loadLeaderboard,
  normalizeQuizName,
  QuizLeaderboardEntry,
} from '../utils/quiz';
import { fetchLeaderboardRemote, submitLeaderboardRemote } from '../utils/quizLeaderboardApi';

interface QuizScreenProps {
  onBack: () => void;
}

const TYPEWRITER_MAX = 140;
const LAST_NAME_KEY = 'milchcards.quiz.lastName';

function loadLastName(): string {
  if (typeof window === 'undefined' || !window.localStorage) return '';
  return normalizeQuizName(window.localStorage.getItem(LAST_NAME_KEY) || '');
}

export const QuizScreen: React.FC<QuizScreenProps> = ({ onBack }) => {
  const {
    run,
    question,
    phase,
    pickedKey,
    highscore,
    start,
    selectOption,
    continueAfterReveal,
    correct,
  } = useQuizState();

  const [displayed, setDisplayed] = useState('');
  const [showEn, setShowEn] = useState(false);
  const [playerName, setPlayerName] = useState(() => loadLastName());
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitNote, setSubmitNote] = useState<string | null>(null);
  const [boardPreview, setBoardPreview] = useState<QuizLeaderboardEntry[]>([]);
  const [boardSource, setBoardSource] = useState<'blobs' | 'local'>('local');
  const quoteRef = useRef<HTMLQuoteElement | null>(null);
  const choicesRef = useRef<HTMLDivElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    start();
  }, [start]);

  useEffect(() => {
    if (phase !== 'gameover') {
      setSubmitted(false);
      setSubmitting(false);
      setSubmitNote(null);
      return;
    }
    setBoardPreview(loadLeaderboard());
    let cancelled = false;
    fetchLeaderboardRemote().then((result) => {
      if (cancelled) return;
      setBoardPreview(result.entries);
      setBoardSource(result.source);
    });
    const t = window.setTimeout(() => nameInputRef.current?.focus(), 80);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [phase]);

  useEffect(() => {
    if (!question) return;
    const text = question.quote.text;
    const reduced = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const skipTypewriter = reduced || text.length > TYPEWRITER_MAX;

    setShowEn(skipTypewriter);
    if (skipTypewriter) {
      setDisplayed(text);
      return;
    }

    setDisplayed('');
    const obj = { n: 0 };
    const tween = gsap.to(obj, {
      n: text.length,
      duration: Math.min(2.4, 0.4 + text.length * 0.016),
      ease: 'none',
      onUpdate: () => setDisplayed(text.slice(0, Math.round(obj.n))),
      onComplete: () => {
        setDisplayed(text);
        setShowEn(true);
      },
    });
    return () => {
      tween.kill();
    };
  }, [question]);

  useEffect(() => {
    if (!question || !quoteRef.current) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    gsap.fromTo(
      quoteRef.current,
      { y: 10, opacity: 0.35 },
      { y: 0, opacity: 1, duration: 0.42, ease: 'power2.out' }
    );
  }, [question]);

  useEffect(() => {
    if (!question || !choicesRef.current) return;
    const cards = choicesRef.current.querySelectorAll('.quiz-choice');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      gsap.set(cards, { clearProps: 'all' });
      return;
    }
    gsap.fromTo(
      cards,
      { y: 22, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.07, duration: 0.38, ease: 'power2.out' }
    );
  }, [question]);

  useEffect(() => {
    if (phase !== 'reveal' || !choicesRef.current) return;
    const wrong = choicesRef.current.querySelector('.quiz-choice--wrong');
    const right = choicesRef.current.querySelector('.quiz-choice--correct');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    if (wrong) {
      gsap.fromTo(wrong, { x: -8 }, { x: 0, duration: 0.42, ease: 'elastic.out(1, 0.5)' });
    }
    if (right) {
      gsap.fromTo(right, { scale: 0.96 }, { scale: 1, duration: 0.35, ease: 'back.out(2)' });
    }
  }, [phase, pickedKey]);

  const handleSubmitScore = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (submitted || submitting || !isValidQuizName(playerName)) return;
    const name = normalizeQuizName(playerName);
    setSubmitting(true);
    const result = await submitLeaderboardRemote({
      name,
      score: run.score,
      bestStreak: run.bestStreak,
    });
    try {
      window.localStorage.setItem(LAST_NAME_KEY, name);
    } catch {
      /* ignore */
    }
    setPlayerName(name);
    setBoardPreview(result.entries);
    setBoardSource(result.source);
    setSubmitted(true);
    setSubmitting(false);
    const where = result.source === 'blobs' ? 'global' : 'lokal';
    if (!result.madeBoard) {
      setSubmitNote(`Gespeichert (${where}) — diesmal nicht in den Top 10.`);
    } else if (result.updatedExisting) {
      setSubmitNote(`Neuer Bestwert für diesen Namen (${where}).`);
    } else {
      setSubmitNote(`Auf der Bestenliste (${where})!`);
    }
  };

  const handlePlayAgain = () => {
    setSubmitted(false);
    setSubmitNote(null);
    start();
  };

  const lives = Array.from({ length: 3 }, (_, i) => i < run.lives);
  const quote = question?.quote;
  const showTranslation = Boolean(quote && showEn && quote.text !== quote.textEn);
  const locked = phase !== 'question';
  const canSubmit = isValidQuizName(playerName) && !submitted && !submitting;

  return (
    <div className="mc-screen quiz-screen">
      <div className="mc-top-right">
        <MusicToggle size="medium" />
      </div>
      <button type="button" className="mc-btn mc-btn--ghost quiz-back" onClick={onBack}>
        Menü
      </button>

      <header className="quiz-hud">
        <div className="quiz-lives" aria-label={`${run.lives} Leben`} aria-live="polite">
          {lives.map((alive, i) => (
            <span
              key={i}
              className={`quiz-life${alive ? '' : ' quiz-life--lost'}`}
              aria-hidden="true"
            />
          ))}
        </div>
        <div className={`quiz-stats${run.streak >= 3 ? ' quiz-stats--hot' : ''}`}>
          <div className="quiz-stat">
            <span className="quiz-stat__label">Punkte</span>
            <span className="quiz-stat__value">{run.score}</span>
          </div>
          <div className="quiz-stat">
            <span className="quiz-stat__label">Streak</span>
            <span className="quiz-stat__value">{run.streak}</span>
          </div>
          <div className="quiz-stat">
            <span className="quiz-stat__label">Rekord</span>
            <span className="quiz-stat__value">{Math.max(highscore, run.score)}</span>
          </div>
        </div>
      </header>

      {quote && (
        <section className="quiz-quote-wrap">
          <p className="quiz-kicker">Wer hat das gesagt?</p>
          <blockquote className="quiz-quote" ref={quoteRef}>
            <span className="quiz-quote__mark" aria-hidden="true">“</span>
            <p className="quiz-quote__text">{displayed}</p>
            {showTranslation && (
              <p className="quiz-quote__en">{quote.textEn}</p>
            )}
            {phase === 'reveal' && (
              <footer className="quiz-quote__meta">
                {quote.year ? `${quote.year}` : ''}
                {quote.year && quote.context ? ' · ' : ''}
                {quote.context ?? ''}
              </footer>
            )}
          </blockquote>
        </section>
      )}

      {question && (
        <div className="quiz-choices" ref={choicesRef} role="group" aria-label="Kartenauswahl">
          {question.options.map((person) => (
            <QuizCardChoice
              key={person.key}
              person={person}
              imageSrc={getCardImagePath(
                { kind: person.kind, baseId: person.baseId, key: person.key },
                'ui'
              )}
              disabled={locked}
              selected={pickedKey === person.key}
              revealed={phase === 'reveal' || phase === 'gameover'}
              isAnswer={person.key === question.correctKey}
              onSelect={() => selectOption(person.key)}
            />
          ))}
        </div>
      )}

      {phase === 'reveal' && (
        <div className="quiz-reveal-bar">
          <p
            className={`quiz-reveal-bar__msg${correct ? ' quiz-reveal-bar__msg--ok' : ' quiz-reveal-bar__msg--no'}`}
            role="status"
            aria-live="polite"
          >
            {correct ? 'Treffer.' : `Falsch. ${question?.options.find((p) => p.key === question.correctKey)?.name ?? ''}.`}
            {run.lives <= 0 ? ' Keine Leben mehr.' : ''}
          </p>
          <button type="button" className="mc-btn mc-btn--primary" onClick={continueAfterReveal}>
            {run.lives <= 0 ? 'Ergebnis' : 'Weiter'}
          </button>
        </div>
      )}

      {phase === 'gameover' && (
        <div className="victory-overlay" role="dialog" aria-modal="true" aria-labelledby="quiz-over-title">
          <div className="victory-overlay__card victory-overlay__card--loss quiz-over-card">
            <div className="victory-overlay__eyebrow">Quiz</div>
            <h1 id="quiz-over-title" className="victory-overlay__title">
              Die Sitzung ist zu Ende
            </h1>
            <p className="victory-overlay__sub">
              Punkte {run.score} · Beste Streak {run.bestStreak} · Rekord {highscore}
            </p>

            {!submitted ? (
              <form className="quiz-name-form" onSubmit={handleSubmitScore}>
                <label className="quiz-name-form__label" htmlFor="quiz-player-name">
                  Name für die Bestenliste
                </label>
                <div className="quiz-name-form__row">
                  <input
                    ref={nameInputRef}
                    id="quiz-player-name"
                    className="quiz-name-form__input"
                    type="text"
                    value={playerName}
                    maxLength={QUIZ_NAME_MAX}
                    autoComplete="nickname"
                    placeholder={`${QUIZ_NAME_MIN}–${QUIZ_NAME_MAX} Zeichen`}
                    onChange={(e) => setPlayerName(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="victory-overlay__btn victory-overlay__btn--primary"
                    disabled={!canSubmit}
                  >
                    {submitting ? '…' : 'Eintragen'}
                  </button>
                </div>
                <p className="quiz-name-form__hint">
                  Gleicher Name behält nur den besseren Score (Top {QUIZ_LEADERBOARD_LIMIT}
                  {boardSource === 'blobs' ? ', global' : ', lokal falls Offline'}).
                </p>
              </form>
            ) : (
              <p className="quiz-name-form__done" role="status">{submitNote}</p>
            )}

            {boardPreview.length > 0 && (
              <ol className="quiz-over-board" aria-label="Aktuelle Bestenliste">
                {boardPreview.slice(0, 5).map((row, i) => (
                  <li
                    key={`${row.name}-${row.at}`}
                    className={`quiz-over-board__row${normalizeQuizName(playerName).toLowerCase() === row.name.toLowerCase() ? ' quiz-over-board__row--you' : ''}`}
                  >
                    <span>{i + 1}. {row.name}</span>
                    <span>{row.score}</span>
                  </li>
                ))}
              </ol>
            )}

            <div className="victory-overlay__actions">
              <button
                type="button"
                className="victory-overlay__btn victory-overlay__btn--primary"
                onClick={handlePlayAgain}
              >
                Nochmal
              </button>
              <button type="button" className="victory-overlay__btn" onClick={onBack}>
                Hauptmenü
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
