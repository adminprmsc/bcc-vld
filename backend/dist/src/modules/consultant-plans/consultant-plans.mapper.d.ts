import { AssetDefinition } from './consultant-plans.constants';
export type PlanAttachmentInput = {
    storedName: string;
    originalName: string;
    mimeType: string;
    size: number;
};
type PlanWithRelations = {
    id: bigint;
    title: string;
    asset_type: string;
    asset_label: string;
    category: string;
    layer_name: string | null;
    description: string | null;
    requisition_id: bigint | null;
    tehsil: string | null;
    district: string | null;
    feature_type: string | null;
    feature_geometry: unknown;
    feature_properties: unknown;
    attributes: unknown;
    maintenance_owner_role: string | null;
    maintenance_owner: bigint | null;
    maintenance_owner_name: string | null;
    created_at: Date;
    updated_at: Date;
    consultant_plan_attachments?: Array<{
        stored_name: string;
        original_name: string | null;
        mime_type: string | null;
        size: bigint | null;
    }>;
    consultant_plan_maintenance_records?: Array<{
        id: bigint;
        performed_at: Date;
        type: string | null;
        status: string | null;
        description: string | null;
        cost: unknown;
        notes: string | null;
        recorded_by: bigint | null;
        recorded_by_name: string | null;
    }>;
    users_consultant_plans_created_byTousers?: {
        id: bigint;
        name: string;
        role: import('@prisma/client').users_role;
    } | null;
    users_consultant_plans_updated_byTousers?: {
        id: bigint;
        name: string;
        role: import('@prisma/client').users_role;
    } | null;
};
export declare function safeString(value: unknown): string;
export declare function normaliseKey(value: unknown): string;
export declare function slugKey(value: unknown): string;
export declare function escapeLike(value: unknown): string;
export declare function resolveIntId(value: unknown): bigint | null;
export declare function resolveAssetDefinition(raw: unknown): AssetDefinition | null;
export declare function parseFeature(raw: unknown): {
    type: "Feature";
    geometry: {
        type: string;
        coordinates: {} | null;
    };
    properties: {
        [x: string]: unknown;
    };
};
export declare function parseAttributes(primary: unknown, fallback?: unknown): Record<string, unknown>;
export declare function withFeatureProperties(feature: {
    type?: string;
    geometry?: unknown;
    properties?: Record<string, unknown>;
}, assetDef: AssetDefinition): {
    type: "Feature";
    geometry: any;
    properties: {
        [x: string]: unknown;
    };
};
export declare function planToFeature(plan: PlanWithRelations): {
    type: "Feature";
    geometry: any;
    properties: Record<string, unknown>;
} | null;
export declare function serializePlan(plan: PlanWithRelations): {
    id: string;
    title: string;
    assetType: string;
    assetLabel: string;
    category: string;
    layerName: string | null;
    description: string;
    requisitionId: string | null;
    tehsil: string;
    district: string;
    feature: {
        type: string;
        geometry: unknown;
        properties: object;
    };
    attributes: object;
    attachments: ({
        storedName: string;
        originalName: string;
        mimeType: string;
        size: number;
        url: string;
    } | null)[];
    maintenanceOwnerRole: string;
    maintenanceOwner: {
        id: string;
        name: string;
        role: string;
    } | null;
    maintenanceOwnerName: string;
    maintenanceRecords: {
        id: string;
        performedAt: Date;
        type: string;
        status: string;
        description: string;
        cost: number;
        notes: string;
        recordedBy: {
            id: string;
            name: string;
            role: string;
        } | null;
        recordedByName: string;
    }[];
    createdBy: {
        id: string;
        name: string;
        role: string;
    } | null;
    updatedBy: {
        id: string;
        name: string;
        role: string;
    } | null;
    createdAt: Date;
    updatedAt: Date;
};
export declare function parsePlanAttachments(raw: unknown): PlanAttachmentInput[];
export declare function serializeAttachment(entry: {
    stored_name?: string;
    storedName?: string;
    path?: string;
    original_name?: string | null;
    originalName?: string;
    name?: string;
    mime_type?: string | null;
    mimeType?: string;
    type?: string;
    size?: bigint | number | null;
}): {
    storedName: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
} | null;
export declare function buildAttachmentUrl(storedName: string): string;
export declare function mapUploadedFiles(files: Express.Multer.File[]): Array<PlanAttachmentInput & {
    url: string;
}>;
export declare function applyMaintenanceMetadata(planDoc: {
    maintenance_owner_role?: string | null;
    maintenance_owner?: bigint | null;
    maintenance_owner_name?: string | null;
    feature_properties?: unknown;
}): void;
export {};
