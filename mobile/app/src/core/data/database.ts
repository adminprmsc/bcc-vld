import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

const DATABASE_NAME = 'prmsc-field-ops.db';
let databasePromise: Promise<SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = (async () => {
      const db = await openDatabaseAsync(DATABASE_NAME);
      await db.execAsync('PRAGMA journal_mode = WAL;');
      await runMigrations(db);
      return db;
    })();
  }
  return databasePromise;
}

async function runMigrations(db: SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT,
      role TEXT,
      due TEXT,
      status TEXT,
      updatedAt INTEGER DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS map_overlays (
      key TEXT PRIMARY KEY NOT NULL,
      payload TEXT NOT NULL,
      updatedAt INTEGER DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY NOT NULL,
      payload TEXT NOT NULL,
      updatedAt INTEGER DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS requisitions_cache (
      id TEXT PRIMARY KEY NOT NULL,
      payload TEXT NOT NULL,
      updatedAt INTEGER DEFAULT (strftime('%s','now'))
    );
  `);
}
