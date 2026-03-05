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

export default function SamplerHomeScreen() {
  const theme = useContext(ThemeContext);
  const navigation = useNavigation<any>();
  const profile = useSessionProfile();
  const { signOut } = useSessionActions();
  const unreadCount = useUnreadCount();

  const todaysAssignments = [
    { id: '1', title: 'Tube Well TW-045', location: 'Tehsil Mianwali', status: 'pending', priority: 'high' },
    { id: '2', title: 'Water Supply WSS-012', location: 'Tehsil Piplan', status: 'pending', priority: 'medium' },
    { id: '3', title: 'Hand Pump HP-089', location: 'Tehsil Isa Khel', status: 'completed', priority: 'low' },
  ];

  const stats = [
    { id: 'pending', title: 'Pending', value: '4', color: '#F59E0B' },
    { id: 'today', title: 'Today', value: '2', color: '#3B82F6' },
    { id: 'completed', title: 'Completed', value: '12', color: '#10B981' },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      default: return '#10B981';
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: theme.colors.textSecondary }]}>Welcome back,</Text>
          <Text style={[styles.name, { color: theme.colors.text }]}>{profile?.name || 'Sampler'}</Text>
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

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        {stats.map(stat => (
          <View key={stat.id} style={[styles.statCard, { backgroundColor: stat.color + '15', borderColor: stat.color }]}>
            <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={[styles.statTitle, { color: theme.colors.textSecondary }]}>{stat.title}</Text>
          </View>
        ))}
      </View>

      {/* New Sample Collection Button */}
      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate('SampleCollection')}
      >
        <Ionicons name="flask" size={24} color="#FFFFFF" />
        <Text style={styles.primaryButtonText}>Start New Sample Collection</Text>
        <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Today's Assignments */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Today's Assignments</Text>
        {todaysAssignments.map(assignment => (
          <TouchableOpacity
            key={assignment.id}
            style={[styles.assignmentCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => navigation.navigate('SampleCollection', { sampleId: assignment.id, assetName: assignment.title })}
          >
            <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(assignment.priority) }]} />
            <View style={styles.assignmentContent}>
              <Text style={[styles.assignmentTitle, { color: theme.colors.text }]}>{assignment.title}</Text>
              <View style={styles.assignmentMeta}>
                <Ionicons name="location" size={14} color={theme.colors.textSecondary} />
                <Text style={[styles.assignmentLocation, { color: theme.colors.textSecondary }]}>{assignment.location}</Text>
              </View>
            </View>
            {assignment.status === 'completed' ? (
              <View style={[styles.statusBadge, { backgroundColor: '#10B98120' }]}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={[styles.statusText, { color: '#10B981' }]}>Done</Text>
              </View>
            ) : (
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Quick Tips */}
      <View style={[styles.tipsCard, { backgroundColor: theme.colors.primary + '10', borderColor: theme.colors.primary }]}>
        <Ionicons name="bulb" size={24} color={theme.colors.primary} />
        <View style={styles.tipsContent}>
          <Text style={[styles.tipsTitle, { color: theme.colors.text }]}>Sampling Tips</Text>
          <Text style={[styles.tipsText, { color: theme.colors.textSecondary }]}>
            Remember to capture GPS location, take photos, and record field measurements for each sample.
          </Text>
        </View>
      </View>

      <TouchableOpacity style={[styles.signOut, { borderColor: theme.colors.border }]} onPress={() => signOut()}>
        <Text style={[styles.signOutText, { color: theme.colors.textSecondary }]}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 14 },
  name: { fontSize: 24, fontWeight: '700' },
  notificationButton: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  badge: { position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '700' },
  statTitle: { fontSize: 12 },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, gap: 12 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', flex: 1 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600' },
  assignmentCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, gap: 12 },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  assignmentContent: { flex: 1 },
  assignmentTitle: { fontSize: 15, fontWeight: '600' },
  assignmentMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  assignmentLocation: { fontSize: 12 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  tipsCard: { flexDirection: 'row', padding: 16, borderRadius: 12, borderWidth: 1, gap: 12 },
  tipsContent: { flex: 1 },
  tipsTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  tipsText: { fontSize: 12, lineHeight: 18 },
  signOut: { paddingVertical: 14, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  signOutText: { fontSize: 14 },
});
