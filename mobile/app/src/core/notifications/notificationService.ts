import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { http } from '../api/httpClient';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationData {
  id: string;
  title: string;
  body: string;
  type: 'task' | 'sample' | 'requisition' | 'progress' | 'system';
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

export interface PushTokenResult {
  token: string | null;
  error?: string;
}

/**
 * Request permission and get push notification token
 */
export async function registerForPushNotifications(): Promise<PushTokenResult> {
  if (!Device.isDevice) {
    return { token: null, error: 'Push notifications require a physical device' };
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return { token: null, error: 'Permission not granted for push notifications' };
    }

    // Get the Expo push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId || undefined,
    });

    // Configure Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563EB',
      });

      await Notifications.setNotificationChannelAsync('tasks', {
        name: 'Task Notifications',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#F59E0B',
      });

      await Notifications.setNotificationChannelAsync('samples', {
        name: 'Sample Collection',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10B981',
      });
    }

    return { token: tokenData.data };
  } catch (error) {
    console.error('Failed to register for push notifications:', error);
    return { token: null, error: String(error) };
  }
}

/**
 * Register push token with backend
 */
export async function registerTokenWithServer(token: string): Promise<boolean> {
  try {
    await http.post('/mobile/notifications/register', {
      token,
      platform: Platform.OS,
      deviceName: Device.deviceName || 'Unknown Device',
    });
    return true;
  } catch (error) {
    console.warn('Failed to register push token with server:', error);
    return false;
  }
}

/**
 * Fetch notifications from server
 */
export async function fetchNotifications(): Promise<NotificationData[]> {
  try {
    const response = await http.get<{ notifications: NotificationData[] }>('/mobile/notifications');
    return response.notifications || [];
  } catch (error) {
    console.warn('Failed to fetch notifications:', error);
    return [];
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(notificationId: string): Promise<boolean> {
  try {
    await http.post(`/mobile/notifications/${notificationId}/read`, {});
    return true;
  } catch (error) {
    console.warn('Failed to mark notification read:', error);
    return false;
  }
}

/**
 * Schedule a local notification
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
  seconds: number = 1
): Promise<string> {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: seconds > 0 ? { seconds } : null,
  });
  return id;
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get badge count
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Set badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Add notification received listener
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add notification response listener (when user taps notification)
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}
