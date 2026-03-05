import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class RequisitionsService {
  private readonly apiUrl = `${environment.apiBaseUrl}/requisition`;

  constructor(private http: HttpClient) {}

  createRequisition(data: any): Observable<any> {
  const token = localStorage.getItem('token');
  const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  return this.http.post(`${this.apiUrl}`, data, { headers: headers });
  }

  getRequisitions(): Observable<any[]> {
    const token = localStorage.getItem('token');
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
    return this.http.get<any[]>(`${this.apiUrl}`, { headers });
  }

  getRequisitionById(id: string): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
    return this.http.get<any>(`${this.apiUrl}/${id}`, { headers });
  }

  downloadRequisitionPdf(id: string): Observable<Blob> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.get(`${this.apiUrl}/${id}/pdf`, {
      headers,
      responseType: 'blob' as 'json'
    }) as Observable<Blob>;
  }

  downloadDueDiligencePdf(id: string): Observable<Blob> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.get(`${this.apiUrl}/${id}/due-diligence-pdf`, {
      headers,
      responseType: 'blob' as 'json'
    }) as Observable<Blob>;
  }

  // Workflow APIs
  dmForwardToBcc(id: string, remarks: string, officerId?: string): Observable<any> {
    return this.patchWithRemarks(`${this.apiUrl}/${id}/dm-forward-bcc`, remarks, officerId);
  }

  bccForwardToTm(id: string, remarks: string, officerId?: string): Observable<any> {
    return this.patchWithRemarks(`${this.apiUrl}/${id}/bcc-forward-tm`, remarks, officerId);
  }

  tmForwardToChief(id: string, remarks: string, officerId?: string): Observable<any> {
    return this.patchWithRemarks(`${this.apiUrl}/${id}/tm-forward-chief`, remarks, officerId);
  }

  chiefForwardToBcc(id: string, remarks: string, officerId?: string): Observable<any> {
    return this.patchWithRemarks(`${this.apiUrl}/${id}/chief-forward-bcc`, remarks, officerId);
  }

  bccForwardToWb(id: string, remarks: string, officerId?: string): Observable<any> {
    return this.patchWithRemarks(`${this.apiUrl}/${id}/bcc-forward-wb`, remarks, officerId);
  }

  wbApprove(id: string, remarks: string, officerId?: string): Observable<any> {
    return this.patchWithRemarks(`${this.apiUrl}/${id}/wb-approve`, remarks, officerId);
  }

  chiefMarkToTm(id: string, remarks: string, officerId?: string): Observable<any> {
    return this.patchWithRemarks(`${this.apiUrl}/${id}/chief-mark-tm`, remarks, officerId);
  }

  tmForwardToBcc(id: string, remarks: string, officerId?: string): Observable<any> {
    return this.patchWithRemarks(`${this.apiUrl}/${id}/tm-forward-bcc`, remarks, officerId);
  }

  bccCloseCase(id: string, remarks: string): Observable<any> {
    return this.patchWithRemarks(`${this.apiUrl}/${id}/bcc-close`, remarks);
  }

  private patchWithRemarks(endpoint: string, remarks: string, officerId?: string): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
    const payload: any = { remarks };
    if (officerId) {
      payload.officerId = officerId;
    }
    return this.http.patch(endpoint, payload, { headers });
  }

  updateMap(
    id: string,
    payload: {
      location?: any;
      locationAddress?: string;
      mapMarker?: { lat: number; lng: number } | null;
      mapFeatures?: any;
      mapViewport?: any;
    }
  ): Observable<any> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.patch(`${this.apiUrl}/${id}/map`, payload, { headers });
  }

  revertRequisition(id: string, remarks: string, toStatus?: string): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
    const payload: any = { remarks };
    if (toStatus) {
      payload.toStatus = toStatus;
    }
    return this.http.patch(`${this.apiUrl}/${id}/revert`, payload, { headers });
  }

  updateLandAcquisition(
    id: string,
    data: {
      type: string;
      status: string;
      donorDetails: any;
      landDetails: any;
      donationDetails: any;
      verification: any;
      keepAttachments: string[];
      ownershipProof?: File;
      attachedDocuments?: File[];
    }
  ): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
    const formData = new FormData();

    if (data.type) {
      formData.append('type', data.type);
    }
    if (data.status) {
      formData.append('status', data.status);
    }

    formData.append('donorDetails', JSON.stringify(data.donorDetails || {}));
    formData.append('landDetails', JSON.stringify(data.landDetails || {}));
    formData.append('donationDetails', JSON.stringify(data.donationDetails || {}));
    formData.append('verification', JSON.stringify(data.verification || {}));
    formData.append('keepAttachments', JSON.stringify(data.keepAttachments || []));

    if (data.ownershipProof) {
      formData.append('ownershipProof', data.ownershipProof);
    }

    (data.attachedDocuments || []).forEach(file => {
      formData.append('attachedDocuments', file);
    });

    return this.http.patch(`${this.apiUrl}/${id}/land-acquisition`, formData, { headers });
  }

  updateLandUtilizationOverview(
    id: string,
    overview: { phase?: string; summary?: string; nextMilestone?: string }
  ): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
    return this.http.patch(`${this.apiUrl}/${id}/land-utilization/overview`, overview, { headers });
  }

  addCivilStructure(
    id: string,
    payload: {
      name: string;
      category?: string;
      status?: string;
      description?: string;
      attributes?: Record<string, unknown>;
      photos?: File[];
    }
  ): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
    const formData = new FormData();
    formData.append('name', payload.name);
    if (payload.category) {
      formData.append('category', payload.category);
    }
    if (payload.status) {
      formData.append('status', payload.status);
    }
    if (payload.description) {
      formData.append('description', payload.description);
    }
    if (payload.attributes && Object.keys(payload.attributes).length) {
      formData.append('attributes', JSON.stringify(payload.attributes));
    }
    (payload.photos || []).forEach(file => formData.append('photos', file));
    return this.http.post(`${this.apiUrl}/${id}/land-utilization/civil-structures`, formData, { headers });
  }

  addMachinery(
    id: string,
    payload: {
      name: string;
      type?: string;
      status?: string;
      capacity?: string;
      manufacturer?: string;
      attributes?: Record<string, unknown>;
      photos?: File[];
    }
  ): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
    const formData = new FormData();
    formData.append('name', payload.name);
    if (payload.type) {
      formData.append('type', payload.type);
    }
    if (payload.status) {
      formData.append('status', payload.status);
    }
    if (payload.capacity) {
      formData.append('capacity', payload.capacity);
    }
    if (payload.manufacturer) {
      formData.append('manufacturer', payload.manufacturer);
    }
    if (payload.attributes && Object.keys(payload.attributes).length) {
      formData.append('attributes', JSON.stringify(payload.attributes));
    }
    (payload.photos || []).forEach(file => formData.append('photos', file));
    return this.http.post(`${this.apiUrl}/${id}/land-utilization/machinery`, formData, { headers });
  }

  addProgressUpdate(
    id: string,
    payload: {
      status: string;
      description?: string;
      progressDate?: string;
      completionPercentage?: number;
      photos?: File[];
    }
  ): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
    const formData = new FormData();
    formData.append('status', payload.status);
    if (payload.description) {
      formData.append('description', payload.description);
    }
    if (payload.progressDate) {
      formData.append('progressDate', payload.progressDate);
    }
    if (typeof payload.completionPercentage === 'number') {
      formData.append('completionPercentage', payload.completionPercentage.toString());
    }
    (payload.photos || []).forEach(file => formData.append('photos', file));
    return this.http.post(`${this.apiUrl}/${id}/land-utilization/progress`, formData, { headers });
  }


  // Search users for assignment/autocomplete
  searchUsers(query: string): Observable<any[]> {
    const token = localStorage.getItem('token');
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
    const q = encodeURIComponent(query || '');
    return this.http.get<any[]>(`${environment.apiBaseUrl}/users?query=${q}`, { headers });
  }
}
