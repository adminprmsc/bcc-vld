/**
 * Map configuration - Centralized settings for MapLibre GL maps
 * All map-related constants, styles, and layer configurations
 */

// Pakistan geographic bounds
export const PAKISTAN_BOUNDS = {
  lat: { min: 23.5, max: 37.5 },
  lng: { min: 60.5, max: 77.5 },
  bbox: [[60.5, 23.5], [77.5, 37.5]] as [[number, number], [number, number]]
};

// Punjab province bounds (more specific for LDS)
export const PUNJAB_BOUNDS = {
  lat: { min: 27.7, max: 34.0 },
  lng: { min: 69.3, max: 75.4 },
  bbox: [[69.3, 27.7], [75.4, 34.0]] as [[number, number], [number, number]]
};

// Key city centers
export const CITY_CENTERS = {
  lahore: { lat: 31.5204, lng: 74.3587, zoom: 12 },
  islamabad: { lat: 33.6844, lng: 73.0479, zoom: 12 },
  karachi: { lat: 24.8607, lng: 67.0011, zoom: 11 },
  peshawar: { lat: 34.0151, lng: 71.5249, zoom: 12 },
  quetta: { lat: 30.1798, lng: 66.9750, zoom: 12 },
  multan: { lat: 30.1575, lng: 71.5249, zoom: 12 },
  faisalabad: { lat: 31.4504, lng: 73.1350, zoom: 12 },
  rawalpindi: { lat: 33.5651, lng: 73.0169, zoom: 12 }
} as const;

// Map style configurations
export const MAP_STYLES = {
  streets: {
    name: 'Streets',
    url: 'https://api.maptiler.com/maps/streets/style.json',
    icon: 'street_view',
    description: 'Standard street map'
  },
  satellite: {
    name: 'Satellite',
    url: 'https://api.maptiler.com/maps/hybrid/style.json',
    icon: 'satellite_alt',
    description: 'Satellite imagery with labels'
  },
  terrain: {
    name: 'Terrain',
    url: 'https://api.maptiler.com/maps/outdoor/style.json',
    icon: 'terrain',
    description: 'Topographic terrain map'
  },
  light: {
    name: 'Light',
    url: 'https://api.maptiler.com/maps/basic/style.json',
    icon: 'light_mode',
    description: 'Light minimal style'
  },
  dark: {
    name: 'Dark',
    url: 'https://api.maptiler.com/maps/dataviz-dark/style.json',
    icon: 'dark_mode',
    description: 'Dark mode style'
  }
} as const;

export type MapStyleKey = keyof typeof MAP_STYLES;

// Layer color schemes
export const LAYER_COLORS = {
  // Status colors
  status: {
    active: '#22c55e',     // Green
    pending: '#f59e0b',    // Amber
    completed: '#3b82f6',  // Blue
    rejected: '#ef4444',   // Red
    critical: '#dc2626'    // Dark red
  },
  
  // Asset type colors
  assets: {
    waterSupply: '#0ea5e9',     // Sky blue
    drainage: '#8b5cf6',        // Purple
    road: '#f97316',            // Orange
    building: '#6366f1',        // Indigo
    electricalPole: '#eab308',  // Yellow
    well: '#06b6d4',            // Cyan
    handPump: '#14b8a6',        // Teal
    motorPump: '#0891b2',       // Cyan dark
    tubeWell: '#0284c7'         // Sky dark
  },
  
  // Water quality colors
  waterQuality: {
    excellent: '#22c55e',
    good: '#84cc16',
    fair: '#facc15',
    poor: '#f97316',
    critical: '#ef4444'
  },
  
  // Land acquisition colors
  landAcquisition: {
    identification: '#a3a3a3',
    documentation: '#60a5fa',
    verification: '#fbbf24',
    approval: '#a78bfa',
    acquisition: '#22c55e'
  }
} as const;

// Default layer configurations
export const DEFAULT_LAYER_PAINT = {
  circle: {
    'circle-radius': 8,
    'circle-stroke-width': 2,
    'circle-stroke-color': '#ffffff'
  },
  fill: {
    'fill-opacity': 0.6
  },
  line: {
    'line-width': 3,
    'line-opacity': 0.8
  }
} as const;

// Symbol icon mappings for assets
export const ASSET_ICONS = {
  waterSupply: 'water',
  drainage: 'drain',
  road: 'road',
  building: 'building',
  well: 'water_well',
  handPump: 'hand_pump',
  motorPump: 'motor_pump',
  tubeWell: 'tube_well',
  electricalPole: 'electrical'
} as const;

// Map interaction settings
export const MAP_INTERACTION = {
  clickTolerance: 5,        // Pixels tolerance for click detection
  doubleClickZoom: true,
  scrollZoom: true,
  boxZoom: true,
  dragRotate: true,
  dragPan: true,
  keyboard: true,
  touchZoomRotate: true,
  touchPitch: true,
  pitchWithRotate: true
} as const;

// Animation settings
export const MAP_ANIMATION = {
  flyTo: {
    duration: 1500,
    curve: 1.5,
    essential: true
  },
  easeTo: {
    duration: 1000,
    essential: true
  },
  fitBounds: {
    padding: 50,
    maxZoom: 15,
    duration: 1000
  }
} as const;

// Zoom level thresholds
export const ZOOM_LEVELS = {
  country: 5,
  province: 7,
  district: 9,
  tehsil: 11,
  city: 13,
  neighborhood: 15,
  street: 17,
  building: 19
} as const;

// Popup configuration
export const POPUP_CONFIG = {
  maxWidth: 320,
  closeButton: true,
  closeOnClick: true,
  offset: [0, -10] as [number, number],
  className: 'lds-map-popup'
} as const;

// Marker presets
export const MARKER_PRESETS = {
  default: {
    color: '#3b82f6',
    scale: 1
  },
  selected: {
    color: '#ef4444',
    scale: 1.2
  },
  hover: {
    color: '#8b5cf6',
    scale: 1.1
  },
  critical: {
    color: '#dc2626',
    scale: 1.3
  }
} as const;

// Cluster configuration
export const CLUSTER_CONFIG = {
  radius: 50,
  maxZoom: 14,
  minPoints: 2,
  colors: {
    small: '#51bbd6',    // < 10 items
    medium: '#f1f075',   // 10-99 items
    large: '#f28cb1'     // 100+ items
  },
  radii: {
    small: 20,
    medium: 30,
    large: 40
  }
} as const;

// Drawing tools configuration
export const DRAW_CONFIG = {
  defaultLineStyle: {
    color: '#3b82f6',
    width: 3,
    opacity: 0.8
  },
  defaultFillStyle: {
    color: '#3b82f6',
    opacity: 0.3,
    outlineColor: '#1e40af'
  },
  defaultPointStyle: {
    color: '#3b82f6',
    radius: 8
  }
} as const;

// Export helper function to get style URL with API key
export function getMapStyleUrl(style: MapStyleKey, apiKey: string): string {
  return `${MAP_STYLES[style].url}?key=${apiKey}`;
}

// Export helper function to validate coordinates
export function isValidCoordinate(lat: number, lng: number, bounds = PAKISTAN_BOUNDS): boolean {
  return (
    lat >= bounds.lat.min &&
    lat <= bounds.lat.max &&
    lng >= bounds.lng.min &&
    lng <= bounds.lng.max
  );
}

// Export helper to create GeoJSON point
export function createGeoJSONPoint(lng: number, lat: number, properties = {}): GeoJSON.Feature<GeoJSON.Point> {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [lng, lat]
    },
    properties
  };
}

// Export helper to create GeoJSON feature collection
export function createFeatureCollection(features: GeoJSON.Feature[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features
  };
}
