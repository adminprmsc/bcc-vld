import { useCallback, useEffect } from 'react';
import { useQuery } from 'react-query';
import { fetchMapOverlays } from '../api/prmscService';
import { QueryKeys } from '../api/queryKeys';
import { useMapStore } from '../state/mapStore';
import type { OverlayKey } from '../types';
import { loadCachedOverlays, persistOverlays } from '../data/mapOverlayRepository';

export function useMapData() {
  const setOverlays = useMapStore(state => state.setOverlays);
  const overlays = useMapStore(state => state.overlays);
  const activeOverlays = useMapStore(state => state.activeOverlays);
  const toggleOverlay = useMapStore(state => state.toggleOverlay);

  useEffect(() => {
    let cancelled = false;
    loadCachedOverlays()
      .then(cached => {
        if (!cancelled) {
          setOverlays(cached);
        }
      })
      .catch(error => console.warn('Failed to hydrate cached map overlays', error));
    return () => {
      cancelled = true;
    };
  }, [setOverlays]);

  const query = useQuery(QueryKeys.mapOverlays, fetchMapOverlays, {
    onSuccess: data => {
      setOverlays(data);
      persistOverlays(data).catch(error => console.warn('Failed to cache map overlays', error));
    }
  });

  const handleToggle = useCallback((key: OverlayKey) => toggleOverlay(key), [toggleOverlay]);

  return {
    overlays,
    activeOverlays,
    toggleOverlay: handleToggle,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error
  };
}
