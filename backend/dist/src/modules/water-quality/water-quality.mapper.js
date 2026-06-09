"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sampleIncludeDetailed = exports.sampleInclude = void 0;
exports.decorateAttachment = decorateAttachment;
exports.serializeSample = serializeSample;
const role_util_1 = require("../../common/utils/role.util");
function decorateAttachment(entry) {
    return {
        id: entry.id || undefined,
        storedName: entry.stored_name,
        originalName: entry.original_name || '',
        mimeType: entry.mime_type || '',
        size: entry.size != null ? Number(entry.size) : 0,
        url: `/uploads/${entry.stored_name}`.replace(/\\/g, '/').replace(/\/+/, '/uploads/'),
    };
}
function decorateAttachmentList(list, type) {
    if (!Array.isArray(list)) {
        return [];
    }
    const filtered = type ? list.filter((a) => a.attachment_type === type) : list;
    return filtered.map(decorateAttachment);
}
function mapUserRef(user) {
    if (!user) {
        return null;
    }
    return {
        id: user.id,
        name: user.name,
        role: (0, role_util_1.roleEnumToApi)(user.role),
    };
}
function serializeSample(source) {
    if (!source) {
        return null;
    }
    const allAttachments = source.water_quality_sample_attachments || [];
    const mainAttachments = allAttachments.filter((a) => a.attachment_type === 'main');
    const collectionAttachments = allAttachments.filter((a) => a.attachment_type === 'collection');
    const labAttachments = allAttachments.filter((a) => a.attachment_type === 'lab_analysis');
    const plan = source.consultant_plans;
    const planField = plan
        ? {
            id: plan.id,
            title: plan.title,
            category: plan.category,
            tehsil: plan.tehsil,
            district: plan.district,
            criticalFlag: plan.critical_flag,
            latestQualityStatus: {
                status: plan.latest_quality_status_status,
                score: plan.latest_quality_status_score != null
                    ? Number(plan.latest_quality_status_score)
                    : null,
                label: plan.latest_quality_status_label,
                updatedAt: plan.latest_quality_status_updated_at,
            },
        }
        : source.plan_id;
    const samplerField = mapUserRef(source.users_water_quality_samples_assigned_samplerTousers) ||
        source.assigned_sampler ||
        null;
    const createdByField = mapUserRef(source.users_water_quality_samples_created_byTousers) || source.created_by;
    const analystField = mapUserRef(source.users_water_quality_samples_lab_analysis_analystTousers) ||
        source.lab_analysis_analyst;
    return {
        id: source.id,
        planId: source.plan_id,
        plan: planField,
        planSnapshot: {
            planId: source.plan_snapshot_plan_id,
            title: source.plan_snapshot_title,
            category: source.plan_snapshot_category,
            tehsil: source.plan_snapshot_tehsil,
            district: source.plan_snapshot_district,
        },
        status: source.status,
        assignedSampler: samplerField,
        assignedSamplerName: source.assigned_sampler_name,
        assignedSamplerId: source.assigned_sampler || null,
        assignedAt: source.assigned_at,
        collection: {
            collectedAt: source.collection_collected_at,
            fieldNotes: source.collection_field_notes,
            location: source.collection_location_lat != null && source.collection_location_lng != null
                ? {
                    lat: Number(source.collection_location_lat),
                    lng: Number(source.collection_location_lng),
                }
                : null,
            collectedBy: source.collection_collected_by,
            collectedByName: source.collection_collected_by_name,
            attachments: decorateAttachmentList(collectionAttachments),
        },
        labAnalysis: {
            receivedAt: source.lab_analysis_received_at,
            completedAt: source.lab_analysis_completed_at,
            analyst: analystField,
            analystName: source.lab_analysis_analyst_name,
            metrics: source.lab_analysis_metrics,
            notes: source.lab_analysis_notes,
            attachments: decorateAttachmentList(labAttachments),
        },
        computedScore: {
            indexName: source.computed_score_index_name,
            value: source.computed_score_value != null ? Number(source.computed_score_value) : null,
            rating: source.computed_score_rating,
            updatedAt: source.computed_score_updated_at,
        },
        statusHistory: Array.isArray(source.water_quality_sample_status_history)
            ? source.water_quality_sample_status_history.map((event) => ({
                id: event.id,
                code: event.code,
                label: event.label,
                note: event.note,
                tone: event.tone,
                createdAt: event.created_at,
                createdBy: event.created_by,
                createdByName: event.created_by_name,
            }))
            : [],
        attachments: decorateAttachmentList(mainAttachments),
        createdBy: createdByField,
        createdByName: source.created_by_name,
        updatedBy: source.updated_by,
        updatedByName: source.updated_by_name,
        createdAt: source.created_at,
        updatedAt: source.updated_at,
    };
}
exports.sampleInclude = {
    consultant_plans: {
        select: {
            id: true,
            title: true,
            category: true,
            tehsil: true,
            district: true,
            critical_flag: true,
            latest_quality_status_status: true,
            latest_quality_status_score: true,
            latest_quality_status_label: true,
            latest_quality_status_updated_at: true,
        },
    },
    users_water_quality_samples_assigned_samplerTousers: {
        select: { id: true, name: true, role: true },
    },
    users_water_quality_samples_created_byTousers: {
        select: { id: true, name: true, role: true },
    },
    water_quality_sample_status_history: {
        orderBy: { created_at: 'asc' },
    },
    water_quality_sample_attachments: true,
};
exports.sampleIncludeDetailed = {
    ...exports.sampleInclude,
    users_water_quality_samples_lab_analysis_analystTousers: {
        select: { id: true, name: true, role: true },
    },
};
//# sourceMappingURL=water-quality.mapper.js.map