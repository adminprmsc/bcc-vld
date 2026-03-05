import { Injectable, inject } from '@angular/core';
import { Map as MapLibreMap, GeoJSONSource, Popup } from 'maplibre-gl';
import { AssetLayerService, AssetLayerConfig } from './asset-layer.service';

/**
 * Map Layer Integration Service
 * Handles integration of asset layers into MapLibre GL maps
 */
@Injectable({
  providedIn: 'root',
})
export class MapLayerIntegrationService {
  private assetLayerService = inject(AssetLayerService);

  private readonly sourceIdPrefix = 'asset-layer-';
  private readonly layerIdPrefix = 'asset-layer-';
  private readonly geometryLayerSuffixes = ['-points', '-lines', '-polygons'];
  private readonly hoverPopups = new WeakMap<MapLibreMap, Popup>();

  /**
   * Initialize all asset layers on the map
   */
  initializeAssetLayers(map: MapLibreMap): void {
    if (!map.isStyleLoaded()) {
      map.once('style.load', () => this.initializeAssetLayers(map));
      return;
    }

    const configs = this.assetLayerService.getLayerConfigs();
    configs.subscribe((layerConfigs) => {
      layerConfigs.forEach((config) => {
        this.addAssetLayerToMap(map, config);
      });
    });

    // Load and render assets
    this.assetLayerService.loadAssetsForMap();
  }

  /**
   * Add a single asset layer to the map
   */
  private addAssetLayerToMap(map: MapLibreMap, config: AssetLayerConfig): void {
    const sourceId = this.sourceIdPrefix + config.id;
    const geoJSON = this.assetLayerService.getAssetsGeoJSON(config.category);

    // Remove existing source/layers if they exist
    this.removeAssetLayerFromMap(map, config.id);

    // Add GeoJSON source
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: geoJSON,
      });
    } else {
      const source = map.getSource(sourceId) as GeoJSONSource;
      source.setData(geoJSON);
    }

    // Add layers for different geometry types
    this.addGeometryLayers(map, sourceId, config);
  }

  /**
   * Add geometry-specific layers (points, lines, polygons)
   */
  private addGeometryLayers(map: MapLibreMap, sourceId: string, config: AssetLayerConfig): void {
    // Point layer
    const pointLayerId = this.layerIdPrefix + config.id + '-points';
    if (!map.getLayer(pointLayerId)) {
      const pointStyle = this.assetLayerService.getMapLibreLayerStyle(config.id, sourceId, 'point');
      if (pointStyle) {
        map.addLayer({
          ...pointStyle,
          id: pointLayerId,
          filter: ['==', '$type', 'Point'],
        });
        this.registerHoverHandlers(map, pointLayerId, config);
        map.on('click', pointLayerId, (e) => this.handleAssetClick(e));
      }
    }

    // Line layer
    const lineLayerId = this.layerIdPrefix + config.id + '-lines';
    if (!map.getLayer(lineLayerId)) {
      const lineStyle = this.assetLayerService.getMapLibreLayerStyle(config.id, sourceId, 'line');
      if (lineStyle) {
        map.addLayer({
          ...lineStyle,
          id: lineLayerId,
          filter: ['==', '$type', 'LineString'],
        });
        this.registerHoverHandlers(map, lineLayerId, config);
        map.on('click', lineLayerId, (e) => this.handleAssetClick(e));
      }
    }

    // Polygon layer
    const polygonLayerId = this.layerIdPrefix + config.id + '-polygons';
    if (!map.getLayer(polygonLayerId)) {
      const polygonStyle = this.assetLayerService.getMapLibreLayerStyle(config.id, sourceId, 'polygon');
      if (polygonStyle) {
        map.addLayer({
          ...polygonStyle,
          id: polygonLayerId,
          filter: ['==', '$type', 'Polygon'],
        });
        this.registerHoverHandlers(map, polygonLayerId, config);
        map.on('click', polygonLayerId, (e) => this.handleAssetClick(e));
      }
    }
  }

  /**
   * Remove asset layer from map
   */
  removeAssetLayerFromMap(map: MapLibreMap, layerId: string): void {
    const sourceId = this.sourceIdPrefix + layerId;

    this.geometryLayerSuffixes.forEach((suffix) => {
      const layerId_ = this.layerIdPrefix + layerId + suffix;
      if (map.getLayer(layerId_)) {
        map.removeLayer(layerId_);
      }
    });

    if (map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }
  }

  /**
   * Toggle asset layer visibility
   */
  toggleLayerVisibility(map: MapLibreMap, layerId: string, visible: boolean): void {
    this.geometryLayerSuffixes.forEach((suffix) => {
      const layerId_ = this.layerIdPrefix + layerId + suffix;
      if (map.getLayer(layerId_)) {
        map.setLayoutProperty(layerId_, 'visibility', visible ? 'visible' : 'none');
      }
    });

    if (!visible) {
      this.hideHoverPopup(map);
    }
  }

  /**
   * Update asset layer data
   */
  updateLayerData(map: MapLibreMap, category: string): void {
    const config = this.assetLayerService.getLayerConfigByCategory(category);
    if (!config) {
      return;
    }

    const sourceId = this.sourceIdPrefix + config.id;
    const geoJSON = this.assetLayerService.getAssetsGeoJSON(category);

    const source = map.getSource(sourceId) as GeoJSONSource;
    if (source) {
      source.setData(geoJSON);
    }
  }

  private registerHoverHandlers(map: MapLibreMap, layerId: string, config: AssetLayerConfig): void {
    map.on('mouseenter', layerId, (event: any) => {
      map.getCanvas().style.cursor = 'pointer';
      this.showHoverPopup(map, event, config);
    });

    map.on('mousemove', layerId, (event: any) => {
      this.showHoverPopup(map, event, config);
    });

    map.on('mouseleave', layerId, () => {
      map.getCanvas().style.cursor = '';
      this.hideHoverPopup(map);
    });
  }

  /**
   * Handle asset click event
   */
  private handleAssetClick(event: any): void {
    if (event.features && event.features.length > 0) {
      const feature = event.features[0];
      console.log('Asset clicked:', feature.properties);
      // Emit or handle the asset selection
    }
  }

  private showHoverPopup(map: MapLibreMap, event: any, config: AssetLayerConfig): void {
    if (!event?.features?.length || !event.lngLat) {
      return;
    }

    const feature = event.features[0];
    const properties = this.normalizeProperties(feature.properties);
    if (!properties) {
      return;
    }

    const title = this.pickFirstProperty(properties, ['assetName', 'asset_name', 'name', 'title']) ?? 'Asset';
    const assetId = this.pickFirstProperty(properties, ['assetCode', 'asset_id', 'assetId', 'id']);
  const category = config?.name ?? config?.category ?? 'Asset';
    const commissioningRaw = this.pickFirstProperty(properties, ['commissioningDate', 'commissioning_date', 'commissionedOn']);
    const nextMaintenanceRaw =
      this.pickFirstProperty(properties, ['__nextMaintenanceDate', 'nextMaintenanceDate', 'next_maintenance_date']) ?? null;

    const commissioning = this.formatDate(commissioningRaw);
    const nextMaintenance = this.formatDate(nextMaintenanceRaw);
    const status = this.describeMaintenanceStatus(nextMaintenanceRaw);

    const popup = this.ensureHoverPopup(map);
    popup
      .setLngLat(event.lngLat)
      .setHTML(
        this.buildHoverMarkup({
          title,
          assetId,
          category,
          commissioning,
          nextMaintenance,
          status,
          accent: config?.color,
        }),
      )
      .addTo(map);
  }

  private hideHoverPopup(map: MapLibreMap): void {
    const popup = this.hoverPopups.get(map);
    if (popup) {
      popup.remove();
    }
  }

  private ensureHoverPopup(map: MapLibreMap): Popup {
    let popup = this.hoverPopups.get(map);
    if (!popup) {
      popup = new Popup({ closeButton: false, closeOnClick: false, closeOnMove: false, className: 'asset-hover-popup' });
      this.hoverPopups.set(map, popup);
    }
    return popup;
  }

  private buildHoverMarkup(data: {
    title: string;
    assetId?: string | null;
    category: string;
    commissioning: string | null;
    nextMaintenance: string | null;
    status: { label: string; tone: 'neutral' | 'warning' | 'danger' };
    accent?: string;
  }): string {
    const accent = data.accent ?? '#2563eb';
    const statusColor = this.resolveStatusColor(data.status.tone, accent);
    const parts: string[] = [];
    parts.push(`<div style="padding:12px 14px; min-width:220px; max-width:260px; font-family:inherit;">`);
    parts.push(
      `<div style="font-size:14px; font-weight:600; margin:0 0 4px; color:#0f172a;">${this.escapeHtml(data.title)}</div>`,
    );
    if (data.assetId) {
      parts.push(
        `<div style="font-size:11px; color:#64748b; margin-bottom:6px;">ID: ${this.escapeHtml(String(data.assetId))}</div>`,
      );
    }
    parts.push(
      `<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; font-size:11px; color:#475569;">` +
        `<span>${this.escapeHtml(data.category)}</span>` +
        `<span style="padding:2px 6px; border-radius:999px; background:${statusColor.background}; color:${statusColor.text};">${this.escapeHtml(data.status.label)}</span>` +
        `</div>`,
    );

    parts.push('<div style="font-size:12px; color:#1f2937; line-height:1.35;">');
    parts.push(
      `<div><span style="color:#64748b;">Next maintenance:</span> ${this.escapeHtml(
        data.nextMaintenance ?? 'Not scheduled',
      )}</div>`,
    );
    parts.push(
      `<div><span style="color:#64748b;">Commissioned:</span> ${this.escapeHtml(
        data.commissioning ?? 'Unknown',
      )}</div>`,
    );
    parts.push('</div>');
    parts.push('</div>');
    return parts.join('');
  }

  private resolveStatusColor(
    tone: 'neutral' | 'warning' | 'danger',
    accent: string,
  ): { background: string; text: string } {
    switch (tone) {
      case 'danger':
        return { background: 'rgba(220, 38, 38, 0.12)', text: '#991b1b' };
      case 'warning':
        return { background: 'rgba(234, 179, 8, 0.18)', text: '#92400e' };
      default:
        return { background: this.buildAccentTint(accent), text: '#0f172a' };
    }
  }

  private buildAccentTint(accent: string): string {
    const hex = accent?.startsWith('#') ? accent.slice(1) : accent;
    if (!hex || (hex.length !== 6 && hex.length !== 3)) {
      return 'rgba(37, 99, 235, 0.12)';
    }

    const expanded = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
    const intVal = parseInt(expanded, 16);
    if (Number.isNaN(intVal)) {
      return 'rgba(37, 99, 235, 0.12)';
    }
    const r = (intVal >> 16) & 255;
    const g = (intVal >> 8) & 255;
    const b = intVal & 255;
    return `rgba(${r}, ${g}, ${b}, 0.12)`;
  }

  private describeMaintenanceStatus(raw: string | null): { label: string; tone: 'neutral' | 'warning' | 'danger' } {
    if (!raw) {
      return { label: 'No upcoming maintenance', tone: 'neutral' };
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      return { label: 'Invalid maintenance date', tone: 'warning' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const parsedDay = new Date(parsed);
    parsedDay.setHours(0, 0, 0, 0);
    const diffMs = parsedDay.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / 86400000);

    if (diffDays < 0) {
      return { label: `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'}`, tone: 'danger' };
    }

    if (diffDays === 0) {
      return { label: 'Due today', tone: 'warning' };
    }

    if (diffDays <= 14) {
      return { label: `Due in ${diffDays} day${diffDays === 1 ? '' : 's'}`, tone: 'warning' };
    }

    return { label: `Scheduled in ${diffDays} day${diffDays === 1 ? '' : 's'}`, tone: 'neutral' };
  }

  private pickFirstProperty(properties: Record<string, any>, keys: string[]): string | null {
    for (const key of keys) {
      if (key in properties && properties[key] != null && properties[key] !== '') {
        return String(properties[key]);
      }
    }
    return null;
  }

  private formatDate(value: string | null): string | null {
    if (!value) {
      return null;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return parsed.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  private normalizeProperties(raw: any): Record<string, any> {
    if (!raw) {
      return {};
    }

    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch {
        return {};
      }
    }

    return raw;
  }

  private escapeHtml(value: string | null): string {
    if (!value) {
      return '';
    }

    return value.replace(/[&<>"']/g, (ch) => {
      switch (ch) {
        case '&':
          return '&amp;';
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case '"':
          return '&quot;';
        case "'":
          return '&#39;';
        default:
          return ch;
      }
    });
  }

  /**
   * Get all asset layer IDs for a given layer ID
   */
  getAssetLayerIds(layerId: string): string[] {
    return this.geometryLayerSuffixes.map((suffix) => this.layerIdPrefix + layerId + suffix);
  }

  /**
   * Fit map to asset layer bounds
   */
  fitToAssetLayer(map: MapLibreMap, category: string): void {
    const assets = this.assetLayerService.getAssetsByLayer(category);
    if (assets.length === 0) {
      return;
    }

    let minLng = 180,
      minLat = 90,
      maxLng = -180,
      maxLat = -90;

    assets.forEach((asset) => {
      if (!asset.feature || !asset.feature.geometry) {
        return;
      }

      const coords = this.extractBounds(asset.feature.geometry);
      if (coords) {
        minLng = Math.min(minLng, coords.minLng);
        minLat = Math.min(minLat, coords.minLat);
        maxLng = Math.max(maxLng, coords.maxLng);
        maxLat = Math.max(maxLat, coords.maxLat);
      }
    });

    if (minLng < 180 && maxLng > -180) {
      map.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        { padding: 50 },
      );
    }
  }

  /**
   * Extract bounds from geometry
   */
  private extractBounds(
    geometry: any,
  ): { minLng: number; minLat: number; maxLng: number; maxLat: number } | null {
    if (geometry.type === 'Point') {
      return {
        minLng: geometry.coordinates[0],
        minLat: geometry.coordinates[1],
        maxLng: geometry.coordinates[0],
        maxLat: geometry.coordinates[1],
      };
    }

    if (geometry.type === 'LineString') {
      let minLng = 180,
        minLat = 90,
        maxLng = -180,
        maxLat = -90;
      geometry.coordinates.forEach(([lng, lat]: [number, number]) => {
        minLng = Math.min(minLng, lng);
        minLat = Math.min(minLat, lat);
        maxLng = Math.max(maxLng, lng);
        maxLat = Math.max(maxLat, lat);
      });
      return { minLng, minLat, maxLng, maxLat };
    }

    if (geometry.type === 'Polygon') {
      let minLng = 180,
        minLat = 90,
        maxLng = -180,
        maxLat = -90;
      geometry.coordinates[0].forEach(([lng, lat]: [number, number]) => {
        minLng = Math.min(minLng, lng);
        minLat = Math.min(minLat, lat);
        maxLng = Math.max(maxLng, lng);
        maxLat = Math.max(maxLat, lat);
      });
      return { minLng, minLat, maxLng, maxLat };
    }

    return null;
  }
}
