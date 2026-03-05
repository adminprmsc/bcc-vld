import { NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider } from 'react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { useEffect, useRef } from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import ThemeProvider from './src/core/theme/ThemeProvider';
import { queryClient } from './src/core/api/queryClient';
import { useSyncQueueProcessor } from './src/core/hooks/useSyncQueueProcessor';
import { hydrateSyncStore } from './src/core/state/syncStore';
import {
  addNotificationReceivedListener,
  addNotificationResponseListener,
} from './src/core/notifications/notificationService';
import { useNotificationStore } from './src/core/notifications/notificationStore';
import type { NotificationData } from './src/core/notifications/notificationService';

export default function App() {
  const colorScheme = useColorScheme();
  useSyncQueueProcessor();
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    // Hydrate sync store
    hydrateSyncStore().catch(error => {
      console.warn('Sync queue hydration failed', error);
    });

    // Initialize push notifications
    const { initializePushNotifications, addNotification } = useNotificationStore.getState();
    initializePushNotifications().catch(error => {
      console.warn('Push notification initialization failed', error);
    });

    // Listen for incoming notifications
    notificationListener.current = addNotificationReceivedListener(notification => {
      const data = notification.request.content.data as any;
      const newNotification: NotificationData = {
        id: notification.request.identifier,
        title: notification.request.content.title || 'Notification',
        body: notification.request.content.body || '',
        type: data?.type || 'system',
        data: data,
        read: false,
        createdAt: new Date().toISOString(),
      };
      addNotification(newNotification);
    });

    // Listen for notification taps
    responseListener.current = addNotificationResponseListener(response => {
      const data = response.notification.request.content.data as any;
      console.log('Notification tapped:', data);
      // Navigate based on notification type
      // This would require access to navigation ref
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider colorScheme={colorScheme}>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
