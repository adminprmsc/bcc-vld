import type { Map, StyleSpecification } from 'maplibre-gl';
import type { FeatureCollection, Geometry } from 'geojson';

export type BasemapId = 'osm' | 'esri' | 'esriTopo' | 'cartoLight' | 'cartoDark';

const OSM_SOURCE_ID = 'osm-tiles';
const ESRI_SOURCE_ID = 'esri-tiles';
const ESRI_TOPO_SOURCE_ID = 'esri-topo-tiles';
const CARTO_LIGHT_SOURCE_ID = 'carto-light-tiles';
const CARTO_DARK_SOURCE_ID = 'carto-dark-tiles';

const OSM_LAYER_ID = 'osm-raster-layer';
const ESRI_LAYER_ID = 'esri-raster-layer';
const ESRI_TOPO_LAYER_ID = 'esri-topo-layer';
const CARTO_LIGHT_LAYER_ID = 'carto-light-layer';
const CARTO_DARK_LAYER_ID = 'carto-dark-layer';

// Asset Layer Source IDs
export const ASSET_LAYER_SOURCE_IDS = {
  'water-supply': 'asset-water-supply',
  'sewerage': 'asset-sewerage',
  'support-facility': 'asset-support-facility',
  'custom': 'asset-custom',
} as const;

export interface BasemapDefinition {
  id: BasemapId;
  label: string;
  description?: string;
}

export const BASEMAPS: BasemapDefinition[] = [
  { id: 'osm', label: 'OpenStreetMap', description: 'General purpose streets basemap' },
  { id: 'esri', label: 'Esri Imagery', description: 'High-resolution satellite imagery' },
  { id: 'esriTopo', label: 'Esri Topographic', description: 'Topography and terrain context' },
  { id: 'cartoLight', label: 'Carto Light', description: 'Low-contrast contextual map' },
  { id: 'cartoDark', label: 'Carto Dark', description: 'Dark theme for low-light environments' }
];

const BASEMAP_LAYER_LOOKUP: Record<BasemapId, string> = {
  osm: OSM_LAYER_ID,
  esri: ESRI_LAYER_ID,
  esriTopo: ESRI_TOPO_LAYER_ID,
  cartoLight: CARTO_LIGHT_LAYER_ID,
  cartoDark: CARTO_DARK_LAYER_ID
};

export const MAP_WORKSPACE_STYLE: StyleSpecification = {
  version: 8,
  name: 'EDCS Workspace',
  sources: {
    [OSM_SOURCE_ID]: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19
    },
    [ESRI_SOURCE_ID]: {
      type: 'raster',
      tiles: [
        'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      ],
      tileSize: 256,
      maxzoom: 19
    },
    [ESRI_TOPO_SOURCE_ID]: {
      type: 'raster',
      tiles: [
        'https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
      ],
      tileSize: 256,
      maxzoom: 19
    },
    [CARTO_LIGHT_SOURCE_ID]: {
      type: 'raster',
      tiles: ['https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 20
    },
    [CARTO_DARK_SOURCE_ID]: {
      type: 'raster',
      tiles: ['https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 20
    }
  },
  layers: [
    {
      id: OSM_LAYER_ID,
      type: 'raster',
      source: OSM_SOURCE_ID,
      layout: {
        visibility: 'visible'
      }
    },
    {
      id: ESRI_LAYER_ID,
      type: 'raster',
      source: ESRI_SOURCE_ID,
      layout: {
        visibility: 'none'
      }
    },
    {
      id: ESRI_TOPO_LAYER_ID,
      type: 'raster',
      source: ESRI_TOPO_SOURCE_ID,
      layout: {
        visibility: 'none'
      }
    },
    {
      id: CARTO_LIGHT_LAYER_ID,
      type: 'raster',
      source: CARTO_LIGHT_SOURCE_ID,
      layout: {
        visibility: 'none'
      }
    },
    {
      id: CARTO_DARK_LAYER_ID,
      type: 'raster',
      source: CARTO_DARK_SOURCE_ID,
      layout: {
        visibility: 'none'
      }
    }
  ]
};

export function toggleBasemap(styleMap: Map, target: BasemapId): void {
  Object.entries(BASEMAP_LAYER_LOOKUP).forEach(([id, layerId]) => {
    if (!styleMap.getLayer(layerId)) {
      return;
    }
    styleMap.setLayoutProperty(layerId, 'visibility', id === target ? 'visible' : 'none');
  });
}

export function emptyFeatureCollection(): FeatureCollection<Geometry> {
  return {
    type: 'FeatureCollection',
    features: []
  };
}

export interface ParsedCoordinate {
  lng: number;
  lat: number;
}

export function parseCoordinateQuery(query: string): ParsedCoordinate | null {
  if (!query?.trim()) {
    return null;
  }

  const parts = query
    .trim()
    .replace(/[,\s]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((value) => Number(value));

  if (parts.length !== 2 || parts.some((value) => Number.isNaN(value) || !Number.isFinite(value))) {
    return null;
  }

  const [first, second] = parts;
  const latFirst = Math.abs(first) <= 90 && Math.abs(second) <= 180;
  const lngFirst = Math.abs(first) <= 180 && Math.abs(second) <= 90;

  if (latFirst) {
    return { lat: first, lng: second };
  }

  if (lngFirst) {
    return { lng: first, lat: second };
  }

  return null;
}
