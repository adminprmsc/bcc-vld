"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REQUISITION_INCLUDE = void 0;
exports.serializeRequisition = serializeRequisition;
exports.serializeMany = serializeMany;
exports.summarizeUser = summarizeUser;
const role_util_1 = require("../../common/utils/role.util");
const requisition_helpers_1 = require("./requisition.helpers");
exports.REQUISITION_INCLUDE = {
    users_requisitions_requested_byTousers: {
        select: { id: true, simple_id: true, name: true, email: true, role: true },
    },
    users_requisitions_assigned_toTousers: {
        select: { id: true, simple_id: true, name: true, email: true, role: true },
    },
    requisition_activity_logs: {
        orderBy: { timestamp: 'asc' },
        include: {
            users: { select: { id: true, simple_id: true, name: true, role: true } },
        },
    },
    requisition_civil_structures: {
        include: {
            users: { select: { id: true, name: true, role: true } },
        },
    },
    requisition_machinery: {
        include: {
            users: { select: { id: true, name: true, role: true } },
        },
    },
    requisition_progress_updates: {
        include: {
            users: { select: { id: true, name: true, role: true } },
        },
    },
};
function mapUserSummary(user) {
    if (!user) {
        return null;
    }
    return {
        id: user.id,
        simpleId: user.simple_id ?? null,
        name: user.name,
        email: user.email,
        role: (0, role_util_1.roleEnumToApi)(user.role),
    };
}
function mapUpdater(user) {
    if (!user) {
        return null;
    }
    return {
        id: user.id,
        name: user.name,
        role: (0, role_util_1.roleEnumToApi)(user.role),
    };
}
function serializeRequisition(row) {
    if (!row) {
        return row;
    }
    const requester = row.users_requisitions_requested_byTousers;
    const assignee = row.users_requisitions_assigned_toTousers;
    const landAcquisitionData = (row.land_acquisition_data || {});
    return {
        id: row.id,
        _id: row.id,
        sequenceNumber: row.sequence_number,
        title: row.title,
        description: row.description,
        purpose: row.purpose,
        division: row.division,
        district: row.district,
        tehsil: row.tehsil,
        requestedBy: mapUserSummary(requester),
        requester: mapUserSummary(requester),
        assignedTo: mapUserSummary(assignee),
        assignee: mapUserSummary(assignee),
        landArea: row.land_area,
        landType: row.land_type,
        landBreadth: (0, requisition_helpers_1.decimalToNumber)(row.land_breadth),
        landDepth: (0, requisition_helpers_1.decimalToNumber)(row.land_depth),
        calculatedAreaSqFt: (0, requisition_helpers_1.decimalToNumber)(row.calculated_area_sq_ft),
        calculatedAreaMarlas: (0, requisition_helpers_1.decimalToNumber)(row.calculated_area_marlas),
        calculatedAreaKanals: (0, requisition_helpers_1.decimalToNumber)(row.calculated_area_kanals),
        govtLandChecklist: row.govt_land_checklist,
        privateLandChecklist: row.private_land_checklist,
        mapFeatures: row.map_features,
        requiredDate: row.required_date,
        priority: row.priority,
        supportingDocs: row.supporting_docs,
        status: row.status,
        estimatedValue: row.estimated_value,
        remarks: row.remarks,
        attachments: row.attachments,
        dateCreated: row.date_created,
        lastUpdated: row.last_updated,
        activityLog: (row.requisition_activity_logs || []).map((log) => ({
            id: log.id,
            _id: log.id,
            action: log.action,
            userId: log.user_id,
            user: mapUserSummary(log.users),
            actor: mapUserSummary(log.users),
            timestamp: log.timestamp,
            remarks: log.remarks,
            meta: log.meta,
        })),
        activityLogs: (row.requisition_activity_logs || []).map((log) => ({
            id: log.id,
            _id: log.id,
            action: log.action,
            userId: log.user_id,
            user: mapUserSummary(log.users),
            actor: mapUserSummary(log.users),
            timestamp: log.timestamp,
            remarks: log.remarks,
            meta: log.meta,
        })),
        location: {
            address: row.location_address || '',
            coordinates: row.location_lat != null && row.location_lng != null
                ? { lat: Number(row.location_lat), lng: Number(row.location_lng) }
                : null,
        },
        mapMarker: row.map_marker_lat != null && row.map_marker_lng != null
            ? { lat: Number(row.map_marker_lat), lng: Number(row.map_marker_lng) }
            : null,
        mapViewport: row.map_viewport_center_lat != null && row.map_viewport_center_lng != null
            ? {
                center: {
                    lat: Number(row.map_viewport_center_lat),
                    lng: Number(row.map_viewport_center_lng),
                },
                zoom: row.map_viewport_zoom || 0,
            }
            : null,
        landAcquisition: {
            type: row.land_acquisition_type ? row.land_acquisition_type.replace(/_/g, ' ') : '',
            status: row.land_acquisition_status || '',
            ...(landAcquisitionData || {}),
            updatedBy: row.land_acquisition_updated_by,
            updatedAt: row.land_acquisition_updated_at,
        },
        landUtilization: {
            overview: {
                phase: row.land_utilization_phase || '',
                summary: row.land_utilization_summary || '',
                nextMilestone: row.land_utilization_next_milestone || '',
            },
            civilStructures: (row.requisition_civil_structures || []).map((s) => ({
                id: s.id,
                _id: s.id,
                name: s.name,
                category: s.category,
                status: s.status,
                description: s.description,
                attributes: s.attributes,
                photos: s.photos,
                updatedBy: mapUpdater(s.users),
                createdAt: s.created_at,
                updatedAt: s.updated_at,
            })),
            machinery: (row.requisition_machinery || []).map((m) => ({
                id: m.id,
                _id: m.id,
                name: m.name,
                type: m.type,
                status: m.status,
                capacity: m.capacity,
                manufacturer: m.manufacturer,
                attributes: m.attributes,
                photos: m.photos,
                updatedBy: mapUpdater(m.users),
                createdAt: m.created_at,
                updatedAt: m.updated_at,
            })),
            progressUpdates: (row.requisition_progress_updates || []).map((p) => ({
                id: p.id,
                _id: p.id,
                status: p.status,
                description: p.description,
                progressDate: p.progress_date,
                completionPercentage: p.completion_percentage,
                attachments: p.attachments,
                updatedBy: mapUpdater(p.users),
                createdAt: p.created_at,
                updatedAt: p.updated_at,
            })),
            gallery: row.land_utilization_gallery || [],
            updatedBy: row.land_utilization_updated_by,
            updatedAt: row.land_utilization_updated_at,
        },
        locationAddress: row.location_address,
        locationLat: (0, requisition_helpers_1.decimalToNumber)(row.location_lat),
        locationLng: (0, requisition_helpers_1.decimalToNumber)(row.location_lng),
        mapMarkerLat: (0, requisition_helpers_1.decimalToNumber)(row.map_marker_lat),
        mapMarkerLng: (0, requisition_helpers_1.decimalToNumber)(row.map_marker_lng),
        mapViewportCenterLat: (0, requisition_helpers_1.decimalToNumber)(row.map_viewport_center_lat),
        mapViewportCenterLng: (0, requisition_helpers_1.decimalToNumber)(row.map_viewport_center_lng),
        mapViewportZoom: row.map_viewport_zoom,
        landAcquisitionType: row.land_acquisition_type,
        landAcquisitionStatus: row.land_acquisition_status,
        landAcquisitionData: row.land_acquisition_data,
        landAcquisitionUpdatedBy: row.land_acquisition_updated_by,
        landAcquisitionUpdatedAt: row.land_acquisition_updated_at,
        landUtilizationPhase: row.land_utilization_phase,
        landUtilizationSummary: row.land_utilization_summary,
        landUtilizationNextMilestone: row.land_utilization_next_milestone,
        landUtilizationGallery: row.land_utilization_gallery,
        landUtilizationUpdatedBy: row.land_utilization_updated_by,
        landUtilizationUpdatedAt: row.land_utilization_updated_at,
    };
}
function serializeMany(requisitions) {
    return requisitions.map((row) => serializeRequisition(row));
}
function summarizeUser(user) {
    if (!user) {
        return '—';
    }
    if (typeof user === 'string') {
        return user;
    }
    const u = user;
    const chunks = [];
    if (u.simpleId != null) {
        chunks.push(`#${u.simpleId}`);
    }
    if (u.name) {
        chunks.push(u.name);
    }
    else if (u.email) {
        chunks.push(u.email);
    }
    if (u.role) {
        chunks.push(`(${u.role})`);
    }
    return chunks.length ? chunks.join(' ') : '—';
}
//# sourceMappingURL=requisition.mapper.js.map