import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import MapExplorerScreen from '../screens/MapExplorerScreen';
import TasksScreen from '../screens/TasksScreen';
import SyncCenterScreen from '../screens/SyncCenterScreen';
import { ThemeContext } from '../core/theme/themes';
import { useContext, useMemo } from 'react';
import { useSessionProfile } from '../core/hooks/useSession';
import { getRoleDefinition } from '../roles/config';
import RequisitionNavigator from './RequisitionNavigator';

export type TabParamList = {
  Home: undefined;
  Map: undefined;
  Tasks: undefined;
  Requisitions: undefined;
  Sync: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

export default function MainNavigator() {
  const theme = useContext(ThemeContext);
  const profile = useSessionProfile();

  const roleDefinition = useMemo(() => {
    if (!profile) {
      return undefined;
    }
    return getRoleDefinition(profile.primaryRole);
  }, [profile]);

  type IconName = keyof typeof Ionicons.glyphMap;
  const homeIcon: IconName = (roleDefinition?.homeIcon ?? 'home') as IconName;

  const iconMap = useMemo<Record<keyof TabParamList, IconName>>(
    () => ({
      Home: homeIcon,
      Map: 'map' as IconName,
      Tasks: 'list' as IconName,
      Requisitions: 'file-tray-full-outline' as IconName,
      Sync: 'sync-outline' as IconName
    }),
    [homeIcon]
  );

  if (!profile || !roleDefinition) {
    return null;
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border
        },
        tabBarIcon: ({ color, size }) => {
          const iconName = getIconForRoute(route, iconMap);
          return <Ionicons name={iconName} size={size} color={color} />;
        }
      })}
    >
      <Tab.Screen
        name="Home"
        component={roleDefinition.HomeComponent}
        options={{ tabBarLabel: roleDefinition.homeLabel }}
      />
      <Tab.Screen
        name="Map"
        component={MapExplorerScreen}
        options={{ tabBarLabel: 'Map' }}
      />
      <Tab.Screen
        name="Tasks"
        component={TasksScreen}
        options={{ tabBarLabel: 'Tasks' }}
      />
      <Tab.Screen
        name="Requisitions"
        component={RequisitionNavigator}
        options={{ tabBarLabel: 'Requisitions' }}
      />
      <Tab.Screen
        name="Sync"
        component={SyncCenterScreen}
        options={{ tabBarLabel: 'Sync' }}
      />
    </Tab.Navigator>
  );
}

function getIconForRoute(
  route: RouteProp<TabParamList, keyof TabParamList>,
  iconMap: Record<keyof TabParamList, keyof typeof Ionicons.glyphMap>
) {
  return iconMap[route.name] ?? 'ellipse-outline';
}
