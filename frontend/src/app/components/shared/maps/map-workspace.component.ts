import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as maplibregl from 'maplibre-gl';
import {
  GeoJSONSource,
  LngLatBounds,
  LngLatBoundsLike,
  LngLatLike,
  Map as MapLibreMap,
  MapLayerMouseEvent,
  NavigationControl,
} from 'maplibre-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { Feature, FeatureCollection, Geometry } from 'geojson';
import { BehaviorSubject } from 'rxjs';
import {
  BASEMAPS,
  BasemapId,
  ParsedCoordinate,
  emptyFeatureCollection,
  MAP_WORKSPACE_STYLE,
  parseCoordinateQuery,
  toggleBasemap,
} from './maplibre-helpers';

export type DrawMode = 'polyline' | 'polygon' | 'marker';
export type CircleLayer = any;
export type FillLayer = any;
export type LineLayer = any;
export type GeoJSONSourceRaw = any;
export type LayerSpecification = any;

export interface AssetMetadata {
  id: string;
  title: string;
  category: string;
  commissioningDate: string | null;
  nextMaintenanceDate: string | null;
  expectedLifespanYears: number | null;
  operationalData?: OperationalSnapshot | null;
}

export interface MapWorkspacePlan extends AssetMetadata {
  feature: Feature | null;
  attributes?: Record<string, unknown>;
}

export interface OperationalSnapshot {
  averageDailyRunHours?: number | null;
  availabilityPercent?: number | null;
  lastInspectionDate?: string | null;
  operationalNotes?: string | null;
  bulkMeterReadingProduction?: number | null;
  bulkMeterAttachment?: string | null;
  energyConsumptionSubMeter?: number | null;
  unitsImportKwh?: number | null;
  unitsExportKwh?: number | null;
  powerSource?: string | null;
  vfdProductionKw?: number | null;
  inverterProductionKw?: number | null;
}

const PLAN_COLORS: Record<'line' | 'point' | 'area', string> = {
  line: '#2563eb',
  point: '#f97316',
  area: '#7c3aed',
};

const HIGHLIGHT_COLOR = '#facc15';
const DEFAULT_SUMMARY = 'Draw the infrastructure footprint on the map.';
const PROJECT_PLAN_LAYER_IDS = [
  'workspace-plan-line-layer',
  'workspace-plan-area-fill',
  'workspace-plan-area-outline',
  'workspace-plan-point-layer',
];

@Component({
  selector: 'app-map-workspace',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './map-workspace.component.html',
  styleUrl: './map-workspace.component.scss',
})
export class MapWorkspaceComponent implements AfterViewInit, OnDestroy {
  readonly basemaps = BASEMAPS;

  searchQuery = '';
  searchError: string | null = null;
  searchResultMessage: string | null = null;
  selectedBasemap: BasemapId = 'osm';
  controlsVisible = true;

  @Input()
  set plans(value: MapWorkspacePlan[] | null | undefined) {
    this.storedPlans = (value ?? []).slice();
    this.queueRenderPlans();
  }

  @Input()
  set highlightedPlanId(value: string | null) {
    this.storedHighlightedId = value ?? null;
    this.queueRenderHighlight();
  }

  @Input()
  set draftFeature(value: Feature | null) {
    const next = cloneFeature(value);
    if (featuresEqual(next, this.storedDraft)) {
      return;
    }
    this.storedDraft = next;
    this.queueRenderDraft();
  }

  @Input()
  set showControls(value: boolean | null | undefined) {
    this.controlsVisible = value !== false;
  }

  @Input()
  set basemap(value: BasemapId) {
    const next = (value ?? 'osm') as BasemapId;
    if (next === this.desiredBasemap && next === this.basemap$.value) {
      this.selectedBasemap = next;
      return;
    }
    this.selectedBasemap = next;
    this.desiredBasemap = next;
    this.basemap$.next(next);
    this.queueBasemapUpdate();
  }

  @Input()
  set showProjectPlans(value: boolean | null | undefined) {
    const visible = value !== false;
    if (visible === this.projectPlansVisible) {
      return;
    }
    this.projectPlansVisible = visible;
    this.queuePlanVisibility();
  }

  @Output() readonly draftFeatureChange = new EventEmitter<Feature | null>();
  @Output() readonly planFocused = new EventEmitter<string | null>();
  @Output() readonly assetSelected = new EventEmitter<AssetMetadata>();
  @Output() readonly draftSummaryChange = new EventEmitter<string>();
  @Output() readonly mapReady = new EventEmitter<MapLibreMap>();

  @ViewChild('mapContainer', { static: true }) mapContainer?: ElementRef<HTMLDivElement>;

  private readonly destroyRef = inject(DestroyRef);
  private readonly basemap$ = new BehaviorSubject<BasemapId>('osm');

  private map: MapLibreMap | null = null;
  private draw: MapboxDraw | null = null;
  private popup: maplibregl.Popup | null = null;
  private searchMarker: maplibregl.Marker | null = null;
  private hoveredPlanId: string | null = null;
  private geolocateControl: maplibregl.GeolocateControl | null = null;

  private storedPlans: MapWorkspacePlan[] = [];
  private storedHighlightedId: string | null = null;
  private storedDraft: Feature | null = null;

  private pendingDrawMode: DrawMode | null = null;
  private pendingInstruction: string | null = null;
  private pendingLocateRequest = false;

  private projectPlansVisible = true;
  private desiredBasemap: BasemapId = 'osm';
  private currentBasemap: BasemapId = 'osm';
  private pendingSearchTarget: ParsedCoordinate | null = null;

  private hasInitialFit = false;
  private hasUserPanned = false;

  private syncingDrawState = false;
  private planRenderQueued = false;
  private highlightRenderQueued = false;
  private draftRenderQueued = false;
  private basemapQueued = false;
  private planVisibilityQueued = false;

  private readonly layerHandlers = new Map<
    string,
    {
      enter: () => void;
      leave: () => void;
      move: (event: MapLayerMouseEvent) => void;
      click: (event: MapLayerMouseEvent) => void;
    }
  >();

  private readonly planLineSourceId = 'workspace-plan-lines';
  private readonly planAreaSourceId = 'workspace-plan-areas';
  private readonly planPointSourceId = 'workspace-plan-points';
  private readonly planLineLayerId = 'workspace-plan-line-layer';
  private readonly planAreaFillLayerId = 'workspace-plan-area-fill';
  private readonly planAreaOutlineLayerId = 'workspace-plan-area-outline';
  private readonly planPointLayerId = 'workspace-plan-point-layer';
  private readonly highlightSourceId = 'workspace-highlight';
  private readonly highlightLineLayerId = 'workspace-highlight-line';
  private readonly highlightFillLayerId = 'workspace-highlight-fill';
  private readonly highlightPointLayerId = 'workspace-highlight-point';
  private readonly draftSourceId = 'workspace-draft';
  private readonly draftLineLayerId = 'workspace-draft-line';
  private readonly draftFillLayerId = 'workspace-draft-fill';
  private readonly draftPointLayerId = 'workspace-draft-point';

  constructor() {
    this.destroyRef.onDestroy(() => this.destroyMap());
  }

  ngAfterViewInit(): void {
    const container = this.mapContainer?.nativeElement;
    if (!container) {
      return;
    }

    const map = new maplibregl.Map({
      container,
      style: MAP_WORKSPACE_STYLE,
      center: [74.3587, 31.5204],
      zoom: 7,
      attributionControl: true,
      preserveDrawingBuffer: true,
      cooperativeGestures: true,
    });

    this.popup = new maplibregl.Popup({ closeButton: true, closeOnMove: false });

    map.on('load', () => this.onMapLoad(map));
    map.on('style.load', () => this.onStyleReload());
    map.on('movestart', () => {
      this.hasUserPanned = true;
    });

    this.map = map;
  }

  ngOnDestroy(): void {
    this.destroyMap();
  }

  beginDrawing(mode: DrawMode, options?: { summary?: string }): void {
    const summary = options?.summary ?? this.instructionForMode(mode);

    if (!this.draw) {
      this.pendingDrawMode = mode;
      this.pendingInstruction = summary;
      this.updateSummary(summary);
      return;
    }

    const targetMode = this.mapboxModeFor(mode);
    if (!targetMode) {
      this.updateSummary('Drawing mode is unavailable.');
      return;
    }

    this.draw.changeMode(targetMode);
    this.updateSummary(summary);
    this.pendingDrawMode = null;
    this.pendingInstruction = null;
  }

  clearDraft(): void {
    if (this.draw) {
      this.draw.deleteAll();
    }
    this.storedDraft = null;
    this.queueRenderDraft();
    this.emitDraftChange(null);
    this.updateSummary(DEFAULT_SUMMARY);
  }

  focusOnPlan(planId: string | null): void {
    if (!this.map || !planId) {
      return;
    }

    const plan = this.storedPlans.find((item) => item.id === planId && item.feature);
    if (!plan?.feature) {
      return;
    }

    const bounds = this.calculateBounds(featureToCollection(plan.feature));
    if (!bounds) {
      return;
    }

    this.map.fitBounds(bounds, { padding: 36 });
  }

  focusOnFeature(feature: Feature | null): void {
    if (!this.map || !feature) {
      return;
    }

    const bounds = this.calculateBounds(featureToCollection(feature));
    if (!bounds) {
      return;
    }

    this.map.fitBounds(bounds, { padding: 48, maxZoom: 18 });
  }

  setBasemap(basemap: BasemapId): void {
    if (this.basemap$.value === basemap && this.currentBasemap === basemap) {
      this.selectedBasemap = basemap;
      return;
    }
    this.selectedBasemap = basemap;
    this.desiredBasemap = basemap;
    this.basemap$.next(basemap);
    this.queueBasemapUpdate();
  }

  fitToPlans(): void {
    this.fitToPlansInternal();
  }

  toggleProjectPlans(show: boolean): void {
    this.projectPlansVisible = show;
    this.queuePlanVisibility();
  }

  submitCoordinateSearch(): void {
    this.searchCoordinates(this.searchQuery);
  }

  clearSearchFeedback(): void {
    this.searchError = null;
    this.searchResultMessage = null;
  }

  searchCoordinates(query: string): { success: boolean; message?: string; error?: string } {
    const value = (query ?? '').trim();
    this.searchQuery = value;

    if (!value) {
      const error = 'Enter coordinates in "lat lon" or "lon lat" format.';
      this.searchError = error;
      this.searchResultMessage = null;
      return { success: false, error };
    }

    const parsed = parseCoordinateQuery(value);
    if (!parsed) {
      const error = 'Enter coordinates in "lat lon" or "lon lat" format.';
      this.searchError = error;
      this.searchResultMessage = null;
      return { success: false, error };
    }

    if (Math.abs(parsed.lat) > 90 || Math.abs(parsed.lng) > 180) {
      const error = 'Latitude must be between -90 and 90; longitude between -180 and 180.';
      this.searchError = error;
      this.searchResultMessage = null;
      return { success: false, error };
    }

    this.pendingSearchTarget = parsed;
    this.searchError = null;
    this.searchResultMessage = this.map?.isStyleLoaded()
      ? `Centering on ${parsed.lat.toFixed(5)}, ${parsed.lng.toFixed(5)}`
      : 'Centering map...';
    this.tryApplySearchTarget();
    return { success: true, message: this.searchResultMessage ?? 'Centering map...' };
  }

  locateUser(): boolean {
    if (this.geolocateControl) {
      try {
        this.geolocateControl.trigger();
        this.searchError = null;
        this.searchResultMessage = 'Centering on your location...';
        this.pendingLocateRequest = false;
        return true;
      } catch {
        return false;
      }
    }

    this.pendingLocateRequest = true;
    this.searchError = null;
    this.searchResultMessage = 'Preparing location services...';
    return true;
  }

  private onMapLoad(map: MapLibreMap): void {
    this.addDefaultControls(map);
    this.ensureSources(map);
    this.ensureLayers(map);
    this.setupDrawing(map);
    this.bindPlanInteractions(map);
    this.renderAll();
    this.applyPlanVisibility();
    this.applyBasemap();
    this.tryApplySearchTarget();
    this.flushPendingLocateRequest();
    this.fitToPlansInternal();
    this.mapReady.emit(map);
    this.flushPendingDrawing();
  }

  private onStyleReload(): void {
    const map = this.map;
    if (!map?.isStyleLoaded()) {
      return;
    }

    this.ensureSources(map);
    this.ensureLayers(map);
    this.bindPlanInteractions(map);
    this.renderAll();
    this.applyPlanVisibility();
    this.applyBasemap();
    this.tryApplySearchTarget();
    this.flushPendingLocateRequest();
  }

  private renderAll(): void {
    this.renderPlans();
    this.renderHighlight();
    this.syncDraftLayer();
  }

  private addDefaultControls(map: MapLibreMap): void {
    map.addControl(new NavigationControl({ visualizePitch: true }), 'top-right');

    const ScaleControl = (maplibregl as any).ScaleControl;
    if (typeof ScaleControl === 'function') {
      map.addControl(new ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left');
    }

    const FullscreenControl = (maplibregl as any).FullscreenControl;
    if (typeof FullscreenControl === 'function') {
      map.addControl(new FullscreenControl(), 'top-right');
    }

    const GeolocateControl = (maplibregl as any).GeolocateControl;
    if (typeof GeolocateControl === 'function') {
      const geoControl = new GeolocateControl({
        trackUserLocation: true,
        showUserHeading: true,
        positionOptions: { enableHighAccuracy: true },
      });
      this.geolocateControl = geoControl;
      map.addControl(geoControl, 'top-left');
    } else {
      this.geolocateControl = null;
    }
  }

  private ensureSources(map: MapLibreMap): void {
    const ensure = (id: string) => {
      if (map.getSource(id)) {
        return;
      }
      map.addSource(id, this.buildGeoJsonSource(emptyFeatureCollection()));
    };

    [
      this.planLineSourceId,
      this.planAreaSourceId,
      this.planPointSourceId,
      this.highlightSourceId,
      this.draftSourceId,
    ].forEach(ensure);
  }

  private ensureLayers(map: MapLibreMap): void {
    const ensureLayer = (layer: LayerSpecification) => {
      if (map.getLayer(layer.id)) {
        return;
      }
      map.addLayer(layer);
    };

    ensureLayer({
      id: this.planLineLayerId,
      type: 'line',
      source: this.planLineSourceId,
      paint: {
        'line-color': PLAN_COLORS.line,
        'line-width': 3,
        'line-opacity': 0.9,
      },
    } as LineLayer);

    ensureLayer({
      id: this.planAreaFillLayerId,
      type: 'fill',
      source: this.planAreaSourceId,
      paint: {
        'fill-color': PLAN_COLORS.area,
        'fill-opacity': 0.22,
      },
    } as FillLayer);

    ensureLayer({
      id: this.planAreaOutlineLayerId,
      type: 'line',
      source: this.planAreaSourceId,
      paint: {
        'line-color': PLAN_COLORS.area,
        'line-width': 2,
        'line-opacity': 0.85,
      },
    } as LineLayer);

    ensureLayer({
      id: this.planPointLayerId,
      type: 'circle',
      source: this.planPointSourceId,
      paint: {
        'circle-radius': 12,
        'circle-color': PLAN_COLORS.point,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.9,
      },
    } as CircleLayer);

    ensureLayer({
      id: this.highlightFillLayerId,
      type: 'fill',
      source: this.highlightSourceId,
      paint: {
        'fill-color': HIGHLIGHT_COLOR,
        'fill-opacity': 0.18,
      },
    } as FillLayer);

    ensureLayer({
      id: this.highlightLineLayerId,
      type: 'line',
      source: this.highlightSourceId,
      paint: {
        'line-color': HIGHLIGHT_COLOR,
        'line-width': 4,
        'line-dasharray': [6, 4],
      },
    } as LineLayer);

    ensureLayer({
      id: this.highlightPointLayerId,
      type: 'circle',
      source: this.highlightSourceId,
      paint: {
        'circle-radius': 10,
        'circle-color': HIGHLIGHT_COLOR,
        'circle-opacity': 0.75,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2,
      },
    } as CircleLayer);

    ensureLayer({
      id: this.draftFillLayerId,
      type: 'fill',
      source: this.draftSourceId,
      paint: {
        'fill-color': '#0ea5e9',
        'fill-opacity': 0.12,
      },
    } as FillLayer);

    ensureLayer({
      id: this.draftLineLayerId,
      type: 'line',
      source: this.draftSourceId,
      paint: {
        'line-color': '#0ea5e9',
        'line-width': 2,
        'line-dasharray': [2, 2],
      },
    } as LineLayer);

    ensureLayer({
      id: this.draftPointLayerId,
      type: 'circle',
      source: this.draftSourceId,
      paint: {
        'circle-radius': 6,
        'circle-color': '#0ea5e9',
        'circle-stroke-width': 1,
        'circle-stroke-color': '#ffffff',
      },
    } as CircleLayer);
  }

  private setupDrawing(map: MapLibreMap): void {
    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
      defaultMode: 'simple_select',
    });

    map.addControl(draw, 'top-right');
    this.draw = draw;

    const updateFromDraw = () => {
      if (this.syncingDrawState) {
        return;
      }
      const all = draw.getAll();
      const feature = all.features.length ? cloneFeature(all.features[0]) : null;
      this.applyDraftFromDraw(feature);
    };

    (map as any).on('draw.create', updateFromDraw);
    (map as any).on('draw.update', updateFromDraw);
    (map as any).on('draw.delete', updateFromDraw);

    this.flushPendingDrawing();
    this.queueRenderDraft();
  }

  private bindPlanInteractions(map: MapLibreMap): void {
    const interactiveLayers = [this.planLineLayerId, this.planAreaFillLayerId, this.planPointLayerId];

    interactiveLayers.forEach((layerId) => {
      if (!map.getLayer(layerId)) {
        return;
      }

      const existing = this.layerHandlers.get(layerId);
      if (existing) {
        map.off('mouseenter', layerId, existing.enter);
        map.off('mouseleave', layerId, existing.leave);
        map.off('mousemove', layerId, existing.move);
        map.off('click', layerId, existing.click);
      }

      const enter = () => {
        map.getCanvas().style.cursor = 'pointer';
      };

      const leave = () => {
        this.hoveredPlanId = null;
        this.hidePopup();
        map.getCanvas().style.cursor = '';
      };

      const click = (event: MapLayerMouseEvent) => {
        const planId = event.features?.[0]?.properties?.['__planId'];
        if (typeof planId === 'string') {
          const plan = this.storedPlans.find((p) => p.id === planId);
          if (plan) {
            this.hoveredPlanId = planId;
            this.showAssetPopup(event.lngLat, plan);
            this.planFocused.emit(planId);
            this.assetSelected.emit(plan);
          }
        }
      };

      const move = (event: MapLayerMouseEvent) => {
        const planId = event.features?.[0]?.properties?.['__planId'];
        if (typeof planId !== 'string') {
          return;
        }
        const plan = this.storedPlans.find((p) => p.id === planId);
        if (!plan) {
          return;
        }
        if (this.hoveredPlanId === planId) {
          this.popup?.setLngLat(event.lngLat);
          return;
        }
        this.hoveredPlanId = planId;
        this.showAssetPopup(event.lngLat, plan);
      };

      map.on('mouseenter', layerId, enter);
      map.on('mouseleave', layerId, leave);
      map.on('mousemove', layerId, move);
      map.on('click', layerId, click);

      this.layerHandlers.set(layerId, { enter, leave, move, click });
    });
  }

  private renderPlans(): void {
    const map = this.map;
    if (!map?.isStyleLoaded()) {
      return;
    }

    const lineFeatures: Feature[] = [];
    const areaFeatures: Feature[] = [];
    const pointFeatures: Feature[] = [];

    this.storedPlans.forEach((plan) => {
      if (!plan?.feature) {
        return;
      }

      const feature = decoratePlanFeature(plan);
      const geometryType = feature.geometry?.type ?? '';

      if (geometryType.includes('Line')) {
        lineFeatures.push(feature);
        return;
      }

      if (geometryType.includes('Polygon')) {
        areaFeatures.push(feature);
        return;
      }

      if (geometryType.includes('Point')) {
        pointFeatures.push(feature);
        return;
      }

      lineFeatures.push(feature);
    });

    this.setSourceData(this.planLineSourceId, toCollection(lineFeatures));
    this.setSourceData(this.planAreaSourceId, toCollection(areaFeatures));
    this.setSourceData(this.planPointSourceId, toCollection(pointFeatures));

    if (!this.hasInitialFit && !this.hasUserPanned) {
      this.fitToPlansInternal();
    }
  }

  private renderHighlight(): void {
    const map = this.map;
    if (!map?.isStyleLoaded()) {
      return;
    }

    const plan = this.storedPlans.find((item) => item.id === this.storedHighlightedId && item.feature);
    if (!plan?.feature) {
      this.setSourceData(this.highlightSourceId, emptyFeatureCollection());
      return;
    }

    const highlightCollection = featureToCollection(plan.feature);
    this.setSourceData(this.highlightSourceId, highlightCollection);

    const bounds = this.calculateBounds(highlightCollection);
    if (bounds) {
      this.map?.fitBounds(bounds, { padding: 28 });
    }
  }

  private syncDraftLayer(): void {
    const map = this.map;
    if (!map?.isStyleLoaded()) {
      return;
    }

    const collection = this.storedDraft ? featureToCollection(this.storedDraft) : emptyFeatureCollection();
    this.setSourceData(this.draftSourceId, collection);
    this.syncDrawControl(collection);

    if (this.storedDraft) {
      this.updateSummary(`Draft geometry ready (${this.storedDraft.geometry?.type ?? 'Unknown'})`);
      const bounds = this.calculateBounds(collection);
      if (bounds) {
        this.map?.fitBounds(bounds, { padding: 32 });
      }
      return;
    }

    this.updateSummary(DEFAULT_SUMMARY);
  }

  private syncDrawControl(collection: FeatureCollection): void {
    if (!this.draw) {
      return;
    }

    const incomingJson = JSON.stringify(collection);
    const currentJson = JSON.stringify(this.draw.getAll());

    if (incomingJson === currentJson) {
      return;
    }

    this.syncingDrawState = true;
    try {
      if (!collection.features.length) {
        this.draw.deleteAll();
        return;
      }
      this.draw.set(collection as any);
    } finally {
      this.syncingDrawState = false;
    }
  }

  private applyBasemap(): void {
    const map = this.map;
    if (!map?.isStyleLoaded()) {
      return;
    }

    const targetBasemap = this.basemap$.value;
    if (targetBasemap === this.currentBasemap) {
      return;
    }

    toggleBasemap(map, targetBasemap);
    this.currentBasemap = targetBasemap;
    this.selectedBasemap = targetBasemap;
  }

  private applyPlanVisibility(): void {
    const map = this.map;
    if (!map?.isStyleLoaded()) {
      return;
    }

    PROJECT_PLAN_LAYER_IDS.forEach((layerId) => {
      if (!map.getLayer(layerId)) {
        return;
      }
      map.setLayoutProperty(layerId, 'visibility', this.projectPlansVisible ? 'visible' : 'none');
    });
  }

  private fitToPlansInternal(): void {
    const map = this.map;
    if (!map?.isStyleLoaded()) {
      return;
    }

    const allFeatures = this.storedPlans
      .map((plan) => plan.feature)
      .filter((feature): feature is Feature => Boolean(feature));

    if (!allFeatures.length) {
      return;
    }

    const collection = toCollection(allFeatures);
    const bounds = this.calculateBounds(collection);
    if (!bounds) {
      return;
    }

    map.fitBounds(bounds, { padding: 40 });
    this.hasInitialFit = true;
  }

  private setSourceData(sourceId: string, data: FeatureCollection): void {
    const source = this.map?.getSource(sourceId) as GeoJSONSource | undefined;
    source?.setData(data);
  }

  private buildGeoJsonSource(data: FeatureCollection): GeoJSONSourceRaw {
    return {
      type: 'geojson',
      data,
    };
  }

  private applyDraftFromDraw(feature: Feature | null): void {
    const draft = feature ? cloneFeature(feature) : null;
    this.storedDraft = draft;
    this.queueRenderDraft();
    this.emitDraftChange(draft);
  }

  private emitDraftChange(feature: Feature | null): void {
    this.draftFeatureChange.emit(feature ? cloneFeature(feature) : null);
  }

  private updateSummary(message: string): void {
    this.draftSummaryChange.emit(message);
  }

  private flushPendingDrawing(): void {
    if (!this.pendingDrawMode) {
      if (this.pendingInstruction) {
        this.updateSummary(this.pendingInstruction);
      }
      return;
    }

    this.beginDrawing(this.pendingDrawMode, {
      summary: this.pendingInstruction ?? this.instructionForMode(this.pendingDrawMode),
    });
  }

  private mapboxModeFor(mode: DrawMode): string | null {
    if (mode === 'polyline') {
      return 'draw_line_string';
    }
    if (mode === 'polygon') {
      return 'draw_polygon';
    }
    if (mode === 'marker') {
      return 'draw_point';
    }
    return null;
  }

  private instructionForMode(mode: DrawMode): string {
    if (mode === 'polyline') {
      return 'Drawing alignment: click each bend along the route and double-click to finish.';
    }
    if (mode === 'polygon') {
      return 'Outlining footprint: click around the perimeter and close the shape on the starting point.';
    }
    return 'Dropping a point asset: click on the map to position the infrastructure.';
  }

  private calculateBounds(collection: FeatureCollection): LngLatBoundsLike | null {
    const features = collection.features;
    if (!features.length) {
      return null;
    }

    const bounds = new LngLatBounds();
    features.forEach((feature) => this.extendBounds(bounds, feature.geometry));
    return bounds.isEmpty() ? null : bounds;
  }

  private extendBounds(bounds: LngLatBounds, geometry: Geometry | null | undefined): void {
    if (!geometry) {
      return;
    }

    if (geometry.type === 'Point') {
      bounds.extend(geometry.coordinates as LngLatLike);
      return;
    }

    if (geometry.type === 'MultiPoint' || geometry.type === 'LineString') {
      (geometry.coordinates as LngLatLike[]).forEach((coord) => bounds.extend(coord));
      return;
    }

    if (geometry.type === 'Polygon' || geometry.type === 'MultiLineString') {
      (geometry.coordinates as LngLatLike[][]).forEach((ring) => ring.forEach((coord) => bounds.extend(coord)));
      return;
    }

    if (geometry.type === 'MultiPolygon') {
      (geometry.coordinates as LngLatLike[][][]).forEach((polygon) =>
        polygon.forEach((ring) => ring.forEach((coord) => bounds.extend(coord))),
      );
      return;
    }

    if (geometry.type === 'GeometryCollection') {
      geometry.geometries.forEach((child) => this.extendBounds(bounds, child));
    }
  }

  private queueRenderPlans(): void {
    if (this.planRenderQueued) {
      return;
    }
    this.planRenderQueued = true;
    queueMicrotask(() => {
      this.planRenderQueued = false;
      this.renderPlans();
    });
  }

  private queueRenderHighlight(): void {
    if (this.highlightRenderQueued) {
      return;
    }
    this.highlightRenderQueued = true;
    queueMicrotask(() => {
      this.highlightRenderQueued = false;
      this.renderHighlight();
    });
  }

  private queueRenderDraft(): void {
    if (this.draftRenderQueued) {
      return;
    }
    this.draftRenderQueued = true;
    queueMicrotask(() => {
      this.draftRenderQueued = false;
      this.syncDraftLayer();
    });
  }

  private queueBasemapUpdate(): void {
    if (this.basemapQueued) {
      return;
    }
    this.basemapQueued = true;
    queueMicrotask(() => {
      this.basemapQueued = false;
      this.applyBasemap();
    });
  }

  private queuePlanVisibility(): void {
    if (this.planVisibilityQueued) {
      return;
    }
    this.planVisibilityQueued = true;
    queueMicrotask(() => {
      this.planVisibilityQueued = false;
      this.applyPlanVisibility();
    });
  }

  private tryApplySearchTarget(): void {
    const map = this.map;
    const target = this.pendingSearchTarget;
    if (!target || !map?.isStyleLoaded()) {
      return;
    }

    this.pendingSearchTarget = null;
    this.centerOnCoordinate(target);
  }

  private centerOnCoordinate(target: ParsedCoordinate): void {
    const map = this.map;
    if (!map) {
      this.pendingSearchTarget = target;
      return;
    }

    const zoom = Math.max(map.getZoom(), 13);
    map.flyTo({ center: [target.lng, target.lat], zoom, essential: true });

    const marker = this.ensureSearchMarker(map);
    marker.setLngLat([target.lng, target.lat]).addTo(map);

    const latText = target.lat.toFixed(5);
    const lngText = target.lng.toFixed(5);
    this.searchError = null;
    this.searchResultMessage = `Centered on ${latText}, ${lngText}`;
  }

  private flushPendingLocateRequest(): void {
    if (!this.pendingLocateRequest || !this.geolocateControl) {
      return;
    }

    try {
      this.geolocateControl.trigger();
      this.searchError = null;
      this.searchResultMessage = 'Centering on your location...';
    } catch {
      /* ignore */
    }

    this.pendingLocateRequest = false;
  }

  private ensureSearchMarker(map: MapLibreMap): maplibregl.Marker {
    if (this.searchMarker) {
      return this.searchMarker;
    }

    this.searchMarker = new maplibregl.Marker({ color: '#ef4444' });
    return this.searchMarker;
  }

  private hidePopup(): void {
    this.popup?.remove();
    this.hoveredPlanId = null;
  }

  private showAssetPopup(lngLat: maplibregl.LngLatLike, asset: AssetMetadata & { feature?: any; attributes?: any }): void {
    if (!this.popup || !lngLat) {
      return;
    }

    // Format metadata
    const commissioningText = asset.commissioningDate
      ? new Date(asset.commissioningDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
      : 'Not Set';
    const maintenanceText = asset.nextMaintenanceDate
      ? new Date(asset.nextMaintenanceDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
      : 'Not Scheduled';
    const lifespanText = asset.expectedLifespanYears ? `${asset.expectedLifespanYears} years` : 'Not Set';

    // Calculate asset age and health status
    let assetAge = 'N/A';
    let healthStatus = 'Unknown';
    let healthColor = '#9ca3af';

    if (asset.commissioningDate) {
      const commDate = new Date(asset.commissioningDate);
      const ageMs = Date.now() - commDate.getTime();
      const ageYears = Math.floor(ageMs / (365.25 * 24 * 60 * 60 * 1000));
      assetAge = `${ageYears} year${ageYears !== 1 ? 's' : ''}`;

      if (asset.expectedLifespanYears) {
        const remaining = asset.expectedLifespanYears - ageYears;
        if (remaining > asset.expectedLifespanYears * 0.3) {
          healthStatus = 'Good';
          healthColor = '#10b981';
        } else if (remaining > 0) {
          healthStatus = 'Needs Monitoring';
          healthColor = '#f59e0b';
        } else {
          healthStatus = 'Critical';
          healthColor = '#ef4444';
        }
      }
    }

    // Get icon URL based on category
    const iconUrl = this.getAssetIconUrl(asset.category);
    const iconHtml = iconUrl ? `<img src="${iconUrl}" alt="${asset.category}" style="width: 40px; height: 40px; margin-right: 10px; border-radius: 4px;" />` : '';

    const attrs = (asset.attributes && typeof asset.attributes === 'object' ? asset.attributes : {}) as Record<string, unknown>;
    const { html: technicalFieldsHtml, usedKeys } = this.buildAdditionalFieldsHtml(asset.category, attrs);
    ['title', 'status', 'priority', 'tehsil', 'strokeColor', 'layerName', 'assetValue', 'assetLabel', 'assetType', 'planId', 'operationalData'].forEach((key) =>
      usedKeys.add(key),
    );
    const generalFieldsHtml = this.buildGeneralAttributeHtml(attrs, usedKeys);
    const operationalSnapshot = this.extractOperationalSnapshot(asset.operationalData, attrs);
    const operationalHtml = this.buildOperationalSummaryHtml(operationalSnapshot);

    const popupContent = `
      <div class="asset-popup-enhanced" style="
        min-width: 320px;
        background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05);
        overflow: hidden;
      ">
        <!-- Header with icon -->
        <div style="
          background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
          padding: 12px;
          display: flex;
          align-items: center;
          color: white;
        ">
          ${iconHtml}
          <div>
            <h3 style="margin: 0; font-size: 15px; font-weight: 700;">${this.escapeHtml(asset.title)}</h3>
            <p style="margin: 2px 0 0 0; font-size: 12px; opacity: 0.9;">${this.escapeHtml(asset.category)}</p>
          </div>
        </div>

        <!-- Health Status Badge -->
        <div style="
          background: ${healthColor}15;
          border-left: 4px solid ${healthColor};
          padding: 8px 12px;
          margin: 8px;
          border-radius: 4px;
        ">
          <span style="
            font-size: 11px;
            font-weight: 600;
            color: ${healthColor};
            text-transform: uppercase;
            letter-spacing: 0.5px;
          ">Health Status: ${healthStatus}</span>
        </div>

        <!-- Main Content -->
        <div style="padding: 12px; border-top: 1px solid #e2e8f0;">
          <!-- Core Metadata Grid -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
            <!-- Commissioned -->
            <div style="background: white; padding: 8px; border-radius: 4px; border: 1px solid #e2e8f0;">
              <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase;">Commissioned</p>
              <p style="margin: 0; font-size: 13px; font-weight: 500; color: #1e293b;">${commissioningText}</p>
            </div>

            <!-- Asset Age -->
            <div style="background: white; padding: 8px; border-radius: 4px; border: 1px solid #e2e8f0;">
              <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase;">Asset Age</p>
              <p style="margin: 0; font-size: 13px; font-weight: 500; color: #1e293b;">${assetAge}</p>
            </div>

            <!-- Next Maintenance -->
            <div style="background: white; padding: 8px; border-radius: 4px; border: 1px solid #e2e8f0;">
              <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase;">Next Maintenance</p>
              <p style="margin: 0; font-size: 13px; font-weight: 500; color: #1e293b;">${maintenanceText}</p>
            </div>

            <!-- Expected Lifespan -->
            <div style="background: white; padding: 8px; border-radius: 4px; border: 1px solid #e2e8f0;">
              <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase;">Lifespan</p>
              <p style="margin: 0; font-size: 13px; font-weight: 500; color: #1e293b;">${lifespanText}</p>
            </div>
          </div>

          <!-- Asset-specific fields -->
          ${technicalFieldsHtml}

          ${operationalHtml}

          <!-- General requisition context -->
          ${generalFieldsHtml}

          <!-- Footer with ID -->
          <div style="
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid #e2e8f0;
            font-size: 10px;
            color: #94a3b8;
          ">
            <strong>Asset ID:</strong> ${this.escapeHtml(asset.id)}
          </div>
        </div>
      </div>
    `;

    this.popup.setLngLat(lngLat).setHTML(popupContent).addTo(this.map!);
  }

  private extractOperationalSnapshot(
    direct: OperationalSnapshot | null | undefined,
    attributes: Record<string, unknown>,
  ): OperationalSnapshot | null {
    const fallback = (attributes?.['operationalData'] ?? null) as OperationalSnapshot | null;
    const source = (direct ?? fallback) as Record<string, unknown> | null;
    if (!source || typeof source !== 'object') {
      return null;
    }

    const toNumber = (value: unknown, options?: { min?: number; max?: number }): number | null => {
      if (value === null || value === undefined || value === '') {
        return null;
      }
      const numeric = typeof value === 'number' ? value : Number(value);
      if (!Number.isFinite(numeric)) {
        return null;
      }
      if (options?.min !== undefined && numeric < options.min) {
        return null;
      }
      if (options?.max !== undefined && numeric > options.max) {
        return null;
      }
      return numeric;
    };

    const toText = (value: unknown): string | null => {
      if (value === null || value === undefined) {
        return null;
      }
      const text = String(value).trim();
      return text ? text : null;
    };

    const snapshot: OperationalSnapshot = {};
    const runHours = toNumber(source['averageDailyRunHours'], { min: 0 });
    if (runHours !== null) {
      snapshot.averageDailyRunHours = Number(runHours.toFixed(1));
    }

    const availability = toNumber(source['availabilityPercent'], { min: 0, max: 100 });
    if (availability !== null) {
      snapshot.availabilityPercent = Number(availability.toFixed(1));
    }

    const lastInspection = toText(source['lastInspectionDate']);
    if (lastInspection) {
      snapshot.lastInspectionDate = lastInspection;
    }

    const notes = toText(source['operationalNotes']);
    if (notes) {
      snapshot.operationalNotes = notes;
    }

    const bulkMeter = toNumber(source['bulkMeterReadingProduction'], { min: 0 });
    if (bulkMeter !== null) {
      snapshot.bulkMeterReadingProduction = Number(bulkMeter.toFixed(2));
    }

    const bulkAttachment = toText(source['bulkMeterAttachment']);
    if (bulkAttachment) {
      snapshot.bulkMeterAttachment = bulkAttachment;
    }

    const energySub = toNumber(source['energyConsumptionSubMeter'], { min: 0 });
    if (energySub !== null) {
      snapshot.energyConsumptionSubMeter = Number(energySub.toFixed(2));
    }

    const unitsImport = toNumber(source['unitsImportKwh'], { min: 0 });
    if (unitsImport !== null) {
      snapshot.unitsImportKwh = Number(unitsImport.toFixed(2));
    }

    const unitsExport = toNumber(source['unitsExportKwh'], { min: 0 });
    if (unitsExport !== null) {
      snapshot.unitsExportKwh = Number(unitsExport.toFixed(2));
    }

    const powerSource = toText(source['powerSource']);
    if (powerSource) {
      snapshot.powerSource = powerSource;
    }

    const vfd = toNumber(source['vfdProductionKw'], { min: 0 });
    if (vfd !== null) {
      snapshot.vfdProductionKw = Number(vfd.toFixed(2));
    }

    const inverter = toNumber(source['inverterProductionKw'], { min: 0 });
    if (inverter !== null) {
      snapshot.inverterProductionKw = Number(inverter.toFixed(2));
    }

    return Object.keys(snapshot).length ? snapshot : null;
  }

  private buildOperationalSummaryHtml(snapshot: OperationalSnapshot | null): string {
    if (!snapshot) {
      return '';
    }

    const fieldConfig: Array<{
      key: keyof OperationalSnapshot;
      label: string;
      formatter?: (value: unknown) => string;
    }> = [
      { key: 'averageDailyRunHours', label: 'Average Daily Run Hours', formatter: (value) => `${value}` },
      { key: 'availabilityPercent', label: 'Availability', formatter: (value) => `${value}%` },
      {
        key: 'lastInspectionDate',
        label: 'Last Inspection',
        formatter: (value) => {
          const parsed = new Date(String(value));
          if (Number.isNaN(parsed.getTime())) {
            return String(value);
          }
          return parsed.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
        },
      },
      { key: 'bulkMeterReadingProduction', label: 'Bulk Meter Reading (Production)', formatter: (value) => `${value}` },
      { key: 'energyConsumptionSubMeter', label: 'Energy Consumption (Sub Meter)', formatter: (value) => `${value}` },
      { key: 'unitsImportKwh', label: 'Units Import (kWh)', formatter: (value) => `${value}` },
      { key: 'unitsExportKwh', label: 'Units Export (kWh)', formatter: (value) => `${value}` },
      { key: 'vfdProductionKw', label: 'VFD Production (kW)', formatter: (value) => `${value}` },
      { key: 'inverterProductionKw', label: 'Inverter Production (kW)', formatter: (value) => `${value}` },
      { key: 'bulkMeterAttachment', label: 'Bulk Meter Attachment' },
      { key: 'powerSource', label: 'Power Source' },
      { key: 'operationalNotes', label: 'Operational Notes' },
    ];

    const entries: Array<{ label: string; value: string }> = [];

    fieldConfig.forEach(({ key, label, formatter }) => {
      const raw = snapshot[key];
      if (raw === null || raw === undefined || raw === '') {
        return;
      }
      let value: string;
      if (formatter) {
        value = formatter(raw);
      } else {
        value = String(raw);
      }
      if (value.trim()) {
        entries.push({ label, value });
      }
    });

    if (!entries.length) {
      return '';
    }

    const items = entries
      .map(
        (entry) => `
        <div style="background: #f8fafc; padding: 8px; border-radius: 4px; border: 1px solid #e2e8f0;">
          <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase;">${this.escapeHtml(
            entry.label,
          )}</p>
          <p style="margin: 0; font-size: 12px; font-weight: 500; color: #1e293b;">${this.escapeHtml(entry.value)}</p>
        </div>
      `,
      )
      .join('');

    return `
      <div style="margin: 12px 0;">
        <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">
          Operational Snapshot
        </p>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px;">
          ${items}
        </div>
      </div>
    `;
  }

  private getAssetIconUrl(category: string): string {
    // Map categories to Font Awesome CDN icons or similar
    const iconMap: Record<string, string> = {
      'Water Supply': 'https://api.fontawesome.com/downloadFile/eyJ1cmwiOiJodHRwczovL2R1LWdpdC5zdGFnaW5nLmZvbnRhd2Vzb21lLmNvbS9mb250YXdlc29tZS1mcmVlLXdlYi1mb250cy9yZWxlYXNlcy9kb3dubG9hZC9mYS14Ni9mYS13YXRlci54Lmh0bWwiLCJleGlkIjoiMTY4NzM5OTMwNyJ9',
      'Sewerage': 'https://cdn-icons-png.flaticon.com/128/3050/3050159.png',
      'Support Facility': 'https://cdn-icons-png.flaticon.com/128/9356/9356999.png',
      'Pipeline': 'https://cdn-icons-png.flaticon.com/128/3808/3808864.png',
      'Reservoir': 'https://cdn-icons-png.flaticon.com/128/744/744699.png',
      'Pump Station': 'https://cdn-icons-png.flaticon.com/128/3143/3143615.png',
    };

    // Return mapped icon or default water droplet
    return iconMap[category] || 'https://cdn-icons-png.flaticon.com/128/751/751455.png';
  }

  private buildAdditionalFieldsHtml(category: string, attributes: Record<string, unknown>): {
    html: string;
    usedKeys: Set<string>;
  } {
    const fields: Array<[string, string]> = [];
    const usedKeys = new Set<string>();
    const push = (key: string, label: string, formatter?: (value: unknown) => string) => {
      if (!Object.prototype.hasOwnProperty.call(attributes, key)) {
        return;
      }
      const raw = attributes[key];
      if (raw === null || raw === undefined) {
        return;
      }
      const display = formatter ? formatter(raw) : String(raw);
      if (!String(display).trim()) {
        return;
      }
      fields.push([label, display]);
      usedKeys.add(key);
    };

    const normalisedCategory = (category || '').toLowerCase();

    if (normalisedCategory.includes('pipeline') || normalisedCategory.includes('water')) {
      push('pipeMaterial', 'Pipe Material');
      push('pipeDiameter', 'Diameter (mm)');
      push('designFlow', 'Design Flow', (value) => `${value} L/s`);
      push('pressureClass', 'Pressure Class');
      push('lengthMeters', 'Length (m)');
    }

    if (normalisedCategory.includes('sewerage') || normalisedCategory.includes('sewage')) {
      push('pipeMaterial', 'Material');
      push('pipeDiameter', 'Diameter (mm)');
      push('invertLevelStart', 'Invert Start (mRL)');
      push('invertLevelEnd', 'Invert End (mRL)');
      push('lengthMeters', 'Length (m)');
    }

    if (normalisedCategory.includes('reservoir') || normalisedCategory.includes('ohr')) {
      push('storageVolume', 'Storage (m³)');
      push('stagingHeight', 'Height (m)');
      push('tankType', 'Tank Type');
    }

    if (normalisedCategory.includes('stand post')) {
      push('taps', 'Number of Taps');
      push('servedPopulation', 'Population');
    }

    if (!fields.length) {
      return { html: '', usedKeys };
    }

    const html = `
      <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">Technical Specifications</p>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          ${fields
            .map(
              ([label, value]) => `
            <div style="background: #f8fafc; padding: 6px; border-radius: 3px; border-left: 2px solid #2563eb;">
              <p style="margin: 0 0 2px 0; font-size: 10px; font-weight: 600; color: #64748b;">${label}</p>
              <p style="margin: 0; font-size: 12px; font-weight: 500; color: #1e293b;">${this.escapeHtml(String(value))}</p>
            </div>
          `,
            )
            .join('')}
        </div>
      </div>
    `;

    return { html, usedKeys };
  }

  private buildGeneralAttributeHtml(attributes: Record<string, unknown>, excludedKeys: Set<string>): string {
    const entries: Array<[string, string]> = [];
    const seen = new Set<string>();

    const humanise = (key: string): string => {
      if (key.includes(' ')) {
        return key
          .split(' ')
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ');
      }
      const withSpaces = key.replace(/([A-Z])/g, ' $1').replace(/[_-]+/g, ' ');
      return withSpaces
        .split(' ')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
    };

    Object.entries(attributes).forEach(([key, value]) => {
      if (excludedKeys.has(key) || seen.has(key)) {
        return;
      }
      if (value === null || value === undefined) {
        return;
      }
      let display: string;
      if (Array.isArray(value)) {
        display = value.map((item) => (item === null || item === undefined ? '' : String(item))).filter(Boolean).join(', ');
      } else if (value instanceof Date) {
        display = value.toLocaleDateString();
      } else if (typeof value === 'object') {
        const json = JSON.stringify(value);
        display = json && json !== '{}' ? json : '';
      } else {
        display = String(value);
      }

      if (!display || !display.trim()) {
        return;
      }

      entries.push([humanise(key), display]);
      seen.add(key);
    });

    if (!entries.length) {
      return '';
    }

    return `
      <div style="margin-top: 12px;">
        <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">Context</p>
        <dl style="margin: 0; display: grid; grid-template-columns: max-content 1fr; gap: 6px 12px;">
          ${entries
            .map(
              ([label, value]) => `
            <dt style="font-size: 11px; font-weight: 600; color: #64748b;">${this.escapeHtml(label)}</dt>
            <dd style="margin: 0; font-size: 12px; font-weight: 500; color: #1e293b;">${this.escapeHtml(String(value))}</dd>
          `,
            )
            .join('')}
        </dl>
      </div>
    `;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private destroyMap(): void {
    if (this.draw && this.map) {
      this.map.removeControl(this.draw);
    }

    if (this.geolocateControl && this.map) {
      this.map.removeControl(this.geolocateControl);
    }

    if (this.map) {
      this.layerHandlers.forEach((handlers, layerId) => {
        this.map?.off('mouseenter', layerId, handlers.enter);
        this.map?.off('mouseleave', layerId, handlers.leave);
        this.map?.off('mousemove', layerId, handlers.move);
        this.map?.off('click', layerId, handlers.click);
      });
    }

    this.layerHandlers.clear();
    this.draw = null;
    this.popup?.remove();
    this.searchMarker?.remove();
    this.searchMarker = null;
    this.pendingSearchTarget = null;
    this.geolocateControl = null;
    this.pendingLocateRequest = false;
    this.map?.remove();
    this.map = null;
  }
}

function cloneFeature<T extends Feature | null | undefined>(feature: T): T {
  if (!feature) {
    return feature;
  }
  try {
    return JSON.parse(JSON.stringify(feature));
  } catch {
    return feature;
  }
}

function decoratePlanFeature(plan: MapWorkspacePlan): Feature {
  const base = cloneFeature(plan.feature) ?? ({
    type: 'Feature',
    geometry: null,
    properties: {},
  } as unknown as Feature);

  return {
    ...base,
    properties: {
      ...(base.properties ?? {}),
      __planId: plan.id,
      __planTitle: plan.title,
      __planCategory: plan.category,
      __commissioningDate: plan.commissioningDate,
      __nextMaintenanceDate: plan.nextMaintenanceDate,
      __expectedLifespanYears: plan.expectedLifespanYears,
    },
  } as Feature;
}

function toCollection(features: Feature[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: features.map((feature) => cloneFeature(feature) ?? feature),
  };
}

function featureToCollection(feature: Feature): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [cloneFeature(feature) ?? feature],
  };
}

function featuresEqual(a: Feature | null, b: Feature | null): boolean {
  if (!a && !b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}
