export declare class RedbookOperationalDto {
    assetId: string;
    assetType: string;
    operationalStatus: string;
    condition: string;
    capacityUtilization?: number | null;
    lastMaintenanceDate?: string;
    nextMaintenanceDue?: string;
    operator?: Record<string, unknown>;
    remarks?: string;
    issues?: unknown[];
    location?: Record<string, unknown> | null;
    capturedAt?: string;
    offlineId?: string | number;
}
