import { Component, AfterViewInit, OnDestroy, OnInit, Output, EventEmitter, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { RequisitionsService } from '../requisitions.service';
import { MapWorkspaceComponent } from '../../shared/maps/map-workspace.component';
import {
  GOVT_LAND_QUESTIONS,
  PRIVATE_LAND_QUESTIONS,
  type DueDiligenceQuestion
} from './due-diligence-questions';
import { PUNJAB_ADMINISTRATIVE_DATA, PunjabAdministrativeHierarchy } from '../../../data/punjab-administrative';
import type { Feature, FeatureCollection } from 'geojson';
import type { Map as MapLibreMap } from 'maplibre-gl';

@Component({
  selector: 'app-requisition-create',
    standalone: true,
    imports: [
      CommonModule,
      FormsModule,
      MatFormFieldModule,
      MatInputModule,
      MatButtonModule,
      MatIconModule,
      MatSelectModule,
      MatSnackBarModule,
      MapWorkspaceComponent
    ],
  templateUrl: './requisition-create.html',
  styleUrls: ['./requisition-create.scss']
})
export class RequisitionCreate implements OnInit, AfterViewInit, OnDestroy {
  private readonly draftStorageKey = 'requisitionDraft';
  private pendingMapState:
    | {
        marker?: { lat: number; lng: number };
        features?: Feature[];
        viewport?: { center: { lat: number; lng: number }; zoom: number };
      }
    | null = null;

  @ViewChild(MapWorkspaceComponent) private mapWorkspace?: MapWorkspaceComponent;

  drawnFeatures: Feature[] = [];
  geometrySummaries: string[] = [];
  isMapExpanded = false;
  mapMarker: { lat: number; lng: number } | null = null;
  mapViewport = {
    center: { lat: 31.5497, lng: 74.3436 },
    zoom: 7
  };
  draftFeature: Feature | null = null;
  readonly govtLandQuestions: DueDiligenceQuestion[] = GOVT_LAND_QUESTIONS;
  readonly privateLandQuestions: DueDiligenceQuestion[] = PRIVATE_LAND_QUESTIONS;
  govtLandResponses: Record<string, string> = {};
  privateLandResponses: Record<string, string> = {};

  private mapInstance: MapLibreMap | null = null;

  showExitPrompt = false;
  draftRestored = false;

  readonly divisions: PunjabAdministrativeHierarchy[] = PUNJAB_ADMINISTRATIVE_DATA;
  availableDistricts: { name: string; tehsils: string[] }[] = [];
  availableTehsils: string[] = [];

  title = '';
  description = '';
  purpose = '';
  division = '';
  district = '';
  tehsil = '';
  landArea = '';
  landType = '';
  location = '';
  requiredDate = '';
  priority = 'Medium';
  supportingDocs = '';
  estimatedValue = '';
  remarks = '';
  attachments: File[] = [];
  landBreadth = 0;
  landDepth = 0;

  @Output() close = new EventEmitter<void>();
  @Output() created = new EventEmitter<any>();

  constructor(
    private requisitionsService: RequisitionsService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.restoreDraft();
  }

  ngAfterViewInit(): void {
    // MapWorkspaceComponent will initialize itself; apply pending map state shortly after view init
    setTimeout(() => this.applyPendingMapState(), 100);
  }

  ngOnDestroy(): void {
    this.drawnFeatures = [];
    this.geometrySummaries = [];
  }

  private restoreDraft(): void {
    const raw = localStorage.getItem(this.draftStorageKey);
    if (!raw) {
      return;
    }
    try {
      const saved = JSON.parse(raw) || {};
      this.title = saved.title || '';
      this.description = saved.description || '';
      this.purpose = saved.purpose || '';
      this.division = saved.division || '';
      this.district = saved.district || '';
      this.tehsil = saved.tehsil || '';
      this.landArea = saved.landArea || '';
      this.landType = saved.landType || '';
      this.location = saved.location || '';
      this.requiredDate = saved.requiredDate || '';
      this.priority = saved.priority || this.priority;
      this.supportingDocs = saved.supportingDocs || '';
      this.estimatedValue = saved.estimatedValue || '';
      this.remarks = saved.remarks || '';
      this.landBreadth = Number(saved.landBreadth) || 0;
      this.landDepth = Number(saved.landDepth) || 0;
      const markerCandidate = saved.mapMarker;
      if (markerCandidate && Number.isFinite(Number(markerCandidate.lat)) && Number.isFinite(Number(markerCandidate.lng))) {
        this.mapMarker = {
          lat: Number(markerCandidate.lat),
          lng: Number(markerCandidate.lng)
        };
        if (!this.location) {
          this.location = `${this.mapMarker.lat.toFixed(6)},${this.mapMarker.lng.toFixed(6)}`;
        }
      } else {
        this.mapMarker = null;
      }
      const viewportCandidate = saved.mapViewport;
      let viewport: { center: { lat: number; lng: number }; zoom: number } | undefined;
      if (
        viewportCandidate &&
        Number.isFinite(Number(viewportCandidate.center?.lat)) &&
        Number.isFinite(Number(viewportCandidate.center?.lng)) &&
        Number.isFinite(Number(viewportCandidate.zoom))
      ) {
        viewport = {
          center: {
            lat: Number(viewportCandidate.center.lat),
            lng: Number(viewportCandidate.center.lng)
          },
          zoom: Number(viewportCandidate.zoom)
        };
        this.mapViewport = viewport;
      }
      const features = Array.isArray(saved.mapFeatures) ? (saved.mapFeatures as Feature[]) : undefined;
      this.geometrySummaries = Array.isArray(saved.geometrySummaries) ? [...saved.geometrySummaries] : [];
      this.govtLandResponses = this.cloneDueDiligenceMap(saved.govtLandResponses);
      this.privateLandResponses = this.cloneDueDiligenceMap(saved.privateLandResponses);
      this.pendingMapState = {
        marker: this.mapMarker || undefined,
        features,
        viewport
      };
      this.draftRestored = true;
      this.onDivisionChange();
    } catch {
      localStorage.removeItem(this.draftStorageKey);
      this.resetDueDiligenceForms();
    }
  }

  private clearDraft(): void {
    localStorage.removeItem(this.draftStorageKey);
    this.draftRestored = false;
    this.resetDueDiligenceForms();
  }

  private hasUnsavedChanges(): boolean {
    if (this.attachments.length || this.drawnFeatures.length || this.mapMarker) {
      return true;
    }
    if (this.landBreadth || this.landDepth) {
      return true;
    }
    const fields = [
      this.title,
      this.description,
      this.purpose,
      this.division,
      this.district,
      this.tehsil,
      this.landType,
      this.location,
      this.requiredDate,
      this.supportingDocs,
      this.estimatedValue,
      this.remarks
    ];
    if (fields.some(value => this.isNonEmpty(value))) {
      return true;
    }
    if (this.priority !== 'Medium') {
      return true;
    }
    return this.dueDiligenceHasEntries(this.govtLandResponses) || this.dueDiligenceHasEntries(this.privateLandResponses);
  }

  private dueDiligenceHasEntries(map: Record<string, string>): boolean {
    return Object.values(map || {}).some(value => this.isNonEmpty(value));
  }

  private cloneDueDiligenceMap(source: any): Record<string, string> {
    if (!source || typeof source !== 'object') {
      return {};
    }
    return Object.keys(source).reduce<Record<string, string>>((acc, key) => {
      const value = source[key];
      if (this.isNonEmpty(value)) {
        acc[key] = value;
      }
      return acc;
    }, {});
  }

  private extractDueDiligencePayload(map: Record<string, string>): Record<string, string> {
    const record: Record<string, string> = {};
    Object.entries(map || {}).forEach(([key, value]) => {
      if (this.isNonEmpty(value)) {
        record[key] = value.toString().trim();
      }
    });
    return record;
  }

  private resetDueDiligenceForms(): void {
    this.govtLandResponses = {};
    this.privateLandResponses = {};
  }

  isYesNoQuestion(question: DueDiligenceQuestion): boolean {
    if (!question?.options || question.options.length !== 2) {
      return false;
    }
    const normalized = question.options.map(opt => opt.toLowerCase().trim());
    return normalized.includes('yes') && normalized.includes('no');
  }

  private isNonEmpty(value: unknown): boolean {
    if (value === null || value === undefined) {
      return false;
    }
    return value.toString().trim().length > 0;
  }

  onClose(): void {
    if (this.hasUnsavedChanges()) {
      this.showExitPrompt = true;
      return;
    }
    this.close.emit();
  }

  onSaveDraft(): boolean {
    this.landArea = this.areaSummary;
    const draftPayload: any = {
      title: this.title,
      description: this.description,
      purpose: this.purpose,
      division: this.division,
      district: this.district,
      tehsil: this.tehsil,
      landArea: this.landArea,
      landType: this.landType,
      location: this.location,
      requiredDate: this.requiredDate,
      priority: this.priority,
      supportingDocs: this.supportingDocs,
      estimatedValue: this.estimatedValue,
      remarks: this.remarks,
      landBreadth: this.landBreadth,
      landDepth: this.landDepth,
      mapMarker: this.mapMarker
        ? {
            lat: Number(this.mapMarker.lat.toFixed(6)),
            lng: Number(this.mapMarker.lng.toFixed(6))
          }
        : null,
      mapViewport: this.mapViewport,
      mapFeatures: this.drawnFeatures,
      geometrySummaries: this.geometrySummaries,
      govtLandResponses: this.govtLandResponses,
      privateLandResponses: this.privateLandResponses
    };
    try {
      localStorage.setItem(this.draftStorageKey, JSON.stringify(draftPayload));
      this.draftRestored = true;
      this.showExitPrompt = false;
      this.snackBar.open('Draft saved', 'Close', { duration: 2500 });
      return true;
    } catch {
      this.snackBar.open('Unable to save draft locally', 'Close', { duration: 2500 });
      return false;
    }
  }

  onDivisionChange(): void {
    const selected = this.divisions.find(entry => entry.division === this.division);
    this.availableDistricts = selected ? selected.districts : [];
    if (!this.availableDistricts.some(d => d.name === this.district)) {
      this.district = '';
    }
    this.onDistrictChange();
  }

  onDistrictChange(): void {
    const match = this.availableDistricts.find(d => d.name === this.district);
    this.availableTehsils = match ? match.tehsils : [];
    if (!this.availableTehsils.includes(this.tehsil)) {
      this.tehsil = '';
    }
  }

  onDimensionsChange(): void {
    this.landArea = this.areaSummary;
  }

  get areaSummary(): string {
    if (!this.landBreadth || !this.landDepth) {
      return '';
    }
    const areaSqFt = this.landBreadth * this.landDepth;
    const areaMarla = areaSqFt / 272.25;
    const areaKanal = areaSqFt / 5445;
    const format = (value: number) =>
      Math.abs(value - Math.round(value)) < 0.005 ? Math.round(value).toString() : value.toFixed(2);
    return `${format(areaSqFt)} sq ft | ${format(areaMarla)} marla | ${format(areaKanal)} kanal`;
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.attachments = input?.files ? Array.from(input.files) : [];
  }

  confirmSaveDraftAndClose(): void {
    if (this.onSaveDraft()) {
      this.close.emit();
    }
  }

  confirmDiscard(): void {
    this.clearDraft();
    this.showExitPrompt = false;
    this.close.emit();
  }

  cancelExitPrompt(): void {
    this.showExitPrompt = false;
  }

  openMapFullscreen(event?: Event): void {
    event?.stopPropagation();
    if (this.isMapExpanded) {
      return;
    }
    this.isMapExpanded = true;
    setTimeout(() => {
      this.mapInstance?.resize();
      if (this.mapInstance) {
        this.captureViewportFromMap(this.mapInstance);
      }
    }, 220);
  }

  closeMapFullscreen(event?: Event): void {
    event?.stopPropagation();
    if (!this.isMapExpanded) {
      return;
    }
    this.isMapExpanded = false;
    setTimeout(() => this.mapInstance?.resize(), 120);
  }

  onSubmit(): void {
    const areaSummary = this.areaSummary;
    this.landArea = areaSummary;
    if (!this.location && this.mapMarker) {
      this.location = `${this.mapMarker.lat.toFixed(6)},${this.mapMarker.lng.toFixed(6)}`;
    }
    const formData = new FormData();
    formData.append('title', this.title);
    formData.append('description', this.description);
    formData.append('purpose', this.purpose);
    formData.append('division', this.division);
    formData.append('district', this.district);
    formData.append('tehsil', this.tehsil);
    formData.append('landArea', areaSummary);
    formData.append('landType', this.landType);
    formData.append('location', this.location);
    formData.append('requiredDate', this.requiredDate);
    formData.append('priority', this.priority || 'Medium');
    formData.append('supportingDocs', this.supportingDocs);
    formData.append('estimatedValue', this.estimatedValue);
    formData.append('remarks', this.remarks);
    formData.append('landBreadth', String(this.landBreadth));
    formData.append('landDepth', String(this.landDepth));
    const govtChecklist = this.extractDueDiligencePayload(this.govtLandResponses);
    if (Object.keys(govtChecklist).length) {
      formData.append('govtLandChecklist', JSON.stringify(govtChecklist));
    }
    const privateChecklist = this.extractDueDiligencePayload(this.privateLandResponses);
    if (Object.keys(privateChecklist).length) {
      formData.append('privateLandChecklist', JSON.stringify(privateChecklist));
    }
    this.attachments.forEach(file => formData.append('attachments', file));
    if (this.mapMarker) {
      formData.append('mapMarker', JSON.stringify(this.mapMarker));
    }
    if (this.drawnFeatures.length) {
      formData.append(
        'mapFeatures',
        JSON.stringify({
          type: 'FeatureCollection',
          features: this.drawnFeatures
        })
      );
    }
    if (this.mapViewport) {
      formData.append('mapViewport', JSON.stringify(this.mapViewport));
    }
    this.requisitionsService.createRequisition(formData).subscribe({
      next: res => {
        try {
          this.snackBar.open('Requisition submitted successfully!', 'Close', { duration: 3000 });
        } catch {
          /* ignore */
        }
        this.clearDraft();
        this.created.emit(res);
        this.close.emit();
      },
      error: err => {
        try {
          this.snackBar.open(
            'Error submitting requisition: ' + (err?.error?.msg || 'Unknown error'),
            'Close',
            { duration: 4000 }
          );
        } catch {
          /* ignore */
        }
      }
    });
  }

  onMapWorkspaceReady(map: MapLibreMap): void {
    // capture viewport updates from the underlying map
    this.mapInstance = map;
    try {
      map.on('moveend', () => this.captureViewportFromMap(map));
      map.on('zoomend', () => this.captureViewportFromMap(map));
      this.applyPendingMapState();
    } catch {
      // ignore errors from third-party map API
    }
  }

  private captureViewportFromMap(map: MapLibreMap | null): void {
    try {
      if (!map) {
        return;
      }
      const center = map.getCenter();
      this.mapViewport = {
        center: { lat: Number(center.lat.toFixed(6)), lng: Number(center.lng.toFixed(6)) },
        zoom: map.getZoom()
      };
    } catch {
      /* ignore */
    }
  }

  onDraftFeatureChange(feature: Feature | null): void {
    if (!feature || !feature.geometry || feature.geometry.type === 'GeometryCollection') {
      this.drawnFeatures = [];
      this.geometrySummaries = [];
      this.mapMarker = null;
      this.location = '';
      return;
    }
    const geometry = feature.geometry;
    if (geometry.type === 'Point') {
      const coords = geometry.coordinates as [number, number];
      const lat = coords[1];
      const lng = coords[0];
      this.mapMarker = { lat, lng };
      this.location = `${lat.toFixed(6)},${lng.toFixed(6)}`;
      this.drawnFeatures = [feature];
      this.geometrySummaries = [`Pushpin • ${lat.toFixed(5)}, ${lng.toFixed(5)}`];
      return;
    }
    // For lines / polygons store as single captured feature
    this.drawnFeatures = [feature];
    this.mapMarker = null;
    let summary = 'Shape captured';
    if (geometry.type === 'Polygon') {
      summary = 'Polygon footprint captured';
    } else if (geometry.type === 'LineString') {
      summary = 'Path captured';
    }
    this.geometrySummaries = [summary];
    this.location = summary;
  }

  private applyPendingMapState(): void {
    const state = this.pendingMapState;
    if (!state) {
      return;
    }
    // if marker exists, set as draft point
    if (state.marker) {
      const f: Feature = { type: 'Feature', geometry: { type: 'Point', coordinates: [state.marker.lng, state.marker.lat] }, properties: {} };
      this.draftFeature = f;
      this.onDraftFeatureChange(f);
    }
    if (state.features && state.features.length) {
      // set the first feature as active draft
      const f = state.features[0] as Feature;
      this.draftFeature = f;
      this.onDraftFeatureChange(f);
    }
    if (state.viewport) {
      this.mapViewport = state.viewport;
      if (this.mapInstance) {
        this.mapInstance.jumpTo({
          center: [state.viewport.center.lng, state.viewport.center.lat],
          zoom: state.viewport.zoom
        });
      }
    }
    if (this.mapInstance) {
      this.pendingMapState = null;
    }
  }
}
