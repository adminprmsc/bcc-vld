import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LandUtilizationProgressScreen from '../screens/forms/LandUtilizationProgressScreen';
import RedbookOperationalScreen from '../screens/forms/RedbookOperationalScreen';
import SampleCollectionScreen from '../screens/forms/SampleCollectionScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

export type FormsStackParamList = {
  LandUtilizationProgress: undefined;
  RedbookOperational: undefined;
  SampleCollection: { sampleId?: string; assetName?: string } | undefined;
  Notifications: undefined;
};

const Stack = createNativeStackNavigator<FormsStackParamList>();

export default function FormsNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen
        name="LandUtilizationProgress"
        component={LandUtilizationProgressScreen}
        options={{ title: 'Land Utilization Progress' }}
      />
      <Stack.Screen
        name="RedbookOperational"
        component={RedbookOperationalScreen}
        options={{ title: 'Redbook Operational' }}
      />
      <Stack.Screen
        name="SampleCollection"
        component={SampleCollectionScreen}
        options={{ title: 'Sample Collection' }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Notifications' }}
      />
    </Stack.Navigator>
  );
}
