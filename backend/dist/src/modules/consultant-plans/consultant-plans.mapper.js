"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeString = safeString;
exports.normaliseKey = normaliseKey;
exports.slugKey = slugKey;
exports.escapeLike = escapeLike;
exports.resolveIntId = resolveIntId;
exports.resolveAssetDefinition = resolveAssetDefinition;
exports.parseFeature = parseFeature;
exports.parseAttributes = parseAttributes;
exports.withFeatureProperties = withFeatureProperties;
exports.planToFeature = planToFeature;
exports.serializePlan = serializePlan;
exports.parsePlanAttachments = parsePlanAttachments;
exports.serializeAttachment = serializeAttachment;
exports.buildAttachmentUrl = buildAttachmentUrl;
exports.mapUploadedFiles = mapUploadedFiles;
exports.applyMaintenanceMetadata = applyMaintenanceMetadata;
const path_1 = require("path");
const consultant_plans_constants_1 = require("./consultant-plans.constants");
const role_util_1 = require("../../common/utils/role.util");
const ASSET_VALUE_INDEX = new Map();
const ASSET_LABEL_INDEX = new Map();
consultant_plans_constants_1.ASSET_DEFINITIONS.forEach((def) => {
    const valueKey = normaliseKey(def.value);
    ASSET_VALUE_INDEX.set(valueKey, def);
    ASSET_VALUE_INDEX.set(slugKey(def.value), def);
    ASSET_LABEL_INDEX.set(normaliseKey(def.label), def);
});
function safeString(value) {
    return (value ?? '').toString().trim();
}
function normaliseKey(value) {
    return safeString(value).toLowerCase();
}
function slugKey(value) {
    return normaliseKey(value).replace(/[^a-z0-9]+/g, '-');
}
function escapeLike(value) {
    return safeString(value).replace(/[%_\\]/g, '\\$&');
}
function resolveIntId(value) {
    const text = safeString(value);
    if (!text) {
        return null;
    }
    const num = Number(text);
    if (!Number.isFinite(num) || num < 1) {
        return null;
    }
    return BigInt(num);
}
function resolveAssetDefinition(raw) {
    const input = safeString(raw);
    if (!input) {
        return null;
    }
    const key = normaliseKey(input);
    if (ASSET_VALUE_INDEX.has(key)) {
        return ASSET_VALUE_INDEX.get(key);
    }
    const slugged = slugKey(input);
    if (ASSET_VALUE_INDEX.has(slugged)) {
        return ASSET_VALUE_INDEX.get(slugged);
    }
    if (ASSET_LABEL_INDEX.has(key)) {
        return ASSET_LABEL_INDEX.get(key);
    }
    if (key === 'other') {
        return ASSET_VALUE_INDEX.get('custom-asset') ?? null;
    }
    return null;
}
function parseFeature(raw) {
    const payload = normaliseFeaturePayload(raw);
    if (!payload) {
        throw new Error('Feature payload is required.');
    }
    if (payload.type !== 'Feature') {
        throw new Error('Feature payload must be a GeoJSON Feature.');
    }
    if (!payload.geometry || typeof payload.geometry !== 'object') {
        throw new Error('Feature geometry is required.');
    }
    const geometry = payload.geometry;
    if (!geometry.type || typeof geometry.coordinates === 'undefined') {
        throw new Error('Feature geometry is not valid GeoJSON.');
    }
    const properties = payload.properties && typeof payload.properties === 'object' && !Array.isArray(payload.properties)
        ? { ...payload.properties }
        : {};
    return {
        type: 'Feature',
        geometry: { type: geometry.type, coordinates: geometry.coordinates },
        properties,
    };
}
function normaliseFeaturePayload(raw) {
    if (!raw) {
        return null;
    }
    if (typeof raw === 'string') {
        try {
            return normaliseFeaturePayload(JSON.parse(raw));
        }
        catch {
            throw new Error('Feature payload must be valid JSON.');
        }
    }
    if (typeof raw !== 'object' || raw === null) {
        return null;
    }
    const obj = raw;
    if (obj.type === 'FeatureCollection' && Array.isArray(obj.features) && obj.features.length) {
        return normaliseFeaturePayload(obj.features[0]);
    }
    if (obj.type && obj.coordinates && !obj.geometry) {
        return {
            type: 'Feature',
            geometry: { type: obj.type, coordinates: obj.coordinates },
            properties: obj.properties && typeof obj.properties === 'object' && !Array.isArray(obj.properties)
                ? obj.properties
                : {},
        };
    }
    return obj;
}
function parseAttributes(primary, fallback) {
    const source = primary !== undefined ? primary : fallback;
    if (!source) {
        return {};
    }
    if (typeof source === 'string') {
        const text = source.trim();
        if (!text) {
            return {};
        }
        try {
            const parsed = JSON.parse(text);
            return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : {};
        }
        catch {
            throw new Error('Attributes must be valid JSON.');
        }
    }
    if (typeof source === 'object' && !Array.isArray(source)) {
        return { ...source };
    }
    return {};
}
function withFeatureProperties(feature, assetDef) {
    const baseFeature = feature && typeof feature === 'object' && feature.geometry
        ? feature
        : { type: 'Feature', geometry: { type: 'Point', coordinates: [] }, properties: {} };
    const featureClone = {
        type: 'Feature',
        geometry: cloneGeometry(baseFeature.geometry),
        properties: { ...(baseFeature.properties || {}) },
    };
    featureClone.properties.layerName = consultant_plans_constants_1.DEFAULT_LAYER_NAME;
    featureClone.properties.assetType = assetDef.label;
    featureClone.properties.assetValue = assetDef.value;
    featureClone.properties.category = assetDef.category;
    if (!featureClone.properties.maintenanceOwnerRole) {
        featureClone.properties.maintenanceOwnerRole = 'Tehsil Manager';
    }
    return featureClone;
}
function planToFeature(plan) {
    if (!plan?.feature_geometry) {
        return null;
    }
    const geometry = cloneGeometry(plan.feature_geometry);
    const baseProperties = plan.feature_properties &&
        typeof plan.feature_properties === 'object' &&
        !Array.isArray(plan.feature_properties)
        ? { ...plan.feature_properties }
        : {};
    const attrs = plan.attributes && typeof plan.attributes === 'object' && !Array.isArray(plan.attributes)
        ? { ...plan.attributes }
        : {};
    const properties = {
        ...baseProperties,
        planId: plan.id?.toString?.() || '',
        title: plan.title || baseProperties.title || plan.asset_label,
        description: plan.description || baseProperties.description || '',
        assetType: plan.asset_label || baseProperties.assetType || plan.asset_type || '',
        assetLabel: plan.asset_label || baseProperties.assetLabel || plan.asset_type,
        assetValue: plan.asset_type || baseProperties.assetValue || '',
        category: plan.category || baseProperties.category || 'Custom',
        layerName: plan.layer_name || baseProperties.layerName || 'Consultant Plans',
        requisitionId: plan.requisition_id
            ? plan.requisition_id.toString()
            : baseProperties.requisitionId || null,
        tehsil: plan.tehsil || baseProperties.tehsil || '',
        district: plan.district || baseProperties.district || '',
        updatedAt: plan.updated_at || baseProperties.updatedAt || null,
        createdAt: plan.created_at || baseProperties.createdAt || null,
        attributes: attrs,
    };
    Object.entries(attrs).forEach(([key, value]) => {
        if (properties[key] === undefined) {
            properties[key] = value;
        }
    });
    if (plan.maintenance_owner_role) {
        properties.maintenanceOwnerRole = plan.maintenance_owner_role;
    }
    if (plan.maintenance_owner_name) {
        properties.maintenanceOwnerName = plan.maintenance_owner_name;
    }
    if (plan.maintenance_owner) {
        properties.maintenanceOwnerId = plan.maintenance_owner.toString();
    }
    return { type: 'Feature', geometry, properties };
}
function serializePlan(plan) {
    const feature = {
        type: plan.feature_type || 'Feature',
        geometry: plan.feature_geometry,
        properties: plan.feature_properties &&
            typeof plan.feature_properties === 'object' &&
            !Array.isArray(plan.feature_properties)
            ? plan.feature_properties
            : {},
    };
    return {
        id: plan.id?.toString?.() || '',
        title: plan.title,
        assetType: plan.asset_type,
        assetLabel: plan.asset_label,
        category: plan.category,
        layerName: plan.layer_name,
        description: plan.description || '',
        requisitionId: plan.requisition_id ? plan.requisition_id.toString() : null,
        tehsil: plan.tehsil || '',
        district: plan.district || '',
        feature,
        attributes: plan.attributes && typeof plan.attributes === 'object' && !Array.isArray(plan.attributes)
            ? plan.attributes
            : {},
        attachments: Array.isArray(plan.consultant_plan_attachments)
            ? plan.consultant_plan_attachments.map(serializeAttachment).filter(Boolean)
            : [],
        maintenanceOwnerRole: plan.maintenance_owner_role || '',
        maintenanceOwner: plan.maintenance_owner
            ? {
                id: plan.maintenance_owner.toString(),
                name: plan.maintenance_owner_name || '',
                role: plan.maintenance_owner_role || 'Tehsil Manager',
            }
            : null,
        maintenanceOwnerName: plan.maintenance_owner_name || '',
        maintenanceRecords: Array.isArray(plan.consultant_plan_maintenance_records)
            ? plan.consultant_plan_maintenance_records.map(serializeMaintenanceRecord).filter(Boolean)
            : [],
        createdBy: serialiseUserRef(plan.users_consultant_plans_created_byTousers),
        updatedBy: serialiseUserRef(plan.users_consultant_plans_updated_byTousers),
        createdAt: plan.created_at,
        updatedAt: plan.updated_at,
    };
}
function serialiseUserRef(ref) {
    if (!ref) {
        return null;
    }
    return {
        id: ref.id?.toString?.() || '',
        name: ref.name || '',
        role: (0, role_util_1.roleEnumToApi)(ref.role),
    };
}
function parsePlanAttachments(raw) {
    if (raw === undefined || raw === null || raw === '') {
        return [];
    }
    let source = raw;
    if (typeof raw === 'string') {
        const text = raw.trim();
        if (!text) {
            return [];
        }
        try {
            source = JSON.parse(text);
        }
        catch {
            return [
                {
                    storedName: text,
                    originalName: (0, path_1.basename)(text),
                    mimeType: '',
                    size: 0,
                },
            ];
        }
    }
    if (!Array.isArray(source)) {
        return [];
    }
    const seen = new Set();
    const attachments = [];
    source.forEach((entry) => {
        const normalised = normaliseAttachment(entry);
        if (!normalised) {
            return;
        }
        const key = `${normalised.storedName}|${normalised.originalName}`.toLowerCase();
        if (seen.has(key)) {
            return;
        }
        seen.add(key);
        attachments.push(normalised);
    });
    return attachments;
}
function normaliseAttachment(entry) {
    if (!entry) {
        return null;
    }
    if (typeof entry === 'string') {
        const storedName = safeString(entry);
        if (!storedName) {
            return null;
        }
        return {
            storedName,
            originalName: (0, path_1.basename)(storedName),
            mimeType: '',
            size: 0,
        };
    }
    if (typeof entry !== 'object') {
        return null;
    }
    const obj = entry;
    const storedName = safeString(obj.storedName || obj.path || obj.key || '');
    if (!storedName) {
        return null;
    }
    return {
        storedName,
        originalName: safeString(obj.originalName || obj.name || (0, path_1.basename)(storedName)),
        mimeType: safeString(obj.mimeType || obj.type || ''),
        size: Number(obj.size) && Number(obj.size) > 0 ? Number(obj.size) : 0,
    };
}
function serializeAttachment(entry) {
    const storedName = safeString(entry.stored_name || entry.storedName || entry.path || '');
    if (!storedName) {
        return null;
    }
    return {
        storedName,
        originalName: safeString(entry.original_name || entry.originalName || entry.name || (0, path_1.basename)(storedName)),
        mimeType: safeString(entry.mime_type || entry.mimeType || entry.type || ''),
        size: Number(entry.size) && Number(entry.size) > 0 ? Number(entry.size) : 0,
        url: buildAttachmentUrl(storedName),
    };
}
function serializeMaintenanceRecord(entry) {
    const costValue = Number(entry.cost);
    return {
        id: entry.id?.toString?.() || '',
        performedAt: entry.performed_at || null,
        type: entry.type || 'preventive',
        status: entry.status || 'completed',
        description: safeString(entry.description),
        cost: Number.isFinite(costValue) ? costValue : 0,
        notes: safeString(entry.notes),
        recordedBy: entry.recorded_by
            ? { id: entry.recorded_by.toString(), name: entry.recorded_by_name || '', role: '' }
            : null,
        recordedByName: safeString(entry.recorded_by_name),
    };
}
function buildAttachmentUrl(storedName) {
    const normalised = safeString(storedName).replace(/^[\\/]+/, '');
    if (!normalised) {
        return '';
    }
    const posixPath = normalised.split('\\').join('/');
    return `/uploads/${posixPath}`;
}
function mapUploadedFiles(files) {
    return files.map((file) => {
        const item = {
            storedName: path_1.posix.join(consultant_plans_constants_1.UPLOAD_SUBDIR, file.filename),
            originalName: file.originalname || '',
            mimeType: file.mimetype || '',
            size: file.size || 0,
        };
        return { ...item, url: buildAttachmentUrl(item.storedName) };
    });
}
function applyMaintenanceMetadata(planDoc) {
    if (!planDoc) {
        return;
    }
    if (!planDoc.feature_properties ||
        typeof planDoc.feature_properties !== 'object' ||
        Array.isArray(planDoc.feature_properties)) {
        planDoc.feature_properties = {};
    }
    const props = planDoc.feature_properties;
    props.maintenanceOwnerRole = planDoc.maintenance_owner_role || 'Tehsil Manager';
    if (planDoc.maintenance_owner) {
        props.maintenanceOwnerId = planDoc.maintenance_owner.toString();
    }
    else {
        delete props.maintenanceOwnerId;
    }
    if (planDoc.maintenance_owner_name) {
        props.maintenanceOwnerName = planDoc.maintenance_owner_name;
    }
}
function cloneGeometry(geometry) {
    if (!geometry || typeof geometry !== 'object') {
        return geometry;
    }
    try {
        return JSON.parse(JSON.stringify(geometry));
    }
    catch {
        return geometry;
    }
}
//# sourceMappingURL=consultant-plans.mapper.js.map