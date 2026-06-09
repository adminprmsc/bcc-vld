import { users_role } from '@prisma/client';
export declare function resolveRoleEnums(roleInput: string | string[]): users_role[];
export declare function normalizeStatus(status: unknown): string;
export declare function statusIn(current: unknown, allowed: string | string[]): boolean;
export declare function resolveId(value: unknown): string;
export declare function parseJsonField<T>(raw: unknown, fallback: T): T;
export declare function cleanString(value: unknown): string;
export declare function toNumber(value: unknown): number | null;
export declare function ensureRemarks(raw: unknown, fallback: string): string;
export declare function mergeGallery(existing: unknown, additions: unknown): string[];
export declare function parseLatLngInput(raw: unknown): {
    lat: number;
    lng: number;
} | null;
export declare function parseMapFeatures(raw: unknown): unknown[];
export declare function parseMapViewport(raw: unknown): {
    center?: {
        lat: number;
        lng: number;
    };
    zoom?: number;
} | null;
export declare function buildLocationPayload(raw: unknown): {
    address?: string;
    coordinates?: {
        lat: number;
        lng: number;
    };
};
export declare function sanitizeChecklistInput(raw: unknown): Record<string, string>;
export declare function decimalToNumber(value: unknown): number | null;
