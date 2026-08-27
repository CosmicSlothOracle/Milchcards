import { getStore } from '@netlify/blobs';

/**
 * Milchcards 1v1 PvP over Netlify Blobs (polling transport).
 *
 * Host-authoritative, same protocol semantics as the old WebSocket relay:
 * the host runs the engine and publishes serialized GameState + FX events;
 * the guest publishes actions. Each room uses two single-writer blobs
 * (host doc / guest doc), so concurrent writes never race:
 *
 *   rooms/{CODE}/host  — written only by the host
 *   rooms/{CODE}/guest — written only by the guest
 *
 * Clients call { op: 'sync' } on an interval; a sync both flushes the
 * caller's outbox into its own doc and returns the peer's news.
 */

const STORE = 'milchcards-pvp';
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_TTL_MS = 12 * 60 * 60 * 1000; // rooms expire after 12h
const MAX_FX = 60; // FX ring buffer per room
const MAX_ACTIONS = 120; // action ring buffer per room
const MAX_STATE_BYTES = 900_000;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

function hostKey(code) { return `rooms/${code}/host`; }
function guestKey(code) { return `rooms/${code}/guest`; }

function normalizeCode(raw) {
  const code = String(raw || '').trim().toUpperCase();
  return /^[A-Z2-9]{4,8}$/.test(code) ? code : null;
}

function generateCode() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return code;
}

async function readDoc(store, key) {
  try {
    const doc = await store.get(key, { type: 'json', consistency: 'strong' });
    return doc && typeof doc === 'object' ? doc : null;
  } catch {
    return null;
  }
}

function isExpired(hostDoc) {
  return !hostDoc || !hostDoc.createdAt || Date.now() - hostDoc.createdAt > ROOM_TTL_MS;
}

export default async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const op = String(body?.op || '');
  const store = getStore({ name: STORE, consistency: 'strong' });

  // ── create ──────────────────────────────────────────────────────────
  if (op === 'create') {
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = generateCode();
      const existing = await readDoc(store, hostKey(code));
      if (existing && !isExpired(existing)) continue;
      const now = Date.now();
      await store.setJSON(hostKey(code), {
        createdAt: now,
        seenAt: now,
        phase: 'lobby',
        stateSeq: 0,
        state: null,
        fx: [],
      });
      // Clear any stale guest doc from an expired room with the same code
      try { await store.delete(guestKey(code)); } catch { /* best effort */ }
      return json({ ok: true, code });
    }
    return json({ error: 'Konnte keinen freien Raumcode finden.' }, 500);
  }

  const code = normalizeCode(body?.code);
  if (!code) return json({ error: 'Ungültiger Raumcode.' }, 400);

  // ── join ────────────────────────────────────────────────────────────
  if (op === 'join') {
    const host = await readDoc(store, hostKey(code));
    if (isExpired(host)) {
      return json({ error: 'Raum nicht gefunden oder abgelaufen.' }, 404);
    }
    if (host.phase === 'closed') {
      return json({ error: 'Raum wurde bereits geschlossen.' }, 410);
    }
    const guest = await readDoc(store, guestKey(code));
    // Occupied only if a guest checked in recently (stale guests are evicted)
    if (guest && guest.seenAt && Date.now() - guest.seenAt < 60_000) {
      return json({ error: 'Raum ist bereits voll.' }, 409);
    }
    const now = Date.now();
    await store.setJSON(guestKey(code), {
      joinedAt: now,
      seenAt: now,
      actionSeq: 0,
      actions: [],
    });
    return json({ ok: true, code, phase: host.phase });
  }

  // ── leave ───────────────────────────────────────────────────────────
  if (op === 'leave') {
    const role = body?.role === 'guest' ? 'guest' : 'host';
    try {
      if (role === 'host') {
        await store.delete(hostKey(code));
        await store.delete(guestKey(code));
      } else {
        await store.delete(guestKey(code));
      }
    } catch { /* best effort */ }
    return json({ ok: true });
  }

  // ── sync (flush own outbox + fetch peer news) ───────────────────────
  if (op === 'sync') {
    const role = body?.role === 'guest' ? 'guest' : 'host';
    const cursor = body?.cursor || {};
    const out = body?.out || {};
    const now = Date.now();

    if (role === 'host') {
      const host = await readDoc(store, hostKey(code));
      if (isExpired(host)) return json({ ok: false, roomGone: true });

      host.seenAt = now;
      if (typeof out.phase === 'string') host.phase = out.phase;
      if (out.state && typeof out.state.json === 'string'
        && Number(out.state.seq) > Number(host.stateSeq || 0)
        && out.state.json.length <= MAX_STATE_BYTES) {
        host.stateSeq = Number(out.state.seq);
        host.state = out.state.json;
      }
      if (Array.isArray(out.fx) && out.fx.length) {
        const fx = Array.isArray(host.fx) ? host.fx : [];
        for (const item of out.fx) {
          if (item && Number.isFinite(Number(item.seq)) && typeof item.name === 'string') {
            fx.push({ seq: Number(item.seq), name: item.name, detail: item.detail ?? null });
          }
        }
        host.fx = fx.slice(-MAX_FX);
      }
      await store.setJSON(hostKey(code), host);

      const guest = await readDoc(store, guestKey(code));
      const sinceAction = Number(cursor.action || 0);
      const actions = guest && Array.isArray(guest.actions)
        ? guest.actions.filter((a) => Number(a.seq) > sinceAction)
        : [];
      return json({
        ok: true,
        guestPresent: Boolean(guest),
        guestSeenAt: guest?.seenAt ?? null,
        actions,
      });
    }

    // guest
    const guest = await readDoc(store, guestKey(code));
    if (!guest) return json({ ok: false, roomGone: true });
    guest.seenAt = now;
    if (Array.isArray(out.actions) && out.actions.length) {
      const list = Array.isArray(guest.actions) ? guest.actions : [];
      const known = new Set(list.map((a) => Number(a.seq)));
      for (const item of out.actions) {
        const seq = Number(item?.seq);
        if (Number.isFinite(seq) && !known.has(seq) && item.action) {
          list.push({ seq, action: item.action });
        }
      }
      guest.actions = list.slice(-MAX_ACTIONS);
    }
    await store.setJSON(guestKey(code), guest);

    const host = await readDoc(store, hostKey(code));
    if (isExpired(host)) return json({ ok: false, roomGone: true });
    const sinceState = Number(cursor.state || 0);
    const sinceFx = Number(cursor.fx || 0);
    const fx = Array.isArray(host.fx)
      ? host.fx.filter((f) => Number(f.seq) > sinceFx)
      : [];
    const hasNewState = Number(host.stateSeq || 0) > sinceState && typeof host.state === 'string';
    return json({
      ok: true,
      phase: host.phase,
      hostSeenAt: host.seenAt ?? null,
      stateSeq: hasNewState ? Number(host.stateSeq) : null,
      state: hasNewState ? host.state : null,
      fx,
    });
  }

  return json({ error: `Unknown op: ${op}` }, 400);
};

export const config = {
  path: '/api/pvp',
};
