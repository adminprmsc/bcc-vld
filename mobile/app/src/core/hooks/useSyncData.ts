import { useMutation, useQuery, useQueryClient } from 'react-query';
import { Alert } from 'react-native';
import { fetchSyncStatus, retrySyncChannel } from '../api/prmscService';
import { QueryKeys } from '../api/queryKeys';
import { useSyncStore } from '../state/syncStore';
import type { SyncStatus } from '../types';

export function useSyncData() {
  const setChannels = useSyncStore(state => state.setChannels);
  const channels = useSyncStore(state => state.channels);
  const queue = useSyncStore(state => state.queue);

  const query = useQuery(QueryKeys.syncStatus, fetchSyncStatus, {
    onSuccess: data => setChannels(data)
  });

  return {
    channels,
    queue,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
    isError: query.isError,
    error: query.error
  };
}

export function useSyncActions() {
  const queryClient = useQueryClient();
  const updateChannel = useSyncStore(state => state.updateChannel);

  const retryMutation = useMutation(retrySyncChannel, {
    onMutate: channelId => {
      updateChannel(channelId, {
        status: 'pending',
        lastAttempt: new Date().toISOString()
      });
    },
    onSuccess: (_result, channelId) => {
      updateChannel(channelId, { status: 'synced', lastAttempt: new Date().toISOString() });
      queryClient.invalidateQueries(QueryKeys.syncStatus);
      Alert.alert('Sync retried', 'Channel successfully synced.');
    },
    onError: (error, channelId) => {
      updateChannel(channelId, {
        status: 'error',
        detail:
          error instanceof Error ? error.message : 'Retry failed. Check network or credentials.'
      });
      Alert.alert('Sync retry failed', error instanceof Error ? error.message : 'Unknown error');
    }
  });

  return {
    retryChannel: (channelId: string) => retryMutation.mutate(channelId),
    retryStatus: retryMutation.status
  };
}

export function syncStatusColor(theme: any, status: SyncStatus) {
  switch (status) {
    case 'synced':
      return theme.colors.primary;
    case 'pending':
      return theme.colors.warning;
    case 'error':
      return theme.colors.critical;
    default:
      return theme.colors.border;
  }
}
