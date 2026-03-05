import { useEffect } from 'react';
import { useQuery } from 'react-query';
import { fetchDashboardSnapshot } from '../api/prmscService';
import { QueryKeys } from '../api/queryKeys';
import { useDashboardStore } from '../state/dashboardStore';

export function useDashboardData() {
  const setSnapshot = useDashboardStore(state => state.setSnapshot);
  const snapshot = useDashboardStore(state => ({
    metrics: state.metrics,
    timeline: state.timeline,
    generatedAt: state.generatedAt
  }));

  const query = useQuery(QueryKeys.dashboard, fetchDashboardSnapshot, {
    onSuccess: data => setSnapshot(data)
  });

  useEffect(() => {
    if (query.data) {
      setSnapshot(query.data);
    }
  }, [query.data, setSnapshot]);

  return {
    ...snapshot,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    refetch: query.refetch,
    error: query.error
  };
}
