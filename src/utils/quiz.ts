import { Pols, Specials } from '../data/gameData';
import { QuizQuote } from '../data/quizQuotes';

export const QUIZ_STARTING_LIVES = 3;
export const QUIZ_OPTION_COUNT = 5;
export const QUIZ_HIGHSCORE_KEY = 'milchcards.quiz.highscore';
export const QUIZ_LEADERBOARD_KEY = 'milchcards.quiz.leaderboard';
export const QUIZ_LEADERBOARD_LIMIT = 10;
export const QUIZ_NAME_MIN = 2;
export const QUIZ_NAME_MAX = 16;

export interface QuizLeaderboardEntry {
  name: string;
  score: number;
  bestStreak: number;
  at: number;
}

export type QuizCategory = 'government' | 'public';
export type Rng = () => number;

export interface QuizPerson {
  key: string;
  name: string;
  category: QuizCategory;
  kind: 'pol' | 'spec';
  baseId: number;
}

export interface QuizQuestion {
  quote: QuizQuote;
  options: QuizPerson[];
  correctKey: string;
}

export interface QuizRunState {
  lives: number;
  score: number;
  streak: number;
  bestStreak: number;
  lastCorrectKey: string | null;
}

export function mulberry32(seed: number): Rng {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleWith<T>(items: T[], rng: Rng = Math.random): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function getQuizRoster(): QuizPerson[] {
  const government: QuizPerson[] = Pols.filter((p) => p.id <= 63).map((p) => ({
    key: p.key,
    name: p.name,
    category: 'government',
    kind: 'pol',
    baseId: p.id,
  }));
  const publicFigures: QuizPerson[] = Specials.filter((s) => s.type === 'Öffentlichkeitskarte').map((s) => ({
    key: s.key,
    name: s.name,
    category: 'public',
    kind: 'spec' as const,
    baseId: s.id,
  }));
  return [...government, ...publicFigures];
}

export function quotesByCardKey(quotes: QuizQuote[]): Map<string, QuizQuote[]> {
  const map = new Map<string, QuizQuote[]>();
  for (const quote of quotes) {
    const list = map.get(quote.cardKey);
    if (list) list.push(quote);
    else map.set(quote.cardKey, [quote]);
  }
  return map;
}

export function createInitialRun(): QuizRunState {
  return {
    lives: QUIZ_STARTING_LIVES,
    score: 0,
    streak: 0,
    bestStreak: 0,
    lastCorrectKey: null,
  };
}

export function applyAnswer(run: QuizRunState, correct: boolean, correctKey: string): QuizRunState {
  if (correct) {
    const streak = run.streak + 1;
    return {
      ...run,
      score: run.score + 1,
      streak,
      bestStreak: Math.max(run.bestStreak, streak),
      lastCorrectKey: correctKey,
    };
  }
  return {
    ...run,
    lives: run.lives - 1,
    streak: 0,
    lastCorrectKey: correctKey,
  };
}

export function loadHighscore(): number {
  if (typeof window === 'undefined' || !window.localStorage) return 0;
  const raw = window.localStorage.getItem(QUIZ_HIGHSCORE_KEY);
  const n = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function commitHighscore(score: number): number {
  const prev = loadHighscore();
  const next = Math.max(prev, score);
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(QUIZ_HIGHSCORE_KEY, String(next));
  }
  return next;
}

export function normalizeQuizName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').slice(0, QUIZ_NAME_MAX);
}

export function isValidQuizName(raw: string): boolean {
  const name = normalizeQuizName(raw);
  return name.length >= QUIZ_NAME_MIN && name.length <= QUIZ_NAME_MAX;
}

function sortLeaderboard(entries: QuizLeaderboardEntry[]): QuizLeaderboardEntry[] {
  return entries
    .slice()
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.bestStreak !== a.bestStreak) return b.bestStreak - a.bestStreak;
      return a.at - b.at;
    })
    .slice(0, QUIZ_LEADERBOARD_LIMIT);
}

export function loadLeaderboard(): QuizLeaderboardEntry[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(QUIZ_LEADERBOARD_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const cleaned: QuizLeaderboardEntry[] = [];
    for (const row of parsed) {
      if (!row || typeof row !== 'object') continue;
      const name = normalizeQuizName(String((row as QuizLeaderboardEntry).name || ''));
      const score = Number((row as QuizLeaderboardEntry).score);
      const bestStreak = Number((row as QuizLeaderboardEntry).bestStreak);
      const at = Number((row as QuizLeaderboardEntry).at);
      if (!isValidQuizName(name) || !Number.isFinite(score) || score < 0) continue;
      cleaned.push({
        name,
        score: Math.floor(score),
        bestStreak: Number.isFinite(bestStreak) && bestStreak > 0 ? Math.floor(bestStreak) : 0,
        at: Number.isFinite(at) && at > 0 ? at : Date.now(),
      });
    }
    return sortLeaderboard(cleaned);
  } catch {
    return [];
  }
}

export function saveLeaderboardCache(entries: QuizLeaderboardEntry[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.setItem(QUIZ_LEADERBOARD_KEY, JSON.stringify(sortLeaderboard(entries)));
}

/**
 * Submit a named score locally. Same name (case-insensitive) keeps only the better run.
 * Prefer `submitLeaderboardRemote` in the UI so Netlify Blobs is the source of truth.
 */
export function submitLeaderboardScore(opts: {
  name: string;
  score: number;
  bestStreak: number;
  at?: number;
}): { entries: QuizLeaderboardEntry[]; madeBoard: boolean; updatedExisting: boolean } {
  const name = normalizeQuizName(opts.name);
  if (!isValidQuizName(name) || opts.score < 0 || !Number.isFinite(opts.score)) {
    return { entries: loadLeaderboard(), madeBoard: false, updatedExisting: false };
  }

  const entry: QuizLeaderboardEntry = {
    name,
    score: Math.floor(opts.score),
    bestStreak: Math.max(0, Math.floor(opts.bestStreak || 0)),
    at: opts.at ?? Date.now(),
  };

  const existing = loadLeaderboard();
  const nameKey = name.toLowerCase();
  const idx = existing.findIndex((e) => e.name.toLowerCase() === nameKey);
  let updatedExisting = false;
  let next = existing.slice();

  if (idx >= 0) {
    const prev = next[idx];
    const better =
      entry.score > prev.score ||
      (entry.score === prev.score && entry.bestStreak > prev.bestStreak);
    if (!better) {
      return { entries: existing, madeBoard: true, updatedExisting: false };
    }
    next[idx] = { ...entry, name: prev.name };
    updatedExisting = true;
  } else {
    next.push(entry);
  }

  next = sortLeaderboard(next);
  saveLeaderboardCache(next);
  const madeBoard = next.some(
    (e) => e.name.toLowerCase() === nameKey && e.score === entry.score
  );
  return { entries: next, madeBoard, updatedExisting };
}

function pickDistractors(
  roster: QuizPerson[],
  correct: QuizPerson,
  rng: Rng
): QuizPerson[] {
  const same = roster.filter((p) => p.category === correct.category && p.key !== correct.key);
  const other = roster.filter((p) => p.category !== correct.category);
  const picked: QuizPerson[] = [];
  const take = (pool: QuizPerson[], n: number) => {
    if (n <= 0) return;
    const remaining = shuffleWith(
      pool.filter((p) => p.key !== correct.key && !picked.some((x) => x.key === p.key)),
      rng
    );
    picked.push(...remaining.slice(0, n));
  };
  take(same, 2);
  take(other, 2);
  if (picked.length < 4) take(roster, 4 - picked.length);
  return picked.slice(0, 4);
}

export function pickQuestion(opts: {
  roster: QuizPerson[];
  quotes: QuizQuote[];
  usedQuoteIds: Set<string>;
  lastCorrectKey?: string | null;
  /** Quote id of the previous question; excluded right after a pool reshuffle so it can't repeat back-to-back. */
  lastQuoteId?: string | null;
  rng?: Rng;
}): QuizQuestion {
  const rng = opts.rng ?? Math.random;
  let pool = opts.quotes.filter((q) => !opts.usedQuoteIds.has(q.id));
  if (pool.length === 0) {
    opts.usedQuoteIds.clear();
    pool = opts.quotes.slice();
    if (opts.lastQuoteId) {
      const withoutLast = pool.filter((q) => q.id !== opts.lastQuoteId);
      if (withoutLast.length > 0) pool = withoutLast;
    }
  }

  const lastKey = opts.lastCorrectKey ?? null;
  const avoidLast = lastKey
    ? pool.filter((q) => q.cardKey !== lastKey)
    : pool;
  const drawPool = avoidLast.length > 0 ? avoidLast : pool;
  const quote = shuffleWith(drawPool, rng)[0];
  if (!quote) {
    throw new Error('Quiz quote pool is empty');
  }

  const correct = opts.roster.find((p) => p.key === quote.cardKey);
  if (!correct) {
    throw new Error(`Quiz roster missing cardKey ${quote.cardKey}`);
  }

  const distractors = pickDistractors(opts.roster, correct, rng);
  const options = shuffleWith([correct, ...distractors], rng);

  return {
    quote,
    options,
    correctKey: correct.key,
  };
}
