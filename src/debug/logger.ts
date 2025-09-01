// src/debug/logger.ts
// Lightweight debug logger that can be enabled via `localStorage.setItem('debug','1')`.
// Use logger.dbg / info / warn / err instead of direct console.* in the codebase.

/* eslint-disable no-console */

const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

function enabled(): boolean {
  try {
    if (!isBrowser) return false;
    return localStorage.getItem('debug') === '1';
  } catch {
    return false;
  }
}

export type LogLevel = 'DBG' | 'INF' | 'WRN' | 'ERR';

function now(): string {
  const d = new Date();
  return d.toISOString().split('T')[1]!.replace('Z', '');
}

class Logger {
  private log(level: LogLevel, message: string, ...args: unknown[]) {
    if (!enabled() && level === 'DBG') return; // only show dbg if enabled
    const prefix = `[${now()}] ${level}`;
    switch (level) {
      case 'DBG':
        console.debug(prefix, message, ...args);
        break;
      case 'INF':
        console.info(prefix, message, ...args);
        break;
      case 'WRN':
        console.warn(prefix, message, ...args);
        break;
      case 'ERR':
        console.error(prefix, message, ...args);
        break;
    }
  }

  dbg(message: string, ...args: unknown[]) {
    this.log('DBG', message, ...args);
  }
  info(message: string, ...args: unknown[]) {
    this.log('INF', message, ...args);
  }
  warn(message: string, ...args: unknown[]) {
    this.log('WRN', message, ...args);
  }
  err(message: string, ...args: unknown[]) {
    this.log('ERR', message, ...args);
  }
}

export const logger = new Logger();
