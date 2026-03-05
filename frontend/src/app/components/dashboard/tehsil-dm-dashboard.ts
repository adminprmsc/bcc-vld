import { Component, OnDestroy, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RequisitionCreate } from '../requisitions/requisition-create/requisition-create';
import { RequisitionsService } from '../requisitions/requisitions.service';
import { NotificationService } from '../shared/notification.service';
import { MapWorkspaceComponent, MapWorkspacePlan } from '../shared/maps/map-workspace.component';
import { BasemapId } from '../shared/maps/maplibre-helpers';
import type { Feature } from 'geojson';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import { ensureLeafletSetup } from '../shared/maps/leaflet-helpers';

interface DashboardMetric {
  label: string;
  value: number | string;
  icon: string;
  accent: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  hint?: string;
}

interface MapControlState {
  query: string;
  error: string | null;
  feedback: string | null;
}

type MapScope = 'dashboard' | 'detail';

@Component({
  selector: 'app-tehsil-dm-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RequisitionCreate, MapWorkspaceComponent],
  templateUrl: './tehsil-dm-dashboard.html',
  styleUrl: './tehsil-dm-dashboard.scss'
})
export class TehsilDmDashboard implements OnInit, OnDestroy {
  showCreateModal = false;
  requisitions: any[] = [];
  selectedRequisition: any = null;
  filterStatus = '';
  filterTehsil = '';
  searchTerm = '';
  uniqueTehsils: string[] = [];
  metrics: DashboardMetric[] = [];
  selectedGeometrySummary = '';
  loading = false;
  detailLoading = false;
  private currentUser: any = null;
  private requisitionsService = inject(RequisitionsService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private mapInstance: L.Map | null = null;
  private drawLayer: L.FeatureGroup | null = null;
  private featureLayer: L.FeatureGroup | null = null;
  private detailMapInstance: L.Map | null = null;
  private chartInstance: any = null;
  @ViewChild('dashboardMap') dashboardMapWorkspace?: MapWorkspaceComponent;
  @ViewChild('detailMap') detailMapWorkspace?: MapWorkspaceComponent;
  mapPlans: MapWorkspacePlan[] = [];
  readonly mapBasemapOptions: { id: BasemapId; label: string }[] = [
    { id: 'osm', label: 'Street' },
    { id: 'esri', label: 'Satellite' },
    { id: 'esriTopo', label: 'Terrain' }
  ];
  selectedBasemap: BasemapId = 'osm';
  mapControls: Record<MapScope, MapControlState> = {
    dashboard: { query: '', error: null, feedback: null },
    detail: { query: '', error: null, feedback: null }
  };

  ngOnInit(): void {
    this.bootstrapUserContext();
    this.loadRequisitions();
  }

  ngOnDestroy(): void {
    this.destroyChart();
    this.teardownMap();
    this.destroyDetailMap();
  }

  get filteredRequisitions(): any[] {
    const statusFilter = (this.filterStatus || '').toLowerCase();
    const tehsilFilter = (this.filterTehsil || '').toLowerCase();
    const query = (this.searchTerm || '').toLowerCase();
    return this.requisitions.filter(req => {
      const status = (req.status || '').toLowerCase();
      const tehsil = (req.tehsil || '').toLowerCase();
      const title = (req.title || '').toLowerCase();
      const purpose = (req.purpose || '').toLowerCase();
      const matchesStatus = !statusFilter || status.includes(statusFilter);
      const matchesTehsil = !tehsilFilter || tehsil === tehsilFilter;
      const matchesQuery = !query || title.includes(query) || purpose.includes(query);
      return matchesStatus && matchesTehsil && matchesQuery;
    });
  }

  onViewRequisitions(): void {
    const anchor = document.getElementById('requisitions-table');
    if (anchor) {
      anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  onCreateRequisition(): void {
    this.showCreateModal = true;
  }

  openLandActivityDashboard(): void {
    this.router.navigate(['/land-activity-dashboard']);
  }

  onCoordinateInput(scope: MapScope): void {
    const state = this.mapControls[scope];
    state.error = null;
    state.feedback = null;
  }

  onCoordinateSearchSubmit(scope: MapScope): void {
    const state = this.mapControls[scope];
    const workspace = this.resolveWorkspace(scope);
    if (!workspace) {
      state.error = 'Map is still loading. Try again in a moment.';
      state.feedback = null;
      return;
    }

    const result = workspace.searchCoordinates(state.query);
    if (!result.success) {
      state.error = result.error ?? 'Unable to locate those coordinates.';
      state.feedback = null;
      return;
    }

    state.error = null;
    state.feedback = result.message ?? 'Centering map...';

    const counterpartScope: MapScope = scope === 'dashboard' ? 'detail' : 'dashboard';
    const counterpartWorkspace = this.counterpartWorkspace(scope);
    if (counterpartWorkspace) {
      const counterpartResult = counterpartWorkspace.searchCoordinates(state.query);
      if (counterpartResult.success) {
        const counterpartState = this.mapControls[counterpartScope];
        counterpartState.error = null;
        counterpartState.feedback = counterpartResult.message ?? 'Centering map...';
        counterpartState.query = state.query;
      }
    }
  }

  onBasemapChange(next: BasemapId): void {
    this.selectedBasemap = next;
    this.dashboardMapWorkspace?.setBasemap(next);
    this.detailMapWorkspace?.setBasemap(next);
  }

  onLocateUser(scope: MapScope): void {
    const state = this.mapControls[scope];
    const workspace = this.resolveWorkspace(scope);
    if (!workspace) {
      state.error = 'Map is still loading. Try again in a moment.';
      state.feedback = null;
      return;
    }

    const triggered = workspace.locateUser();
    if (!triggered) {
      state.error = 'Location services are not ready yet.';
      state.feedback = null;
      return;
    }

    state.error = null;
    state.feedback = 'Centering on your location...';

    const counterpartScope: MapScope = scope === 'dashboard' ? 'detail' : 'dashboard';
    const counterpartWorkspace = this.counterpartWorkspace(scope);
    if (counterpartWorkspace) {
      const counterpartResult = counterpartWorkspace.locateUser();
      const counterpartState = this.mapControls[counterpartScope];
      if (counterpartResult) {
        counterpartState.error = null;
        counterpartState.feedback = 'Centering on your location...';
      }
    }
  }

  onRequisitionCreated(_: any): void {
    this.showCreateModal = false;
    this.loadRequisitions();
    this.notificationService.push('Requisition submitted successfully', {
      type: 'success',
      context: { scope: 'tehsil-dm-dashboard' }
    });
  }

  viewRequisition(req: any): void {
    if (!req?._id) {
      alert('Unable to open requisition details without an identifier.');
      return;
    }
    this.detailLoading = true;
    this.requisitionsService.getRequisitionById(req._id).subscribe({
      next: detail => {
        const enriched = this.enrichRequisitions([detail])[0];
        this.selectedRequisition = enriched;
        this.detailLoading = false;
        setTimeout(() => this.renderDetailMap(enriched), 0);
      },
      error: err => {
        this.detailLoading = false;
        alert('Unable to load requisition details: ' + (err?.error?.msg || err?.message || 'Unknown error'));
      }
    });
  }

  closeDetailModal(): void {
    this.selectedRequisition = null;
    this.detailLoading = false;
    this.destroyDetailMap();
    this.mapPlans = this.buildMapPlans(this.requisitions);
    setTimeout(() => this.dashboardMapWorkspace?.fitToPlans(), 150);
    this.mapControls.detail.error = null;
    this.mapControls.detail.feedback = null;
  }

  resetDrawnShapes(): void {
    this.drawLayer?.clearLayers();
    this.selectedGeometrySummary = '';
  }

  hasDrawings(): boolean {
    return !!(this.drawLayer && this.drawLayer.getLayers().length);
  }

  formatArea(req: any): string {
    if (req.calculatedAreaSqFt) {
      return `${req.calculatedAreaSqFt.toLocaleString()} sq ft`;
    }
    if (req.landArea) {
      return req.landArea;
    }
    return 'N/A';
  }

  statusBadgeClass(status: string): string {
    const normalized = this.normalizeStatus(status);
    if (normalized === 'approved') return 'status-approved';
    if (normalized === 'rejected') return 'status-rejected';
    if (normalized === 'in-progress') return 'status-in-progress';
    return 'status-pending';
  }

  private resolveWorkspace(scope: MapScope): MapWorkspaceComponent | undefined {
    if (scope === 'dashboard') {
      return this.dashboardMapWorkspace;
    }

    if (this.selectedRequisition) {
      return this.detailMapWorkspace ?? this.dashboardMapWorkspace;
    }

    return this.dashboardMapWorkspace;
  }

  private counterpartWorkspace(scope: MapScope): MapWorkspaceComponent | undefined {
    if (scope === 'dashboard') {
      return this.selectedRequisition ? this.detailMapWorkspace ?? undefined : undefined;
    }
    return this.dashboardMapWorkspace ?? undefined;
  }

  private bootstrapUserContext(): void {
    const stored = localStorage.getItem('user');
    if (!stored) {
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      this.currentUser = parsed;
      const tehsil = parsed?.tehsil || parsed?.office?.tehsil;
      if (typeof tehsil === 'string' && tehsil.trim()) {
        this.filterTehsil = tehsil.trim().toLowerCase();
      }
    } catch {
      this.currentUser = null;
    }
  }

  private loadRequisitions(): void {
    this.loading = true;
    this.requisitionsService.getRequisitions().subscribe({
      next: data => {
        const list = Array.isArray(data) ? this.enrichRequisitions(data) : [];
        this.requisitions = list;
        this.uniqueTehsils = [...new Set(list.map(item => (item.tehsil || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
        this.calculateMetrics(list);
        this.loading = false;
        Promise.resolve().then(() => {
          this.mapPlans = this.buildMapPlans(list);
          // request fit / render once the child map is ready
          setTimeout(() => this.dashboardMapWorkspace?.fitToPlans(), 200);
          this.renderChart();
        });
      },
      error: err => {
        console.error('Failed loading requisitions', err);
        this.loading = false;
        alert('Unable to load requisitions: ' + (err?.error?.msg || err?.message || 'Unknown error'));
      }
    });
  }

  private enrichRequisitions(source: any[]): any[] {
    return source.map(item => {
      const breadth = Number(item?.landBreadth) || 0;
      const depth = Number(item?.landDepth) || 0;
      const baseAreaSqFt = Number(item?.calculatedAreaSqFt) || (breadth && depth ? breadth * depth : 0);
      const areaSqFt = baseAreaSqFt ? Number(baseAreaSqFt.toFixed(0)) : 0;
      const areaMarlas = areaSqFt ? Number((areaSqFt / 272.25).toFixed(2)) : Number(item?.calculatedAreaMarlas) || 0;
      const areaKanals = areaSqFt ? Number((areaSqFt / 5445).toFixed(2)) : Number(item?.calculatedAreaKanals) || 0;
      const supportingDocs = Array.isArray(item?.supportingDocs)
        ? item.supportingDocs
        : item?.supportingDocs
        ? [item.supportingDocs]
        : [];
      const attachments = Array.isArray(item?.attachments)
        ? item.attachments
        : item?.attachments
        ? [item.attachments]
        : [];
      const normalizedLocation = this.normalizeLocation(item?.location);
      const mapFeatures = this.normalizeFeatures(item?.mapFeatures);
      const mapViewport = this.normalizeViewport(item?.mapViewport);
      return {
        ...item,
        landBreadth: breadth,
        landDepth: depth,
        calculatedAreaSqFt: areaSqFt,
        calculatedAreaMarlas: areaMarlas,
        calculatedAreaKanals: areaKanals,
        requiredDate: item?.requiredDate ? new Date(item.requiredDate) : null,
        createdAt: item?.createdAt ? new Date(item.createdAt) : null,
        supportingDocs,
        attachments,
        activityLog: Array.isArray(item?.activityLog) ? item.activityLog : [],
        location: normalizedLocation,
        tehsil: item?.tehsil || normalizedLocation?.tehsil || normalizedLocation?.addressTehsil || '',
        mapFeatures,
        mapViewport
      };
    });
  }

  private calculateMetrics(list: any[]): void {
    const total = list.length;
    const pending = list.filter(item => this.normalizeStatus(item.status) === 'pending').length;
    const approved = list.filter(item => this.normalizeStatus(item.status) === 'approved').length;
    const inProgress = list.filter(item => this.normalizeStatus(item.status) === 'in-progress').length;
    
    // Pending statuses for "Land Area Requested"
    const pendingStatuses = [
      'pending', 'pending dm review', 'pending bcc officer review',
      'pending tm review', 'pending bcc specialist review',
      'pending wb dispatch', 'pending wb approval', 'marked to tm',
      'assigned to bcc', 'land acquisition updated', 'donor data uploaded'
    ];
    
    // Completed statuses for "Land Acquired"
    const completedStatuses = ['wb approved', 'closed', 'approved', 'acquisition complete'];
    
    // Calculate Land Area Requested (pending requisitions)
    let landAreaRequestedSqFt = 0;
    let landAreaRequestedCount = 0;
    
    // Calculate Land Acquired (approved/closed requisitions)
    let landAcquiredSqFt = 0;
    let landAcquiredCount = 0;
    
    list.forEach(item => {
      const status = (item.status || '').toLowerCase();
      const sqFt = Number(item.calculatedAreaSqFt) || this.parseLandAreaToSqFt(item.landArea);
      
      if (pendingStatuses.some(ps => status.includes(ps) || ps.includes(status))) {
        landAreaRequestedSqFt += sqFt;
        landAreaRequestedCount++;
      } else if (completedStatuses.some(cs => status.includes(cs) || cs.includes(status))) {
        landAcquiredSqFt += sqFt;
        landAcquiredCount++;
      }
    });
    
    const landAreaRequestedKanals = landAreaRequestedSqFt / 5445;
    const landAcquiredKanals = landAcquiredSqFt / 5445;

    this.metrics = [
      {
        label: 'Total Requisitions',
        value: total,
        icon: 'inventory_2',
        accent: 'primary'
      },
      {
        label: 'Pending Review',
        value: pending,
        icon: 'pending_actions',
        accent: pending ? 'warning' : 'neutral',
        hint: inProgress ? `${inProgress} progressing` : undefined
      },
      {
        label: 'Land Area Requested',
        value: landAreaRequestedKanals ? `${landAreaRequestedKanals.toFixed(2)} kanals` : '—',
        icon: 'request_quote',
        accent: landAreaRequestedCount ? 'warning' : 'neutral',
        hint: landAreaRequestedCount ? `${landAreaRequestedCount} pending requisitions` : undefined
      },
      {
        label: 'Land Acquired',
        value: landAcquiredKanals ? `${landAcquiredKanals.toFixed(2)} kanals` : '—',
        icon: 'task_alt',
        accent: landAcquiredCount ? 'success' : 'neutral',
        hint: landAcquiredCount ? `${landAcquiredCount} completed requisitions` : undefined
      }
    ];
  }
  
  private parseLandAreaToSqFt(areaStr: string | undefined | null): number {
    if (!areaStr) return 0;
    const str = areaStr.toString().toLowerCase().trim();
    
    const numMatch = str.match(/[\d.]+/);
    const value = numMatch ? parseFloat(numMatch[0]) : 0;
    
    if (str.includes('kanal')) return value * 5445;
    if (str.includes('marla')) return value * 272.25;
    if (str.includes('acre')) return value * 43560;
    return value; // Assume sqft
  }

  private normalizeStatus(status: string | null | undefined): 'pending' | 'approved' | 'rejected' | 'in-progress' {
    const value = (status || '').toLowerCase();
    if (!value) return 'pending';
    if (value.includes('approve')) return 'approved';
    if (value.includes('reject')) return 'rejected';
    if (value.includes('assign') || value.includes('progress')) return 'in-progress';
    return 'pending';
  }

  private statusLabel(status: string | null | undefined): string {
    const normalized = this.normalizeStatus(status);
    return normalized
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private buildMapPlans(source: any[]): MapWorkspacePlan[] {
    if (!Array.isArray(source) || !source.length) {
      return [];
    }

    const plans: MapWorkspacePlan[] = [];

    source.forEach((req, index) => {
      if (!req) {
        return;
      }

      const baseId = String(req._id || req.id || index);
      const title = req.title || `Requisition ${index + 1}`;
      const category = this.statusLabel(req.status);
      const commissioningDate = req.requiredDate instanceof Date
        ? req.requiredDate.toISOString()
        : req.requiredDate
        ? new Date(req.requiredDate).toISOString()
        : null;
      const baseAttributes = this.buildPlanAttributes(req);

      const features = this.normalizeFeatures(req.mapFeatures);
      if (features.length) {
        features.forEach((feature: Feature, featureIndex: number) => {
          const cloned = this.cloneFeature(feature);
          cloned.properties = {
            ...(cloned.properties ?? {}),
            title,
            status: category,
            priority: req.priority || '',
            tehsil: req.tehsil || '',
          };

          plans.push({
            id: `${baseId}-${featureIndex}`,
            title,
            category,
            commissioningDate,
            nextMaintenanceDate: null,
            expectedLifespanYears: null,
            feature: cloned,
            attributes: {
              ...baseAttributes,
              ...this.extractFeatureAttributes(cloned),
            },
          });
        });
        return;
      }

      const coords = this.normalizeCoordinates(req?.location?.coordinates || req?.location);
      if (coords) {
        const pointFeature: Feature = {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [coords.lng, coords.lat],
          },
          properties: {
            title,
            status: category,
            priority: req.priority || '',
            tehsil: req.tehsil || '',
          },
        };

        plans.push({
          id: baseId,
          title,
          category,
          commissioningDate,
          nextMaintenanceDate: null,
          expectedLifespanYears: null,
          feature: pointFeature,
          attributes: { ...baseAttributes },
        });
      }
    });

    return plans;
  }

  private buildPlanAttributes(req: any): Record<string, unknown> {
    const attributes: Record<string, unknown> = {};
    const add = (label: string, value: unknown, formatter?: (value: unknown) => string) => {
      if (value === null || value === undefined) {
        return;
      }
      let display = formatter ? formatter(value) : String(value);
      if (typeof value === 'number' && !formatter) {
        display = value.toLocaleString();
      }
      if (typeof value === 'string' && !value.trim()) {
        return;
      }
      if (!String(display).trim()) {
        return;
      }
      attributes[label] = display;
    };

    add('Status', this.statusLabel(req.status));
    add('Priority', req.priority);
    add('Division', req.division);
    add('District', req.district);
    add('Tehsil', req.tehsil);
    add('Land Type', req.landType);
    add('Land Area', this.formatArea(req));
    add('Land Breadth (ft)', req.landBreadth);
    add('Land Depth (ft)', req.landDepth);
    add('Purpose', req.purpose);
    add('Reference ID', req.referenceId || req.caseId || req.requestNumber);

    if (req.requiredDate) {
      add(
        'Required Date',
        req.requiredDate,
        (value) =>
          value instanceof Date
            ? value.toLocaleDateString()
            : new Date(value as string).toLocaleDateString()
      );
    }

    if (req.createdAt) {
      add(
        'Submitted On',
        req.createdAt,
        (value) =>
          value instanceof Date
            ? value.toLocaleString()
            : new Date(value as string).toLocaleString()
      );
    }

    if (req.updatedAt) {
      add(
        'Last Updated',
        req.updatedAt,
        (value) =>
          value instanceof Date
            ? value.toLocaleString()
            : new Date(value as string).toLocaleString()
      );
    }

    if (req.estimatedValue) {
      add('Estimated Value (PKR)', req.estimatedValue, (value) => {
        const numeric = Number(value);
        if (!Number.isNaN(numeric) && Number.isFinite(numeric)) {
          return numeric.toLocaleString();
        }
        return String(value);
      });
    }

    if (req.supportingDocs?.length) {
      add('Supporting Documents', req.supportingDocs.length, (value) => `${value}`);
    }

    if (req.location?.coordinateString) {
      add('Coordinates', req.location.coordinateString);
    }
    if (req.location?.address) {
      add('Address', req.location.address);
    }

    add('Remarks', req.remarks);

    return attributes;
  }

  private extractFeatureAttributes(feature: Feature | null | undefined): Record<string, unknown> {
    if (!feature?.properties || typeof feature.properties !== 'object') {
      return {};
    }

    const attributes: Record<string, unknown> = {};
    Object.entries(feature.properties as Record<string, unknown>).forEach(([key, value]) => {
      if (key.startsWith('__') || value === null || value === undefined) {
        return;
      }
      let display: string;
      if (Array.isArray(value)) {
        display = value.map(item => (item === null || item === undefined ? '' : String(item))).filter(Boolean).join(', ');
      } else if (value instanceof Date) {
        display = value.toLocaleString();
      } else if (typeof value === 'object') {
        try {
          const json = JSON.stringify(value);
          display = json && json !== '{}' ? json : '';
        } catch {
          display = '';
        }
      } else {
        display = String(value);
      }

      if (!display.trim()) {
        return;
      }

      attributes[key] = display;
    });

    return attributes;
  }

  private cloneFeature(feature: Feature): Feature {
    try {
      return JSON.parse(JSON.stringify(feature));
    } catch {
      return feature;
    }
  }

  private updateDrawSummary(): void {
    if (!this.drawLayer) {
      this.selectedGeometrySummary = '';
      return;
    }
    const layers = this.drawLayer.getLayers();
    if (!layers.length) {
      this.selectedGeometrySummary = '';
      return;
    }
    const latest = layers[layers.length - 1];
    this.selectedGeometrySummary = this.describeDrawnLayer(latest);
  }

  private describeDrawnLayer(layer: L.Layer): string {
    ensureLeafletSetup();
    if ((layer as L.Marker).getLatLng) {
      const point = (layer as L.Marker).getLatLng();
      return `Point • ${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`;
    }
    if ((layer as L.Circle).getRadius) {
      const circle = layer as L.Circle;
      const areaSqM = Math.PI * Math.pow(circle.getRadius(), 2);
      const areaSqKm = areaSqM / 1_000_000;
      return `Circle • ${(circle.getRadius() / 1000).toFixed(2)} km radius · ${areaSqKm.toFixed(2)} km^2`;
    }
    if ((layer as L.Polygon).getLatLngs) {
      const polygon = layer as L.Polygon;
      const latLngs = polygon.getLatLngs()[0] as L.LatLng[];
      try {
        const areaSqM = ((L as any).GeometryUtil?.geodesicArea?.(latLngs)) || 0;
        const areaSqKm = areaSqM / 1_000_000;
        return `Polygon • ${areaSqKm.toFixed(2)} km^2`;
      } catch {
        return 'Polygon captured';
      }
    }
    if ((layer as L.Polyline).getLatLngs) {
      const polyline = layer as L.Polyline;
      const latLngs = polyline.getLatLngs() as L.LatLng[];
      let meters = 0;
      for (let i = 1; i < latLngs.length; i += 1) {
        meters += latLngs[i - 1].distanceTo(latLngs[i]);
      }
      return `Path • ${(meters / 1000).toFixed(2)} km`;
    }
    return 'Shape captured';
  }

  private teardownMap(): void {
    if (this.mapInstance) {
      try {
        this.mapInstance.remove();
      } catch {
        /* ignore */
      }
      this.mapInstance = null;
    }
    this.drawLayer = null;
    this.featureLayer = null;
  }

  private destroyChart(): void {
    if (this.chartInstance) {
      try {
        this.chartInstance.destroy();
      } catch {
        /* ignore */
      }
      this.chartInstance = null;
    }
  }

  private renderChart(): void {
    const canvas = document.getElementById('monthlyRequestsChart') as HTMLCanvasElement | null;
    if (!canvas) {
      return;
    }

    const initialise = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return;
      }
      const buckets: Record<string, number> = {};
      this.requisitions.forEach(req => {
        if (!req.requiredDate) return;
        const monthKey = `${req.requiredDate.getFullYear()}-${(req.requiredDate.getMonth() + 1)
          .toString()
          .padStart(2, '0')}`;
        buckets[monthKey] = (buckets[monthKey] || 0) + 1;
      });
      let labels = Object.keys(buckets).sort();
      let data = labels.map(label => buckets[label]);
      if (!labels.length) {
        labels = ['No data yet'];
        data = [0];
      }
      this.destroyChart();
      this.chartInstance = new (window as any).Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Requisitions per Month',
              data,
              borderColor: '#1976d2',
              backgroundColor: 'rgba(25, 118, 210, 0.2)',
              tension: 0.35,
              fill: true,
              pointRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: { beginAtZero: true }
          }
        }
      });
    };

    if ((window as any).Chart) {
      initialise();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    script.onload = initialise;
    document.body.appendChild(script);
  }

  private renderDetailMap(req: any): void {
    const plans = this.buildMapPlans([req]);
    this.mapPlans = plans;
    this.mapControls.detail.query = this.mapControls.dashboard.query;
    this.mapControls.detail.error = null;
    this.mapControls.detail.feedback = null;
    setTimeout(() => {
      if (!plans.length) {
        return;
      }
      const detailMap = this.detailMapWorkspace;
      if (detailMap) {
        detailMap.focusOnPlan(plans[0].id);
        return;
      }
      this.dashboardMapWorkspace?.focusOnPlan(plans[0].id);
    }, 100);
  }

  private normalizeLocation(location: any) {
    if (!location) {
      return location;
    }
    const normalized: any = typeof location === 'object' && !Array.isArray(location) ? { ...location } : {};
    if (typeof location === 'string') {
      normalized.address = location;
    }
    const coords = this.normalizeCoordinates((location as any).coordinates || (location as any).coords || location);
    if (coords) {
      normalized.coordinates = coords;
      normalized.coordinateString = this.formatCoordinates(coords);
    }
    return normalized;
  }

  private normalizeCoordinates(coords: any): { lat: number; lng: number } | null {
    if (!coords) {
      return null;
    }
    if (Array.isArray(coords)) {
      const lngFirst = Number(coords[0]);
      const latSecond = Number(coords[1]);
      if (Number.isFinite(latSecond) && Number.isFinite(lngFirst)) {
        return { lat: latSecond, lng: lngFirst };
      }
      const latFirst = Number(coords[0]);
      const lngSecond = Number(coords[1]);
      if (Number.isFinite(latFirst) && Number.isFinite(lngSecond)) {
        return { lat: latFirst, lng: lngSecond };
      }
    }
    const latCandidates = [coords.lat, coords.latitude, coords.y, coords.latLng?.lat];
    const lngCandidates = [coords.lng, coords.longitude, coords.x, coords.latLng?.lng];
    const lat = latCandidates.map(v => Number(v)).find(v => Number.isFinite(v));
    const lng = lngCandidates.map(v => Number(v)).find(v => Number.isFinite(v));
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat: lat as number, lng: lng as number };
    }
    return null;
  }

  private normalizeFeatures(raw: any): Feature[] {
    if (!raw) {
      return [];
    }
    let value = raw;
    if (typeof value === 'string') {
      try {
        value = JSON.parse(value);
      } catch {
        return [];
      }
    }
    if (Array.isArray(value)) {
      return value
        .filter(entry => entry && typeof entry === 'object' && entry.type === 'Feature' && entry.geometry)
        .map(entry => entry as Feature);
    }
    if (value && typeof value === 'object') {
      if (value.type === 'FeatureCollection' && Array.isArray((value as any).features)) {
        return this.normalizeFeatures((value as any).features);
      }
      if (value.type === 'Feature') {
        return this.normalizeFeatures([value]);
      }
    }
    return [];
  }

  private normalizeViewport(raw: any): { center?: { lat: number; lng: number }; zoom?: number } | null {
    if (!raw) {
      return null;
    }
    let value = raw;
    if (typeof value === 'string') {
      try {
        value = JSON.parse(value);
      } catch {
        return null;
      }
    }
    if (!value || typeof value !== 'object') {
      return null;
    }
    const center = this.normalizeCoordinates((value as any).center || value);
    const zoom = Number((value as any).zoom);
    const payload: { center?: { lat: number; lng: number }; zoom?: number } = {};
    if (center) {
      payload.center = center;
    }
    if (Number.isFinite(zoom)) {
      payload.zoom = zoom;
    }
    return Object.keys(payload).length ? payload : null;
  }

  private featureStyleForStatus(status: string | null | undefined): L.PathOptions {
    const normalized = this.normalizeStatus(status);
    if (normalized === 'approved') {
      return {
        color: '#16a34a',
        weight: 2,
        fillColor: '#4ade80',
        fillOpacity: 0.35
      };
    }
    if (normalized === 'rejected') {
      return {
        color: '#dc2626',
        weight: 2,
        dashArray: '6 4',
        fillColor: '#f87171',
        fillOpacity: 0.25
      };
    }
    if (normalized === 'in-progress') {
      return {
        color: '#f59e0b',
        weight: 2,
        fillColor: '#fbbf24',
        fillOpacity: 0.28
      };
    }
    return {
      color: '#2563eb',
      weight: 2,
      fillColor: '#60a5fa',
      fillOpacity: 0.3
    };
  }

  private formatCoordinates(raw: any): string {
    const coords = this.normalizeCoordinates(raw);
    if (!coords) {
      return '';
    }
    const lat = Number.isFinite(coords.lat) ? coords.lat : null;
    const lng = Number.isFinite(coords.lng) ? coords.lng : null;
    if (lat === null || lng === null) {
      return '';
    }
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }

  private destroyDetailMap(): void {
    if (this.detailMapInstance) {
      try {
        this.detailMapInstance.remove();
      } catch {
        /* ignore */
      }
      this.detailMapInstance = null;
    }
  }
}
