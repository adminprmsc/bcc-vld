import { water_quality_sample_status_history_code, water_quality_sample_status_history_tone } from '@prisma/client';
export declare function safeString(value: unknown): string;
export declare function isValidId(value: unknown): boolean;
export declare function parseId(value: unknown): number | null;
export declare function limitInt(value: unknown, fallback: number): number;
export declare function escapeLike(value: unknown): string;
export declare function parseDate(raw: unknown): Date | null;
export declare function parseCoords(value: unknown): {
    lat: number;
    lng: number;
} | null;
export declare function parseMetrics(raw: unknown): Record<string, unknown>;
export declare function normalizeLabMetrics(metrics?: Record<string, unknown>): Record<string, unknown>;
export declare function toneForStatus(code: string): water_quality_sample_status_history_tone;
export declare function labelForStatus(code: string): string;
export declare function labelForRating(rating: string): string;
export declare function buildStatusEvent(code: water_quality_sample_status_history_code, user: {
    userId?: number | string | bigint;
    name?: string;
}, note: string): {
    code: import(".prisma/client").$Enums.water_quality_sample_status_history_code;
    label: string;
    note: string;
    tone: import(".prisma/client").$Enums.water_quality_sample_status_history_tone;
    created_by: bigint;
    created_by_name: string;
};
export declare function canCreate(role: string | undefined): boolean;
export declare function canReadSample(user: {
    userId?: number | string | bigint;
    role?: string;
}, sample: {
    created_by: bigint;
    assigned_sampler: bigint | null;
    status: string | null;
}): boolean;
