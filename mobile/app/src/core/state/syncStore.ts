import { create } from 'zustand';
import type { SyncChannelStatus, SyncQueueItem } from '../types';
import { loadCachedQueue, persistQueue } from '../data/syncQueueRepository';

interface SyncState {
  channels: SyncChannelStatus[];
  queue: SyncQueueItem[];
  setChannels: (channels: SyncChannelStatus[]) => void;
  updateChannel: (id: string, patch: Partial<SyncChannelStatus>) => void;
  enqueue: (item: SyncQueueItem) => void;
  updateQueueItem: (id: string, patch: Partial<SyncQueueItem>) => void;
  clearQueueItem: (id: string) => void;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  channels: [],
  queue: [],
  setChannels: channels => set(() => ({ channels })),
  updateChannel: (id, patch) =>
    set(() => ({
      channels: get().channels.map(channel => (channel.id === id ? { ...channel, ...patch } : channel))
    })),
  enqueue: item => set(() => ({ queue: [...get().queue, item] })),
  updateQueueItem: (id, patch) =>
    set(() => ({
      queue: get().queue.map(entry => (entry.id === id ? { ...entry, ...patch } : entry))
    })),
  clearQueueItem: id => set(() => ({ queue: get().queue.filter(entry => entry.id !== id) }))
}));

let hasHydratedQueue = false;
let hydratePromise: Promise<void> | null = null;

export function hydrateSyncStore(): Promise<void> {
  if (hydratePromise) {
    return hydratePromise;
  }
  hydratePromise = (async () => {
    try {
      const cachedQueue = await loadCachedQueue();
      if (cachedQueue.length) {
        useSyncStore.setState(state => ({
          ...state,
          queue: cachedQueue
        }));
      }
    } catch (error) {
      console.warn('Failed to hydrate sync queue cache', error);
    } finally {
      hasHydratedQueue = true;
    }
  })();
  return hydratePromise;
}

useSyncStore.subscribe(state => {
  if (!hasHydratedQueue) {
    return;
  }
  persistQueue(state.queue).catch(error => console.warn('Failed to persist sync queue cache', error));
});
