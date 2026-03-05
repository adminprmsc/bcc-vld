import { create } from 'zustand';
import type { RequisitionDetail, RequisitionSummary } from '../types';

export type RequisitionFilter = 'all' | 'my-desk' | 'pending' | 'completed';

interface RequisitionState {
  summaries: RequisitionSummary[];
  details: Record<string, RequisitionDetail>;
  filter: RequisitionFilter;
  setSummaries: (summaries: RequisitionSummary[]) => void;
  upsertDetail: (detail: RequisitionDetail) => void;
  setFilter: (filter: RequisitionFilter) => void;
}

export const useRequisitionStore = create<RequisitionState>((set, get) => ({
  summaries: [],
  details: {},
  filter: 'all',
  setSummaries: summaries => set(() => ({ summaries })),
  upsertDetail: detail =>
    set(() => ({
      details: {
        ...get().details,
        [detail.id]: detail
      }
    })),
  setFilter: filter => set(() => ({ filter }))
}));
