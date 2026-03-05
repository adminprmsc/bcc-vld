import { create } from 'zustand';
import type { DashboardSnapshot, DashboardMetric, TimelineEntry } from '../types';

interface DashboardState {
  metrics: DashboardMetric[];
  timeline: TimelineEntry[];
  generatedAt?: string;
  setSnapshot: (snapshot: DashboardSnapshot) => void;
  reset: () => void;
}

const initialState = {
  metrics: [],
  timeline: [],
  generatedAt: undefined
};

export const useDashboardStore = create<DashboardState>(set => ({
  ...initialState,
  setSnapshot: snapshot =>
    set(() => ({
      metrics: snapshot.metrics,
      timeline: snapshot.timeline,
      generatedAt: snapshot.generatedAt
    })),
  reset: () => set(() => ({ ...initialState }))
}));
