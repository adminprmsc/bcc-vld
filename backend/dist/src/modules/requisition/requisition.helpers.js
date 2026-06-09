"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveRoleEnums = resolveRoleEnums;
exports.normalizeStatus = normalizeStatus;
exports.statusIn = statusIn;
exports.resolveId = resolveId;
exports.parseJsonField = parseJsonField;
exports.cleanString = cleanString;
exports.toNumber = toNumber;
exports.ensureRemarks = ensureRemarks;
exports.mergeGallery = mergeGallery;
exports.parseLatLngInput = parseLatLngInput;
exports.parseMapFeatures = parseMapFeatures;
exports.parseMapViewport = parseMapViewport;
exports.buildLocationPayload = buildLocationPayload;
exports.sanitizeChecklistInput = sanitizeChecklistInput;
exports.decimalToNumber = decimalToNumber;
const client_1 = require("@prisma/client");
const role_synonyms_1 = require("../../common/security/role-synonyms");
const ROLE_API_TO_PRISMA = {
    'Tehsil DM': client_1.users_role.DM_Tehsil,
    'DM Tehsil': client_1.users_role.DM_Tehsil,
    'BCC Officer': client_1.users_role.BCC_Officer_Tehsil,
    'BCC Officer Tehsil': client_1.users_role.BCC_Officer_Tehsil,
    'BCC Specialist': client_1.users_role.BCC_Specialist,
    'Tehsil Manager': client_1.users_role.Tehsil_Manager,
    TM: client_1.users_role.Tehsil_Manager,
    'WB User': client_1.users_role.WB_User,
    'Super Admin': client_1.users_role.Super_Admin,
};
function resolveRoleEnums(roleInput) {
    const expanded = (0, role_synonyms_1.expandRoleAliases)(roleInput);
    const enums = new Set();
    for (const role of expanded) {
        if (ROLE_API_TO_PRISMA[role]) {
            enums.add(ROLE_API_TO_PRISMA[role]);
            continue;
        }
        const asEnum = role.replace(/ /g, '_');
        if (Object.values(client_1.users_role).includes(asEnum)) {
            enums.add(asEnum);
        }
    }
    return Array.from(enums);
}
function normalizeStatus(status) {
    return (status || '').toString().trim().toLowerCase();
}
function statusIn(current, allowed) {
    const normalizedCurrent = normalizeStatus(current);
    if (!Array.isArray(allowed)) {
        return normalizedCurrent === normalizeStatus(allowed);
    }
    return allowed.some((status) => normalizeStatus(status) === normalizedCurrent);
}
function resolveId(value) {
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
        const obj = value;
        if (obj._id) {
            return obj._id.toString();
        }
        if (obj.id) {
            return obj.id.toString();
        }
        if (obj.userId) {
            return obj.userId.toString();
        }
        const maybe = value.toString?.();
        if (maybe && maybe !== '[object Object]') {
            return maybe;
        }
    }
    return '';
}
function parseJsonField(raw, fallback) {
    if (!raw) {
        return fallback;
    }
    if (typeof raw === 'object') {
        return raw;
    }
    try {
        return JSON.parse(raw);
    }
    catch {
        return fallback;
    }
}
function cleanString(value) {
    return (value ?? '').toString().trim();
}
function toNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
}
function ensureRemarks(raw, fallback) {
    const text = (raw || '').toString().trim();
    return text || fallback;
}
function mergeGallery(existing, additions) {
    const current = Array.isArray(existing) ? existing : [];
    const next = Array.isArray(additions) ? additions.filter(Boolean) : [];
    return Array.from(new Set([...current, ...next]));
}
function parseLatLngInput(raw) {
    if (!raw) {
        return null;
    }
    if (typeof raw === 'string') {
        const trimmed = raw.trim();
        try {
            const parsed = JSON.parse(trimmed);
            return parseLatLngInput(parsed);
        }
        catch {
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
        const obj = raw;
        const latCandidates = [obj.lat, obj.latitude, obj.y, obj.latLng?.lat];
        const lngCandidates = [obj.lng, obj.longitude, obj.x, obj.latLng?.lng];
        const lat = latCandidates.map((val) => Number(val)).find((val) => Number.isFinite(val));
        const lng = lngCandidates.map((val) => Number(val)).find((val) => Number.isFinite(val));
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
            return { lat: lat, lng: lng };
        }
    }
    return null;
}
function sanitizeFeatureArray(features) {
    return features
        .filter((feature) => feature && typeof feature === 'object')
        .map((feature) => {
        const safeFeature = { ...feature };
        if (safeFeature.properties && typeof safeFeature.properties !== 'object') {
            safeFeature.properties = {};
        }
        if (!safeFeature.properties) {
            safeFeature.properties = {};
        }
        if (!safeFeature.geometry || typeof safeFeature.geometry !== 'object') {
            return null;
        }
        const geometry = { ...safeFeature.geometry };
        if (geometry.coordinates === undefined) {
            return null;
        }
        safeFeature.geometry = geometry;
        return safeFeature;
    })
        .filter(Boolean);
}
function parseMapFeatures(raw) {
    const value = typeof raw === 'string'
        ? (() => {
            try {
                return JSON.parse(raw);
            }
            catch {
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
        const obj = value;
        if (obj.type === 'FeatureCollection' && Array.isArray(obj.features)) {
            return sanitizeFeatureArray(obj.features);
        }
        if (obj.type === 'Feature') {
            return sanitizeFeatureArray([value]);
        }
    }
    return [];
}
function parseMapViewport(raw) {
    const source = typeof raw === 'string'
        ? (() => {
            try {
                return JSON.parse(raw);
            }
            catch {
                return null;
            }
        })()
        : raw;
    if (!source || typeof source !== 'object') {
        return null;
    }
    const obj = source;
    const center = parseLatLngInput(obj.center || source);
    const zoom = Number(obj.zoom);
    const payload = {};
    if (center) {
        payload.center = center;
    }
    if (Number.isFinite(zoom)) {
        payload.zoom = zoom;
    }
    return Object.keys(payload).length ? payload : null;
}
function buildLocationPayload(raw) {
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
        const obj = raw;
        const location = { ...obj };
        const coords = parseLatLngInput(obj.coordinates || obj.coords || raw);
        if (coords) {
            location.coordinates = coords;
        }
        if (!location.address && typeof obj.addressLine === 'string') {
            location.address = obj.addressLine;
        }
        return location;
    }
    return {};
}
function sanitizeChecklistInput(raw) {
    const source = parseJsonField(raw, {});
    if (!source || typeof source !== 'object') {
        return {};
    }
    return Object.entries(source).reduce((acc, [key, value]) => {
        const normalizedKey = cleanString(key);
        if (!normalizedKey) {
            return acc;
        }
        if (value === null || value === undefined) {
            return acc;
        }
        const normalizedValue = typeof value === 'string'
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
    }, {});
}
function decimalToNumber(value) {
    if (value === null || value === undefined) {
        return null;
    }
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
}
//# sourceMappingURL=requisition.helpers.js.map