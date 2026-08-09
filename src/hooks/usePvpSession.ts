import { useCallback, useEffect, useRef, useState } from 'react';
import { GameState } from '../types/game';
import { serializeGameState, deserializeGameState } from '../pvp/serialize';
import { PvpAction, PvpPhase, RELAYED_ENGINE_EVENTS, RELAYED_FX_EVENTS } from '../pvp/types';
import { setPvpRole, PvpRole } from '../pvp/pvpRole';
import {
  connectWs,
  sendWs,
  isPvpConfigured,
  WsServerMessage,
} from '../pvp/wsClient';

export type PvpStatus = 'idle' | 'waiting' | 'ready' | 'playing' | 'error';

interface UsePvpSessionArgs {
  onRemoteAction: (action: PvpAction) => void;
  onRemoteState: (state: GameState) => void;
  onPhaseChange?: (phase: PvpPhase) => void;
}

export function usePvpSession({ onRemoteAction, onRemoteState, onPhaseChange }: UsePvpSessionArgs) {
  const [role, setRole] = useState<PvpRole>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [status, setStatus] = useState<PvpStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const seqRef = useRef(0);
  const lastFxSeqRef = useRef(0);
  const roleRef = useRef<PvpRole>(null);
  const roomRef = useRef<string | null>(null);
  const fxUnsubsRef = useRef<Array<() => void>>([]);
  const eventUnsubsRef = useRef<Array<() => void>>([]);

  const onRemoteActionRef = useRef(onRemoteAction);
  const onRemoteStateRef = useRef(onRemoteState);
  const onPhaseChangeRef = useRef(onPhaseChange);
  useEffect(() => { onRemoteActionRef.current = onRemoteAction; }, [onRemoteAction]);
  useEffect(() => { onRemoteStateRef.current = onRemoteState; }, [onRemoteState]);
  useEffect(() => { onPhaseChangeRef.current = onPhaseChange; }, [onPhaseChange]);

  const applyRole = useCallback((next: PvpRole) => {
    roleRef.current = next;
    setPvpRole(next);
    setRole(next);
  }, []);

  const clearFxListeners = useCallback(() => {
    fxUnsubsRef.current.forEach((fn) => { try { fn(); } catch { /* */ } });
    fxUnsubsRef.current = [];
    eventUnsubsRef.current.forEach((fn) => { try { fn(); } catch { /* */ } });
    eventUnsubsRef.current = [];
  }, []);

  const closeSocket = useCallback(() => {
    clearFxListeners();
    const ws = wsRef.current;
    wsRef.current = null;
    if (ws) {
      try { sendWs(ws, { t: 'leave' }); } catch { /* */ }
      try { ws.close(); } catch { /* */ }
    }
  }, [clearFxListeners]);

  const leaveRoom = useCallback(() => {
    closeSocket();
    roomRef.current = null;
    setRoomCode(null);
    applyRole(null);
    setStatus('idle');
    setError(null);
  }, [closeSocket, applyRole]);

  const handleServerMessage = useCallback((msg: WsServerMessage) => {
    switch (msg.t) {
      case 'created':
        roomRef.current = msg.code;
        applyRole('host');
        setRoomCode(msg.code);
        setStatus('waiting');
        setError(null);
        // Host mirrors FX events to guest
        RELAYED_FX_EVENTS.forEach((name) => {
          const handler = (ev: Event) => {
            const detail = (ev as CustomEvent).detail;
            seqRef.current += 1;
            sendWs(wsRef.current, {
              t: 'fx',
              seq: seqRef.current,
              name,
              detail: detail === undefined ? null : JSON.parse(JSON.stringify(detail)),
            });
          };
          window.addEventListener(name, handler as EventListener);
          fxUnsubsRef.current.push(() => window.removeEventListener(name, handler as EventListener));
        });
        break;

      case 'joined':
        roomRef.current = msg.code;
        applyRole('guest');
        setRoomCode(msg.code);
        setStatus('ready');
        setError(null);
        // Guest forwards engine events to host
        RELAYED_ENGINE_EVENTS.forEach((name) => {
          const handler = (ev: Event) => {
            const detail = (ev as CustomEvent).detail;
            sendWs(wsRef.current, {
              t: 'action',
              action: {
                t: 'event',
                name,
                detail: detail === undefined ? null : JSON.parse(JSON.stringify(detail)),
              },
            });
          };
          window.addEventListener(name, handler as EventListener);
          eventUnsubsRef.current.push(() => window.removeEventListener(name, handler as EventListener));
        });
        break;

      case 'guest_joined':
        setStatus((prev) => (prev === 'playing' ? prev : 'ready'));
        break;

      case 'guest_left':
        setStatus((prev) => (prev === 'playing' ? prev : 'waiting'));
        break;

      case 'peer_left':
        setError('Gegner hat die Verbindung getrennt.');
        setStatus('error');
        break;

      case 'phase': {
        const phase = msg.phase as PvpPhase;
        if (phase === 'started') setStatus('playing');
        onPhaseChangeRef.current?.(phase);
        break;
      }

      case 'state':
        try {
          onRemoteStateRef.current(deserializeGameState(msg.json));
        } catch (e) {
          console.error('[PvP] state deserialize failed', e);
        }
        break;

      case 'action':
        try {
          const action = msg.action as PvpAction;
          if (action && typeof action === 'object' && 't' in action) {
            onRemoteActionRef.current(action);
          }
        } catch (e) {
          console.error('[PvP] action apply failed', e);
        }
        break;

      case 'fx':
        if (msg.seq === lastFxSeqRef.current) break;
        lastFxSeqRef.current = msg.seq;
        try {
          window.dispatchEvent(new CustomEvent(msg.name, { detail: msg.detail ?? undefined }));
        } catch { /* */ }
        break;

      case 'error':
        setError(msg.message || 'Unbekannter PvP-Fehler');
        setStatus('error');
        break;

      default:
        break;
    }
  }, [applyRole]);

  const ensureSocket = useCallback((): Promise<WebSocket> => {
    return new Promise((resolve, reject) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        resolve(wsRef.current);
        return;
      }
      closeSocket();
      const ws = connectWs(
        handleServerMessage,
        () => {
          if (roomRef.current) {
            setError('Verbindung zum PvP-Server verloren.');
            setStatus('error');
          }
        },
        () => {
          setError('PvP-Server nicht erreichbar. Starte den Relay-Server (npm run pvp).');
        }
      );
      wsRef.current = ws;
      ws.onopen = () => resolve(ws);
      const failTimer = window.setTimeout(() => {
        reject(new Error('Timeout beim Verbinden mit dem PvP-Server'));
      }, 8000);
      const prevOpen = ws.onopen;
      ws.onopen = (ev) => {
        window.clearTimeout(failTimer);
        if (typeof prevOpen === 'function') prevOpen.call(ws, ev);
        resolve(ws);
      };
    });
  }, [closeSocket, handleServerMessage]);

  const createRoom = useCallback(async (): Promise<string | null> => {
    try {
      setError(null);
      seqRef.current = 0;
      const ws = await ensureSocket();
      sendWs(ws, { t: 'create' });
      // room code arrives via 'created' message
      return new Promise((resolve) => {
        const start = Date.now();
        const poll = window.setInterval(() => {
          if (roomRef.current) {
            window.clearInterval(poll);
            resolve(roomRef.current);
          } else if (Date.now() - start > 5000) {
            window.clearInterval(poll);
            setError('Raum konnte nicht erstellt werden.');
            setStatus('error');
            resolve(null);
          }
        }, 50);
      });
    } catch (e: any) {
      setError(e?.message ?? 'Raum konnte nicht erstellt werden.');
      setStatus('error');
      return null;
    }
  }, [ensureSocket]);

  const joinRoom = useCallback(async (codeRaw: string): Promise<boolean> => {
    const code = codeRaw.trim().toUpperCase();
    if (!code) return false;
    try {
      setError(null);
      const ws = await ensureSocket();
      sendWs(ws, { t: 'join', code });
      return new Promise((resolve) => {
        const start = Date.now();
        const poll = window.setInterval(() => {
          if (roomRef.current === code && roleRef.current === 'guest') {
            window.clearInterval(poll);
            resolve(true);
          } else if (Date.now() - start > 5000) {
            window.clearInterval(poll);
            resolve(false);
          }
        }, 50);
      });
    } catch (e: any) {
      setError(e?.message ?? 'Beitritt fehlgeschlagen.');
      setStatus('error');
      return false;
    }
  }, [ensureSocket]);

  const markStarted = useCallback(() => {
    if (!roomRef.current || roleRef.current !== 'host') return;
    sendWs(wsRef.current, { t: 'phase', phase: 'started' });
    setStatus('playing');
  }, []);

  const publishState = useCallback((state: GameState) => {
    if (!roomRef.current || roleRef.current !== 'host') return;
    seqRef.current += 1;
    sendWs(wsRef.current, {
      t: 'state',
      seq: seqRef.current,
      json: serializeGameState(state),
    });
  }, []);

  const sendAction = useCallback((action: PvpAction) => {
    if (!roomRef.current || roleRef.current !== 'guest') return;
    sendWs(wsRef.current, {
      t: 'action',
      action: JSON.parse(JSON.stringify(action)),
    });
  }, []);

  useEffect(() => () => {
    leaveRoom();
    setPvpRole(null);
  }, [leaveRoom]);

  return {
    configured: isPvpConfigured(),
    role,
    roomCode,
    status,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    markStarted,
    publishState,
    sendAction,
  };
}
