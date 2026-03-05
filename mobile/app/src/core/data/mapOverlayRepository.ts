import type { MapOverlayCollection, OverlayKey } from '../types';
import { getDatabase } from './database';

const OVERLAY_KEYS: OverlayKey[] = ['critical', 'sampling', 'maintenance', 'outreach'];

export async function loadCachedOverlays(): Promise<MapOverlayCollection> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<DbOverlayRow>('SELECT key, payload FROM map_overlays');
  const defaultCollection: MapOverlayCollection = {
    critical: [],
    sampling: [],
    maintenance: [],
    outreach: []
  };

  return rows.reduce<MapOverlayCollection>((acc, row) => {
    if (!row.key || !isOverlayKey(row.key)) {
      return acc;
    }
    try {
      const parsed = JSON.parse(row.payload ?? '[]');
      acc[row.key] = Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('Failed to parse cached overlay payload', error);
      acc[row.key] = [];
    }
    return acc;
  }, defaultCollection);
}

export async function persistOverlays(collection: MapOverlayCollection): Promise<void> {
  const db = await getDatabase();
  await db.withExclusiveTransactionAsync(async tx => {
    for (const key of OVERLAY_KEYS) {
      await tx.runAsync(
        `INSERT OR REPLACE INTO map_overlays (key, payload, updatedAt)
         VALUES (?, ?, strftime('%s','now'))`,
        [key, JSON.stringify(collection[key] ?? [])]
      );
    }
  });
}

function isOverlayKey(key: string): key is OverlayKey {
  return OVERLAY_KEYS.includes(key as OverlayKey);
}

interface DbOverlayRow {
  key: string;
  payload?: string;
}
