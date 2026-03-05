import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface AssetMetadata {
  id: string;
  title: string;
  category: string;
  commissioningDate: string | null;
  nextMaintenanceDate: string | null;
  expectedLifespanYears: number | null;
}

export interface AssetMetadataResponse extends AssetMetadata {
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AssetMetadataService {
  private readonly assetMetadataCache = new Map<string, AssetMetadata>();
  private readonly assetMetadataUpdated$ = new BehaviorSubject<AssetMetadata | null>(null);

  constructor() {
    this.initializeCache();
  }

  /**
   * Retrieve asset metadata by ID
   */
  getAssetMetadata(id: string): AssetMetadata | null {
    return this.assetMetadataCache.get(id) ?? null;
  }

  /**
   * Retrieve all cached asset metadata
   */
  getAllAssetMetadata(): AssetMetadata[] {
    return Array.from(this.assetMetadataCache.values());
  }

  /**
   * Observable for asset metadata updates
   */
  assetMetadataUpdated(): Observable<AssetMetadata | null> {
    return this.assetMetadataUpdated$.asObservable();
  }

  /**
   * Create or update asset metadata
   */
  saveAssetMetadata(asset: AssetMetadata): AssetMetadata {
    // Validate required fields
    if (!asset.id || !asset.title || !asset.category) {
      throw new Error('Asset must have id, title, and category');
    }

    // Validate dates if provided
    if (asset.commissioningDate && !this.isValidDate(asset.commissioningDate)) {
      throw new Error('Invalid commissioning date format');
    }

    if (asset.nextMaintenanceDate && !this.isValidDate(asset.nextMaintenanceDate)) {
      throw new Error('Invalid next maintenance date format');
    }

    if (asset.expectedLifespanYears !== null && asset.expectedLifespanYears !== undefined) {
      if (asset.expectedLifespanYears < 0) {
        throw new Error('Expected lifespan must be non-negative');
      }
    }

    // Store in cache (in production, this would be an HTTP POST/PUT)
    const metadata: AssetMetadata = {
      id: asset.id,
      title: asset.title,
      category: asset.category,
      commissioningDate: asset.commissioningDate ?? null,
      nextMaintenanceDate: asset.nextMaintenanceDate ?? null,
      expectedLifespanYears: asset.expectedLifespanYears ?? null,
    };

    this.assetMetadataCache.set(asset.id, metadata);
    this.assetMetadataUpdated$.next(metadata);

    return metadata;
  }

  /**
   * Delete asset metadata by ID
   */
  deleteAssetMetadata(id: string): boolean {
    const existed = this.assetMetadataCache.has(id);
    if (existed) {
      this.assetMetadataCache.delete(id);
      this.assetMetadataUpdated$.next(null);
    }
    return existed;
  }

  /**
   * Update specific metadata fields for an asset
   */
  patchAssetMetadata(id: string, updates: Partial<Omit<AssetMetadata, 'id'>>): AssetMetadata | null {
    const existing = this.assetMetadataCache.get(id);
    if (!existing) {
      return null;
    }

    if (updates.commissioningDate && !this.isValidDate(updates.commissioningDate)) {
      throw new Error('Invalid commissioning date format');
    }

    if (updates.nextMaintenanceDate && !this.isValidDate(updates.nextMaintenanceDate)) {
      throw new Error('Invalid next maintenance date format');
    }

    const updated: AssetMetadata = {
      ...existing,
      ...updates,
      id: existing.id,
    };

    this.assetMetadataCache.set(id, updated);
    this.assetMetadataUpdated$.next(updated);

    return updated;
  }

  /**
   * Batch import asset metadata
   */
  importAssetMetadata(assets: AssetMetadata[]): AssetMetadata[] {
    const imported: AssetMetadata[] = [];

    assets.forEach((asset) => {
      try {
        imported.push(this.saveAssetMetadata(asset));
      } catch (error) {
        console.warn(`Failed to import asset ${asset.id}:`, error);
      }
    });

    return imported;
  }

  /**
   * Export asset metadata as JSON
   */
  exportAssetMetadata(): string {
    const assets = this.getAllAssetMetadata();
    return JSON.stringify(assets, null, 2);
  }

  /**
   * Calculate asset age based on commissioning date
   */
  calculateAssetAge(commissioningDate: string | null): number | null {
    if (!commissioningDate || !this.isValidDate(commissioningDate)) {
      return null;
    }

    try {
      const commissioning = new Date(commissioningDate);
      const now = new Date();
      const ageInMs = now.getTime() - commissioning.getTime();
      const ageInYears = ageInMs / (365.25 * 24 * 60 * 60 * 1000);
      return Math.floor(ageInYears);
    } catch {
      return null;
    }
  }

  /**
   * Calculate remaining asset lifespan
   */
  calculateRemainingLifespan(commissioningDate: string | null, expectedLifespanYears: number | null): number | null {
    if (expectedLifespanYears === null || expectedLifespanYears === undefined) {
      return null;
    }

    const age = this.calculateAssetAge(commissioningDate);
    if (age === null) {
      return null;
    }

    return Math.max(0, expectedLifespanYears - age);
  }

  /**
   * Check if asset is near end of life (remaining lifespan < 1 year)
   */
  isNearEndOfLife(commissioningDate: string | null, expectedLifespanYears: number | null): boolean {
    const remaining = this.calculateRemainingLifespan(commissioningDate, expectedLifespanYears);
    return remaining !== null && remaining < 1;
  }

  /**
   * Check if asset is overdue for maintenance based on stored due date
   */
  isMaintenanceOverdue(nextMaintenanceDate: string | null): boolean {
    if (!nextMaintenanceDate || !this.isValidDate(nextMaintenanceDate)) {
      return false;
    }

    try {
      const due = new Date(nextMaintenanceDate);
      return new Date() > due;
    } catch {
      return false;
    }
  }

  /**
   * Format commissioning date for display
   */
  formatCommissioningDate(date: string | null | undefined): string {
    if (!date || !this.isValidDate(date)) {
      return 'N/A';
    }

    try {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Invalid Date';
    }
  }

  /**
   * Format next maintenance date for display
   */
  formatNextMaintenanceDate(nextDate: string | null | undefined): string {
    if (!nextDate || !this.isValidDate(nextDate)) {
      return 'N/A';
    }

    try {
      return new Date(nextDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Invalid Date';
    }
  }

  /**
   * Format expected lifespan for display
   */
  formatExpectedLifespan(years: number | null | undefined): string {
    if (years === null || years === undefined) {
      return 'N/A';
    }

    return `${years} year${years !== 1 ? 's' : ''}`;
  }

  /**
   * Validate date string format (YYYY-MM-DD or ISO format)
   */
  private isValidDate(dateString: string): boolean {
    try {
      const date = new Date(dateString);
      return !isNaN(date.getTime());
    } catch {
      return false;
    }
  }

  /**
   * Initialize cache with sample data (for development)
   */
  private initializeCache(): void {
    // In production, this would fetch from backend API
    // For now, we initialize empty
  }

  /**
   * Clear all cached metadata
   */
  clearCache(): void {
    this.assetMetadataCache.clear();
    this.assetMetadataUpdated$.next(null);
  }
}
