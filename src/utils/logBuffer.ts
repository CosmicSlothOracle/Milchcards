/** Buffers log lines while inside a setState updater (avoids nested setState clobbering game state). */
let buffer: string[] | null = null;

export function formatLogEntry(msg: string): string {
  const timestamp = new Date().toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return `[${ timestamp }] ${ msg }`;
}

export function beginLogBuffer(): void {
  buffer = [];
}

export function isLogBufferActive(): boolean {
  return buffer !== null;
}

export function pushToLogBuffer(entry: string): void {
  buffer?.push(entry);
}

export function flushLogBuffer<T extends { log: string[] }>(state: T): T {
  if (!buffer?.length) {
    buffer = null;
    return state;
  }
  const entries = buffer;
  buffer = null;
  return { ...state, log: [...state.log, ...entries] };
}

export function cancelLogBuffer(): void {
  buffer = null;
}
