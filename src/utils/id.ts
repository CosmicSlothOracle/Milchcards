import { UID } from '../types/primitives';

// Prefer cryptographically strong random IDs when available to avoid collisions.
let __uidCounter = 0;

function randomUid(): UID | null {
  if (typeof globalThis === 'undefined') return null;
  const cryptoObj = (globalThis as any).crypto;
  if (!cryptoObj?.getRandomValues) return null;
  const buf = new Uint32Array(2);
  cryptoObj.getRandomValues(buf);
  // Compose a 53-bit integer from two 32-bit values.
  const high = buf[0] & 0x1fffff; // 21 bits
  const low = buf[1];
  return (high * 2 ** 32 + low) as UID;
}

export function makeUid(_prefix = 'card'): UID {
  const random = randomUid();
  if (random !== null) {
    return random;
  }
  __uidCounter = (__uidCounter + 1) % Number.MAX_SAFE_INTEGER;
  return __uidCounter;
}
