import type { SyncQueueItem } from '../types';
import { getDatabase } from './database';

export async function loadCachedQueue(): Promise<SyncQueueItem[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<DbQueueRow>('SELECT id, payload FROM sync_queue ORDER BY updatedAt ASC');
  return rows
    .map(row => {
      try {
        return JSON.parse(row.payload ?? '{}') as SyncQueueItem;
      } catch (error) {
        console.warn('Failed to parse cached sync queue row', error);
        return undefined;
      }
    })
    .filter((item): item is SyncQueueItem => Boolean(item?.id));
}

export async function persistQueue(queue: SyncQueueItem[]): Promise<void> {
  const db = await getDatabase();
  await db.withExclusiveTransactionAsync(async tx => {
    await tx.execAsync('DELETE FROM sync_queue');
    for (const item of queue) {
      await tx.runAsync(
        `INSERT OR REPLACE INTO sync_queue (id, payload, updatedAt)
         VALUES (?, ?, strftime('%s','now'))`,
        [item.id, JSON.stringify(item)]
      );
    }
  });
}

interface DbQueueRow {
  id: string;
  payload?: string;
}
