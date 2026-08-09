/**
 * Milchcards 1v1 PvP relay server.
 *
 * Host-authoritative: the host runs the game engine locally and publishes
 * serialized GameState; the guest sends actions which are forwarded to the host.
 * This process only relays messages and tracks room presence — no game logic.
 *
 * Binds 0.0.0.0:$PORT for Render (and local) deployments.
 */

const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = Number(process.env.PORT || 8081);
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_TTL_MS = 2 * 60 * 60 * 1000; // 2h idle cleanup

/** @typedef {{ host: import('ws').WebSocket|null, guest: import('ws').WebSocket|null, phase: string, createdAt: number, lastActive: number }} Room */

/** @type {Map<string, Room>} */
const rooms = new Map();

function generateRoomCode() {
  for (let attempt = 0; attempt < 50; attempt++) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
    }
    if (!rooms.has(code)) return code;
  }
  throw new Error('Could not allocate room code');
}

function send(ws, msg) {
  if (!ws || ws.readyState !== 1) return;
  try {
    ws.send(JSON.stringify(msg));
  } catch (_) { /* ignore */ }
}

function roleOf(room, ws) {
  if (room.host === ws) return 'host';
  if (room.guest === ws) return 'guest';
  return null;
}

function cleanupRoom(code, reason) {
  const room = rooms.get(code);
  if (!room) return;
  if (room.host) send(room.host, { t: 'peer_left', reason });
  if (room.guest) send(room.guest, { t: 'peer_left', reason });
  try { room.host?.close(); } catch (_) {}
  try { room.guest?.close(); } catch (_) {}
  rooms.delete(code);
  console.log(`[pvp] room ${code} closed (${reason})`);
}

function touch(room) {
  room.lastActive = Date.now();
}

const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size }));
    return;
  }
  res.writeHead(404);
  res.end('Not found');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  /** @type {{ code: string|null, role: 'host'|'guest'|null }} */
  const meta = { code: null, role: null };

  send(ws, { t: 'hello', serverTime: Date.now() });

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      send(ws, { t: 'error', message: 'Invalid JSON' });
      return;
    }
    if (!msg || typeof msg.t !== 'string') {
      send(ws, { t: 'error', message: 'Missing message type' });
      return;
    }

    switch (msg.t) {
      case 'create': {
        if (meta.code) {
          send(ws, { t: 'error', message: 'Already in a room' });
          return;
        }
        const code = generateRoomCode();
        const room = {
          host: ws,
          guest: null,
          phase: 'lobby',
          createdAt: Date.now(),
          lastActive: Date.now(),
        };
        rooms.set(code, room);
        meta.code = code;
        meta.role = 'host';
        send(ws, { t: 'created', code, role: 'host' });
        console.log(`[pvp] room ${code} created`);
        break;
      }

      case 'join': {
        if (meta.code) {
          send(ws, { t: 'error', message: 'Already in a room' });
          return;
        }
        const code = String(msg.code || '').trim().toUpperCase();
        const room = rooms.get(code);
        if (!room || room.phase === 'closed') {
          send(ws, { t: 'error', message: 'Raum nicht gefunden oder bereits geschlossen.' });
          return;
        }
        if (room.guest) {
          send(ws, { t: 'error', message: 'Raum ist bereits voll.' });
          return;
        }
        room.guest = ws;
        touch(room);
        meta.code = code;
        meta.role = 'guest';
        send(ws, { t: 'joined', code, role: 'guest' });
        send(room.host, { t: 'guest_joined' });
        console.log(`[pvp] guest joined ${code}`);
        break;
      }

      case 'phase': {
        const room = meta.code ? rooms.get(meta.code) : null;
        if (!room || meta.role !== 'host') return;
        room.phase = msg.phase || room.phase;
        touch(room);
        if (room.guest) send(room.guest, { t: 'phase', phase: room.phase });
        break;
      }

      case 'state': {
        const room = meta.code ? rooms.get(meta.code) : null;
        if (!room || meta.role !== 'host') return;
        touch(room);
        if (room.guest) {
          send(room.guest, { t: 'state', seq: msg.seq, json: msg.json });
        }
        break;
      }

      case 'action': {
        const room = meta.code ? rooms.get(meta.code) : null;
        if (!room || meta.role !== 'guest') return;
        touch(room);
        if (room.host) {
          send(room.host, { t: 'action', action: msg.action });
        }
        break;
      }

      case 'fx': {
        const room = meta.code ? rooms.get(meta.code) : null;
        if (!room || meta.role !== 'host') return;
        touch(room);
        if (room.guest) {
          send(room.guest, { t: 'fx', seq: msg.seq, name: msg.name, detail: msg.detail });
        }
        break;
      }

      case 'leave': {
        if (!meta.code) return;
        const code = meta.code;
        const room = rooms.get(code);
        const role = meta.role;
        meta.code = null;
        meta.role = null;
        if (!room) break;
        if (role === 'host') {
          cleanupRoom(code, 'host_left');
        } else if (role === 'guest') {
          room.guest = null;
          touch(room);
          send(room.host, { t: 'guest_left' });
        }
        break;
      }

      case 'ping': {
        send(ws, { t: 'pong', ts: Date.now() });
        break;
      }

      default:
        send(ws, { t: 'error', message: `Unknown type: ${msg.t}` });
    }
  });

  ws.on('close', () => {
    if (!meta.code) return;
    const code = meta.code;
    const room = rooms.get(code);
    if (!room) return;
    const role = roleOf(room, ws) || meta.role;
    if (role === 'host') {
      cleanupRoom(code, 'host_disconnect');
    } else if (role === 'guest') {
      room.guest = null;
      touch(room);
      send(room.host, { t: 'guest_left' });
      console.log(`[pvp] guest left ${code}`);
    }
  });
});

// Idle room sweeper
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.lastActive > ROOM_TTL_MS) {
      cleanupRoom(code, 'ttl');
    }
  }
}, 60 * 1000).unref?.();

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[pvp] WebSocket relay listening on 0.0.0.0:${PORT}`);
});
