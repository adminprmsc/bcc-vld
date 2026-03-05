import { useContext } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ThemeContext } from '../core/theme/themes';
import { useTaskFilters, useTaskMutations, useTasksData, deriveStatusColor, labelForFilter } from '../core/hooks/useTasksData';
import type { TaskItem } from '../core/types';

const FILTER_ORDER = ['all', 'in-progress', 'pending', 'blocked', 'completed'] as const;

export default function TasksScreen() {
  const theme = useContext(ThemeContext);
  const { tasks, isLoading, isFetching, refetch } = useTasksData();
  const { filter, setFilter } = useTaskFilters();
  const { markComplete, isLoading: isMutating } = useTaskMutations();

  const renderTask = ({ item }: { item: TaskItem }) => {
    const completed = item.status === 'completed';
    return (
      <View style={[styles.taskCard, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.statusDot, { backgroundColor: deriveStatusColor(theme, item.status) }]} />
          <Text style={[styles.roleLabel, { color: theme.colors.textSecondary }]}>{item.role}</Text>
          <Text style={[styles.dueLabel, { color: theme.colors.textSecondary }]}>{item.due}</Text>
        </View>
        <Text style={[styles.title, { color: theme.colors.text }]}>{item.title}</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            disabled={completed || isMutating}
            onPress={() => markComplete(item.id)}
            style={[
              styles.actionButton,
              {
                backgroundColor: completed ? theme.colors.surface : theme.colors.primary,
                borderColor: theme.colors.border,
                opacity: completed ? 0.5 : 1
              }
            ]}
          >
            <Text style={{ color: completed ? theme.colors.textSecondary : theme.colors.surface }}>
              {completed ? 'Completed' : 'Mark Complete'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.filterRow}>
        {FILTER_ORDER.map(filterOption => {
          const isActive = filter === filterOption;
          return (
            <TouchableOpacity
              key={filterOption}
              onPress={() => setFilter(filterOption)}
              style={[
                styles.filterPill,
                {
                  backgroundColor: isActive ? theme.colors.primary : theme.colors.surface,
                  borderColor: theme.colors.border
                }
              ]}
            >
              <Text style={{ color: isActive ? theme.colors.surface : theme.colors.textSecondary }}>
                {labelForFilter(filterOption)}
              </Text>
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
          data={tasks}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={isFetching}
          onRefresh={() => {
            void refetch();
          }}
          renderItem={renderTask}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Text style={{ color: theme.colors.textSecondary }}>No tasks in this filter. Great job!</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 24,
    gap: 16
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1
  },
  listContent: {
    gap: 12,
    paddingBottom: 24
  },
  taskCard: {
    padding: 16,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5
  },
  roleLabel: {
    flex: 1,
    fontSize: 13
  },
  dueLabel: {
    fontSize: 13
  },
  title: {
    fontSize: 16,
    fontWeight: '600'
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center'
  },
  actionsRow: {
    marginTop: 8,
    flexDirection: 'row'
  },
  actionButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
