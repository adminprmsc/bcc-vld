import { users_role } from '@prisma/client';
import { expandRoleAliases } from '../../common/security/role-synonyms';

const ROLE_API_TO_PRISMA: Record<string, users_role> = {
  'Tehsil DM': users_role.DM_Tehsil,
  'DM Tehsil': users_role.DM_Tehsil,
  'BCC Officer': users_role.BCC_Officer_Tehsil,
  'BCC Officer Tehsil': users_role.BCC_Officer_Tehsil,
  'BCC Specialist': users_role.BCC_Specialist,
  'Tehsil Manager': users_role.Tehsil_Manager,
  TM: users_role.Tehsil_Manager,
  'WB User': users_role.WB_User,
  'Super Admin': users_role.Super_Admin,
};

export function resolveRoleEnums(roleInput: string | string[]): users_role[] {
  const expanded = expandRoleAliases(roleInput);
  const enums = new Set<users_role>();
  for (const role of expanded) {
    if (ROLE_API_TO_PRISMA[role]) {
      enums.add(ROLE_API_TO_PRISMA[role]);
      continue;
    }
    const asEnum = role.replace(/ /g, '_');
    if ((Object.values(users_role) as string[]).includes(asEnum)) {
      enums.add(asEnum as users_role);
    }
  }
  return Array.from(enums);
}

export function normalizeStatus(status: unknown): string {
  return (status || '').toString().trim().toLowerCase();
}

export function statusIn(current: unknown, allowed: string | string[]): boolean {
  const normalizedCurrent = normalizeStatus(current);
  if (!Array.isArray(allowed)) {
    return normalizedCurrent === normalizeStatus(allowed);
  }
  return allowed.some((status) => normalizeStatus(status) === normalizedCurrent);
}

export function resolveId(value: unknown): string {
  if (!value) {
    return '';
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (obj._id) {
      return obj._id.toString();
    }
    if (obj.id) {
      return obj.id.toString();
    }
    if (obj.userId) {
      return obj.userId.toString();
    }
    const maybe = (value as { toString?: () => string }).toString?.();
    if (maybe && maybe !== '[object Object]') {
      return maybe;
    }
  }
  return '';
}

export function parseJsonField<T>(raw: unknown, fallback: T): T {
  if (!raw) {
    return fallback;
  }
  if (typeof raw === 'object') {
    return raw as T;
  }
  try {
    return JSON.parse(raw as string) as T;
  } catch {
    return fallback;
  }
}

export function cleanString(value: unknown): string {
  return (value ?? '').toString().trim();
}

export function toNumber(value: unknown): number | null {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function ensureRemarks(raw: unknown, fallback: string): string {
  const text = (raw || '').toString().trim();
  return text || fallback;
}

export function mergeGallery(existing: unknown, additions: unknown): string[] {
  const current = Array.isArray(existing) ? (existing as string[]) : [];
  const next = Array.isArray(additions) ? (additions as string[]).filter(Boolean) : [];
  return Array.from(new Set([...current, ...next]));
}

export function parseLatLngInput(raw: unknown): { lat: number; lng: number } | null {
  if (!raw) {
    return null;
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    try {
      const parsed = JSON.parse(trimmed);
      return parseLatLngInput(parsed);
    } catch {
      const parts = trimmed.split(',').map((part) => Number(part.trim()));
      if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
        return { lat: parts[0], lng: parts[1] };
      }
    }
  }
  if (Array.isArray(raw)) {
    if (raw.length >= 2) {
      const latCandidate = Number(raw[0]);
      const lngCandidate = Number(raw[1]);
      if (Number.isFinite(latCandidate) && Number.isFinite(lngCandidate)) {
        return { lat: latCandidate, lng: lngCandidate };
      }
      const lngFirst = Number(raw[0]);
      const latSecond = Number(raw[1]);
      if (Number.isFinite(latSecond) && Number.isFinite(lngFirst)) {
        return { lat: latSecond, lng: lngFirst };
      }
    }
    return null;
  }
  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    const latCandidates = [obj.lat, obj.latitude, obj.y, (obj.latLng as { lat?: unknown })?.lat];
    const lngCandidates = [obj.lng, obj.longitude, obj.x, (obj.latLng as { lng?: unknown })?.lng];
    const lat = latCandidates.map((val) => Number(val)).find((val) => Number.isFinite(val));
    const lng = lngCandidates.map((val) => Number(val)).find((val) => Number.isFinite(val));
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat: lat as number, lng: lng as number };
    }
  }
  return null;
}

function sanitizeFeatureArray(features: unknown[]): unknown[] {
  return features
    .filter((feature) => feature && typeof feature === 'object')
    .map((feature) => {
      const safeFeature = { ...(feature as Record<string, unknown>) };
      if (safeFeature.properties && typeof safeFeature.properties !== 'object') {
        safeFeature.properties = {};
      }
      if (!safeFeature.properties) {
        safeFeature.properties = {};
      }
      if (!safeFeature.geometry || typeof safeFeature.geometry !== 'object') {
        return null;
      }
      const geometry = { ...(safeFeature.geometry as Record<string, unknown>) };
      if (geometry.coordinates === undefined) {
        return null;
      }
      safeFeature.geometry = geometry;
      return safeFeature;
    })
    .filter(Boolean);
}

export function parseMapFeatures(raw: unknown): unknown[] {
  const value =
    typeof raw === 'string'
      ? (() => {
          try {
            return JSON.parse(raw);
          } catch {
            return null;
          }
        })()
      : raw;
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return sanitizeFeatureArray(value);
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (obj.type === 'FeatureCollection' && Array.isArray(obj.features)) {
      return sanitizeFeatureArray(obj.features);
    }
    if (obj.type === 'Feature') {
      return sanitizeFeatureArray([value]);
    }
  }
  return [];
}

export function parseMapViewport(raw: unknown): { center?: { lat: number; lng: number }; zoom?: number } | null {
  const source =
    typeof raw === 'string'
      ? (() => {
          try {
            return JSON.parse(raw);
          } catch {
            return null;
          }
        })()
      : raw;
  if (!source || typeof source !== 'object') {
    return null;
  }
  const obj = source as Record<string, unknown>;
  const center = parseLatLngInput(obj.center || source);
  const zoom = Number(obj.zoom);
  const payload: { center?: { lat: number; lng: number }; zoom?: number } = {};
  if (center) {
    payload.center = center;
  }
  if (Number.isFinite(zoom)) {
    payload.zoom = zoom;
  }
  return Object.keys(payload).length ? payload : null;
}

export function buildLocationPayload(raw: unknown): {
  address?: string;
  coordinates?: { lat: number; lng: number };
} {
  if (!raw) {
    return {};
  }
  if (typeof raw === 'string') {
    const coords = parseLatLngInput(raw);
    if (coords) {
      return { address: '', coordinates: coords };
    }
    return { address: raw };
  }
  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    const location = { ...obj };
    const coords = parseLatLngInput(obj.coordinates || obj.coords || raw);
    if (coords) {
      (location as { coordinates?: { lat: number; lng: number } }).coordinates = coords;
    }
    if (!location.address && typeof obj.addressLine === 'string') {
      location.address = obj.addressLine;
    }
    return location as { address?: string; coordinates?: { lat: number; lng: number } };
  }
  return {};
}

export function sanitizeChecklistInput(raw: unknown): Record<string, string> {
  const source = parseJsonField(raw, {});
  if (!source || typeof source !== 'object') {
    return {};
  }
  return Object.entries(source as Record<string, unknown>).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      const normalizedKey = cleanString(key);
      if (!normalizedKey) {
        return acc;
      }
      if (value === null || value === undefined) {
        return acc;
      }
      const normalizedValue =
        typeof value === 'string'
          ? value.trim()
          : typeof value === 'number' && Number.isFinite(value)
            ? value.toString()
            : typeof value === 'boolean'
              ? value.toString()
              : '';
      if (!normalizedValue) {
        return acc;
      }
      acc[normalizedKey] = normalizedValue;
      return acc;
    },
    {},
  );
}

export function decimalToNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}
