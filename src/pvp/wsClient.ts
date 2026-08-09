/**
 * Thin WebSocket client for the Milchcards PvP relay.
 * URL from REACT_APP_WS_URL (default ws://localhost:8081 in development).
 */

export type WsServerMessage =
  | { t: 'hello'; serverTime: number }
  | { t: 'created'; code: string; role: 'host' }
  | { t: 'joined'; code: string; role: 'guest' }
  | { t: 'guest_joined' }
  | { t: 'guest_left' }
  | { t: 'peer_left'; reason?: string }
  | { t: 'phase'; phase: string }
  | { t: 'state'; seq: number; json: string }
  | { t: 'action'; action: any }
  | { t: 'fx'; seq: number; name: string; detail: any }
  | { t: 'error'; message: string }
  | { t: 'pong'; ts: number };

export type WsClientMessage =
  | { t: 'create' }
  | { t: 'join'; code: string }
  | { t: 'phase'; phase: string }
  | { t: 'state'; seq: number; json: string }
  | { t: 'action'; action: any }
  | { t: 'fx'; seq: number; name: string; detail: any }
  | { t: 'leave' }
  | { t: 'ping' };

export function getWsUrl(): string {
  const fromEnv = process.env.REACT_APP_WS_URL;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();
  if (typeof window !== 'undefined') {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    // In CRA dev, the React app runs on :3000 and the relay on :8081
    if (window.location.port === '3000' || window.location.hostname === 'localhost') {
      return `${proto}://localhost:8081`;
    }
    return `${proto}://${window.location.host}`;
  }
  return 'ws://localhost:8081';
}

export function isPvpConfigured(): boolean {
  // Always available — local default or explicit REACT_APP_WS_URL
  return true;
}

export function connectWs(
  onMessage: (msg: WsServerMessage) => void,
  onClose?: (ev: CloseEvent) => void,
  onError?: (ev: Event) => void
): WebSocket {
  const url = getWsUrl();
  const ws = new WebSocket(url);
  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(String(ev.data)) as WsServerMessage;
      onMessage(msg);
    } catch (e) {
      console.error('[PvP] bad WS message', e);
    }
  };
  if (onClose) ws.onclose = onClose;
  if (onError) ws.onerror = onError;
  return ws;
}

export function sendWs(ws: WebSocket | null, msg: WsClientMessage) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  try {
    ws.send(JSON.stringify(msg));
  } catch (e) {
    console.error('[PvP] send failed', e);
  }
}
