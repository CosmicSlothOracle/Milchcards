/**
 * HTTP client for the Netlify Blobs PvP backend (netlify/functions/pvp-room.mjs).
 *
 * The transport is plain polling: both peers call `sync` on an interval,
 * flushing their outbox and receiving the peer's news in one round-trip.
 */

import { PvpAction } from './types';

export const PVP_API = '/api/pvp';

export type PvpRoleName = 'host' | 'guest';

export interface HostSyncResponse {
  ok: boolean;
  roomGone?: boolean;
  guestPresent?: boolean;
  guestSeenAt?: number | null;
  actions?: Array<{ seq: number; action: PvpAction }>;
}

export interface GuestSyncResponse {
  ok: boolean;
  roomGone?: boolean;
  phase?: string;
  hostSeenAt?: number | null;
  stateSeq?: number | null;
  state?: string | null;
  fx?: Array<{ seq: number; name: string; detail: any }>;
}

export interface HostOutbox {
  phase?: string;
  state?: { seq: number; json: string };
  fx?: Array<{ seq: number; name: string; detail: any }>;
}

export interface GuestOutbox {
  actions?: Array<{ seq: number; action: PvpAction }>;
}

async function post(body: Record<string, any>): Promise<any> {
  const res = await fetch(PVP_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch { /* non-JSON error page (e.g. CRA dev without functions) */ }
  if (!res.ok) {
    const message = typeof data?.error === 'string'
      ? data.error
      : 'PvP-Backend nicht erreichbar. Online-Spiel benötigt das Netlify-Deployment (oder lokal `netlify dev`).';
    throw new Error(message);
  }
  return data ?? {};
}

export async function apiCreateRoom(): Promise<string> {
  const data = await post({ op: 'create' });
  if (!data?.code) throw new Error('Raum konnte nicht erstellt werden.');
  return String(data.code);
}

export async function apiJoinRoom(code: string): Promise<void> {
  await post({ op: 'join', code });
}

export async function apiLeaveRoom(code: string, role: PvpRoleName): Promise<void> {
  try {
    await post({ op: 'leave', code, role });
  } catch { /* best effort */ }
}

export async function apiSyncHost(
  code: string,
  cursor: { action: number },
  out: HostOutbox
): Promise<HostSyncResponse> {
  return post({ op: 'sync', code, role: 'host', cursor, out });
}

export async function apiSyncGuest(
  code: string,
  cursor: { state: number; fx: number },
  out: GuestOutbox
): Promise<GuestSyncResponse> {
  return post({ op: 'sync', code, role: 'guest', cursor, out });
}
