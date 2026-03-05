import { Injectable, signal, computed, inject, NgZone } from '@angular/core';
import maplibregl, { Map as MaplibreMap, Marker, Popup, LngLatLike, LngLatBoundsLike, MapOptions, NavigationControl, GeolocateControl, ScaleControl, AttributionControl, FilterSpecification } from 'maplibre-gl';
import { environment } from '../../environments/environment';

// Pakistan geographic bounds
export const PAKISTAN_BOUNDS = {
  lat: { min: 23.5, max: 37.5 },
  lng: { min: 60.5, max: 77.5 }
};

// Map layer configuration
export interface LayerConfig {
  id: string;
  type: 'circle' | 'fill' | 'line' | 'symbol' | 'heatmap';
  source: string;
  paint: Record<string, unknown>;
  layout?: Record<string, unknown>;
  minzoom?: number;
  maxzoom?: number;
  filter?: FilterSpecification;
}

// Map style presets
export const MAP_STYLES = {
  streets: 'https://api.maptiler.com/maps/streets/style.json',
  satellite: 'https://api.maptiler.com/maps/hybrid/style.json',
  terrain: 'https://api.maptiler.com/maps/outdoor/style.json',
  light: 'https://api.maptiler.com/maps/basic/style.json',
  dark: 'https://api.maptiler.com/maps/dataviz-dark/style.json'
} as const;

export type MapStyleKey = keyof typeof MAP_STYLES;

// Marker configuration
export interface MarkerConfig {
  id: string;
  coordinates: [number, number]; // [lng, lat]
  color?: string;
  popup?: string | HTMLElement;
  draggable?: boolean;
  data?: Record<string, unknown>;
}

// Event types for map interactions
export interface MapClickEvent {
  lngLat: { lng: number; lat: number };
  features?: unknown[];
  originalEvent: MouseEvent;
}

// Cache entry interface
interface CacheEntry {
  data: unknown;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class MapService {
  private ngZone = inject(NgZone);
  
  // Signal-based state management
  private mapInstance = signal<MaplibreMap | null>(null);
  private markers = signal<Record<string, Marker>>({});
  private currentStyle = signal<MapStyleKey>('streets');
  private isLoading = signal(true);
  private error = signal<string | null>(null);
  
  // Computed values
  readonly map = computed(() => this.mapInstance());
  readonly loading = computed(() => this.isLoading());
  readonly mapError = computed(() => this.error());
  readonly activeMarkers = computed(() => this.markers());
  readonly style = computed(() => this.currentStyle());

  // Cache for tile and data requests (using global Map to avoid conflict with MaplibreMap)
  private dataCache: globalThis.Map<string, CacheEntry> = new globalThis.Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Initialize a MapLibre GL map instance
   */
  initializeMap(
    container: string | HTMLElement,
    options: Partial<MapOptions> = {}
  ): MaplibreMap {
    this.isLoading.set(true);
    this.error.set(null);

    const defaultOptions: MapOptions = {
      container,
      style: this.getStyleUrl('streets'),
      center: [environment.defaultMapCenter.lng, environment.defaultMapCenter.lat],
      zoom: environment.defaultMapZoom,
      minZoom: 4,
      maxZoom: 18,
      attributionControl: false,
      maxBounds: [
        [PAKISTAN_BOUNDS.lng.min - 5, PAKISTAN_BOUNDS.lat.min - 2],
        [PAKISTAN_BOUNDS.lng.max + 5, PAKISTAN_BOUNDS.lat.max + 2]
      ] as LngLatBoundsLike
    };

    const map = new maplibregl.Map({ ...defaultOptions, ...options });

    // Add standard controls
    map.addControl(new NavigationControl(), 'top-right');
    map.addControl(new ScaleControl({ maxWidth: 200, unit: 'metric' }), 'bottom-left');
    map.addControl(new AttributionControl({ compact: true }), 'bottom-right');

    // Add geolocation control if supported
    if ('geolocation' in navigator) {
      map.addControl(
        new GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true
        }),
        'top-right'
      );
    }

    // Set up event handlers
    map.on('load', () => {
      this.ngZone.run(() => {
        this.mapInstance.set(map);
        this.isLoading.set(false);
      });
    });

    map.on('error', (e) => {
      this.ngZone.run(() => {
        console.error('Map error:', e);
        this.error.set(e.error?.message || 'Map initialization failed');
        this.isLoading.set(false);
      });
    });

    return map;
  }

  /**
   * Get style URL with API key appended
   */
  getStyleUrl(style: MapStyleKey, apiKey?: string): string {
    const key = apiKey || 'get_your_own_key';
    const baseUrl = MAP_STYLES[style];
    return `${baseUrl}?key=${key}`;
  }

  /**
   * Change map style
   */
  setStyle(style: MapStyleKey, apiKey?: string): void {
    const map = this.mapInstance();
    if (!map) return;

    this.currentStyle.set(style);
    map.setStyle(this.getStyleUrl(style, apiKey));
  }

  /**
   * Validate coordinates are within Pakistan bounds
   */
  validateCoordinates(lat: number, lng: number): { valid: boolean; error?: string } {
    if (isNaN(lat) || isNaN(lng)) {
      return { valid: false, error: 'Invalid coordinate values' };
    }
    
    if (lat < PAKISTAN_BOUNDS.lat.min || lat > PAKISTAN_BOUNDS.lat.max) {
      return { 
        valid: false, 
        error: `Latitude ${lat} is outside Pakistan bounds (${PAKISTAN_BOUNDS.lat.min}-${PAKISTAN_BOUNDS.lat.max})` 
      };
    }
    
    if (lng < PAKISTAN_BOUNDS.lng.min || lng > PAKISTAN_BOUNDS.lng.max) {
      return { 
        valid: false, 
        error: `Longitude ${lng} is outside Pakistan bounds (${PAKISTAN_BOUNDS.lng.min}-${PAKISTAN_BOUNDS.lng.max})` 
      };
    }
    
    return { valid: true };
  }

  /**
   * Add a marker to the map
   */
  addMarker(config: MarkerConfig): Marker | null {
    const map = this.mapInstance();
    if (!map) return null;

    const [lng, lat] = config.coordinates;
    const validation = this.validateCoordinates(lat, lng);
    
    if (!validation.valid) {
      console.warn(`Invalid marker coordinates: ${validation.error}`);
      return null;
    }

    // Remove existing marker with same ID
    this.removeMarker(config.id);

    const marker = new Marker({
      color: config.color || '#3b82f6',
      draggable: config.draggable || false
    })
      .setLngLat([lng, lat])
      .addTo(map);

    // Add popup if provided
    if (config.popup) {
      const popup = new Popup({ offset: 25 }).setHTML(
        typeof config.popup === 'string' ? config.popup : ''
      );
      if (typeof config.popup !== 'string') {
        popup.setDOMContent(config.popup);
      }
      marker.setPopup(popup);
    }

    // Store marker reference
    this.markers.update(current => ({
      ...current,
      [config.id]: marker
    }));

    return marker;
  }

  /**
   * Remove a marker by ID
   */
  removeMarker(id: string): void {
    const currentMarkers = this.markers();
    const marker = currentMarkers[id];
    
    if (marker) {
      marker.remove();
      this.markers.update(current => {
        const { [id]: removed, ...rest } = current;
        return rest;
      });
    }
  }

  /**
   * Remove all markers
   */
  clearMarkers(): void {
    const currentMarkers = this.markers();
    Object.values(currentMarkers).forEach(marker => marker.remove());
    this.markers.set({});
  }

  /**
   * Fit map to bounds
   */
  fitBounds(bounds: LngLatBoundsLike, options?: { padding?: number; maxZoom?: number }): void {
    const map = this.mapInstance();
    if (!map) return;

    map.fitBounds(bounds, {
      padding: options?.padding ?? 50,
      maxZoom: options?.maxZoom ?? 15
    });
  }

  /**
   * Fly to a specific location
   */
  flyTo(center: LngLatLike, zoom?: number): void {
    const map = this.mapInstance();
    if (!map) return;

    map.flyTo({
      center,
      zoom: zoom ?? map.getZoom(),
      essential: true
    });
  }

  /**
   * Add a GeoJSON source
   */
  addGeoJSONSource(id: string, data: GeoJSON.FeatureCollection | GeoJSON.Feature): void {
    const map = this.mapInstance();
    if (!map) return;

    if (map.getSource(id)) {
      (map.getSource(id) as maplibregl.GeoJSONSource).setData(data);
    } else {
      map.addSource(id, {
        type: 'geojson',
        data
      });
    }
  }

  /**
   * Add a layer to the map
   */
  addLayer(config: LayerConfig, beforeId?: string): void {
    const map = this.mapInstance();
    if (!map) return;

    // Remove existing layer if it exists
    if (map.getLayer(config.id)) {
      map.removeLayer(config.id);
    }

    map.addLayer(config as maplibregl.LayerSpecification, beforeId);
  }

  /**
   * Remove a layer
   */
  removeLayer(id: string): void {
    const map = this.mapInstance();
    if (!map || !map.getLayer(id)) return;
    
    map.removeLayer(id);
  }

  /**
   * Set layer visibility
   */
  setLayerVisibility(layerId: string, visible: boolean): void {
    const map = this.mapInstance();
    if (!map || !map.getLayer(layerId)) return;

    map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
  }

  /**
   * Query rendered features
   */
  queryFeatures(
    point: [number, number],
    options?: { layers?: string[]; filter?: FilterSpecification }
  ): maplibregl.MapGeoJSONFeature[] {
    const map = this.mapInstance();
    if (!map) return [];

    return map.queryRenderedFeatures(point, options);
  }

  /**
   * Register click handler for the map
   */
  onClick(callback: (event: MapClickEvent) => void): () => void {
    const map = this.mapInstance();
    if (!map) return () => {};

    const handler = (e: maplibregl.MapMouseEvent) => {
      this.ngZone.run(() => {
        callback({
          lngLat: e.lngLat,
          originalEvent: e.originalEvent
        });
      });
    };

    map.on('click', handler);
    return () => map.off('click', handler);
  }

  /**
   * Register click handler for a specific layer
   */
  onLayerClick(
    layerId: string,
    callback: (event: MapClickEvent) => void
  ): () => void {
    const map = this.mapInstance();
    if (!map) return () => {};

    const handler = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      this.ngZone.run(() => {
        callback({
          lngLat: e.lngLat,
          features: e.features,
          originalEvent: e.originalEvent
        });
      });
    };

    map.on('click', layerId, handler);
    
    // Change cursor on hover
    map.on('mouseenter', layerId, () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', layerId, () => {
      map.getCanvas().style.cursor = '';
    });

    return () => {
      map.off('click', layerId, handler);
    };
  }

  /**
   * Cache data with expiration
   */
  setCacheData(key: string, data: unknown): void {
    this.dataCache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Get cached data if not expired
   */
  getCacheData<T>(key: string): T | null {
    const cached = this.dataCache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.CACHE_DURATION) {
      this.dataCache.delete(key);
      return null;
    }
    
    return cached.data as T;
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.dataCache.clear();
  }

  /**
   * Get map center coordinates
   */
  getCenter(): { lat: number; lng: number } | null {
    const map = this.mapInstance();
    if (!map) return null;
    
    const center = map.getCenter();
    return { lat: center.lat, lng: center.lng };
  }

  /**
   * Get current zoom level
   */
  getZoom(): number | null {
    const map = this.mapInstance();
    return map ? map.getZoom() : null;
  }

  /**
   * Take a screenshot of the map
   */
  async getMapScreenshot(): Promise<string | null> {
    const map = this.mapInstance();
    if (!map) return null;

    return new Promise((resolve) => {
      map.once('render', () => {
        const canvas = map.getCanvas();
        resolve(canvas.toDataURL('image/png'));
      });
      map.triggerRepaint();
    });
  }

  /**
   * Destroy map instance and clean up resources
   */
  destroy(): void {
    const map = this.mapInstance();
    if (map) {
      this.clearMarkers();
      this.clearCache();
      map.remove();
      this.mapInstance.set(null);
    }
    this.isLoading.set(true);
    this.error.set(null);
  }

  /**
   * Convert screen coordinates to geographic coordinates
   */
  unproject(point: [number, number]): { lat: number; lng: number } | null {
    const map = this.mapInstance();
    if (!map) return null;

    const lngLat = map.unproject(point);
    return { lat: lngLat.lat, lng: lngLat.lng };
  }

  /**
   * Convert geographic coordinates to screen coordinates
   */
  project(lngLat: LngLatLike): { x: number; y: number } | null {
    const map = this.mapInstance();
    if (!map) return null;

    const point = map.project(lngLat);
    return { x: point.x, y: point.y };
  }
}
