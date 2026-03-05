import { useEffect, useRef } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSessionActions, useSessionStatus } from '../core/hooks/useSession';
import SignInScreen from '../screens/SignInScreen';
import MainNavigator from './MainNavigator';
import LandUtilizationProgressScreen from '../screens/forms/LandUtilizationProgressScreen';
import RedbookOperationalScreen from '../screens/forms/RedbookOperationalScreen';
import SampleCollectionScreen from '../screens/forms/SampleCollectionScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

type RootStackParamList = {
  Splash: undefined;
  SignIn: undefined;
  Main: undefined;
  // Form screens accessible from any tab
  LandUtilizationProgress: undefined;
  RedbookOperational: undefined;
  SampleCollection: { sampleId?: string; assetName?: string } | undefined;
  Notifications: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const status = useSessionStatus();
  const { initialize } = useSessionActions();
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    if (!bootstrappedRef.current) {
      bootstrappedRef.current = true;
      initialize().catch(error => console.warn('Session initialise failed', error));
    }
  }, [initialize]);

  const isBootstrapping = status === 'idle' || status === 'checking' || status === 'authenticating';

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isBootstrapping ? (
        <Stack.Screen name="Splash" component={SplashScreen} />
      ) : status === 'authenticated' ? (
        <>
          <Stack.Screen name="Main" component={MainNavigator} />
          <Stack.Screen
            name="LandUtilizationProgress"
            component={LandUtilizationProgressScreen}
            options={{ headerShown: true, title: 'Land Utilization Progress', presentation: 'modal' }}
          />
          <Stack.Screen
            name="RedbookOperational"
            component={RedbookOperationalScreen}
            options={{ headerShown: true, title: 'Redbook Operational', presentation: 'modal' }}
          />
          <Stack.Screen
            name="SampleCollection"
            component={SampleCollectionScreen}
            options={{ headerShown: true, title: 'Sample Collection', presentation: 'modal' }}
          />
          <Stack.Screen
            name="Notifications"
            component={NotificationsScreen}
            options={{ headerShown: true, title: 'Notifications' }}
          />
        </>
      ) : (
        <Stack.Screen name="SignIn" component={SignInScreen} />
      )}
    </Stack.Navigator>
  );
}

function SplashScreen() {
  return (
    <View style={styles.splashContainer}>
      <ActivityIndicator size="large" color="#2563EB" />
    </View>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
