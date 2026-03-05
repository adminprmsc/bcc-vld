import { getDatabase } from './database';

export interface CachedRequisitionRecord {
  id: string;
  payload: unknown;
}

export async function loadCachedRequisitions(): Promise<CachedRequisitionRecord[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<DbRequisitionRow>('SELECT id, payload FROM requisitions_cache ORDER BY updatedAt DESC');
  return rows
    .map(row => {
      try {
        return {
          id: row.id,
          payload: JSON.parse(row.payload ?? '{}') as unknown
        };
      } catch (error) {
        console.warn('Failed to parse cached requisition payload', error);
        return undefined;
      }
    })
    .filter((record): record is CachedRequisitionRecord => Boolean(record?.id));
}

export async function persistRequisitions(records: CachedRequisitionRecord[], options?: { truncate?: boolean }): Promise<void> {
  const db = await getDatabase();
  await db.withExclusiveTransactionAsync(async tx => {
    if (options?.truncate) {
      await tx.execAsync('DELETE FROM requisitions_cache');
    }
    for (const record of records) {
      await tx.runAsync(
        `INSERT OR REPLACE INTO requisitions_cache (id, payload, updatedAt)
         VALUES (?, ?, strftime('%s','now'))`,
        [record.id, JSON.stringify(record.payload ?? {})]
      );
    }
  });
}

interface DbRequisitionRow {
  id: string;
  payload?: string;
}
