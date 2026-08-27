import { useCallback, useEffect, useRef, useState } from 'react';
import { GameState } from '../types/game';
import { serializeGameState, deserializeGameState } from '../pvp/serialize';
import { PvpAction, PvpPhase, RELAYED_ENGINE_EVENTS, RELAYED_FX_EVENTS } from '../pvp/types';
import { setPvpRole, PvpRole } from '../pvp/pvpRole';
import {
  apiCreateRoom,
  apiJoinRoom,
  apiLeaveRoom,
  apiSyncGuest,
  apiSyncHost,
  HostOutbox,
} from '../pvp/blobApi';

export type PvpStatus = 'idle' | 'waiting' | 'ready' | 'playing' | 'error';

/** Poll cadence — turn-based game, ~1s feels responsive enough. */
const POLL_MS = 1000;
/** Trailing debounce so bursts of state changes collapse into one upload. */
const FLUSH_DEBOUNCE_MS = 250;
/** Peer considered gone if not seen for this long while playing. */
const PEER_STALE_MS = 2 * 60 * 1000;

interface UsePvpSessionArgs {
  onRemoteAction: (action: PvpAction) => void;
  onRemoteState: (state: GameState) => void;
  onPhaseChange?: (phase: PvpPhase) => void;
}

/**
 * 1v1 online session over Netlify Blobs (HTTP polling, no dedicated server).
 * Host-authoritative: the host runs the engine and publishes serialized
 * GameState + FX events; the guest renders synced state and sends actions.
 */
export function usePvpSession({ onRemoteAction, onRemoteState, onPhaseChange }: UsePvpSessionArgs) {
  const [role, setRole] = useState<PvpRole>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [status, setStatus] = useState<PvpStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const roleRef = useRef<PvpRole>(null);
  const roomRef = useRef<string | null>(null);
  const statusRef = useRef<PvpStatus>('idle');

  // Outgoing (host): latest state wins; fx and phase accumulate.
  const outSeqRef = useRef(0);
  const outboxHostRef = useRef<HostOutbox>({});
  // Outgoing (guest): ordered action queue.
  const outboxActionsRef = useRef<Array<{ seq: number; action: PvpAction }>>([]);

  // Incoming cursors
  const inStateSeqRef = useRef(0);
  const inFxSeqRef = useRef(0);
  const inActionSeqRef = useRef(0);
  const guestWasPresentRef = useRef(false);

  const pollTimerRef = useRef<number | null>(null);
  const flushTimerRef = useRef<number | null>(null);
  const syncChainRef = useRef<Promise<void>>(Promise.resolve());
  const failStreakRef = useRef(0);

  const fxUnsubsRef = useRef<Array<() => void>>([]);
  const eventUnsubsRef = useRef<Array<() => void>>([]);

  const onRemoteActionRef = useRef(onRemoteAction);
  const onRemoteStateRef = useRef(onRemoteState);
  const onPhaseChangeRef = useRef(onPhaseChange);
  useEffect(() => { onRemoteActionRef.current = onRemoteAction; }, [onRemoteAction]);
  useEffect(() => { onRemoteStateRef.current = onRemoteState; }, [onRemoteState]);
  useEffect(() => { onPhaseChangeRef.current = onPhaseChange; }, [onPhaseChange]);

  const applyStatus = useCallback((next: PvpStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const applyRole = useCallback((next: PvpRole) => {
    roleRef.current = next;
    setPvpRole(next);
    setRole(next);
  }, []);

  const clearListeners = useCallback(() => {
    fxUnsubsRef.current.forEach((fn) => { try { fn(); } catch { /* */ } });
    fxUnsubsRef.current = [];
    eventUnsubsRef.current.forEach((fn) => { try { fn(); } catch { /* */ } });
    eventUnsubsRef.current = [];
  }, []);

  const stopTimers = useCallback(() => {
    if (pollTimerRef.current) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (flushTimerRef.current) {
      window.clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
  }, []);

  const failPeerGone = useCallback((message: string) => {
    setError(message);
    applyStatus('error');
    onPhaseChangeRef.current?.('closed');
  }, [applyStatus]);

  // One serialized sync round-trip: flush outbox + ingest peer news.
  // Serialization matters because each peer's blob is read-modify-written
  // server-side; overlapping requests from the same client could drop data.
  const syncOnce = useCallback(async () => {
    const code = roomRef.current;
    const myRole = roleRef.current;
    if (!code || !myRole) return;

    try {
      if (myRole === 'host') {
        const out = outboxHostRef.current;
        outboxHostRef.current = {};
        const res = await apiSyncHost(code, { action: inActionSeqRef.current }, out);
        failStreakRef.current = 0;
        if (!res.ok || res.roomGone) return;

        if (res.guestPresent) {
          guestWasPresentRef.current = true;
          if (statusRef.current === 'waiting') applyStatus('ready');
          const seenAt = Number(res.guestSeenAt || 0);
          if (statusRef.current === 'playing' && seenAt && Date.now() - seenAt > PEER_STALE_MS) {
            failPeerGone('Gegner reagiert nicht mehr (Verbindung verloren).');
            return;
          }
        } else if (guestWasPresentRef.current) {
          if (statusRef.current === 'playing') {
            failPeerGone('Gegner hat das Spiel verlassen.');
            return;
          }
          guestWasPresentRef.current = false;
          if (statusRef.current === 'ready') applyStatus('waiting');
        }

        const actions = res.actions || [];
        actions.sort((a, b) => a.seq - b.seq);
        for (const item of actions) {
          if (item.seq <= inActionSeqRef.current) continue;
          inActionSeqRef.current = item.seq;
          const action = item.action;
          if (action && typeof action === 'object' && 't' in action) {
            try {
              onRemoteActionRef.current(action);
            } catch (e) {
              console.error('[PvP] action apply failed', e);
            }
          }
        }
        return;
      }

      // guest
      const pendingActions = outboxActionsRef.current;
      outboxActionsRef.current = [];
      let res;
      try {
        res = await apiSyncGuest(
          code,
          { state: inStateSeqRef.current, fx: inFxSeqRef.current },
          pendingActions.length ? { actions: pendingActions } : {}
        );
      } catch (e) {
        // Re-queue unsent actions ahead of anything enqueued meanwhile
        outboxActionsRef.current = [...pendingActions, ...outboxActionsRef.current];
        throw e;
      }
      failStreakRef.current = 0;
      if (!res.ok || res.roomGone) {
        failPeerGone('Der Host hat den Raum geschlossen.');
        return;
      }

      if (res.phase === 'started' && statusRef.current !== 'playing') {
        applyStatus('playing');
        onPhaseChangeRef.current?.('started');
      }

      if (res.state && typeof res.stateSeq === 'number' && res.stateSeq > inStateSeqRef.current) {
        inStateSeqRef.current = res.stateSeq;
        try {
          onRemoteStateRef.current(deserializeGameState(res.state));
        } catch (e) {
          console.error('[PvP] state deserialize failed', e);
        }
      }

      const fx = res.fx || [];
      fx.sort((a, b) => a.seq - b.seq);
      for (const item of fx) {
        if (item.seq <= inFxSeqRef.current) continue;
        inFxSeqRef.current = item.seq;
        try {
          window.dispatchEvent(new CustomEvent(item.name, { detail: item.detail ?? undefined }));
        } catch { /* */ }
      }
    } catch (e) {
      failStreakRef.current += 1;
      // Tolerate transient network blips; give up after ~15s of failures.
      if (failStreakRef.current >= 15 && statusRef.current !== 'error') {
        failPeerGone('Verbindung zum PvP-Backend verloren.');
      }
    }
  }, [applyStatus, failPeerGone]);

  const enqueueSync = useCallback(() => {
    syncChainRef.current = syncChainRef.current.then(() => syncOnce());
    return syncChainRef.current;
  }, [syncOnce]);

  const scheduleFlush = useCallback((delay = FLUSH_DEBOUNCE_MS) => {
    if (flushTimerRef.current) return;
    flushTimerRef.current = window.setTimeout(() => {
      flushTimerRef.current = null;
      enqueueSync();
    }, delay);
  }, [enqueueSync]);

  const startPolling = useCallback(() => {
    if (pollTimerRef.current) return;
    pollTimerRef.current = window.setInterval(() => {
      if (statusRef.current === 'error' || statusRef.current === 'idle') return;
      enqueueSync();
    }, POLL_MS);
  }, [enqueueSync]);

  const leaveRoom = useCallback(() => {
    const code = roomRef.current;
    const myRole = roleRef.current;
    stopTimers();
    clearListeners();
    roomRef.current = null;
    setRoomCode(null);
    applyRole(null);
    applyStatus('idle');
    setError(null);
    outboxHostRef.current = {};
    outboxActionsRef.current = [];
    inStateSeqRef.current = 0;
    inFxSeqRef.current = 0;
    inActionSeqRef.current = 0;
    outSeqRef.current = 0;
    guestWasPresentRef.current = false;
    failStreakRef.current = 0;
    if (code && myRole) {
      apiLeaveRoom(code, myRole);
    }
  }, [stopTimers, clearListeners, applyRole, applyStatus]);

  const attachHostFxListeners = useCallback(() => {
    RELAYED_FX_EVENTS.forEach((name) => {
      const handler = (ev: Event) => {
        const detail = (ev as CustomEvent).detail;
        outSeqRef.current += 1;
        const fx = outboxHostRef.current.fx || (outboxHostRef.current.fx = []);
        fx.push({
          seq: outSeqRef.current,
          name,
          detail: detail === undefined ? null : JSON.parse(JSON.stringify(detail)),
        });
        scheduleFlush(120);
      };
      window.addEventListener(name, handler as EventListener);
      fxUnsubsRef.current.push(() => window.removeEventListener(name, handler as EventListener));
    });
  }, [scheduleFlush]);

  const enqueueAction = useCallback((action: PvpAction) => {
    outSeqRef.current += 1;
    outboxActionsRef.current.push({
      seq: outSeqRef.current,
      action: JSON.parse(JSON.stringify(action)),
    });
    scheduleFlush(0);
  }, [scheduleFlush]);

  const attachGuestEventListeners = useCallback(() => {
    RELAYED_ENGINE_EVENTS.forEach((name) => {
      const handler = (ev: Event) => {
        const detail = (ev as CustomEvent).detail;
        enqueueAction({
          t: 'event',
          name,
          detail: detail === undefined ? null : detail,
        });
      };
      window.addEventListener(name, handler as EventListener);
      eventUnsubsRef.current.push(() => window.removeEventListener(name, handler as EventListener));
    });
  }, [enqueueAction]);

  const createRoom = useCallback(async (): Promise<string | null> => {
    try {
      setError(null);
      const code = await apiCreateRoom();
      roomRef.current = code;
      applyRole('host');
      setRoomCode(code);
      applyStatus('waiting');
      attachHostFxListeners();
      startPolling();
      return code;
    } catch (e: any) {
      setError(e?.message ?? 'Raum konnte nicht erstellt werden.');
      applyStatus('error');
      return null;
    }
  }, [applyRole, applyStatus, attachHostFxListeners, startPolling]);

  const joinRoom = useCallback(async (codeRaw: string): Promise<boolean> => {
    const code = codeRaw.trim().toUpperCase();
    if (!code) return false;
    try {
      setError(null);
      await apiJoinRoom(code);
      roomRef.current = code;
      applyRole('guest');
      setRoomCode(code);
      applyStatus('ready');
      attachGuestEventListeners();
      startPolling();
      enqueueSync();
      return true;
    } catch (e: any) {
      setError(e?.message ?? 'Beitritt fehlgeschlagen.');
      applyStatus('error');
      return false;
    }
  }, [applyRole, applyStatus, attachGuestEventListeners, startPolling, enqueueSync]);

  const markStarted = useCallback(() => {
    if (!roomRef.current || roleRef.current !== 'host') return;
    outboxHostRef.current.phase = 'started';
    applyStatus('playing');
    scheduleFlush(0);
  }, [applyStatus, scheduleFlush]);

  const publishState = useCallback((state: GameState) => {
    if (!roomRef.current || roleRef.current !== 'host') return;
    outSeqRef.current += 1;
    outboxHostRef.current.state = {
      seq: outSeqRef.current,
      json: serializeGameState(state),
    };
    scheduleFlush();
  }, [scheduleFlush]);

  const sendAction = useCallback((action: PvpAction) => {
    if (!roomRef.current || roleRef.current !== 'guest') return;
    enqueueAction(action);
  }, [enqueueAction]);

  useEffect(() => () => {
    leaveRoom();
    setPvpRole(null);
  }, [leaveRoom]);

  return {
    configured: true,
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
