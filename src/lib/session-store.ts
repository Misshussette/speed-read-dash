import { openDB, type IDBPDatabase } from 'idb';
import type { StoredSession, SessionMeta } from '@/types/telemetry';

const DB_NAME = 'stintlab';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'meta.id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function getAllSessions(): Promise<StoredSession[]> {
  const db = await getDB();
  return db.getAll(STORE_NAME);
}

export async function getSession(id: string): Promise<StoredSession | undefined> {
  const db = await getDB();
  return db.get(STORE_NAME, id);
}

export async function saveSession(session: StoredSession): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAME, session);
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

export async function getAllSessionMetas(): Promise<SessionMeta[]> {
  const sessions = await getAllSessions();
  return sessions.map(s => s.meta).sort((a, b) => b.importedAt - a.importedAt);
}
