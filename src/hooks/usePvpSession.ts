import { useCallback, useEffect, useRef, useState } from 'react';
import {
  child,
  get,
  onChildAdded,
  onDisconnect,
  onValue,
  push,
  ref,
  remove,
  serverTimestamp,
  set,
} from 'firebase/database';
import { GameState } from '../types/game';
import { getDb, isPvpConfigured } from '../pvp/firebaseClient';
import { serializeGameState, deserializeGameState } from '../pvp/serialize';
import { PvpAction, PvpPhase, RELAYED_ENGINE_EVENTS, RELAYED_FX_EVENTS } from '../pvp/types';
import { setPvpRole, PvpRole } from '../pvp/pvpRole';

export type PvpStatus = 'idle' | 'waiting' | 'ready' | 'playing' | 'error';

interface UsePvpSessionArgs {
  /** Host only: apply a guest action to the local engine. */
  onRemoteAction: (action: PvpAction) => void;
  /** Guest only: replace local game state with the host's authoritative state. */
  onRemoteState: (state: GameState) => void;
  /** Both: room phase changed (guest uses 'started' to enter the game view). */
  onPhaseChange?: (phase: PvpPhase) => void;
}

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return code;
}

export function usePvpSession({ onRemoteAction, onRemoteState, onPhaseChange }: UsePvpSessionArgs) {
  const [role, setRole] = useState<PvpRole>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [status, setStatus] = useState<PvpStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const unsubsRef = useRef<Array<() => void>>([]);
  const seqRef = useRef(0);
  const lastFxSeqRef = useRef(0);
  const roleRef = useRef<PvpRole>(null);
  const roomRef = useRef<string | null>(null);

  // Keep callbacks in refs so subscriptions never go stale
  const onRemoteActionRef = useRef(onRemoteAction);
  const onRemoteStateRef = useRef(onRemoteState);
  const onPhaseChangeRef = useRef(onPhaseChange);
  useEffect(() => { onRemoteActionRef.current = onRemoteAction; }, [onRemoteAction]);
  useEffect(() => { onRemoteStateRef.current = onRemoteState; }, [onRemoteState]);
  useEffect(() => { onPhaseChangeRef.current = onPhaseChange; }, [onPhaseChange]);

  const cleanup = useCallback(() => {
    unsubsRef.current.forEach((fn) => {
      try { fn(); } catch { }
    });
    unsubsRef.current = [];
  }, []);

  const applyRole = useCallback((next: PvpRole) => {
    roleRef.current = next;
    setPvpRole(next);
    setRole(next);
  }, []);

  const leaveRoom = useCallback(() => {
    const code = roomRef.current;
    const currentRole = roleRef.current;
    cleanup();
    if (code) {
      try {
        const db = getDb();
        if (currentRole === 'host') {
          remove(ref(db, `rooms/${ code }`)).catch(() => { });
        } else if (currentRole === 'guest') {
          remove(ref(db, `rooms/${ code }/guest`)).catch(() => { });
        }
      } catch { }
    }
    roomRef.current = null;
    setRoomCode(null);
    applyRole(null);
    setStatus('idle');
    setError(null);
  }, [cleanup, applyRole]);

  // ----- HOST -----

  const createRoom = useCallback(async (): Promise<string | null> => {
    try {
      const db = getDb();
      const code = generateRoomCode();
      const room = ref(db, `rooms/${ code }`);
      await set(room, { phase: 'lobby', createdAt: serverTimestamp() });
      onDisconnect(child(room, 'phase')).set('closed').catch(() => { });

      roomRef.current = code;
      seqRef.current = 0;
      applyRole('host');
      setRoomCode(code);
      setStatus('waiting');
      setError(null);

      // Guest presence
      const unsubGuest = onValue(child(room, 'guest'), (snap) => {
        if (snap.exists()) {
          setStatus((prev) => (prev === 'playing' ? prev : 'ready'));
        } else {
          setStatus((prev) => (prev === 'playing' ? prev : 'waiting'));
        }
      });

      // Guest actions: apply to local engine, then delete
      const unsubActions = onChildAdded(child(room, 'actions'), (snap) => {
        const action = snap.val() as PvpAction | null;
        remove(snap.ref).catch(() => { });
        if (action && typeof action === 'object' && 't' in action) {
          try {
            onRemoteActionRef.current(action);
          } catch (e) {
            console.error('[PvP] Fehler beim Anwenden einer Gast-Aktion', e);
          }
        }
      });

      // Mirror visual feedback events (dice etc.) to the guest
      const fxHandlers = RELAYED_FX_EVENTS.map((name) => {
        const handler = (ev: Event) => {
          const detail = (ev as CustomEvent).detail;
          seqRef.current += 1;
          set(child(room, 'fx'), {
            seq: seqRef.current,
            name,
            detail: detail === undefined ? null : JSON.parse(JSON.stringify(detail)),
          }).catch(() => { });
        };
        window.addEventListener(name, handler as EventListener);
        return () => window.removeEventListener(name, handler as EventListener);
      });

      unsubsRef.current.push(unsubGuest, unsubActions, ...fxHandlers);
      return code;
    } catch (e: any) {
      setError(e?.message ?? 'Raum konnte nicht erstellt werden.');
      setStatus('error');
      return null;
    }
  }, [applyRole]);

  const markStarted = useCallback(() => {
    const code = roomRef.current;
    if (!code || roleRef.current !== 'host') return;
    try {
      const db = getDb();
      set(ref(db, `rooms/${ code }/phase`), 'started').catch(() => { });
      setStatus('playing');
    } catch { }
  }, []);

  const publishState = useCallback((state: GameState) => {
    const code = roomRef.current;
    if (!code || roleRef.current !== 'host') return;
    try {
      const db = getDb();
      seqRef.current += 1;
      set(ref(db, `rooms/${ code }/state`), {
        seq: seqRef.current,
        json: serializeGameState(state),
      }).catch(() => { });
    } catch { }
  }, []);

  // ----- GUEST -----

  const joinRoom = useCallback(async (codeRaw: string): Promise<boolean> => {
    const code = codeRaw.trim().toUpperCase();
    if (!code) return false;
    try {
      const db = getDb();
      const room = ref(db, `rooms/${ code }`);
      const snap = await get(child(room, 'phase'));
      if (!snap.exists() || snap.val() === 'closed') {
        setError('Raum nicht gefunden oder bereits geschlossen.');
        return false;
      }

      await set(child(room, 'guest'), { joinedAt: serverTimestamp() });
      onDisconnect(child(room, 'guest')).remove().catch(() => { });

      roomRef.current = code;
      applyRole('guest');
      setRoomCode(code);
      setStatus('ready');
      setError(null);

      // Authoritative state from host
      const unsubState = onValue(child(room, 'state'), (snap2) => {
        const val = snap2.val() as { seq: number; json: string } | null;
        if (!val?.json) return;
        try {
          onRemoteStateRef.current(deserializeGameState(val.json));
        } catch (e) {
          console.error('[PvP] Fehler beim Deserialisieren des States', e);
        }
      });

      // Phase changes (host started the match / closed the room)
      const unsubPhase = onValue(child(room, 'phase'), (snap2) => {
        const phase = snap2.val() as PvpPhase | null;
        if (!phase) return;
        if (phase === 'started') setStatus('playing');
        onPhaseChangeRef.current?.(phase);
      });

      // Visual feedback mirrored from the host (dice rolls etc.)
      const unsubFx = onValue(child(room, 'fx'), (snap2) => {
        const fx = snap2.val() as { seq: number; name: string; detail: any } | null;
        if (!fx || fx.seq === lastFxSeqRef.current) return;
        lastFxSeqRef.current = fx.seq;
        try {
          window.dispatchEvent(new CustomEvent(fx.name, { detail: fx.detail ?? undefined }));
        } catch { }
      });

      // Forward engine window-events (corruption rolls etc.) to the host.
      // The local engine listeners are gated off for guests via pvpRole.
      const eventForwarders = RELAYED_ENGINE_EVENTS.map((name) => {
        const handler = (ev: Event) => {
          const detail = (ev as CustomEvent).detail;
          push(child(room, 'actions'), {
            t: 'event',
            name,
            detail: detail === undefined ? null : JSON.parse(JSON.stringify(detail)),
          }).catch(() => { });
        };
        window.addEventListener(name, handler as EventListener);
        return () => window.removeEventListener(name, handler as EventListener);
      });

      unsubsRef.current.push(unsubState, unsubPhase, unsubFx, ...eventForwarders);
      return true;
    } catch (e: any) {
      setError(e?.message ?? 'Beitritt fehlgeschlagen.');
      setStatus('error');
      return false;
    }
  }, [applyRole]);

  const sendAction = useCallback((action: PvpAction) => {
    const code = roomRef.current;
    if (!code || roleRef.current !== 'guest') return;
    try {
      const db = getDb();
      push(ref(db, `rooms/${ code }/actions`), JSON.parse(JSON.stringify(action))).catch(() => { });
    } catch { }
  }, []);

  // Cleanup on unmount
  useEffect(() => () => {
    cleanup();
    setPvpRole(null);
  }, [cleanup]);

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
