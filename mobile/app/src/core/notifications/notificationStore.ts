import { create } from 'zustand';
import type { NotificationData } from './notificationService';
import {
  fetchNotifications,
  markNotificationRead,
  registerForPushNotifications,
  registerTokenWithServer,
  setBadgeCount,
} from './notificationService';

interface NotificationState {
  notifications: NotificationData[];
  unreadCount: number;
  pushToken: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setNotifications: (notifications: NotificationData[]) => void;
  addNotification: (notification: NotificationData) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  setPushToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Async actions
  initializePushNotifications: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  pushToken: null,
  isLoading: false,
  error: null,

  setNotifications: (notifications) => {
    const unreadCount = notifications.filter(n => !n.read).length;
    set({ notifications, unreadCount });
    setBadgeCount(unreadCount).catch(console.warn);
  },

  addNotification: (notification) => {
    const { notifications } = get();
    const exists = notifications.some(n => n.id === notification.id);
    if (!exists) {
      const updated = [notification, ...notifications];
      const unreadCount = updated.filter(n => !n.read).length;
      set({ notifications: updated, unreadCount });
      setBadgeCount(unreadCount).catch(console.warn);
    }
  },

  markAsRead: async (id) => {
    const { notifications } = get();
    const updated = notifications.map(n =>
      n.id === id ? { ...n, read: true } : n
    );
    const unreadCount = updated.filter(n => !n.read).length;
    set({ notifications: updated, unreadCount });
    setBadgeCount(unreadCount).catch(console.warn);
    
    // Sync with server
    await markNotificationRead(id);
  },

  markAllAsRead: () => {
    const { notifications } = get();
    const updated = notifications.map(n => ({ ...n, read: true }));
    set({ notifications: updated, unreadCount: 0 });
    setBadgeCount(0).catch(console.warn);
  },

  setPushToken: (token) => set({ pushToken: token }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  initializePushNotifications: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await registerForPushNotifications();
      if (result.token) {
        set({ pushToken: result.token });
        await registerTokenWithServer(result.token);
      } else if (result.error) {
        set({ error: result.error });
      }
    } catch (error) {
      set({ error: String(error) });
    } finally {
      set({ isLoading: false });
    }
  },

  refreshNotifications: async () => {
    set({ isLoading: true, error: null });
    try {
      const notifications = await fetchNotifications();
      get().setNotifications(notifications);
    } catch (error) {
      set({ error: String(error) });
    } finally {
      set({ isLoading: false });
    }
  },
}));

// Selectors
export const useNotifications = () => useNotificationStore(state => state.notifications);
export const useUnreadCount = () => useNotificationStore(state => state.unreadCount);
export const usePushToken = () => useNotificationStore(state => state.pushToken);
export const useNotificationLoading = () => useNotificationStore(state => state.isLoading);
