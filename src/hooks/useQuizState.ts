import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QUIZ_QUOTES } from '../data/quizQuotes';
import {
  QuizQuestion,
  QuizRunState,
  applyAnswer,
  commitHighscore,
  createInitialRun,
  getQuizRoster,
  loadHighscore,
  pickQuestion,
} from '../utils/quiz';

export type QuizPhase = 'question' | 'reveal' | 'gameover';

export function useQuizState() {
  const roster = useMemo(() => getQuizRoster(), []);
  const usedQuoteIds = useRef<Set<string>>(new Set());
  const [run, setRun] = useState<QuizRunState>(() => createInitialRun());
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [phase, setPhase] = useState<QuizPhase>('question');
  const [pickedKey, setPickedKey] = useState<string | null>(null);
  const [highscore, setHighscore] = useState(() => loadHighscore());

  const deal = useCallback((lastCorrectKey: string | null, lastQuoteId: string | null) => {
    const next = pickQuestion({
      roster,
      quotes: QUIZ_QUOTES,
      usedQuoteIds: usedQuoteIds.current,
      lastCorrectKey,
      lastQuoteId,
    });
    usedQuoteIds.current.add(next.quote.id);
    setQuestion(next);
    setPickedKey(null);
    setPhase('question');
  }, [roster]);

  const start = useCallback(() => {
    usedQuoteIds.current = new Set();
    const initial = createInitialRun();
    setRun(initial);
    setHighscore(loadHighscore());
    deal(null, null);
  }, [deal]);

  const selectOption = useCallback((key: string) => {
    if (phase !== 'question' || !question) return;
    const correct = key === question.correctKey;
    setRun((prev) => applyAnswer(prev, correct, question.correctKey));
    setPickedKey(key);
    setPhase('reveal');
  }, [phase, question]);

  const continueAfterReveal = useCallback(() => {
    if (run.lives <= 0) {
      setHighscore(commitHighscore(run.score));
      setPhase('gameover');
      return;
    }
    deal(run.lastCorrectKey, question?.quote.id ?? null);
  }, [deal, run, question]);

  // Persist the highscore as it happens, not only at game over — a run that
  // is abandoned early (e.g. back to menu) should still count.
  useEffect(() => {
    if (run.score <= 0) return;
    const next = commitHighscore(run.score);
    setHighscore((prev) => (next > prev ? next : prev));
  }, [run.score]);

  return {
    run,
    question,
    phase,
    pickedKey,
    highscore,
    start,
    selectOption,
    continueAfterReveal,
    correct: pickedKey !== null && question !== null && pickedKey === question.correctKey,
  };
}
