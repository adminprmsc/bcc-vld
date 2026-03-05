import { Component, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RequisitionsService } from '../../requisitions/requisitions.service';
import { NotificationService } from '../../shared/notification.service';
import { MapWorkspaceComponent, MapWorkspacePlan } from '../../shared/maps/map-workspace.component';
import type { Feature } from 'geojson';

interface LandActivityMetrics {
  totalSites: number;
  activeStructures: number;
  activeMachinery: number;
  latestProgressDate: string | null;
}

@Component({
  selector: 'app-land-activity-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MapWorkspaceComponent],
  templateUrl: './land-activity-dashboard.html',
  styleUrl: './land-activity-dashboard.scss'
})
export class LandActivityDashboard implements OnInit {
  private requisitionsService = inject(RequisitionsService);
  private notificationService = inject(NotificationService);
  private fb = inject(FormBuilder);
  @ViewChild(MapWorkspaceComponent) mapWorkspace?: MapWorkspaceComponent;

  readonly loading = signal(false);
  readonly requisitions = signal<any[]>([]);
  readonly selectedRequisition = signal<any | null>(null);
  readonly filterTehsil = signal('');
  readonly searchTerm = signal('');

  readonly overviewForm = this.fb.nonNullable.group({
    phase: [''],
    summary: [''],
    nextMilestone: ['']
  });

  readonly structureForm = this.fb.group({
    name: ['', Validators.required],
    category: [''],
    status: ['Under Construction'],
    description: [''],
    attributesJson: ['']
  });
  structurePhotos: File[] = [];

  readonly machineryForm = this.fb.group({
    name: ['', Validators.required],
    type: [''],
    status: ['Operational'],
    capacity: [''],
    manufacturer: [''],
    attributesJson: ['']
  });
  machineryPhotos: File[] = [];

  readonly progressForm = this.fb.group({
    status: ['', Validators.required],
    description: [''],
    progressDate: [new Date().toISOString().substring(0, 10)],
    completionPercentage: [null]
  });
  progressPhotos: File[] = [];

  readonly filteredRequisitions = computed(() => {
    const tehsilFilter = (this.filterTehsil() || '').toLowerCase();
    const query = (this.searchTerm() || '').toLowerCase();
    return this.requisitions().filter(req => {
      const tehsil = (req.tehsil || '').toLowerCase();
      const title = (req.title || '').toLowerCase();
      const purpose = (req.purpose || '').toLowerCase();
      const matchesTehsil = !tehsilFilter || tehsil.includes(tehsilFilter);
      const matchesQuery = !query || title.includes(query) || purpose.includes(query);
      const hasUtilisation = req.landUtilization && (
        (req.landUtilization.civilStructures || []).length > 0 ||
        (req.landUtilization.machinery || []).length > 0 ||
        (req.landUtilization.progressUpdates || []).length > 0
      );
      const landReady = this.isLandAcquisitionComplete(req);
      return matchesTehsil && matchesQuery && (hasUtilisation || landReady);
    });
  });

  readonly mapPlans = computed<MapWorkspacePlan[]>(() => this.buildMapPlans(this.filteredRequisitions()));

  readonly highlightedPlanId = computed(() => {
    const plans = this.mapPlans();
    const selected = this.selectedRequisition();
    if (!selected) {
      return null;
    }
    const prefix = this.planIdPrefixFor(selected);
    const match = plans.find(plan => plan.id.startsWith(prefix));
    return match?.id ?? null;
  });

  readonly metrics = computed<LandActivityMetrics>(() => {
    const list = this.filteredRequisitions();
    const structures = list.reduce((acc, r) => acc + (r.landUtilization?.civilStructures?.length || 0), 0);
    const machinery = list.reduce((acc, r) => acc + (r.landUtilization?.machinery?.length || 0), 0);
    const latest = list
      .flatMap(r => (r.landUtilization?.progressUpdates || []))
      .map(item => (item.progressDate ? new Date(item.progressDate).getTime() : 0))
      .filter(Boolean)
      .sort((a, b) => b - a)[0];
    return {
      totalSites: list.length,
      activeStructures: structures,
      activeMachinery: machinery,
      latestProgressDate: latest ? new Date(latest).toLocaleDateString() : null
    };
  });

  ngOnInit(): void {
    this.loadRequisitions();
  }

  trackById(_: number, item: any): string {
    return item?._id || item?.id;
  }

  onSelectRequisition(req: any): void {
    if (!req) {
      this.selectedRequisition.set(null);
      return;
    }
    this.selectedRequisition.set(req);
    this.patchOverviewForm(req);
    this.focusSelectedPlan();
  }

  onOverviewSubmit(): void {
    const selected = this.selectedRequisition();
    if (!selected) {
      return;
    }
    const payload = this.overviewForm.getRawValue();
    this.requisitionsService.updateLandUtilizationOverview(selected._id, payload).subscribe({
      next: updated => {
        this.handleRequisitionUpdate(updated);
        this.notificationService.push('Utilization overview updated', { type: 'success' });
      },
      error: err => this.handleError('Unable to update overview', err)
    });
  }

  onStructureFilesChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.structurePhotos = target.files ? Array.from(target.files) : [];
  }

  onStructureSubmit(): void {
    const selected = this.selectedRequisition();
    if (!selected || this.structureForm.invalid) {
      this.structureForm.markAllAsTouched();
      return;
    }
    const raw = this.structureForm.getRawValue();
    let attributes: Record<string, any> | undefined;
    if (raw.attributesJson) {
      try {
        attributes = JSON.parse(raw.attributesJson);
      } catch (err) {
        this.notificationService.push('Structure attributes must be valid JSON', { type: 'critical' });
        return;
      }
    }
    this.requisitionsService.addCivilStructure(selected._id, {
      name: raw.name!,
      category: raw.category || undefined,
      status: raw.status || undefined,
      description: raw.description || undefined,
      attributes,
      photos: this.structurePhotos
    }).subscribe({
      next: updated => {
        this.structureForm.reset({ status: 'Under Construction' });
        this.structurePhotos = [];
        this.handleRequisitionUpdate(updated);
        this.notificationService.push('Structure recorded successfully', { type: 'success' });
      },
      error: err => this.handleError('Unable to add structure', err)
    });
  }

  onMachineryFilesChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.machineryPhotos = target.files ? Array.from(target.files) : [];
  }

  onMachinerySubmit(): void {
    const selected = this.selectedRequisition();
    if (!selected || this.machineryForm.invalid) {
      this.machineryForm.markAllAsTouched();
      return;
    }
    const raw = this.machineryForm.getRawValue();
    let attributes: Record<string, any> | undefined;
    if (raw.attributesJson) {
      try {
        attributes = JSON.parse(raw.attributesJson);
      } catch (err) {
        this.notificationService.push('Machinery attributes must be valid JSON', { type: 'critical' });
        return;
      }
    }
    this.requisitionsService.addMachinery(selected._id, {
      name: raw.name!,
      type: raw.type || undefined,
      status: raw.status || undefined,
      capacity: raw.capacity || undefined,
      manufacturer: raw.manufacturer || undefined,
      attributes,
      photos: this.machineryPhotos
    }).subscribe({
      next: updated => {
        this.machineryForm.reset({ status: 'Operational' });
        this.machineryPhotos = [];
        this.handleRequisitionUpdate(updated);
        this.notificationService.push('Machinery logged successfully', { type: 'success' });
      },
      error: err => this.handleError('Unable to add machinery', err)
    });
  }

  onProgressFilesChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.progressPhotos = target.files ? Array.from(target.files) : [];
  }

  onProgressSubmit(): void {
    const selected = this.selectedRequisition();
    if (!selected || this.progressForm.invalid) {
      this.progressForm.markAllAsTouched();
      return;
    }
    const raw = this.progressForm.getRawValue();
    this.requisitionsService.addProgressUpdate(selected._id, {
      status: raw.status!,
      description: raw.description || undefined,
      progressDate: raw.progressDate || undefined,
      completionPercentage: raw.completionPercentage === null ? undefined : raw.completionPercentage || undefined,
      photos: this.progressPhotos
    }).subscribe({
      next: updated => {
        this.progressForm.reset({ progressDate: new Date().toISOString().substring(0, 10) });
        this.progressPhotos = [];
        this.handleRequisitionUpdate(updated);
        this.notificationService.push('Progress update captured', { type: 'success' });
      },
      error: err => this.handleError('Unable to log progress', err)
    });
  }

  onFilterTehsil(tehsil: string): void {
    this.filterTehsil.set(tehsil);
    this.ensureMapFits();
  }

  onSearchTerm(term: string): void {
    this.searchTerm.set(term);
    this.ensureMapFits();
  }

  galleryForSelected(): string[] {
    const selected = this.selectedRequisition();
    if (!selected) {
      return [];
    }
    return Array.isArray(selected.landUtilization?.gallery) ? selected.landUtilization.gallery : [];
  }

  private loadRequisitions(): void {
    this.loading.set(true);
    this.requisitionsService.getRequisitions().subscribe({
      next: data => {
        const enriched = Array.isArray(data) ? data.map(item => this.normalize(item)) : [];
        this.requisitions.set(enriched);
        const filtered = this.filteredRequisitions();
        const current = this.selectedRequisition();
        if (current) {
          const refreshed = enriched.find(r => r._id === current._id);
          if (refreshed) {
            this.onSelectRequisition(refreshed);
          }
        }
        const selectedAfterRefresh = this.selectedRequisition();
        if (!selectedAfterRefresh && filtered.length) {
          this.onSelectRequisition(filtered[0]);
        } else if (selectedAfterRefresh && filtered.length) {
          const selectedId = selectedAfterRefresh._id;
          if (!filtered.some(r => r._id === selectedId)) {
            this.onSelectRequisition(filtered[0]);
          }
        } else if (!filtered.length) {
          this.onSelectRequisition(null);
        }
        this.loading.set(false);
        this.ensureMapFits();
      },
      error: err => {
        this.loading.set(false);
        this.handleError('Unable to load land activity data', err);
      }
    });
  }

  private handleRequisitionUpdate(updated: any): void {
    if (!updated?._id) {
      return;
    }
    const normalized = this.normalize(updated);
    const list = this.requisitions().map(item => (item._id === normalized._id ? normalized : item));
    if (!list.find(item => item._id === normalized._id)) {
      list.push(normalized);
    }
    this.requisitions.set(list);
    this.onSelectRequisition(normalized);
    this.ensureMapFits();
  }

  private normalize(item: any): any {
    const utilization = item.landUtilization || {};
    utilization.civilStructures = Array.isArray(utilization.civilStructures) ? utilization.civilStructures : [];
    utilization.machinery = Array.isArray(utilization.machinery) ? utilization.machinery : [];
    utilization.progressUpdates = Array.isArray(utilization.progressUpdates) ? utilization.progressUpdates : [];
    utilization.gallery = Array.isArray(utilization.gallery) ? utilization.gallery : [];
    return {
      ...item,
      landUtilization: utilization,
      __mapKey: this.computeRequisitionKey(item)
    };
  }

  private isLandAcquisitionComplete(req: any): boolean {
    const acquisitionStatus = (req?.landAcquisition?.status || req?.status || '').toString().trim().toLowerCase();
    return acquisitionStatus === 'acquisition complete';
  }

  private patchOverviewForm(req: any): void {
    const overview = req.landUtilization?.overview || {};
    this.overviewForm.patchValue({
      phase: overview.phase || '',
      summary: overview.summary || '',
      nextMilestone: overview.nextMilestone || ''
    });
  }

  private handleError(message: string, err: any): void {
    console.error(message, err);
    const detail = err?.error?.msg || err?.message || 'Unknown error';
    this.notificationService.push(`${message}: ${detail}`, { type: 'critical' });
  }

  private ensureMapFits(): void {
    setTimeout(() => this.mapWorkspace?.fitToPlans(), 150);
  }

  private focusSelectedPlan(): void {
    const planId = this.highlightedPlanId();
    if (!planId) {
      return;
    }
    setTimeout(() => this.mapWorkspace?.focusOnPlan(planId), 120);
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

      const prefix = this.planIdPrefixFor(req, index);
      const title = req.title || `Utilization Site ${index + 1}`;
      const phase = (req.landUtilization?.overview?.phase || '').toString().trim() || 'Phase TBD';
      const latestProgress = this.latestProgressDate(req);
      const commissioningDate = latestProgress ? new Date(latestProgress).toISOString() : null;

      const baseAttributes = this.buildPlanAttributes(req, phase, latestProgress);
      const features = this.normalizeFeatures(req.mapFeatures);

      if (features.length) {
        features.forEach((feature: Feature, featureIndex: number) => {
          const planId = `${prefix}-f${featureIndex}`;
          const cloned = this.cloneFeature(feature);
          cloned.properties = {
            ...(cloned.properties ?? {}),
            title,
            status: phase,
            tehsil: req.tehsil || '',
            priority: req.priority || ''
          };
          plans.push({
            id: planId,
            title,
            category: phase,
            commissioningDate,
            nextMaintenanceDate: null,
            expectedLifespanYears: null,
            feature: cloned,
            attributes: { ...baseAttributes }
          });
        });
        return;
      }

      const coords = this.normalizeCoordinates(req?.location?.coordinates || req?.location || req?.mapMarker);
      if (!coords) {
        return;
      }

      plans.push({
        id: `${prefix}-point`,
        title,
        category: phase,
        commissioningDate,
        nextMaintenanceDate: null,
        expectedLifespanYears: null,
        feature: {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [coords.lng, coords.lat]
          },
          properties: {
            title,
            status: phase,
            tehsil: req.tehsil || '',
            priority: req.priority || ''
          }
        },
        attributes: { ...baseAttributes }
      });
    });

    return plans;
  }

  private buildPlanAttributes(req: any, phase: string, latestProgress: Date | null): Record<string, unknown> {
    const attributes: Record<string, unknown> = {};
    const add = (label: string, value: unknown, formatter?: (value: unknown) => string) => {
      if (value === null || value === undefined) {
        return;
      }
      let display = formatter ? formatter(value) : String(value);
      if (!String(display).trim()) {
        return;
      }
      attributes[label] = display;
    };

    add('Requisition #', req.sequenceNumber || req.referenceId || req.requestNumber || req._id);
    add('Status', req.status);
    add('Tehsil', req.tehsil);
    add('Purpose', req.purpose);
    add('Phase', phase);
    add('Structures Logged', req.landUtilization?.civilStructures?.length || 0);
    add('Machinery Logged', req.landUtilization?.machinery?.length || 0);
    add('Last Progress Update', latestProgress, value => this.formatDate(value));
    add('Total Progress Entries', req.landUtilization?.progressUpdates?.length || 0);
    add('Land Ready', this.isLandAcquisitionComplete(req) ? 'Yes' : 'No');

    if (req.landUtilization?.overview?.nextMilestone) {
      add('Next Milestone', req.landUtilization.overview.nextMilestone);
    }

    if (req.landUtilization?.overview?.summary) {
      add('Summary', req.landUtilization.overview.summary);
    }

    if (req.location?.address) {
      add('Address', req.location.address);
    }

    const coords = this.normalizeCoordinates(req?.location?.coordinates || req?.location || req?.mapMarker);
    if (coords) {
      add('Coordinates', `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);
    }

    return attributes;
  }

  private planIdPrefixFor(req: any, fallbackIndex = 0): string {
    const key = req?.__mapKey || this.computeRequisitionKey(req, fallbackIndex);
    return `req-${key}`;
  }

  private computeRequisitionKey(item: any, fallbackIndex = 0): string {
    const candidates: Array<string | number | undefined> = [
      item?.sequenceNumber,
      item?.referenceNumber,
      item?.referenceId,
      item?.requestNumber,
      item?._id,
      item?.id,
      item?.title
    ];
    const raw = candidates
      .map(value => {
        if (typeof value === 'number') {
          return value.toString();
        }
        if (typeof value === 'string' && value.trim()) {
          return value.trim();
        }
        return null;
      })
      .find(Boolean);

    if (raw) {
      return this.sanitizeKey(raw as string);
    }

    return this.sanitizeKey(`site-${fallbackIndex}`);
  }

  private sanitizeKey(value: string): string {
    const sanitized = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return sanitized || 'site';
  }

  private normalizeCoordinates(coords: any): { lat: number; lng: number } | null {
    if (!coords) {
      return null;
    }

    if (Array.isArray(coords)) {
      const [first, second] = coords;
      const lngFirst = Number(first);
      const latSecond = Number(second);
      if (Number.isFinite(latSecond) && Number.isFinite(lngFirst)) {
        return { lat: latSecond, lng: lngFirst };
      }
      const latFirst = Number(first);
      const lngSecond = Number(second);
      if (Number.isFinite(latFirst) && Number.isFinite(lngSecond)) {
        return { lat: latFirst, lng: lngSecond };
      }
    }

    const latCandidates = [coords.lat, coords.latitude, coords.y, coords.latLng?.lat];
    const lngCandidates = [coords.lng, coords.longitude, coords.x, coords.latLng?.lng];
    const lat = latCandidates.map(value => Number(value)).find(value => Number.isFinite(value));
    const lng = lngCandidates.map(value => Number(value)).find(value => Number.isFinite(value));

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

  private formatDate(value: unknown): string {
    if (!value) {
      return '';
    }
    if (value instanceof Date) {
      return value.toLocaleDateString();
    }
    const parsed = new Date(value as string);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleDateString();
  }

  private latestProgressDate(req: any): Date | null {
    const updates = Array.isArray(req?.landUtilization?.progressUpdates)
      ? req.landUtilization.progressUpdates
      : [];
    if (!updates.length) {
      return null;
    }
    const timestamps = updates
      .map((entry: any): number => (entry?.progressDate ? new Date(entry.progressDate).getTime() : NaN))
  .filter((time: number): time is number => Number.isFinite(time))
  .sort((a: number, b: number) => b - a);
    if (!timestamps.length) {
      return null;
    }
    return new Date(timestamps[0]);
  }

  private cloneFeature(feature: Feature): Feature {
    try {
      return JSON.parse(JSON.stringify(feature));
    } catch {
      return feature;
    }
  }
}
