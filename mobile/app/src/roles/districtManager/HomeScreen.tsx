import React, { useContext } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../../core/theme/themes';
import { useSessionActions, useSessionProfile } from '../../core/hooks/useSession';
import { useUnreadCount } from '../../core/notifications/notificationStore';

export default function DistrictManagerHomeScreen() {
  const theme = useContext(ThemeContext);
  const navigation = useNavigation<any>();
  const profile = useSessionProfile();
  const { signOut } = useSessionActions();
  const unreadCount = useUnreadCount();

  const quickActions = [
    {
      id: 'land-progress',
      title: 'Land Utilization Progress',
      description: 'Update on-site construction status',
      icon: 'trending-up',
      color: '#10B981',
      screen: 'LandUtilizationProgress',
    },
    {
      id: 'redbook',
      title: 'Redbook Operational Data',
      description: 'Record asset operational status',
      icon: 'book',
      color: '#EF4444',
      screen: 'RedbookOperational',
    },
  ];

  const dashboardCards = [
    { id: 'requisitions', title: 'Active Requisitions', value: '12', icon: 'file-tray-full', color: '#3B82F6' },
    { id: 'critical', title: 'Critical Assets', value: '5', icon: 'warning', color: '#EF4444' },
    { id: 'progress', title: 'Avg. Progress', value: '67%', icon: 'analytics', color: '#10B981' },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: theme.colors.textSecondary }]}>Welcome back,</Text>
          <Text style={[styles.name, { color: theme.colors.text }]}>{profile?.name || 'District Manager'}</Text>
        </View>
        <TouchableOpacity
          style={[styles.notificationButton, { backgroundColor: theme.colors.surface }]}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Ionicons name="notifications" size={24} color={theme.colors.text} />
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Overview</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardsRow}>
          {dashboardCards.map(card => (
            <View key={card.id} style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Ionicons name={card.icon as any} size={28} color={card.color} />
              <Text style={[styles.cardValue, { color: theme.colors.text }]}>{card.value}</Text>
              <Text style={[styles.cardTitle, { color: theme.colors.textSecondary }]}>{card.title}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Quick Actions</Text>
        {quickActions.map(action => (
          <TouchableOpacity
            key={action.id}
            style={[styles.actionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => navigation.navigate(action.screen)}
          >
            <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
              <Ionicons name={action.icon as any} size={28} color={action.color} />
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { color: theme.colors.text }]}>{action.title}</Text>
              <Text style={[styles.actionDesc, { color: theme.colors.textSecondary }]}>{action.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={[styles.signOut, { borderColor: theme.colors.border }]} onPress={() => signOut()}>
        <Text style={[styles.signOutText, { color: theme.colors.textSecondary }]}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 14 },
  name: { fontSize: 24, fontWeight: '700' },
  notificationButton: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  badge: { position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  section: { gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600' },
  cardsRow: { gap: 12 },
  card: { width: 120, padding: 12, borderRadius: 12, borderWidth: 1, gap: 8, alignItems: 'center' },
  cardValue: { fontSize: 24, fontWeight: '700' },
  cardTitle: { fontSize: 11, textAlign: 'center' },
  actionCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, gap: 12 },
  actionIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  actionContent: { flex: 1 },
  actionTitle: { fontSize: 15, fontWeight: '600' },
  actionDesc: { fontSize: 12 },
  signOut: { paddingVertical: 14, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  signOutText: { fontSize: 14 },
});
