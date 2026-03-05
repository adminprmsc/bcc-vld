import { useContext, useMemo } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View, type TextStyle } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { ThemeContext } from '../../core/theme/themes';
import { useRequisitionsList } from '../../core/hooks/useRequisitionsData';
import type { RequisitionSummary } from '../../core/types';
import type { RequisitionFilter } from '../../core/state/requisitionStore';
import type { RequisitionStackParamList } from '../../navigation/RequisitionNavigator';

const FILTERS: Array<{ value: RequisitionFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'my-desk', label: 'My Desk' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' }
];

export default function RequisitionListScreen() {
  const theme = useContext(ThemeContext);
  const navigation = useNavigation<NativeStackNavigationProp<RequisitionStackParamList>>();
  const { requisitions, filter, setFilter, stats, isLoading, isFetching, refetch } = useRequisitionsList();

  const sorted = useMemo(() => sortRequisitions(requisitions), [requisitions]);

  const renderItem = ({ item }: { item: RequisitionSummary }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.colors.surface }]}
      onPress={() => navigation.navigate('RequisitionDetail', { requisitionId: item.id })}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.statusPill, { backgroundColor: statusColor(theme, item.status) }]}>
          <Text style={styles.statusPillText}>{item.status}</Text>
        </View>
        {item.priority ? (
          <Text style={[styles.priorityLabel, priorityTone(theme, item.priority)]}>{item.priority}</Text>
        ) : null}
      </View>
      <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{item.title}</Text>
      <Text style={{ color: theme.colors.textSecondary }}>{item.purpose}</Text>
      <View style={styles.metaRow}>
        <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>Seq #{item.sequenceNumber ?? '—'}</Text>
        <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>Due {formatDate(item.requiredDate)}</Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>Assigned: {item.assignedTo?.name ?? 'Unassigned'}</Text>
        <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>Updated {formatDate(item.lastUpdated)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>Open Requisitions: {stats.total}</Text>
        <Text style={{ color: theme.colors.textSecondary }}>High Priority: {stats.urgent}</Text>
        <Text style={{ color: theme.colors.textSecondary }}>Pending Reviews: {stats.pending}</Text>
        <Text style={{ color: theme.colors.textSecondary }}>
          Updated {stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleString() : '–'}
        </Text>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map(option => {
          const isActive = filter === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.filterPill,
                {
                  backgroundColor: isActive ? theme.colors.primary : theme.colors.surface,
                  borderColor: theme.colors.border
                }
              ]}
              onPress={() => setFilter(option.value)}
            >
              <Text style={{ color: isActive ? theme.colors.surface : theme.colors.textSecondary }}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={isFetching}
          onRefresh={() => {
            void refetch();
          }}
          renderItem={renderItem}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Text style={{ color: theme.colors.textSecondary }}>No requisitions match this filter.</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

function sortRequisitions(items: RequisitionSummary[]) {
  return [...items].sort((a, b) => {
    const aTime = a.lastUpdated ?? a.requiredDate ?? '';
    const bTime = b.lastUpdated ?? b.requiredDate ?? '';
    if (aTime === bTime) {
      return 0;
    }
    return aTime > bTime ? -1 : 1;
  });
}

function statusColor(theme: any, status?: string) {
  const text = status?.toLowerCase() ?? '';
  if (text.includes('pending')) {
    return theme.colors.warning;
  }
  if (text.includes('approved') || text.includes('completed')) {
    return '#22C55E';
  }
  if (text.includes('error')) {
    return theme.colors.critical;
  }
  return theme.colors.primary;
}

function priorityTone(theme: any, priority: string): TextStyle {
  const base = priority === 'High' ? theme.colors.critical : priority === 'Low' ? theme.colors.textSecondary : theme.colors.text;
  return {
    color: base,
    fontWeight: '600' as TextStyle['fontWeight']
  };
}

function formatDate(value?: string) {
  if (!value) {
    return '—';
  }
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16
  },
  summaryCard: {
    padding: 16,
    borderRadius: 16,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600'
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1
  },
  listContent: {
    gap: 12,
    paddingBottom: 24
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  card: {
    padding: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10
  },
  statusPillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },
  priorityLabel: {
    fontSize: 13
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600'
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  meta: {
    fontSize: 12
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center'
  }
});
