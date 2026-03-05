import { create } from 'zustand';
import type { MapOverlayCollection, OverlayKey } from '../types';

interface MapState {
  overlays: MapOverlayCollection;
  activeOverlays: OverlayKey[];
  setOverlays: (collection: MapOverlayCollection) => void;
  toggleOverlay: (key: OverlayKey) => void;
}

const defaultState: MapOverlayCollection = {
  critical: [],
  sampling: [],
  maintenance: [],
  outreach: []
};

export const useMapStore = create<MapState>((set, get) => ({
  overlays: defaultState,
  activeOverlays: ['critical', 'sampling'],
  setOverlays: collection => set(() => ({ overlays: collection })),
  toggleOverlay: key =>
    set(state => ({
      activeOverlays: state.activeOverlays.includes(key)
        ? state.activeOverlays.filter(item => item !== key)
        : [...state.activeOverlays, key]
    }))
}));
