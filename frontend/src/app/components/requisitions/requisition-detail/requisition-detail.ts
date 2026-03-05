import { Component, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapWorkspaceComponent, MapWorkspacePlan } from '../../shared/maps/map-workspace.component';
import type { Feature } from 'geojson';

@Component({
  selector: 'app-requisition-detail',
  standalone: true,
  imports: [CommonModule, MapWorkspaceComponent],
  templateUrl: './requisition-detail.html',
  styleUrl: './requisition-detail.scss'
})
export class RequisitionDetail implements OnChanges {
  @Input() requisition: any | null = null;

  @ViewChild(MapWorkspaceComponent) map?: MapWorkspaceComponent;

  plans: MapWorkspacePlan[] = [];
  highlightedPlanId: string | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['requisition']) {
      this.updatePlansFromRequisition();
    }
  }

  private updatePlansFromRequisition(): void {
    const req = this.requisition;
    this.plans = [];
    this.highlightedPlanId = null;
    if (!req) {
      return;
    }

    const plans = this.buildPlans(req);
    this.plans = plans;
    this.highlightedPlanId = plans[0]?.id ?? null;

    if (this.highlightedPlanId) {
      setTimeout(() => this.map?.focusOnPlan(this.highlightedPlanId), 120);
    }
  }

  private buildPlans(req: any): MapWorkspacePlan[] {
    const title = req?.title || 'Requisition';
    const category = this.statusLabel(req?.status);
    const commissioningDate = req?.requiredDate instanceof Date
      ? req.requiredDate.toISOString()
      : req?.requiredDate
      ? new Date(req.requiredDate).toISOString()
      : null;
    const attributes = this.buildAttributes(req);
    const features = this.normalizeFeatures(req?.mapFeatures);
    const baseId = String(req?._id || req?.id || 'req');

    if (features.length) {
      return features.map((feature: Feature, index: number) => {
        const cloned = this.cloneFeature(feature);
        cloned.properties = {
          ...(cloned.properties ?? {}),
          title,
          status: category,
          priority: req?.priority || '',
          tehsil: req?.tehsil || '',
        };
        return {
          id: `${baseId}-${index}`,
          title,
          category,
          commissioningDate,
          nextMaintenanceDate: null,
          expectedLifespanYears: null,
          feature: cloned,
          attributes: {
            ...attributes,
            ...this.extractFeatureAttributes(cloned),
          },
        };
      });
    }

    const coords = this.normalizeCoordinates(req?.location?.coordinates || req?.location);
    if (!coords) {
      return [];
    }

    const pointFeature: Feature = {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [coords.lng, coords.lat],
      },
      properties: {
        title,
        status: category,
        priority: req?.priority || '',
        tehsil: req?.tehsil || '',
      },
    };

    return [
      {
        id: baseId,
        title,
        category,
        commissioningDate,
        nextMaintenanceDate: null,
        expectedLifespanYears: null,
        feature: pointFeature,
        attributes,
      },
    ];
  }

  private buildAttributes(req: any): Record<string, unknown> {
    const attributes: Record<string, unknown> = {};
    const add = (label: string, value: unknown, formatter?: (value: unknown) => string) => {
      if (value === null || value === undefined) {
        return;
      }
      let display = formatter ? formatter(value) : String(value);
      if (typeof value === 'number' && !formatter) {
        display = value.toLocaleString();
      }
      if (!String(display).trim()) {
        return;
      }
      attributes[label] = display;
    };

    add('Status', this.statusLabel(req?.status));
    add('Priority', req?.priority);
    add('Division', req?.division);
    add('District', req?.district);
    add('Tehsil', req?.tehsil);
    add('Land Type', req?.landType);
    add('Land Area', this.formatArea(req));
    add('Land Breadth (ft)', req?.landBreadth);
    add('Land Depth (ft)', req?.landDepth);
    add('Purpose', req?.purpose);
    add('Reference ID', req?.referenceId || req?.caseId || req?.requestNumber);

    if (req?.requiredDate) {
      add(
        'Required Date',
        req.requiredDate,
        (value) =>
          value instanceof Date
            ? value.toLocaleDateString()
            : new Date(value as string).toLocaleDateString()
      );
    }

    if (req?.createdAt) {
      add(
        'Submitted On',
        req.createdAt,
        (value) =>
          value instanceof Date
            ? value.toLocaleString()
            : new Date(value as string).toLocaleString()
      );
    }

    if (req?.updatedAt) {
      add(
        'Last Updated',
        req.updatedAt,
        (value) =>
          value instanceof Date
            ? value.toLocaleString()
            : new Date(value as string).toLocaleString()
      );
    }

    if (req?.estimatedValue) {
      add('Estimated Value (PKR)', req.estimatedValue, (value) => {
        const numeric = Number(value);
        if (!Number.isNaN(numeric) && Number.isFinite(numeric)) {
          return numeric.toLocaleString();
        }
        return String(value);
      });
    }

    if (Array.isArray(req?.supportingDocs) && req.supportingDocs.length) {
      add('Supporting Documents', req.supportingDocs.length, (value) => `${value}`);
    }

    if (req?.location?.coordinateString) {
      add('Coordinates', req.location.coordinateString);
    }
    if (req?.location?.address) {
      add('Address', req.location.address);
    }

    add('Remarks', req?.remarks);

    return attributes;
  }

  private formatArea(req: any): string {
    const breadth = Number(req?.landBreadth) || 0;
    const depth = Number(req?.landDepth) || 0;
    if (!breadth || !depth) {
      return req?.landArea || '';
    }
    const areaSqFt = breadth * depth;
    const areaMarla = areaSqFt / 272.25;
    const areaKanal = areaSqFt / 5445;
    return `${areaSqFt.toLocaleString()} sq ft | ${areaMarla.toFixed(2)} marla | ${areaKanal.toFixed(2)} kanal`;
  }

  private statusLabel(status: string | null | undefined): string {
    const value = (status || '').toLowerCase();
    if (!value) {
      return 'Pending';
    }
    if (value.includes('approve')) return 'Approved';
    if (value.includes('reject')) return 'Rejected';
    if (value.includes('assign') || value.includes('progress')) return 'In Progress';
    return 'Pending';
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
        .map(entry => this.cloneFeature(entry as Feature));
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

  private normalizeCoordinates(source: any): { lat: number; lng: number } | null {
    if (!source) {
      return null;
    }
    if (Array.isArray(source)) {
      if (source.length >= 2) {
        const lng = Number(source[0]);
        const lat = Number(source[1]);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          return { lat, lng };
        }
      }
    }
    const latCandidates = [source.lat, source.latitude, source.y, source?.center?.lat];
    const lngCandidates = [source.lng, source.longitude, source.x, source?.center?.lng];
    const lat = latCandidates.map(v => Number(v)).find(v => Number.isFinite(v));
    const lng = lngCandidates.map(v => Number(v)).find(v => Number.isFinite(v));
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat: lat as number, lng: lng as number };
    }
    return null;
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
}
