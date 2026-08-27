import {
  QuizLeaderboardEntry,
  loadLeaderboard,
  saveLeaderboardCache,
  submitLeaderboardScore,
} from './quiz';

export const QUIZ_LEADERBOARD_API = '/api/quiz-leaderboard';

export type LeaderboardSubmitResult = {
  entries: QuizLeaderboardEntry[];
  madeBoard: boolean;
  updatedExisting: boolean;
  source: 'blobs' | 'local';
};

async function parseJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/** Prefer Netlify Blobs via function; fall back to localStorage offline / local CRA. */
export async function fetchLeaderboardRemote(): Promise<{
  entries: QuizLeaderboardEntry[];
  source: 'blobs' | 'local';
}> {
  try {
    const res = await fetch(QUIZ_LEADERBOARD_API, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await parseJson(res);
    const entries = Array.isArray(data?.entries) ? data.entries : [];
    saveLeaderboardCache(entries);
    return { entries, source: 'blobs' };
  } catch {
    return { entries: loadLeaderboard(), source: 'local' };
  }
}

export async function submitLeaderboardRemote(opts: {
  name: string;
  score: number;
  bestStreak: number;
}): Promise<LeaderboardSubmitResult> {
  try {
    const res = await fetch(QUIZ_LEADERBOARD_API, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: opts.name,
        score: opts.score,
        bestStreak: opts.bestStreak,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await parseJson(res);
    const entries = Array.isArray(data?.entries) ? data.entries : [];
    saveLeaderboardCache(entries);
    return {
      entries,
      madeBoard: Boolean(data?.madeBoard),
      updatedExisting: Boolean(data?.updatedExisting),
      source: 'blobs',
    };
  } catch {
    const local = submitLeaderboardScore(opts);
    return { ...local, source: 'local' };
  }
}
