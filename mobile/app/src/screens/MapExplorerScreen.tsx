import { useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import type { GeoJSON } from 'geojson';
import { ThemeContext } from '../core/theme/themes';
import { useMapData } from '../core/hooks/useMapData';
import type { OverlayKey } from '../core/types';

const OVERLAY_OPTIONS: Array<{ key: OverlayKey; label: string }> = [
  { key: 'critical', label: 'Critical Assets' },
  { key: 'sampling', label: 'Sampling Route' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'outreach', label: 'Outreach' }
];

const DEFAULT_STYLE_URL = 'https://demotiles.maplibre.org/style.json';

MapboxGL.setAccessToken(null);
MapboxGL.setTelemetryEnabled(false);

export default function MapExplorerScreen() {
  const theme = useContext(ThemeContext);
  const { overlays, activeOverlays, toggleOverlay, isLoading } = useMapData();
  const [offlineReady, setOfflineReady] = useState(false);

  useEffect(() => {
    const offlineManager = (MapboxGL as unknown as { offlineManager?: typeof MapboxGL.offlineManager }).offlineManager
      ?? MapboxGL.offlineManager;

    if (!offlineManager) {
      return;
    }

    const bounds: [GeoJSON.Position, GeoJSON.Position] = [
      [72.93, 33.69],
      [73.06, 33.78]
    ];

    const packName = 'prmsc-core-region';

    (async () => {
      try {
        const existingPack = await offlineManager.getPack(packName);
        if (!existingPack) {
          await offlineManager.createPack(
            {
              name: packName,
              styleURL: DEFAULT_STYLE_URL,
              minZoom: 9,
              maxZoom: 15,
              bounds
            },
            () => {},
            error => console.warn('MapLibre offline pack error', error)
          );
        }
        setOfflineReady(true);
      } catch (error) {
        console.warn('MapLibre offline preload failed', error);
      }
    })();
  }, []);

  const activeLabels = useMemo(
    () =>
      OVERLAY_OPTIONS.filter(option => activeOverlays.includes(option.key))
        .map(option => option.label)
        .join(', ') || 'None',
    [activeOverlays]
  );

  const visibleFeatures = useMemo(() => {
    return activeOverlays.flatMap(key => overlays[key] ?? []);
  }, [activeOverlays, overlays]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.overlayRow}
      >
        {OVERLAY_OPTIONS.map(option => {
          const isActive = activeOverlays.includes(option.key);
          return (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.overlayChip,
                {
                  backgroundColor: isActive ? theme.colors.primary : theme.colors.surface,
                  borderColor: theme.colors.border
                }
              ]}
              onPress={() => toggleOverlay(option.key)}
            >
              <Text style={{ color: isActive ? theme.colors.surface : theme.colors.text }}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={[styles.mapContainer, { borderColor: theme.colors.border }]}>
        {isLoading ? (
          <View style={styles.loader}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : (
          <MapboxGL.MapView style={styles.map} styleURL={DEFAULT_STYLE_URL}>
            <MapboxGL.Camera zoomLevel={11} centerCoordinate={[72.99, 33.72]} />
            {visibleFeatures.map(feature => (
              <MapboxGL.PointAnnotation
                key={feature.id}
                id={feature.id}
                coordinate={feature.coordinates}
              >
                <View style={styles.annotationContainer}>
                  <View style={[styles.annotationDot, { backgroundColor: theme.colors.primary }]} />
                  <View style={[styles.annotationCallout, { backgroundColor: theme.colors.surface }]}>
                    <Text style={[styles.annotationTitle, { color: theme.colors.text }]}>{feature.title}</Text>
                    {feature.subtitle ? (
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>{feature.subtitle}</Text>
                    ) : null}
                  </View>
                </View>
              </MapboxGL.PointAnnotation>
            ))}
          </MapboxGL.MapView>
        )}
      </View>

      <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>Visible Overlays</Text>
        <Text style={{ color: theme.colors.textSecondary }}>{activeLabels}</Text>
        <Text style={{ color: theme.colors.textSecondary, marginTop: 8 }}>
          Offline tiles cached: {offlineReady ? 'Core region ready' : 'Preloading…'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 24,
    gap: 16
  },
  overlayRow: {
    paddingHorizontal: 16,
    gap: 12
  },
  overlayChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1
  },
  mapContainer: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden'
  },
  map: {
    flex: 1
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  summaryCard: {
    marginHorizontal: 16,
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
  annotationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF'
  },
  annotationContainer: {
    alignItems: 'center'
  },
  annotationCallout: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1
  },
  annotationTitle: {
    fontSize: 13,
    fontWeight: '600'
  }
});
