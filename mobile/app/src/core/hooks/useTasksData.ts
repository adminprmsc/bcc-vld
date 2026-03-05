import { useEffect, useMemo } from 'react';
import { Alert } from 'react-native';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { fetchTasks, submitTaskUpdate } from '../api/prmscService';
import { QueryKeys } from '../api/queryKeys';
import { useSyncStore } from '../state/syncStore';
import { useTaskStore } from '../state/taskStore';
import type { SyncQueueItem, TaskItem, TaskStatus } from '../types';
import { loadCachedTasks, persistTasks } from '../data/tasksRepository';

const TASK_ENTITY = 'task';

export function useTasksData() {
  const setTasks = useTaskStore(state => state.setTasks);
  const tasks = useTaskStore(state => state.tasks);
  const filter = useTaskStore(state => state.filter);

  useEffect(() => {
    let cancelled = false;
    loadCachedTasks()
      .then(cached => {
        if (!cancelled && cached.length) {
          setTasks(cached);
        }
      })
      .catch(error => console.warn('Failed to hydrate cached tasks', error));
    return () => {
      cancelled = true;
    };
  }, [setTasks]);

  const query = useQuery(QueryKeys.tasks, fetchTasks, {
    onSuccess: data => {
      setTasks(data);
      persistTasks(data).catch(error => console.warn('Failed to cache tasks', error));
    }
  });

  const filteredTasks = useMemo(() => {
    if (filter === 'all') {
      return tasks;
    }
    return tasks.filter(task => task.status === filter);
  }, [tasks, filter]);

  return {
    tasks: filteredTasks,
    filter,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    refetch: query.refetch,
    error: query.error
  };
}

export function useTaskFilters() {
  const filter = useTaskStore(state => state.filter);
  const setFilter = useTaskStore(state => state.setFilter);
  return { filter, setFilter };
}

export function useTaskMutations() {
  const queryClient = useQueryClient();
  const setTasks = useTaskStore(state => state.setTasks);
  const updateTaskStatus = useTaskStore(state => state.updateTaskStatus);
  const enqueue = useSyncStore(state => state.enqueue);
  const updateQueueItem = useSyncStore(state => state.updateQueueItem);

  const mutation = useMutation(submitTaskUpdate, {
    onMutate: async taskId => {
      await queryClient.cancelQueries(QueryKeys.tasks);
      const previousTasks = queryClient.getQueryData<TaskItem[]>(QueryKeys.tasks);
      updateTaskStatus(taskId, 'completed');
      const queueItem = createQueueItem(taskId);
      enqueue(queueItem);
      return { queueItemId: queueItem.id, previousTasks };
    },
    onSuccess: (_result, taskId, context) => {
      if (context?.queueItemId) {
        updateQueueItem(context.queueItemId, {
          status: 'synced',
          lastAttempt: new Date().toISOString()
        });
      }
      Alert.alert('Task synced', 'Marked complete and queued for upload.');
    },
    onError: (error, taskId, context) => {
      if (context?.queueItemId) {
        updateQueueItem(context.queueItemId, {
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      if (context?.previousTasks) {
        setTasks(context.previousTasks);
      } else {
        updateTaskStatus(taskId, 'pending');
      }
      Alert.alert('Task sync failed', error instanceof Error ? error.message : 'Unknown error');
    },
    onSettled: () => {
      queryClient.invalidateQueries(QueryKeys.tasks);
      const allTasks = useTaskStore.getState().tasks;
      persistTasks(allTasks).catch(error => console.warn('Failed to cache tasks after mutation', error));
    }
  });

  return {
    markComplete: (taskId: string) => mutation.mutate(taskId),
    status: mutation.status,
    isLoading: mutation.isLoading
  };
}

function createQueueItem(taskId: string, payload?: unknown): SyncQueueItem {
  return {
    id: `queue-${taskId}-${Date.now()}`,
    entity: TASK_ENTITY,
    referenceId: taskId,
    description: `Task ${taskId} marked completed`,
    status: 'syncing',
    lastAttempt: new Date().toISOString(),
    operation: {
      type: 'TASK_COMPLETE',
      taskId,
      payload
    }
  };
}

export function deriveStatusColor(theme: any, status: TaskStatus) {
  switch (status) {
    case 'blocked':
      return theme.colors.critical;
    case 'pending':
      return theme.colors.warning;
    case 'in-progress':
      return theme.colors.primary;
    case 'completed':
      return theme.colors.textSecondary;
    default:
      return theme.colors.primary;
  }
}

export function labelForFilter(filter: TaskStatus | 'all') {
  switch (filter) {
    case 'in-progress':
      return 'In Progress';
    case 'pending':
      return 'Pending';
    case 'blocked':
      return 'Blocked';
    case 'completed':
      return 'Completed';
    default:
      return 'All';
  }
}
