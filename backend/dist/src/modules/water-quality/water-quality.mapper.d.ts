import { Prisma, water_quality_samples } from '@prisma/client';
type PlanSummary = {
    id: bigint;
    title: string;
    category: string;
    tehsil: string | null;
    district: string | null;
    critical_flag: boolean | null;
    latest_quality_status_status: string | null;
    latest_quality_status_score: Prisma.Decimal | null;
    latest_quality_status_label: string | null;
    latest_quality_status_updated_at: Date | null;
};
type UserSummary = {
    id: bigint;
    name: string;
    role: import('@prisma/client').users_role;
};
type SampleWithRelations = water_quality_samples & {
    consultant_plans?: PlanSummary | null;
    users_water_quality_samples_assigned_samplerTousers?: UserSummary | null;
    users_water_quality_samples_created_byTousers?: UserSummary | null;
    users_water_quality_samples_lab_analysis_analystTousers?: UserSummary | null;
    water_quality_sample_status_history?: Array<{
        id: bigint;
        code: string;
        label: string;
        note: string | null;
        tone: string | null;
        created_at: Date;
        created_by: bigint;
        created_by_name: string | null;
    }>;
    water_quality_sample_attachments?: Array<{
        id: bigint;
        attachment_type: string;
        stored_name: string;
        original_name: string | null;
        mime_type: string | null;
        size: bigint | null;
    }>;
};
type AttachmentRow = {
    id?: bigint;
    stored_name: string;
    original_name?: string | null;
    mime_type?: string | null;
    size?: bigint | null;
    attachment_type?: string;
};
export declare function decorateAttachment(entry: AttachmentRow): {
    id: bigint | undefined;
    storedName: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
};
export declare function serializeSample(source: SampleWithRelations | null): {
    id: bigint;
    planId: bigint;
    plan: bigint | {
        id: bigint;
        title: string;
        category: string;
        tehsil: string | null;
        district: string | null;
        criticalFlag: boolean | null;
        latestQualityStatus: {
            status: string | null;
            score: number | null;
            label: string | null;
            updatedAt: Date | null;
        };
    };
    planSnapshot: {
        planId: bigint;
        title: string | null;
        category: string | null;
        tehsil: string | null;
        district: string | null;
    };
    status: import(".prisma/client").$Enums.water_quality_samples_status | null;
    assignedSampler: bigint | {
        id: bigint;
        name: string;
        role: string;
    } | null;
    assignedSamplerName: string | null;
    assignedSamplerId: bigint | null;
    assignedAt: Date | null;
    collection: {
        collectedAt: Date | null;
        fieldNotes: string | null;
        location: {
            lat: number;
            lng: number;
        } | null;
        collectedBy: bigint | null;
        collectedByName: string | null;
        attachments: {
            id: bigint | undefined;
            storedName: string;
            originalName: string;
            mimeType: string;
            size: number;
            url: string;
        }[];
    };
    labAnalysis: {
        receivedAt: Date | null;
        completedAt: Date | null;
        analyst: bigint | {
            id: bigint;
            name: string;
            role: string;
        } | null;
        analystName: string | null;
        metrics: Prisma.JsonValue;
        notes: string | null;
        attachments: {
            id: bigint | undefined;
            storedName: string;
            originalName: string;
            mimeType: string;
            size: number;
            url: string;
        }[];
    };
    computedScore: {
        indexName: string | null;
        value: number | null;
        rating: string | null;
        updatedAt: Date | null;
    };
    statusHistory: {
        id: bigint;
        code: string;
        label: string;
        note: string | null;
        tone: string | null;
        createdAt: Date;
        createdBy: bigint;
        createdByName: string | null;
    }[];
    attachments: {
        id: bigint | undefined;
        storedName: string;
        originalName: string;
        mimeType: string;
        size: number;
        url: string;
    }[];
    createdBy: bigint | {
        id: bigint;
        name: string;
        role: string;
    };
    createdByName: string | null;
    updatedBy: bigint | null;
    updatedByName: string | null;
    createdAt: Date;
    updatedAt: Date;
} | null;
export declare const sampleInclude: {
    consultant_plans: {
        select: {
            id: true;
            title: true;
            category: true;
            tehsil: true;
            district: true;
            critical_flag: true;
            latest_quality_status_status: true;
            latest_quality_status_score: true;
            latest_quality_status_label: true;
            latest_quality_status_updated_at: true;
        };
    };
    users_water_quality_samples_assigned_samplerTousers: {
        select: {
            id: true;
            name: true;
            role: true;
        };
    };
    users_water_quality_samples_created_byTousers: {
        select: {
            id: true;
            name: true;
            role: true;
        };
    };
    water_quality_sample_status_history: {
        orderBy: {
            created_at: "asc";
        };
    };
    water_quality_sample_attachments: true;
};
export declare const sampleIncludeDetailed: {
    users_water_quality_samples_lab_analysis_analystTousers: {
        select: {
            id: true;
            name: true;
            role: true;
        };
    };
    consultant_plans: {
        select: {
            id: true;
            title: true;
            category: true;
            tehsil: true;
            district: true;
            critical_flag: true;
            latest_quality_status_status: true;
            latest_quality_status_score: true;
            latest_quality_status_label: true;
            latest_quality_status_updated_at: true;
        };
    };
    users_water_quality_samples_assigned_samplerTousers: {
        select: {
            id: true;
            name: true;
            role: true;
        };
    };
    users_water_quality_samples_created_byTousers: {
        select: {
            id: true;
            name: true;
            role: true;
        };
    };
    water_quality_sample_status_history: {
        orderBy: {
            created_at: "asc";
        };
    };
    water_quality_sample_attachments: true;
};
export {};
