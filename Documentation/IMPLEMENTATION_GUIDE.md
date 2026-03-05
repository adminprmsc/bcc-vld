# Asset Layer System Implementation Guide

## Overview
This document outlines the complete implementation of the asset layer system with multi-layer support, asset ID series generation, and enhanced PDF reporting.

---

## 1. Asset Layer System (Display All Assets on Map)

### Services Created

#### `AssetLayerService` (`src/app/services/asset-layer.service.ts`)
**Purpose**: Core service for managing asset layers and organizing assets by category.

**Key Features**:
- Load all assets from backend database
- Organize assets by category (Water Supply, Sewerage, Support Facility, Custom)
- Generate GeoJSON FeatureCollections for map rendering
- Track layer visibility states
- Manage asset CRUD operations
- Store and retrieve maintenance history

**Key Methods**:
```typescript
loadAssetsForMap(): Observable<Map<string, AssetWithCategory[]>>
getAssetsGeoJSON(category?: string): FeatureCollection
toggleLayerVisibility(layerId: string): void
getLayerConfigs(): Observable<AssetLayerConfig[]>
getAssetsByLayer(category: string): AssetWithCategory[]
getMapLibreLayerStyle(layerId: string, sourceId: string, geometry: 'point' | 'line' | 'polygon'): any
```

**Default Layers Configured**:
1. **Water Supply Layer** (#2563eb - Blue)
2. **Sewerage Layer** (#8b5cf6 - Purple)
3. **Support Facility Layer** (#f59e0b - Amber)
4. **Custom Assets Layer** (#64748b - Gray)

#### `MapLayerIntegrationService` (`src/app/services/map-layer-integration.service.ts`)
**Purpose**: Integration layer between AssetLayerService and MapLibre GL.

**Key Methods**:
```typescript
initializeAssetLayers(map: MapLibreMap): void
toggleLayerVisibility(map: MapLibreMap, layerId: string, visible: boolean): void
updateLayerData(map: MapLibreMap, category: string): void
fitToAssetLayer(map: MapLibreMap, category: string): void
```

---

## 2. Asset ID Series System

### Format
`[CategoryPrefix]-[SubCategoryCode]-[SequentialNumber]`

**Examples**:
- `WS-SP-001` - Water Supply, Stand Post, #1
- `WS-OHR-005` - Water Supply, Overhead Reservoir, #5
- `SG-SL-042` - Sewerage, Sewage Line, #42
- `SF-GR-003` - Support Facility, Guard Room, #3

### Category & Sub-Category Mappings

| Category | Prefix | Sub-Category | Code |
|----------|--------|--------------|------|
| Water Supply | WS | Water Pipeline | PL |
| | | Overhead Reservoir | OHR |
| | | Stand Post | SP |
| | | RO Plant | RO |
| | | Bore Hole | BH |
| | | Tubewell Pump Room | TPR |
| Sewerage | SG | ABR | ABR |
| | | Sewage Line | SL |
| | | Manhole | MH |
| | | Other | OSA |
| Support Facility | SF | Guard Room | GR |
| | | Solar Installation | SI |
| | | Water Support Asset | WSA |
| Custom | CS | Custom Asset | CA |

### Implementation
Located in `AssetLayerService`:
```typescript
generateAssetId(category: string, assetType: string): string
parseAssetId(assetId: string): AssetIdConfig | null
```

**Usage**:
```typescript
const assetId = assetLayerService.generateAssetId('Water Supply', 'stand-post');
// Result: "WS-SP-001" (if first Stand Post)

const parsed = assetLayerService.parseAssetId('WS-SP-001');
// Result: { categoryPrefix: 'WS', subCategoryCode: 'SP', counter: 1 }
```

---

## 3. Asset Layer Toggle Component

### Component: `AssetLayerToggleComponent`
**Location**: `src/app/components/shared/maps/asset-layer-toggle.component.ts`

**Features**:
- Displays all asset layers with visibility checkboxes
- Color-coded layer indicators
- Collapse/expand functionality
- Responsive design for mobile and desktop
- Layer count badges (extensible)

**Templates**:
- `asset-layer-toggle.component.html` - Template markup
- `asset-layer-toggle.component.scss` - Styling with animations

**Usage in Dashboard**:
```typescript
import { AssetLayerToggleComponent } from './maps/asset-layer-toggle.component';

@Component({
  imports: [AssetLayerToggleComponent],
})
export class EdcsConsultantDashboard {
  onLayerToggled(event: { layerId: string; visible: boolean }): void {
    console.log(`Layer ${event.layerId} visibility: ${event.visible}`);
  }
}
```

**HTML**:
```html
<app-asset-layer-toggle 
  [collapsed]="false"
  (layerToggled)="onLayerToggled($event)"
  (collapsed$)="onToggleCollapsed($event)">
</app-asset-layer-toggle>
```

---

## 4. Enhanced PDF Reporting

### Features Added

#### 4.1 PRMSC Logo Integration
- Embedded SVG logo as Base64 data URI (no external dependency)
- Located in header with proper sizing
- Fallback for graceful degradation

```typescript
private readonly PRMSC_LOGO_URL = 'data:image/svg+xml;base64,...'
```

#### 4.2 Asset Attributes Section
- Dynamic table generation from asset attributes object
- Proper key formatting (camelCase → readable text)
- Escaped HTML for security

**Example Attributes**:
- Material (pipe material type)
- Diameter (mm)
- Design Flow (L/s)
- Pressure Class (bar)
- Length (m)

#### 4.3 Maintenance History Section
- Timeline table with columns: Date, Type, Description, Status, Cost
- Status color-coding (Completed: Green, Pending: Amber, Cancelled: Red)
- Total cost calculation and display
- PKR currency formatting

**Maintenance Types**:
- Preventive
- Corrective
- Emergency
- Inspection

**Maintenance Statuses**:
- Completed
- Pending
- Cancelled

### Updated Methods

```typescript
// Extended asset metadata interface
export interface ExtendedAssetMetadata extends AssetMetadata {
  assetType?: string;
  category?: string;
  attributes?: Record<string, any>;
  maintenanceHistory?: MaintenanceRecord[];
}

// Generate report with attributes and history
generateAssetReport(asset: AssetMetadata | ExtendedAssetMetadata, fileName?: string): void

// Helper methods
private generateAssetAttributesSection(asset: ExtendedAssetMetadata): string
private generateMaintenanceHistorySection(asset: ExtendedAssetMetadata): string
private formatAttributeKey(key: string): string
private formatMaintenanceType(type: string): string
```

---

## 5. Integration Steps

### Step 1: Import Services in Dashboard
```typescript
import { AssetLayerService } from '../../../services/asset-layer.service';
import { MapLayerIntegrationService } from '../../../services/map-layer-integration.service';
import { AssetLayerToggleComponent } from '../../shared/maps/asset-layer-toggle.component';

@Component({
  imports: [AssetLayerToggleComponent],
})
export class EdcsConsultantDashboard {
  private assetLayerService = inject(AssetLayerService);
  private mapLayerIntegration = inject(MapLayerIntegrationService);

  @ViewChild(MapWorkspaceComponent) mapWorkspace?: MapWorkspaceComponent;

  onMapReady(map: MapLibreMap): void {
    this.mapLayerIntegration.initializeAssetLayers(map);
  }
}
```

### Step 2: Add Layer Toggle to Template
```html
<div class="map-controls">
  <app-asset-layer-toggle 
    (layerToggled)="onLayerToggled($event)">
  </app-asset-layer-toggle>
</div>

<app-map-workspace
  (mapReady)="onMapReady($event)"
  [plans]="mapPlans()">
</app-map-workspace>
```

### Step 3: Use Asset ID in Reporting
```typescript
// When creating an asset
const asset = {
  id: this.assetLayerService.generateAssetId('Water Supply', 'stand-post'),
  title: 'New Stand Post',
  category: 'Water Supply',
  assetType: 'stand-post',
  attributes: {
    material: 'Stainless Steel',
    diameter: 50,
    designFlow: 100,
  },
};

// Generate PDF with all features
this.pdfReportService.generateAssetReport(asset);
```

---

## 6. Database Integration (Backend)

### Asset Model Requirements
```javascript
{
  _id: ObjectId,
  id: String,  // e.g., "WS-SP-001"
  title: String,
  category: String,
  assetType: String,
  feature: GeoJSON.Feature,
  attributes: {
    // Dynamic based on asset type
    material: String,
    diameter: Number,
    // ... other specs
  },
  commissioningDate: Date,
  omIntervalMonths: Number,
  expectedLifespanYears: Number,
  maintenanceHistory: [{
    id: String,
    date: Date,
    type: String,  // preventive|corrective|emergency|inspection
    description: String,
    cost: Number,
    status: String,  // completed|pending|cancelled
    notes: String
  }],
  createdAt: Date,
  updatedAt: Date
}
```

### API Endpoints Required
```
GET  /api/consultant-plans                 // List all assets
GET  /api/consultant-plans/:id             // Get single asset
POST /api/consultant-plans                 // Create asset
PUT  /api/consultant-plans/:id             // Update asset
DELETE /api/consultant-plans/:id           // Delete asset

GET  /api/consultant-plans/:id/maintenance // Get maintenance history
POST /api/consultant-plans/:id/maintenance // Add maintenance record
```

---

## 7. QR Code Integration (Future Enhancement)

The asset ID system is designed for QR code labeling:

```typescript
// Generate QR code from asset ID
const qrData = {
  assetId: 'WS-SP-001',
  title: 'Stand Post - Main Road',
  category: 'Water Supply',
  coordinates: [74.35, 31.52],
  timestamp: new Date().toISOString(),
};

// Encode as JSON for QR
const qrContent = JSON.stringify(qrData);
```

**QR Code Payload Structure**:
```json
{
  "assetId": "WS-SP-001",
  "title": "Stand Post - Main Road",
  "category": "Water Supply",
  "coordinates": [74.35, 31.52],
  "timestamp": "2025-10-26T00:00:00Z"
}
```

---

## 8. Testing Checklist

### Asset Layer System
- [ ] Assets load on map load
- [ ] Assets grouped by category layer
- [ ] Layer toggle shows/hides assets
- [ ] Multiple layers can be toggled independently
- [ ] Asset popup shows when clicked
- [ ] Fit to layer bounds works

### Asset ID System
- [ ] Asset IDs generated correctly
- [ ] Sequential counters increment
- [ ] Asset IDs parse back correctly
- [ ] Different categories have correct prefixes

### PDF Reporting
- [ ] PRMSC logo appears in header
- [ ] Asset attributes table renders
- [ ] Maintenance history table renders
- [ ] Currency formatting works (PKR)
- [ ] Status color coding displays
- [ ] Print to PDF works without errors

### Map Integration
- [ ] Layer toggle component visible
- [ ] Layers appear on map with correct colors
- [ ] Point/line/polygon geometries render
- [ ] Asset selection triggers popup
- [ ] Fit to layer centers map correctly

---

## 9. File Structure

```
src/app/
├── services/
│   ├── asset-layer.service.ts          (NEW)
│   ├── map-layer-integration.service.ts (NEW)
│   ├── pdf-report.service.ts           (ENHANCED)
│   └── asset-metadata.service.ts
├── components/
│   ├── shared/maps/
│   │   ├── asset-layer-toggle.component.ts        (NEW)
│   │   ├── asset-layer-toggle.component.html      (NEW)
│   │   ├── asset-layer-toggle.component.scss      (NEW)
│   │   ├── map-workspace.component.ts             (TO INTEGRATE)
│   │   └── maplibre-helpers.ts                    (UPDATED)
│   └── dashboard/
│       └── edcs-consultant-dashboard/
│           ├── edcs-consultant-dashboard.ts       (TO INTEGRATE)
│           └── edcs-consultant-dashboard.html     (TO ADD TOGGLE)
```

---

## 10. Configuration Constants

**Default Layer Colors**:
```typescript
- Water Supply: #2563eb (Blue)
- Sewerage: #8b5cf6 (Purple)
- Support Facility: #f59e0b (Amber)
- Custom: #64748b (Gray)
```

**Asset Type Mappings** (in AssetLayerService.ASSET_ID_MAP):
```typescript
Water Supply: 6 sub-types
Sewerage: 4 sub-types
Support Facility: 3 sub-types
Custom: 1 sub-type
```

---

## 11. Usage Examples

### Load and Display Assets
```typescript
// In component initialization
ngOnInit() {
  this.assetLayerService.loadAssetsForMap().subscribe(assetsByCategory => {
    console.log('Assets by category:', assetsByCategory);
  });
}
```

### Generate Asset ID and Create
```typescript
const newAssetId = this.assetLayerService.generateAssetId('Water Supply', 'stand-post');
const newAsset = {
  id: newAssetId,  // WS-SP-001
  title: 'Main Stand Post',
  category: 'Water Supply',
  assetType: 'stand-post',
  feature: geoJSONFeature,
  attributes: { /* ... */ },
};
```

### Generate PDF with Full Report
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
    design_flow: 100,
    pressure_class: 10,
  },
  maintenanceHistory: [
    {
      id: 'M001',
      date: '2025-03-15',
      type: 'preventive',
      description: 'Routine maintenance and inspection',
      cost: 5000,
      status: 'completed',
    },
  ],
};

this.pdfReportService.generateAssetReport(asset, 'stand-post-001-report.pdf');
```

---

## 12. Notes & Future Enhancements

### Completed ✅
1. Asset layer system with GeoJSON support
2. Multi-category layer organization
3. Asset ID series generation with QR-ready format
4. PDF reporting with attributes and maintenance history
5. PRMSC logo integration
6. Layer toggle UI component
7. MapLibre integration service

### Recommended Future Work
1. QR code generation and scanning
2. Asset photo gallery in popup
3. Real-time asset status updates via WebSockets
4. Asset movement tracking and history
5. Bulk import/export of assets
6. Advanced filtering and search
7. Asset health predictions using ML
8. Integration with IoT sensors for real-time monitoring

---

**Implementation Date**: October 26, 2025
**Status**: Complete - Ready for Integration Testing
