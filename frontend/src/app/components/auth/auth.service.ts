import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = `${environment.apiBaseUrl}/users`;

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, { email, password });
  }

  register(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  getUsers(query?: string): Observable<any[]> {
    const headers = this.buildAuthHeaders();
    let params: HttpParams | undefined;
    if (query) {
      params = new HttpParams().set('query', query);
    }
    return this.http.get<any[]>(`${this.apiUrl}`, { headers, params });
  }

  createUser(payload: any): Observable<any> {
    const headers = this.buildAuthHeaders();
    return this.http.post(`${this.apiUrl}`, payload, { headers });
  }

  updateUser(user: any): Observable<any> {
    const headers = this.buildAuthHeaders();
    const id = user?.id || user?._id;
    if (!id) {
      throw new Error('User identifier is required to update.');
    }
    const payload: any = { ...user };
    delete payload.id;
    delete payload._id;
    return this.http.put(`${this.apiUrl}/${id}`, payload, { headers });
  }

  getUserById(id: string): Observable<any> {
    const headers = this.buildAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/${id}`, { headers });
  }

  private buildAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }
}
