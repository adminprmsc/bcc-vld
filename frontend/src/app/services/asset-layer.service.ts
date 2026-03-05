import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Feature, FeatureCollection, Point, LineString, Polygon } from 'geojson';
import { ConsultantPlansService } from '../components/dashboard/edcs-consultant-dashboard/consultant-plans.service';

/**
 * Asset Layer Configuration
 * Defines styling and behavior for each asset category layer
 */
export interface AssetLayerConfig {
  id: string;
  name: string;
  category: string;
  visible: boolean;
  color: string;
  icon?: string;
  iconUrl?: string;
  fillOpacity?: number;
  strokeWidth?: number;
}

/**
 * Asset ID Series Configuration
 * Defines prefix, sub-category codes, and counter for each asset type
 */
export interface AssetIdConfig {
  categoryPrefix: string; // WS (Water Supply), SG (Sewerage), SF (Support Facility), etc.
  subCategoryCode: string; // SP (Stand Post), OHR (Overhead Reservoir), PL (Pipeline), etc.
  counter: number; // Sequential number starting from 1
}

/**
 * Asset with ID and Category Information
 */
export interface AssetWithCategory {
  id?: string;
  title: string;
  category: string;
  assetType: string;
  feature: Feature | null;
  attributes: Record<string, any>;
  commissioningDate?: string | null;
  nextMaintenanceDate?: string | null;
  expectedLifespanYears?: number | null;
  maintenanceHistory?: MaintenanceRecord[];
}

/**
 * Maintenance Record for Asset
 */
export interface MaintenanceRecord {
  id: string;
  date: string;
  type: 'preventive' | 'corrective' | 'emergency' | 'inspection';
  description: string;
  cost: number;
  status: 'completed' | 'pending' | 'cancelled';
  notes?: string;
  attachments?: Array<{
    url: string;
    originalName?: string;
    storedName?: string;
  }>;
  performedBy?: string;
  recordedAt?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AssetLayerService {
  private readonly assetLayers$ = new BehaviorSubject<AssetLayerConfig[]>([]);
  private readonly assetsByLayer$ = new BehaviorSubject<Map<string, AssetWithCategory[]>>(new Map());
  private readonly assetIdCounters = new Map<string, number>();

  // Asset ID Series Prefixes and Codes
  private readonly ASSET_ID_MAP: Record<string, { prefix: string; subCodes: Record<string, string> }> = {
    'Water Supply': {
      prefix: 'WS',
      subCodes: {
        'water-pipeline': 'PL',
        'overhead-reservoir': 'OHR',
        'stand-post': 'SP',
        'ro-plant': 'RO',
        'bore-hole': 'BH',
        'tubewell-pump-room': 'TPR',
      },
    },
    'Sewerage': {
      prefix: 'SG',
      subCodes: {
        'abr': 'ABR',
        'sewage-line': 'SL',
        'manhole': 'MH',
        'other-sewerage-asset': 'OSA',
      },
    },
    'Support Facility': {
      prefix: 'SF',
      subCodes: {
        'guard-room': 'GR',
        'solar-installation': 'SI',
        'water-support-asset': 'WSA',
      },
    },
    'Custom': {
      prefix: 'CS',
      subCodes: {
        'custom-asset': 'CA',
      },
    },
  };

  // Layer Styling Configuration
  private readonly DEFAULT_LAYER_CONFIGS: AssetLayerConfig[] = [
    {
      id: 'water-supply-layer',
      name: 'Water Supply Assets',
      category: 'Water Supply',
      visible: true,
      color: '#2563eb',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/svgs/solid/droplet.svg',
      fillOpacity: 0.7,
      strokeWidth: 2,
    },
    {
      id: 'sewerage-layer',
      name: 'Sewerage Assets',
      category: 'Sewerage',
      visible: true,
      color: '#8b5cf6',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/svgs/solid/pipe.svg',
      fillOpacity: 0.7,
      strokeWidth: 2,
    },
    {
      id: 'support-facility-layer',
      name: 'Support Facilities',
      category: 'Support Facility',
      visible: true,
      color: '#f59e0b',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/svgs/solid/building.svg',
      fillOpacity: 0.7,
      strokeWidth: 2,
    },
    {
      id: 'custom-layer',
      name: 'Custom Assets',
      category: 'Custom',
      visible: true,
      color: '#64748b',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/svgs/solid/circle.svg',
      fillOpacity: 0.7,
      strokeWidth: 2,
    },
  ];

  constructor(private plansService: ConsultantPlansService) {
    this.initializeLayerConfigs();
  }

  /**
   * Initialize default layer configurations
   */
  private initializeLayerConfigs(): void {
    this.assetLayers$.next(this.DEFAULT_LAYER_CONFIGS);
  }

  /**
   * Load all assets from the backend and organize by category layers
   */
  loadAssetsForMap(): Observable<Map<string, AssetWithCategory[]>> {
    this.plansService.listPlans().subscribe(
      (plans: any[]) => {
        const assetsByCategory = this.organizeAssetsByCategory(plans);
        this.assetsByLayer$.next(assetsByCategory);
      },
      (error) => {
        console.error('Error loading assets for map:', error);
      },
    );

    return this.assetsByLayer$.asObservable();
  }

  /**
   * Organize assets by category into layers
   */
  private organizeAssetsByCategory(plans: any[]): Map<string, AssetWithCategory[]> {
    const assetsByCategory = new Map<string, AssetWithCategory[]>();

    // Initialize category maps
    this.DEFAULT_LAYER_CONFIGS.forEach((config) => {
      assetsByCategory.set(config.category, []);
    });

    // Group assets by category
    plans.forEach((plan) => {
      const category = plan.category || 'Custom';
      const assets = assetsByCategory.get(category) || [];

      // Generate asset ID if not present
      const assetId = plan.id || this.generateAssetId(category, plan.assetType);

      const nextMaintenance = plan.nextMaintenanceDate
        || plan.attributes?.nextMaintenanceDate
        || plan.attributes?.maintenanceDueDate
        || null;
      const commissioningDate = plan.commissioningDate
        || plan.attributes?.commissioningDate
        || null;
      const expectedLifespan = plan.expectedLifespanYears
        ?? plan.attributes?.expectedLifespanYears
        ?? null;

      const history = Array.isArray((plan as any)?.maintenanceHistory)
        ? (plan as any).maintenanceHistory
        : Array.isArray(plan.attributes?.maintenanceHistory)
        ? plan.attributes.maintenanceHistory
        : [];

      const assetWithCategory: AssetWithCategory = {
        id: assetId,
        title: plan.title,
        category: category,
        assetType: plan.assetType,
        feature: plan.feature,
        attributes: plan.attributes || {},
        commissioningDate,
        nextMaintenanceDate: nextMaintenance,
        expectedLifespanYears: expectedLifespan,
        maintenanceHistory: history,
      };

      assets.push(assetWithCategory);
      assetsByCategory.set(category, assets);
    });

    return assetsByCategory;
  }

  /**
   * Convert organized assets to GeoJSON FeatureCollection for map rendering
   */
  getAssetsGeoJSON(category?: string): FeatureCollection {
    const assets = this.assetsByLayer$.value;
    const features: Feature[] = [];

    if (category) {
      const categoryAssets = assets.get(category) || [];
      categoryAssets.forEach((asset) => {
        if (asset.feature) {
          features.push(this.enrichFeature(asset.feature, asset));
        }
      });
    } else {
      assets.forEach((categoryAssets) => {
        categoryAssets.forEach((asset) => {
          if (asset.feature) {
            features.push(this.enrichFeature(asset.feature, asset));
          }
        });
      });
    }

    return {
      type: 'FeatureCollection',
      features,
    };
  }

  /**
   * Enrich feature with asset metadata
   */
  private enrichFeature(feature: Feature, asset: AssetWithCategory): Feature {
    return {
      ...feature,
      properties: {
        ...feature.properties,
        id: asset.id,
        title: asset.title,
        category: asset.category,
        assetType: asset.assetType,
        commissioningDate: asset.commissioningDate,
        nextMaintenanceDate: asset.nextMaintenanceDate,
        expectedLifespanYears: asset.expectedLifespanYears,
      },
    };
  }

  /**
   * Generate Asset ID based on category, sub-category, and sequential number
   * Format: [CategoryPrefix]-[SubCategoryCode]-[SequentialNumber]
   * Example: WS-SP-001 for Water Supply Stand Post #1
   */
  generateAssetId(category: string, assetType: string): string {
    const categoryConfig = this.ASSET_ID_MAP[category];
    if (!categoryConfig) {
      return `GEN-${Date.now()}`;
    }

    const prefix = categoryConfig.prefix;
    const subCode = categoryConfig.subCodes[assetType] || 'XX';

    // Get or initialize counter for this asset type
    const counterKey = `${category}-${assetType}`;
    const counter = (this.assetIdCounters.get(counterKey) || 0) + 1;
    this.assetIdCounters.set(counterKey, counter);

    // Format: WS-SP-001 (pad with leading zeros)
    return `${prefix}-${subCode}-${String(counter).padStart(3, '0')}`;
  }

  /**
   * Parse Asset ID to extract components
   * Reverse of generateAssetId
   */
  parseAssetId(assetId: string): AssetIdConfig | null {
    const match = assetId.match(/^([A-Z]+)-([A-Z]+)-(\d+)$/);
    if (!match) {
      return null;
    }

    return {
      categoryPrefix: match[1],
      subCategoryCode: match[2],
      counter: parseInt(match[3], 10),
    };
  }

  /**
   * Get all layer configurations
   */
  getLayerConfigs(): Observable<AssetLayerConfig[]> {
    return this.assetLayers$.asObservable();
  }

  /**
   * Toggle layer visibility
   */
  toggleLayerVisibility(layerId: string): boolean {
    const configs = this.assetLayers$.value;
    let newVisible = true;
    const updated = configs.map((config) => {
      if (config.id !== layerId) {
        return config;
      }
      newVisible = !config.visible;
      return { ...config, visible: newVisible };
    });
    this.assetLayers$.next(updated);
    return newVisible;
  }

  /**
   * Get assets for specific layer
   */
  getAssetsByLayer(category: string): AssetWithCategory[] {
    return this.assetsByLayer$.value.get(category) || [];
  }

  /**
   * Get all assets across all layers
   */
  getAllAssets(): AssetWithCategory[] {
    const allAssets: AssetWithCategory[] = [];
    this.assetsByLayer$.value.forEach((assets) => {
      allAssets.push(...assets);
    });
    return allAssets;
  }

  /**
   * Get asset by ID
   */
  getAssetById(id: string): AssetWithCategory | null {
    const assets = this.getAllAssets();
    return assets.find((asset) => asset.id === id) || null;
  }

  /**
   * Update asset in layers
   */
  updateAsset(id: string, updates: Partial<AssetWithCategory>): void {
    const assetsByLayer = this.assetsByLayer$.value;
    let found = false;

    assetsByLayer.forEach((assets) => {
      const index = assets.findIndex((asset) => asset.id === id);
      if (index !== -1) {
        assets[index] = { ...assets[index], ...updates };
        found = true;
      }
    });

    if (found) {
      this.assetsByLayer$.next(new Map(assetsByLayer));
    }
  }

  /**
   * Delete asset from layers
   */
  deleteAsset(id: string): boolean {
    const assetsByLayer = this.assetsByLayer$.value;
    let found = false;

    assetsByLayer.forEach((assets) => {
      const index = assets.findIndex((asset) => asset.id === id);
      if (index !== -1) {
        assets.splice(index, 1);
        found = true;
      }
    });

    if (found) {
      this.assetsByLayer$.next(new Map(assetsByLayer));
    }

    return found;
  }

  /**
   * Get maintenance history for asset
   */
  getMaintenanceHistory(assetId: string): MaintenanceRecord[] {
    const asset = this.getAssetById(assetId);
    return asset?.maintenanceHistory || [];
  }

  /**
   * Add maintenance record to asset
   */
  addMaintenanceRecord(assetId: string, record: MaintenanceRecord): void {
    const asset = this.getAssetById(assetId);
    if (asset) {
      const history = asset.maintenanceHistory || [];
      history.push(record);
      this.updateAsset(assetId, { maintenanceHistory: history });
    }
  }

  /**
   * Get layer configuration by category
   */
  getLayerConfigByCategory(category: string): AssetLayerConfig | undefined {
    return this.assetLayers$.value.find((config) => config.category === category);
  }

  /**
   * Get layer styling for MapLibre
   */
  getMapLibreLayerStyle(layerId: string, sourceId: string, geometry: 'point' | 'line' | 'polygon'): any {
    const config = this.assetLayers$.value.find((c) => c.id === layerId);
    if (!config) {
      return null;
    }

    const baseStyle = {
      id: layerId,
      source: sourceId,
      layout: {
        visibility: config.visible ? 'visible' : 'none',
      },
    };

    if (geometry === 'point') {
      return {
        ...baseStyle,
        type: 'circle',
        paint: {
          'circle-radius': 8,
          'circle-color': config.color,
          'circle-opacity': 0.8,
          'circle-stroke-width': config.strokeWidth || 2,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-opacity': 0.9,
        },
      };
    }

    if (geometry === 'line') {
      return {
        ...baseStyle,
        type: 'line',
        paint: {
          'line-color': config.color,
          'line-width': config.strokeWidth || 2,
          'line-opacity': 0.8,
        },
      };
    }

    if (geometry === 'polygon') {
      return {
        ...baseStyle,
        type: 'fill',
        paint: {
          'fill-color': config.color,
          'fill-opacity': config.fillOpacity || 0.5,
        },
      };
    }

    return baseStyle;
  }
}
