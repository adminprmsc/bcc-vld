import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { map, Observable, of } from 'rxjs';
import type { ConsultantPlan, ConsultantPlanAttachment } from './consultant-plan.model';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ConsultantPlansService {
  private readonly apiUrl = `${environment.apiBaseUrl}/consultant-plans`;

  constructor(private http: HttpClient) {}

  uploadAttachments(files: File[]): Observable<ConsultantPlanAttachment[]> {
    if (!files.length) {
      return of([]);
    }

    const formData = new FormData();
    files.forEach(file => formData.append('attachments', file));

    return this.http
      .post<{ attachments: ConsultantPlanAttachment[] }>(
        `${this.apiUrl}/upload`,
        formData,
        { headers: this.buildHeaders({ json: false }) }
      )
      .pipe(map(response => response.attachments ?? []));
  }

  getDefinitions(): Observable<any[]> {
  return this.http.get<any[]>(`${this.apiUrl}/definitions`, { headers: this.buildHeaders({ json: false }) });
  }

  listPlans(filters?: {
    tehsil?: string;
    district?: string;
    category?: string;
    assetType?: string;
    requisitionId?: string;
    search?: string;
  }): Observable<ConsultantPlan[]> {
    let params = new HttpParams();
    if (filters) {
      params = appendIfPresent(params, 'tehsil', filters.tehsil);
      params = appendIfPresent(params, 'district', filters.district);
      params = appendIfPresent(params, 'category', filters.category);
      params = appendIfPresent(params, 'assetType', filters.assetType);
      params = appendIfPresent(params, 'requisitionId', filters.requisitionId);
      params = appendIfPresent(params, 'search', filters.search);
    }
    return this.http.get<ConsultantPlan[]>(this.apiUrl, { headers: this.buildHeaders({ json: false }), params });
  }

  createPlan(payload: any): Observable<ConsultantPlan> {
    return this.http.post<ConsultantPlan>(this.apiUrl, payload, { headers: this.buildHeaders() });
  }

  updatePlan(id: string, payload: any): Observable<ConsultantPlan> {
    return this.http.patch<ConsultantPlan>(`${this.apiUrl}/${id}`, payload, { headers: this.buildHeaders() });
  }

  deletePlan(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.buildHeaders({ json: false }) });
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

function appendIfPresent(params: HttpParams, key: string, value: string | null | undefined): HttpParams {
  if (value === null || value === undefined) {
    return params;
  }
  const text = value.toString().trim();
  if (!text) {
    return params;
  }
  return params.set(key, text);
}
