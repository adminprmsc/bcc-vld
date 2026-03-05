import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { WaterQualitySample } from './water-quality-sample.model';
import { environment } from '../../../../environments/environment';

export interface WaterQualitySampleQuery {
  status?: string;
  tehsil?: string;
  planId?: string;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class WaterQualitySamplesService {
  private readonly apiUrl = `${environment.apiBaseUrl}/water-quality-samples`;

  constructor(private readonly http: HttpClient) {}

  listSamples(query?: WaterQualitySampleQuery): Observable<WaterQualitySample[]> {
    const params = this.buildParams(query);
    return this.http
      .get<WaterQualitySample[]>(this.apiUrl, {
        params,
        headers: this.buildHeaders({ json: false })
      })
      .pipe(map(response => Array.isArray(response) ? response : []));
  }

  getSample(id: string): Observable<WaterQualitySample> {
    return this.http.get<WaterQualitySample>(`${this.apiUrl}/${id}`, {
      headers: this.buildHeaders({ json: false })
    });
  }

  flagAsset(payload: { planId: string; reason?: string }): Observable<WaterQualitySample> {
    return this.http.post<WaterQualitySample>(this.apiUrl, payload, {
      headers: this.buildHeaders()
    });
  }

  startCollection(sampleId: string, payload: { collectedAt?: string; fieldNotes?: string; location?: { lat: number; lng: number } | null }): Observable<WaterQualitySample> {
    return this.http.post<WaterQualitySample>(`${this.apiUrl}/${sampleId}/collection`, payload, {
      headers: this.buildHeaders()
    });
  }

  completeCollection(
    sampleId: string,
    payload: {
      collectedAt?: string;
      fieldNotes?: string;
      location?: { lat: number; lng: number } | null;
      attachments?: File[];
    }
  ): Observable<WaterQualitySample> {
    const form = new FormData();
    if (payload.collectedAt) {
      form.append('collectedAt', payload.collectedAt);
    }
    if (payload.fieldNotes) {
      form.append('fieldNotes', payload.fieldNotes);
    }
    if (payload.location) {
      form.append('location', JSON.stringify(payload.location));
    }
    (payload.attachments || []).forEach(file => form.append('attachments', file));

    return this.http.post<WaterQualitySample>(`${this.apiUrl}/${sampleId}/collection/complete`, form, {
      headers: this.buildHeaders({ json: false })
    });
  }

  submitLabResults(
    sampleId: string,
    payload: {
      receivedAt?: string;
      completedAt?: string;
      notes?: string;
      metrics?: Record<string, unknown>;
    },
    attachments: File[]
  ): Observable<WaterQualitySample> {
    const form = new FormData();
    if (payload.receivedAt) {
      form.append('receivedAt', payload.receivedAt);
    }
    if (payload.completedAt) {
      form.append('completedAt', payload.completedAt);
    }
    if (payload.notes) {
      form.append('notes', payload.notes);
    }
    if (payload.metrics) {
      form.append('metrics', JSON.stringify(payload.metrics));
    }
    (attachments || []).forEach(file => form.append('attachments', file));

    return this.http.post<WaterQualitySample>(`${this.apiUrl}/${sampleId}/lab`, form, {
      headers: this.buildHeaders({ json: false })
    });
  }

  listByPlan(planId: string, limit = 50): Observable<WaterQualitySample[]> {
    const params = new HttpParams().set('limit', String(limit > 0 ? limit : 50));
    return this.http
      .get<WaterQualitySample[]>(`${this.apiUrl}/plans/${planId}`, {
        params,
        headers: this.buildHeaders({ json: false })
      })
      .pipe(map(response => Array.isArray(response) ? response : []));
  }

  private buildParams(query?: WaterQualitySampleQuery): HttpParams {
    let params = new HttpParams();
    if (!query) {
      return params;
    }
    if (query.status) {
      params = params.set('status', query.status);
    }
    if (query.tehsil) {
      params = params.set('tehsil', query.tehsil);
    }
    if (query.planId) {
      params = params.set('planId', query.planId);
    }
    if (query.limit) {
      params = params.set('limit', String(query.limit));
    }
    return params;
  }

  private buildHeaders(options?: { json?: boolean }): HttpHeaders {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    if (options?.json !== false) {
      headers = headers.set('Content-Type', 'application/json');
    }
    return headers;
  }
}
