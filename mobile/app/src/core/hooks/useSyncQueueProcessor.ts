import { useEffect, useRef } from 'react';
import { submitTaskUpdate } from '../api/prmscService';
import { useSyncStore } from '../state/syncStore';
import type { SyncQueueItem } from '../types';

const PROCESS_INTERVAL_MS = 30_000;

export function useSyncQueueProcessor() {
  const queueRef = useRef<SyncQueueItem[]>([]);
  const updateQueueItem = useSyncStore(state => state.updateQueueItem);
  const queue = useSyncStore(state => state.queue);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    let cancelled = false;

    async function processNext() {
      if (cancelled) {
        return;
      }
      const snapshot = queueRef.current;
      const nextItem = snapshot.find(entry => entry.status === 'pending' || entry.status === 'error');
      if (!nextItem) {
        return;
      }

      updateQueueItem(nextItem.id, {
        status: 'syncing',
        lastAttempt: new Date().toISOString(),
        errorMessage: undefined
      });

      try {
        await performOperation(nextItem);
        updateQueueItem(nextItem.id, {
          status: 'synced',
          lastAttempt: new Date().toISOString(),
          errorMessage: undefined
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Background sync failed';
        updateQueueItem(nextItem.id, {
          status: 'error',
          lastAttempt: new Date().toISOString(),
          errorMessage: message
        });
      }
    }

    processNext().catch(err => console.warn('Sync queue processor error', err));

    const timer = setInterval(() => {
      processNext().catch(err => console.warn('Sync queue processor error', err));
    }, PROCESS_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [updateQueueItem]);
}

async function performOperation(item: SyncQueueItem) {
  switch (item.operation.type) {
    case 'TASK_COMPLETE':
      await submitTaskUpdate(item.operation.taskId, item.operation.payload);
      return;
    default:
      throw new Error(`Unsupported operation ${item.operation.type}`);
  }
}
