import { initializeApp, FirebaseApp } from 'firebase/app';
import { Database, getDatabase } from 'firebase/database';

/**
 * Firebase Realtime Database client (lazy singleton).
 *
 * Config comes from REACT_APP_FB_* env vars; PvP is simply unavailable
 * when they are missing, the rest of the game works without them.
 */
let app: FirebaseApp | null = null;
let db: Database | null = null;

const config = {
  apiKey: process.env.REACT_APP_FB_API_KEY,
  authDomain: process.env.REACT_APP_FB_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FB_DATABASE_URL,
  projectId: process.env.REACT_APP_FB_PROJECT_ID,
  appId: process.env.REACT_APP_FB_APP_ID,
};

export function isPvpConfigured(): boolean {
  return Boolean(config.apiKey && config.databaseURL);
}

export function getDb(): Database {
  if (!isPvpConfigured()) {
    throw new Error('PvP ist nicht konfiguriert (REACT_APP_FB_API_KEY / REACT_APP_FB_DATABASE_URL fehlen).');
  }
  if (!db) {
    app = initializeApp(config as any);
    db = getDatabase(app);
  }
  return db;
}
