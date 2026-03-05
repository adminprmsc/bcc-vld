import { useContext } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ThemeContext } from '../core/theme/themes';
import { useSyncActions, useSyncData, syncStatusColor } from '../core/hooks/useSyncData';
import type { SyncChannelStatus, SyncQueueItem } from '../core/types';

export default function SyncCenterScreen() {
  const theme = useContext(ThemeContext);
  const { channels, queue, isLoading, isFetching, refetch } = useSyncData();
  const { retryChannel } = useSyncActions();

  const renderChannel = ({ item }: { item: SyncChannelStatus }) => {
    const showRetry = item.status === 'error';
    return (
      <View style={[styles.itemCard, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.itemHeader}>
          <View style={[styles.statusBadge, { backgroundColor: syncStatusColor(theme, item.status) }]} />
          <Text style={[styles.itemTitle, { color: theme.colors.text }]}>{item.title}</Text>
          {showRetry ? (
            <TouchableOpacity
              style={[styles.retryPill, { backgroundColor: theme.colors.critical }]}
              onPress={() => retryChannel(item.id)}
            >
              <Text style={{ color: theme.colors.surface }}>Retry</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={{ color: theme.colors.textSecondary }}>{item.detail}</Text>
        <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>{item.lastAttempt}</Text>
      </View>
    );
  };

  const renderQueueItem = (item: SyncQueueItem) => (
    <View key={item.id} style={[styles.queueRow, { borderColor: theme.colors.border }]}>
      <View>
        <Text style={[styles.queueTitle, { color: theme.colors.text }]}>{item.description}</Text>
        <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Ref #{item.referenceId}</Text>
        {item.errorMessage ? (
          <Text style={[styles.queueError, { color: theme.colors.critical }]}>{item.errorMessage}</Text>
        ) : null}
      </View>
      <View
        style={[
          styles.queueBadge,
          {
            backgroundColor: syncStatusColor(theme, mapQueueStatus(item.status)),
            borderColor: theme.colors.border
          }
        ]}
      >
        <Text style={{ color: theme.colors.surface, fontSize: 12 }}>{item.status.toUpperCase()}</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>Sync Health</Text>
        <Text style={{ color: theme.colors.textSecondary }}>
          {isFetching ? 'Refreshing…' : 'Last refreshed'} {new Date().toLocaleTimeString()}
        </Text>
        <Text style={{ color: theme.colors.textSecondary }}>Queued payloads: {queue.length}</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={channels}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={isFetching}
          onRefresh={() => {
            void refetch();
          }}
          renderItem={renderChannel}
          ListFooterComponent={() => (
            <View style={[styles.queueCard, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.queueHeading, { color: theme.colors.text }]}>Pending Queue</Text>
              {queue.length === 0 ? (
                <Text style={{ color: theme.colors.textSecondary }}>No queued payloads.</Text>
              ) : (
                queue.map(renderQueueItem)
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

function mapQueueStatus(status: SyncQueueItem['status']): SyncChannelStatus['status'] {
  if (status === 'synced') {
    return 'synced';
  }
  if (status === 'error') {
    return 'error';
  }
  return 'pending';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 24,
    gap: 16
  },
  summaryCard: {
    padding: 16,
    borderRadius: 16,
    gap: 8,
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
  listContent: {
    gap: 12,
    paddingBottom: 24
  },
  itemCard: {
    padding: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  statusBadge: {
    width: 12,
    height: 12,
    borderRadius: 6
  },
  itemTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600'
  },
  meta: {
    fontSize: 12
  },
  retryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#EF4444'
  },
  queueCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2
  },
  queueHeading: {
    fontSize: 16,
    fontWeight: '600'
  },
  queueRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  queueTitle: {
    fontSize: 14,
    fontWeight: '500'
  },
  queueError: {
    marginTop: 4,
    fontSize: 12
  },
  queueBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
