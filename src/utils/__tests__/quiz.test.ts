import { QUIZ_QUOTES } from '../../data/quizQuotes';
import {
  applyAnswer,
  createInitialRun,
  getQuizRoster,
  loadHighscore,
  commitHighscore,
  mulberry32,
  pickQuestion,
  quotesByCardKey,
  QUIZ_HIGHSCORE_KEY,
  QUIZ_LEADERBOARD_KEY,
  QUIZ_LEADERBOARD_LIMIT,
  QUIZ_OPTION_COUNT,
  QUIZ_STARTING_LIVES,
  loadLeaderboard,
  submitLeaderboardScore,
} from '../quiz';

describe('quiz roster and quotes', () => {
  const roster = getQuizRoster();
  const byKey = quotesByCardKey(QUIZ_QUOTES);

  it('has 88 named people and no KL archetypes', () => {
    expect(roster).toHaveLength(88);
    expect(roster.some((p) => p.key === 'Lobbyist' || p.baseId >= 100)).toBe(false);
    expect(roster.filter((p) => p.category === 'government')).toHaveLength(63);
    expect(roster.filter((p) => p.category === 'public')).toHaveLength(25);
  });

  it('gives every roster person at least 3 quotes', () => {
    const short: string[] = [];
    for (const person of roster) {
      const n = byKey.get(person.key)?.length ?? 0;
      if (n < 3) short.push(`${person.key} (${n})`);
    }
    expect(short).toEqual([]);
  });

  it('only references people on the roster', () => {
    const keys = new Set(roster.map((p) => p.key));
    const orphans = QUIZ_QUOTES.filter((q) => !keys.has(q.cardKey)).map((q) => q.cardKey);
    expect(orphans).toEqual([]);
  });

  it('has unique quote ids', () => {
    const ids = QUIZ_QUOTES.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every quote original and English text', () => {
    const missing = QUIZ_QUOTES.filter((q) => !q.text?.trim() || !q.textEn?.trim()).map((q) => q.id);
    expect(missing).toEqual([]);
  });
});

describe('pickQuestion', () => {
  const roster = getQuizRoster();

  it('returns 5 unique options with exactly one correct card', () => {
    const used = new Set<string>();
    const question = pickQuestion({
      roster,
      quotes: QUIZ_QUOTES,
      usedQuoteIds: used,
      rng: mulberry32(42),
    });
    expect(question.options).toHaveLength(QUIZ_OPTION_COUNT);
    const keys = question.options.map((o) => o.key);
    expect(new Set(keys).size).toBe(5);
    expect(keys.filter((k) => k === question.correctKey)).toHaveLength(1);
    expect(question.quote.cardKey).toBe(question.correctKey);
  });

  it('mixes same-category and other-category distractors', () => {
    const question = pickQuestion({
      roster,
      quotes: QUIZ_QUOTES,
      usedQuoteIds: new Set(),
      rng: mulberry32(7),
    });
    const correct = question.options.find((o) => o.key === question.correctKey)!;
    const others = question.options.filter((o) => o.key !== question.correctKey);
    expect(others.some((o) => o.category === correct.category)).toBe(true);
    expect(others.some((o) => o.category !== correct.category)).toBe(true);
  });

  it('does not repeat a quote before the pool is exhausted', () => {
    const used = new Set<string>();
    const seen = new Set<string>();
    for (let i = 0; i < QUIZ_QUOTES.length; i++) {
      const question = pickQuestion({
        roster,
        quotes: QUIZ_QUOTES,
        usedQuoteIds: used,
        rng: mulberry32(1000 + i),
      });
      expect(seen.has(question.quote.id)).toBe(false);
      seen.add(question.quote.id);
      used.add(question.quote.id);
    }
    expect(seen.size).toBe(QUIZ_QUOTES.length);

    const reshuffled = pickQuestion({
      roster,
      quotes: QUIZ_QUOTES,
      usedQuoteIds: used,
      rng: mulberry32(9),
    });
    expect(QUIZ_QUOTES.some((q) => q.id === reshuffled.quote.id)).toBe(true);
    expect(used.size).toBe(0);
  });

  it('does not immediately repeat the just-answered quote when the pool reshuffles', () => {
    const used = new Set<string>();
    let lastQuoteId: string | null = null;
    for (let i = 0; i < QUIZ_QUOTES.length; i++) {
      const question = pickQuestion({
        roster,
        quotes: QUIZ_QUOTES,
        usedQuoteIds: used,
        lastQuoteId,
        rng: mulberry32(2000 + i),
      });
      used.add(question.quote.id);
      lastQuoteId = question.quote.id;
    }
    // Pool is now fully exhausted; the very next pick reshuffles and must not
    // hand back the quote that was just answered.
    const afterReshuffle = pickQuestion({
      roster,
      quotes: QUIZ_QUOTES,
      usedQuoteIds: used,
      lastQuoteId,
      rng: mulberry32(5),
    });
    expect(afterReshuffle.quote.id).not.toBe(lastQuoteId);
  });

  it('avoids the same correct person twice in a row when the pool allows it', () => {
    const used = new Set<string>();
    const first = pickQuestion({
      roster,
      quotes: QUIZ_QUOTES,
      usedQuoteIds: used,
      rng: mulberry32(3),
    });
    used.add(first.quote.id);
    const second = pickQuestion({
      roster,
      quotes: QUIZ_QUOTES,
      usedQuoteIds: used,
      lastCorrectKey: first.correctKey,
      rng: mulberry32(4),
    });
    expect(second.correctKey).not.toBe(first.correctKey);
  });
});

describe('applyAnswer', () => {
  it('increments score and streak on a correct answer without spending a life', () => {
    let run = createInitialRun();
    expect(run.lives).toBe(QUIZ_STARTING_LIVES);
    run = applyAnswer(run, true, 'Donald_Trump');
    expect(run.score).toBe(1);
    expect(run.streak).toBe(1);
    expect(run.bestStreak).toBe(1);
    expect(run.lives).toBe(3);
    run = applyAnswer(run, true, 'Elon_Musk');
    expect(run.score).toBe(2);
    expect(run.streak).toBe(2);
    expect(run.bestStreak).toBe(2);
  });

  it('drops a life and resets streak only on a wrong answer', () => {
    let run = applyAnswer(createInitialRun(), true, 'A');
    run = applyAnswer(run, false, 'B');
    expect(run.score).toBe(1);
    expect(run.streak).toBe(0);
    expect(run.bestStreak).toBe(1);
    expect(run.lives).toBe(2);
  });
});

describe('highscore', () => {
  beforeEach(() => {
    window.localStorage.removeItem(QUIZ_HIGHSCORE_KEY);
  });

  it('stores only a new best', () => {
    expect(loadHighscore()).toBe(0);
    expect(commitHighscore(4)).toBe(4);
    expect(commitHighscore(2)).toBe(4);
    expect(loadHighscore()).toBe(4);
  });
});

describe('leaderboard', () => {
  beforeEach(() => {
    window.localStorage.removeItem(QUIZ_LEADERBOARD_KEY);
  });

  it('accepts a named score and ranks by score', () => {
    submitLeaderboardScore({ name: 'Ada', score: 3, bestStreak: 2 });
    submitLeaderboardScore({ name: 'Bob', score: 8, bestStreak: 1 });
    submitLeaderboardScore({ name: 'Cy', score: 5, bestStreak: 5 });
    expect(loadLeaderboard().map((e) => e.name)).toEqual(['Bob', 'Cy', 'Ada']);
  });

  it('keeps only the better score for the same name (case-insensitive)', () => {
    submitLeaderboardScore({ name: 'Milch', score: 4, bestStreak: 2 });
    const again = submitLeaderboardScore({ name: 'milch', score: 9, bestStreak: 3 });
    expect(again.updatedExisting).toBe(true);
    expect(loadLeaderboard()).toHaveLength(1);
    expect(loadLeaderboard()[0].score).toBe(9);
    expect(loadLeaderboard()[0].name).toBe('Milch');
  });

  it('rejects short names and does not write them', () => {
    const result = submitLeaderboardScore({ name: 'A', score: 10, bestStreak: 1 });
    expect(result.madeBoard).toBe(false);
    expect(loadLeaderboard()).toHaveLength(0);
  });

  it('caps the board at the limit', () => {
    for (let i = 0; i < QUIZ_LEADERBOARD_LIMIT + 3; i++) {
      submitLeaderboardScore({ name: `P${i}`, score: i + 1, bestStreak: 1 });
    }
    const board = loadLeaderboard();
    expect(board).toHaveLength(QUIZ_LEADERBOARD_LIMIT);
    expect(board[0].score).toBe(QUIZ_LEADERBOARD_LIMIT + 3);
  });
});
