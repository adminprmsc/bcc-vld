# Service API Reference

## AssetLayerService

**Location**: `src/app/services/asset-layer.service.ts`  
**Provider**: `providedIn: 'root'`

### Interfaces

#### AssetLayerConfig
```typescript
interface AssetLayerConfig {
  id: string;                  // Unique layer identifier
  name: string;                // Display name
  category: string;            // Asset category
  visible: boolean;            // Layer visibility state
  color: string;               // Hex color code
  icon?: string;               // Icon name
  iconUrl?: string;            // CDN icon URL
  fillOpacity?: number;        // Fill opacity 0-1
  strokeWidth?: number;        // Stroke width in pixels
}
```

#### AssetWithCategory
```typescript
interface AssetWithCategory {
  id?: string;                 // Asset ID (e.g., WS-SP-001)
  title: string;               // Asset title
  category: string;            // Category
  assetType: string;           // Type identifier
  feature: Feature | null;     // GeoJSON feature
  attributes: Record<string, any>; // Asset attributes
  commissioningDate?: string | null;
  omIntervalMonths?: number | null;
  expectedLifespanYears?: number | null;
  maintenanceHistory?: MaintenanceRecord[];
}
```

#### AssetIdConfig
```typescript
interface AssetIdConfig {
  categoryPrefix: string;      // e.g., 'WS'
  subCategoryCode: string;     // e.g., 'SP'
  counter: number;             // Sequential number
}
```

#### MaintenanceRecord
```typescript
interface MaintenanceRecord {
  id: string;
  date: string;                // ISO date string
  type: 'preventive' | 'corrective' | 'emergency' | 'inspection';
  description: string;
  cost: number;                // Cost in PKR
  status: 'completed' | 'pending' | 'cancelled';
  notes?: string;
}
```

---

### Methods

#### loadAssetsForMap()
Loads all assets from backend and organizes by category.

**Signature**:
```typescript
loadAssetsForMap(): Observable<Map<string, AssetWithCategory[]>>
```

**Returns**: Observable map of category → assets array  
**Side Effects**: Updates internal `assetsByLayer$` subject

**Example**:
```typescript
assetLayerService.loadAssetsForMap().subscribe(assetsByCategory => {
  assetsByCategory.forEach((assets, category) => {
    console.log(`${category}: ${assets.length} assets`);
  });
});
```

---

#### getAssetsGeoJSON()
Converts organized assets to GeoJSON FeatureCollection for map rendering.

**Signature**:
```typescript
getAssetsGeoJSON(category?: string): FeatureCollection
```

**Parameters**:
- `category` (optional): Filter by specific category; if not provided, returns all assets

**Returns**: GeoJSON FeatureCollection with enriched properties

**Example**:
```typescript
const allAssets = assetLayerService.getAssetsGeoJSON();
const waterAssets = assetLayerService.getAssetsGeoJSON('Water Supply');
```

**FeatureCollection Structure**:
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [74.35, 31.52] },
      "properties": {
        "id": "WS-SP-001",
        "title": "Main Stand Post",
        "category": "Water Supply",
        "assetType": "stand-post",
        "commissioningDate": "2020-01-15",
        "omIntervalMonths": 6,
        "expectedLifespanYears": 25
      }
    }
  ]
}
```

---

#### generateAssetId()
Generates unique asset ID based on category and sub-category.

**Signature**:
```typescript
generateAssetId(category: string, assetType: string): string
```

**Parameters**:
- `category`: Asset category (e.g., 'Water Supply', 'Sewerage')
- `assetType`: Specific asset type (e.g., 'stand-post', 'sewage-line')

**Returns**: Formatted asset ID (e.g., 'WS-SP-001')

**Format**: `[PREFIX]-[SUBCODE]-[NUMBER]`

**Example**:
```typescript
const id1 = assetLayerService.generateAssetId('Water Supply', 'stand-post');
// Returns: 'WS-SP-001'

const id2 = assetLayerService.generateAssetId('Water Supply', 'stand-post');
// Returns: 'WS-SP-002' (auto-incremented)

const id3 = assetLayerService.generateAssetId('Sewerage', 'sewage-line');
// Returns: 'SG-SL-001'
```

**Category-Type Mappings**:
| Category | Types |
|----------|-------|
| Water Supply | water-pipeline, overhead-reservoir, stand-post, ro-plant, bore-hole, tubewell-pump-room |
| Sewerage | abr, sewage-line, manhole, other-sewerage-asset |
| Support Facility | guard-room, solar-installation, water-support-asset |
| Custom | custom-asset |

---

#### parseAssetId()
Reverse operation of generateAssetId - parses asset ID into components.

**Signature**:
```typescript
parseAssetId(assetId: string): AssetIdConfig | null
```

**Parameters**:
- `assetId`: Asset ID string (e.g., 'WS-SP-001')

**Returns**: Parsed components or null if invalid format

**Example**:
```typescript
const parsed = assetLayerService.parseAssetId('WS-SP-001');
console.log(parsed);
// {
//   categoryPrefix: 'WS',
//   subCategoryCode: 'SP',
//   counter: 1
// }

const invalid = assetLayerService.parseAssetId('INVALID');
console.log(invalid); // null
```

---

#### getLayerConfigs()
Gets all layer configurations as observable.

**Signature**:
```typescript
getLayerConfigs(): Observable<AssetLayerConfig[]>
```

**Returns**: Observable array of layer configurations

**Example**:
```typescript
assetLayerService.getLayerConfigs().subscribe(configs => {
  configs.forEach(config => {
    console.log(`${config.name}: ${config.visible ? 'visible' : 'hidden'}`);
  });
});
```

---

#### toggleLayerVisibility()
Toggles visibility of a specific layer.

**Signature**:
```typescript
toggleLayerVisibility(layerId: string): void
```

**Parameters**:
- `layerId`: Layer ID (e.g., 'water-supply-layer')

**Side Effects**: Updates layer visibility state

**Example**:
```typescript
assetLayerService.toggleLayerVisibility('water-supply-layer');
// Layer visibility is now inverted
```

---

#### getAssetsByLayer()
Gets all assets for a specific category.

**Signature**:
```typescript
getAssetsByLayer(category: string): AssetWithCategory[]
```

**Parameters**:
- `category`: Asset category

**Returns**: Array of assets in that category

**Example**:
```typescript
const waterAssets = assetLayerService.getAssetsByLayer('Water Supply');
console.log(`Found ${waterAssets.length} water assets`);
```

---

#### getAllAssets()
Gets all assets across all categories.

**Signature**:
```typescript
getAllAssets(): AssetWithCategory[]
```

**Returns**: Flat array of all assets

**Example**:
```typescript
const all = assetLayerService.getAllAssets();
console.log(`Total assets: ${all.length}`);
```

---

#### getAssetById()
Retrieves a specific asset by ID.

**Signature**:
```typescript
getAssetById(id: string): AssetWithCategory | null
```

**Parameters**:
- `id`: Asset ID

**Returns**: Asset object or null if not found

**Example**:
```typescript
const asset = assetLayerService.getAssetById('WS-SP-001');
if (asset) {
  console.log(`Found: ${asset.title}`);
} else {
  console.log('Asset not found');
}
```

---

#### updateAsset()
Updates an asset with new properties.

**Signature**:
```typescript
updateAsset(id: string, updates: Partial<AssetWithCategory>): void
```

**Parameters**:
- `id`: Asset ID
- `updates`: Partial asset object with new values

**Side Effects**: Updates internal cache and emits change

**Example**:
```typescript
assetLayerService.updateAsset('WS-SP-001', {
  title: 'Updated Stand Post',
  attributes: { diameter: 75 }
});
```

---

#### deleteAsset()
Removes an asset from all layers.

**Signature**:
```typescript
deleteAsset(id: string): boolean
```

**Parameters**:
- `id`: Asset ID

**Returns**: true if asset was deleted, false if not found

**Example**:
```typescript
const deleted = assetLayerService.deleteAsset('WS-SP-001');
if (deleted) {
  console.log('Asset removed');
}
```

---

#### getMaintenanceHistory()
Gets maintenance records for an asset.

**Signature**:
```typescript
getMaintenanceHistory(assetId: string): MaintenanceRecord[]
```

**Parameters**:
- `assetId`: Asset ID

**Returns**: Array of maintenance records

**Example**:
```typescript
const history = assetLayerService.getMaintenanceHistory('WS-SP-001');
history.forEach(record => {
  console.log(`${record.date}: ${record.description}`);
});
```

---

#### addMaintenanceRecord()
Adds a maintenance record to an asset.

**Signature**:
```typescript
addMaintenanceRecord(assetId: string, record: MaintenanceRecord): void
```

**Parameters**:
- `assetId`: Asset ID
- `record`: Maintenance record to add

**Example**:
```typescript
assetLayerService.addMaintenanceRecord('WS-SP-001', {
  id: 'M001',
  date: '2025-03-15',
  type: 'preventive',
  description: 'Annual maintenance',
  cost: 5000,
  status: 'completed'
});
```

---

#### getMapLibreLayerStyle()
Gets MapLibre GL layer style configuration for a specific geometry.

**Signature**:
```typescript
getMapLibreLayerStyle(layerId: string, sourceId: string, geometry: 'point' | 'line' | 'polygon'): any
```

**Parameters**:
- `layerId`: Layer ID
- `sourceId`: GeoJSON source ID
- `geometry`: Geometry type

**Returns**: MapLibre layer specification

**Example**:
```typescript
const pointStyle = assetLayerService.getMapLibreLayerStyle(
  'water-supply-layer',
  'asset-water-supply',
  'point'
);
map.addLayer(pointStyle);
```

---

#### getLayerConfigByCategory()
Gets layer configuration for a specific category.

**Signature**:
```typescript
getLayerConfigByCategory(category: string): AssetLayerConfig | undefined
```

**Parameters**:
- `category`: Asset category

**Returns**: Layer configuration or undefined if not found

**Example**:
```typescript
const config = assetLayerService.getLayerConfigByCategory('Water Supply');
if (config) {
  console.log(`Color: ${config.color}`);
}
```

---

## MapLayerIntegrationService

**Location**: `src/app/services/map-layer-integration.service.ts`  
**Provider**: `providedIn: 'root'`

### Methods

#### initializeAssetLayers()
Initializes all asset layers on a MapLibre GL map.

**Signature**:
```typescript
initializeAssetLayers(map: MapLibreMap): void
```

**Parameters**:
- `map`: MapLibre GL Map instance

**Side Effects**: 
- Adds GeoJSON sources
- Adds layer specifications
- Sets up interactivity

**Example**:
```typescript
@Component({
  template: `<div #mapContainer></div>`
})
export class MapComponent implements AfterViewInit {
  @ViewChild('mapContainer') container!: ElementRef;

  ngAfterViewInit() {
    const map = new maplibregl.Map({
      container: this.container.nativeElement,
      // ... other options
    });

    map.on('load', () => {
      mapLayerIntegrationService.initializeAssetLayers(map);
    });
  }
}
```

---

#### toggleLayerVisibility()
Toggles visibility of all geometry layers for an asset layer.

**Signature**:
```typescript
toggleLayerVisibility(map: MapLibreMap, layerId: string, visible: boolean): void
```

**Parameters**:
- `map`: MapLibre GL Map instance
- `layerId`: Asset layer ID
- `visible`: New visibility state

**Example**:
```typescript
mapLayerIntegrationService.toggleLayerVisibility(map, 'water-supply-layer', false);
// All water supply layers now hidden
```

---

#### updateLayerData()
Updates GeoJSON data for a layer.

**Signature**:
```typescript
updateLayerData(map: MapLibreMap, category: string): void
```

**Parameters**:
- `map`: MapLibre GL Map instance
- `category`: Asset category

**Example**:
```typescript
// After adding new assets
mapLayerIntegrationService.updateLayerData(map, 'Water Supply');
```

---

#### fitToAssetLayer()
Fits map view to asset layer bounds.

**Signature**:
```typescript
fitToAssetLayer(map: MapLibreMap, category: string): void
```

**Parameters**:
- `map`: MapLibre GL Map instance
- `category`: Asset category

**Example**:
```typescript
mapLayerIntegrationService.fitToAssetLayer(map, 'Water Supply');
// Map zooms to all water supply assets
```

---

#### getAssetLayerIds()
Gets all layer IDs for a given asset layer (includes geometry suffixes).

**Signature**:
```typescript
getAssetLayerIds(layerId: string): string[]
```

**Parameters**:
- `layerId`: Asset layer ID

**Returns**: Array of layer IDs (points, lines, polygons)

**Example**:
```typescript
const ids = mapLayerIntegrationService.getAssetLayerIds('water-supply-layer');
// ['asset-layer-water-supply-layer-points', 'asset-layer-water-supply-layer-lines', 'asset-layer-water-supply-layer-polygons']
```

---

## PdfReportService (Enhanced)

**Location**: `src/app/services/pdf-report.service.ts`

### New Interface

#### ExtendedAssetMetadata
```typescript
export interface ExtendedAssetMetadata extends AssetMetadata {
  assetType?: string;
  category?: string;
  attributes?: Record<string, any>;
  maintenanceHistory?: MaintenanceRecord[];
}
```

### Enhanced Methods

#### generateAssetReport()
Now accepts both basic and extended asset metadata.

**Signature**:
```typescript
generateAssetReport(asset: AssetMetadata | ExtendedAssetMetadata, fileName?: string): void
```

**New PDF Sections**:
1. Asset Attributes (dynamic table from attributes object)
2. Maintenance History (table with totals)

**Example**:
```typescript
const asset: ExtendedAssetMetadata = {
  id: 'WS-SP-001',
  title: 'Main Stand Post',
  category: 'Water Supply',
  assetType: 'stand-post',
  commissioningDate: '2020-01-15',
  omIntervalMonths: 6,
  expectedLifespanYears: 25,
  attributes: {
    material: 'PVC',
    diameter: 50,
    design_flow: 100
  },
  maintenanceHistory: [
    {
      id: 'M001',
      date: '2025-03-15',
      type: 'preventive',
      description: 'Annual maintenance',
      cost: 5000,
      status: 'completed'
    }
  ]
};

pdfReportService.generateAssetReport(asset);
```

---

### New Methods

#### generateAssetAttributesSection()
Generates HTML for asset attributes table.

**Signature**:
```typescript
private generateAssetAttributesSection(asset: ExtendedAssetMetadata): string
```

---

#### generateMaintenanceHistorySection()
Generates HTML for maintenance history table.

**Signature**:
```typescript
private generateMaintenanceHistorySection(asset: ExtendedAssetMetadata): string
```

**Features**:
- Date formatting
- Status color-coding
- Currency formatting (PKR)
- Total cost calculation

---

## Complete Integration Example

```typescript
import { Component, ViewChild, OnInit, inject } from '@angular/core';
import { Map as MapLibreMap } from 'maplibre-gl';
import { AssetLayerService } from '../services/asset-layer.service';
import { MapLayerIntegrationService } from '../services/map-layer-integration.service';
import { PdfReportService } from '../services/pdf-report.service';
import { MapWorkspaceComponent } from './maps/map-workspace.component';
import { AssetLayerToggleComponent } from './maps/asset-layer-toggle.component';

@Component({
  selector: 'app-asset-dashboard',
  template: `
    <div class="dashboard">
      <app-asset-layer-toggle (layerToggled)="onLayerToggled($event)"></app-asset-layer-toggle>
      <app-map-workspace (mapReady)="onMapReady($event)"></app-map-workspace>
    </div>
  `,
  imports: [MapWorkspaceComponent, AssetLayerToggleComponent]
})
export class AssetDashboard implements OnInit {
  private assetLayerService = inject(AssetLayerService);
  private mapLayerIntegration = inject(MapLayerIntegrationService);
  private pdfReportService = inject(PdfReportService);

  @ViewChild(MapWorkspaceComponent) mapWorkspace!: MapWorkspaceComponent;

  ngOnInit() {
    // Load assets on init
    this.assetLayerService.loadAssetsForMap().subscribe(assetsByCategory => {
      console.log('Assets loaded:', assetsByCategory);
    });
  }

  onMapReady(map: MapLibreMap) {
    // Initialize layers on map
    this.mapLayerIntegration.initializeAssetLayers(map);
  }

  onLayerToggled(event: { layerId: string; visible: boolean }) {
    // Handle layer toggle
    console.log(`Layer ${event.layerId} is now ${event.visible ? 'visible' : 'hidden'}`);
  }

  exportAssetReport(assetId: string) {
    const asset = this.assetLayerService.getAssetById(assetId);
    if (asset) {
      this.pdfReportService.generateAssetReport(asset);
    }
  }
}
```

---

## Error Handling

All services include proper error handling:

```typescript
// Graceful handling of missing assets
const asset = assetLayerService.getAssetById('INVALID-ID');
if (!asset) {
  console.warn('Asset not found');
}

// Observable error handling
assetLayerService.loadAssetsForMap().subscribe(
  assetsByCategory => {
    // Success
  },
  error => {
    console.error('Failed to load assets:', error);
  }
);
```

---

**Last Updated**: October 26, 2025  
**API Version**: 1.0  
**Status**: Stable
