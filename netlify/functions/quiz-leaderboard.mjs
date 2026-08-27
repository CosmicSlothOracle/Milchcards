import { getStore } from '@netlify/blobs';

const STORE = 'milchcards-quiz';
const KEY = 'leaderboard';
const LIMIT = 10;
const NAME_MIN = 2;
const NAME_MAX = 16;

function normalizeName(raw) {
  return String(raw || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, NAME_MAX);
}

function isValidName(raw) {
  const name = normalizeName(raw);
  return name.length >= NAME_MIN && name.length <= NAME_MAX;
}

function sortBoard(entries) {
  return entries
    .slice()
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.bestStreak !== a.bestStreak) return b.bestStreak - a.bestStreak;
      return a.at - b.at;
    })
    .slice(0, LIMIT);
}

function cleanEntries(parsed) {
  if (!Array.isArray(parsed)) return [];
  const cleaned = [];
  for (const row of parsed) {
    if (!row || typeof row !== 'object') continue;
    const name = normalizeName(row.name);
    const score = Number(row.score);
    const bestStreak = Number(row.bestStreak);
    const at = Number(row.at);
    if (!isValidName(name) || !Number.isFinite(score) || score < 0) continue;
    cleaned.push({
      name,
      score: Math.floor(score),
      bestStreak: Number.isFinite(bestStreak) && bestStreak > 0 ? Math.floor(bestStreak) : 0,
      at: Number.isFinite(at) && at > 0 ? at : Date.now(),
    });
  }
  return sortBoard(cleaned);
}

function mergeEntry(existing, opts) {
  const name = normalizeName(opts.name);
  if (!isValidName(name) || opts.score < 0 || !Number.isFinite(opts.score)) {
    return { entries: existing, madeBoard: false, updatedExisting: false };
  }

  const entry = {
    name,
    score: Math.floor(opts.score),
    bestStreak: Math.max(0, Math.floor(opts.bestStreak || 0)),
    at: opts.at ?? Date.now(),
  };

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

  next = sortBoard(next);
  const madeBoard = next.some(
    (e) => e.name.toLowerCase() === nameKey && e.score === entry.score
  );
  return { entries: next, madeBoard, updatedExisting };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

async function readBoard(store) {
  try {
    const data = await store.get(KEY, { type: 'json', consistency: 'strong' });
    return cleanEntries(data?.entries ?? data ?? []);
  } catch {
    return [];
  }
}

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return json({ ok: true });
  }

  const store = getStore({ name: STORE, consistency: 'strong' });

  if (req.method === 'GET') {
    const entries = await readBoard(store);
    return json({ entries, source: 'blobs' });
  }

  if (req.method === 'POST') {
    let body;
    try {
      body = await req.json();
    } catch {
      return json({ error: 'Invalid JSON' }, 400);
    }

    const name = normalizeName(body?.name);
    const score = Number(body?.score);
    const bestStreak = Number(body?.bestStreak);

    if (!isValidName(name)) {
      return json({ error: `Name must be ${NAME_MIN}–${NAME_MAX} characters` }, 400);
    }
    if (!Number.isFinite(score) || score < 0 || score > 10000) {
      return json({ error: 'Invalid score' }, 400);
    }

    // Simple optimistic merge; quiz traffic is low. Re-read under strong consistency.
    const existing = await readBoard(store);
    const result = mergeEntry(existing, {
      name,
      score,
      bestStreak: Number.isFinite(bestStreak) ? bestStreak : 0,
    });
    await store.setJSON(KEY, { entries: result.entries, updatedAt: Date.now() });
    return json({ ...result, source: 'blobs' });
  }

  return json({ error: 'Method not allowed' }, 405);
};

export const config = {
  path: '/api/quiz-leaderboard',
};
