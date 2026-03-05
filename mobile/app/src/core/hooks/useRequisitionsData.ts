import { useEffect, useMemo } from 'react';
import { useQuery } from 'react-query';
import { fetchRequisitionDetail, fetchRequisitions } from '../api/prmscService';
import { QueryKeys } from '../api/queryKeys';
import { useRequisitionStore, type RequisitionFilter } from '../state/requisitionStore';
import { loadCachedRequisitions, persistRequisitions } from '../data/requisitionRepository';
import type { MapFeature, RequisitionDetail, RequisitionPriority, RequisitionSummary } from '../types';
import { useSessionProfile } from './useSession';

interface RequisitionListStats {
  total: number;
  urgent: number;
  pending: number;
  lastUpdated?: string;
}

export function useRequisitionsList() {
  const summaries = useRequisitionStore(state => state.summaries);
  const setSummaries = useRequisitionStore(state => state.setSummaries);
  const filter = useRequisitionStore(state => state.filter);
  const setFilter = useRequisitionStore(state => state.setFilter);
  const upsertDetail = useRequisitionStore(state => state.upsertDetail);
  const profile = useSessionProfile();

  useEffect(() => {
    let cancelled = false;
    loadCachedRequisitions()
      .then(records => {
        if (cancelled || !records.length) {
          return;
        }
        const details = records
          .map(record => coerceRequisitionDetail(record.payload))
          .filter((detail): detail is RequisitionDetail => Boolean(detail));
        if (!details.length) {
          return;
        }
        details.forEach(detail => upsertDetail(detail));
        setSummaries(deriveSummariesFromDetails(details));
      })
      .catch(error => console.warn('Failed to hydrate requisitions cache', error));
    return () => {
      cancelled = true;
    };
  }, [setSummaries, upsertDetail]);

  const listQuery = useQuery(QueryKeys.requisitions, fetchRequisitions, {
    onSuccess: data => setSummaries(data)
  });

  const filtered = useMemo(() => {
    const userId = profile?.id;
    return summaries.filter(summary => matchesFilter(summary, filter, userId));
  }, [summaries, filter, profile?.id]);

  const stats = useMemo<RequisitionListStats>(() => {
    const pending = summaries.filter(item => item.status?.toLowerCase().includes('pending')).length;
    const urgent = summaries.filter(item => item.priority === 'High').length;
    const lastUpdated = getLatestTimestamp(summaries);
    return {
      total: summaries.length,
      urgent,
      pending,
      lastUpdated
    };
  }, [summaries]);

  return {
    requisitions: filtered,
    filter,
    setFilter,
    stats,
    isLoading: listQuery.isLoading,
    isFetching: listQuery.isFetching,
    isError: listQuery.isError,
    refetch: listQuery.refetch,
    error: listQuery.error
  };
}

export function useRequisitionDetail(requisitionId?: string) {
  const detail = useRequisitionStore(state => (requisitionId ? state.details[requisitionId] : undefined));
  const upsertDetail = useRequisitionStore(state => state.upsertDetail);

  const detailQuery = useQuery({
    queryKey: requisitionId ? QueryKeys.requisitionDetail(requisitionId) : QueryKeys.requisitions,
    queryFn: () => fetchRequisitionDetail(requisitionId as string),
    enabled: Boolean(requisitionId),
    onSuccess: data => {
      upsertDetail(data);
      persistRequisitions([{ id: data.id, payload: data }]).catch(error => console.warn('Failed to cache requisition detail', error));
    }
  });

  return {
    detail: detail ?? detailQuery.data,
    isLoading: !detail && detailQuery.isLoading,
    isFetching: detailQuery.isFetching,
    isError: detailQuery.isError,
    error: detailQuery.error,
    refetch: detailQuery.refetch
  };
}

function matchesFilter(summary: RequisitionSummary, filter: RequisitionFilter, userId?: string) {
  if (filter === 'all') {
    return true;
  }
  const statusText = summary.status?.toLowerCase() ?? '';
  if (filter === 'pending') {
    return statusText.includes('pending');
  }
  if (filter === 'completed') {
    return statusText.includes('completed') || statusText.includes('approved');
  }
  if (filter === 'my-desk') {
    if (!userId) {
      return false;
    }
    return summary.assignedTo?.id === userId;
  }
  return true;
}

function getLatestTimestamp(items: RequisitionSummary[]): string | undefined {
  const timestamps = items
    .map(item => item.lastUpdated ?? item.requiredDate)
    .filter((value): value is string => Boolean(value));
  if (!timestamps.length) {
    return undefined;
  }
  return timestamps.sort().reverse()[0];
}

function deriveSummariesFromDetails(details: RequisitionDetail[]): RequisitionSummary[] {
  const map = new Map<string, RequisitionSummary>();
  details.forEach(detail => map.set(detail.id, toSummary(detail)));
  return Array.from(map.values());
}

function toSummary(detail: RequisitionDetail): RequisitionSummary {
  return {
    id: detail.id,
    title: detail.title,
    purpose: detail.purpose,
    status: detail.status,
    priority: detail.priority,
    sequenceNumber: detail.sequenceNumber,
    requiredDate: detail.requiredDate,
    lastUpdated: detail.lastUpdated,
    requestedBy: detail.requestedBy,
    assignedTo: detail.assignedTo,
    tehsil: detail.tehsil,
    division: detail.division,
    district: detail.district,
    landType: detail.landType,
    estimatedValue: detail.estimatedValue
  };
}

function coerceRequisitionDetail(value: unknown): RequisitionDetail | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const record = value as Partial<RequisitionDetail> & { _id?: string };
  const id = typeof record.id === 'string' && record.id ? record.id : typeof record._id === 'string' ? record._id : undefined;
  if (!id) {
    return null;
  }
  const priority = normalizePriority(record.priority);
  return {
    id,
    title: record.title ?? 'Requisition',
    purpose: record.purpose ?? record.description ?? 'Field requisition',
    status: record.status ?? 'Pending',
    priority,
    sequenceNumber: record.sequenceNumber,
    requiredDate: record.requiredDate,
    lastUpdated: record.lastUpdated ?? record.requiredDate ?? new Date().toISOString(),
    requestedBy: record.requestedBy,
    assignedTo: record.assignedTo,
    tehsil: record.tehsil,
    division: record.division,
    district: record.district,
    landType: record.landType,
    estimatedValue: record.estimatedValue,
    description: record.description,
    location: record.location,
    mapMarker: record.mapMarker,
    mapViewport: record.mapViewport,
    mapFeatures: Array.isArray(record.mapFeatures) ? (record.mapFeatures as MapFeature[]) : [],
    govtLandChecklist: record.govtLandChecklist,
    privateLandChecklist: record.privateLandChecklist,
    landAcquisition: record.landAcquisition,
    landUtilization: record.landUtilization,
    activityLog: record.activityLog ?? [],
    supportingDocs: record.supportingDocs ?? [],
    attachments: record.attachments ?? [],
    remarks: record.remarks
  };
}

function normalizePriority(priority: RequisitionDetail['priority'] | undefined): RequisitionPriority {
  if (priority === 'Low' || priority === 'Medium' || priority === 'High') {
    return priority;
  }
  return 'Medium';
}
