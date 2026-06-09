export declare class MaintenanceFormDto {
    planId: string | number;
    type: 'preventive' | 'corrective' | 'emergency' | 'inspection';
    description: string;
    cost?: number;
    notes?: string;
    performedAt?: string;
    offlineId?: string | number;
}
