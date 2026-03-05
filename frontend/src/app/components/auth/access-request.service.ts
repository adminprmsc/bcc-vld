import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AccessRequestService {
  private readonly apiUrl = `${environment.apiBaseUrl}/access-requests`;

  constructor(private readonly http: HttpClient) {}

  submit(payload: any): Observable<any> {
    return this.http.post(this.apiUrl, payload);
  }

  list(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl, { headers: this.buildAuthHeaders() });
  }

  approve(id: string, payload?: { notes?: string; role?: string }): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/approve`, payload ?? {}, { headers: this.buildAuthHeaders() });
  }

  reject(id: string, payload?: { notes?: string }): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/reject`, payload ?? {}, { headers: this.buildAuthHeaders() });
  }

  private buildAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }
}
