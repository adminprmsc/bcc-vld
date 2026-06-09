"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaterQualityService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const water_quality_domain_1 = require("../../domain/water-quality/water-quality.domain");
const tehsil_scope_service_1 = require("../../domain/tehsil-scope/tehsil-scope.service");
const prisma_service_1 = require("../../prisma/prisma.service");
const water_quality_constants_1 = require("./water-quality.constants");
const water_quality_helpers_1 = require("./water-quality.helpers");
const water_quality_mapper_1 = require("./water-quality.mapper");
const water_quality_upload_1 = require("./water-quality-upload");
let WaterQualityService = class WaterQualityService {
    constructor(prisma, tehsilScope) {
        this.prisma = prisma;
        this.tehsilScope = tehsilScope;
    }
    async list(user, query) {
        const role = user?.role || '';
        const requiresScope = this.tehsilScope.needsTehsilScope(role);
        const tehsilScope = requiresScope ? await this.tehsilScope.resolveUserTehsils(user) : [];
        if (requiresScope && tehsilScope.length === 0) {
            return [];
        }
        const requestedTehsil = query.tehsil?.toString();
        if (requestedTehsil && requiresScope && !this.tehsilScope.tehsilMatches(tehsilScope, requestedTehsil)) {
            return [];
        }
        const where = this.buildFilter(user, query, tehsilScope);
        const samples = await this.prisma.water_quality_samples.findMany({
            where,
            include: water_quality_mapper_1.sampleInclude,
            orderBy: [{ updated_at: 'desc' }, { created_at: 'desc' }],
            take: (0, water_quality_helpers_1.limitInt)(query.limit, 200),
        });
        return samples.map((sample) => (0, water_quality_mapper_1.serializeSample)(sample));
    }
    async getById(id, user) {
        if (!(0, water_quality_helpers_1.isValidId)(id)) {
            throw new common_1.BadRequestException({ msg: 'Invalid sample identifier' });
        }
        const sample = await this.prisma.water_quality_samples.findUnique({
            where: { id: BigInt(id) },
            include: water_quality_mapper_1.sampleIncludeDetailed,
        });
        if (!sample) {
            throw new common_1.NotFoundException({ msg: 'Sample not found' });
        }
        const role = user?.role || '';
        if (this.tehsilScope.needsTehsilScope(role)) {
            const tehsilScope = await this.tehsilScope.resolveUserTehsils(user);
            const tehsil = sample.plan_snapshot_tehsil || sample.consultant_plans?.tehsil || '';
            if (tehsilScope.length === 0 || !this.tehsilScope.tehsilMatches(tehsilScope, tehsil)) {
                throw new common_1.ForbiddenException({ msg: 'Forbidden' });
            }
        }
        if (!(0, water_quality_helpers_1.canReadSample)(user, sample)) {
            throw new common_1.ForbiddenException({ msg: 'Forbidden' });
        }
        return (0, water_quality_mapper_1.serializeSample)(sample);
    }
    async create(user, body) {
        if (!(0, water_quality_helpers_1.canCreate)(user?.role)) {
            throw new common_1.ForbiddenException({ msg: 'Forbidden' });
        }
        if (!(0, water_quality_helpers_1.isValidId)(body.planId)) {
            throw new common_1.NotFoundException({ msg: 'Linked asset not found' });
        }
        const plan = await this.prisma.consultant_plans.findUnique({
            where: { id: BigInt(body.planId) },
        });
        if (!plan) {
            throw new common_1.NotFoundException({ msg: 'Linked asset not found' });
        }
        const actor = await this.resolveActor(user);
        const now = new Date();
        const sample = await this.prisma.water_quality_samples.create({
            data: {
                plan_id: plan.id,
                plan_snapshot_plan_id: plan.id,
                plan_snapshot_title: plan.title,
                plan_snapshot_category: plan.category,
                plan_snapshot_tehsil: plan.tehsil || '',
                plan_snapshot_district: plan.district || '',
                status: client_1.water_quality_samples_status.awaiting_assignment,
                created_by: BigInt(actor.userId),
                created_by_name: actor.name,
                updated_by: BigInt(actor.userId),
                updated_by_name: actor.name,
                created_at: now,
                updated_at: now,
            },
        });
        await this.prisma.water_quality_sample_status_history.create({
            data: {
                sample_id: sample.id,
                ...(0, water_quality_helpers_1.buildStatusEvent)(client_1.water_quality_sample_status_history_code.critical_flagged, actor, 'Critical asset flagged'),
                created_at: now,
                updated_at: now,
            },
        });
        await this.maybeAutoAssignSampler(sample.id, actor);
        await this.prisma.consultant_plans.update({
            where: { id: plan.id },
            data: {
                latest_quality_status_status: 'pending_sample',
                latest_quality_status_label: 'Awaiting Sample',
                latest_quality_status_score: null,
                latest_quality_status_updated_at: now,
                critical_flag: true,
                critical_reason: (0, water_quality_helpers_1.safeString)(body.reason) || 'Flagged for water quality sampling',
                critical_marked_at: now,
                critical_marked_by: BigInt(actor.userId),
                critical_marked_by_name: actor.name,
                critical_acknowledged_at: null,
                critical_acknowledged_by: null,
                critical_acknowledged_by_name: '',
                updated_at: now,
            },
        });
        const fullSample = await this.prisma.water_quality_samples.findUnique({
            where: { id: sample.id },
            include: water_quality_mapper_1.sampleInclude,
        });
        return (0, water_quality_mapper_1.serializeSample)(fullSample);
    }
    async assign(id, user, body) {
        this.ensureRole(user, water_quality_constants_1.RA_ROLES);
        const sample = await this.fetchEditableSample(id, user);
        if (['closed', 'cancelled', 'results_ready', 'in_lab'].includes(sample.status || '')) {
            throw new common_1.ConflictException({ msg: 'Sample has already moved past assignment.' });
        }
        if (!['awaiting_assignment', 'awaiting_collection'].includes(sample.status || '')) {
            throw new common_1.ConflictException({ msg: 'Sample is not in a state that allows assignment.' });
        }
        const samplerId = (0, water_quality_helpers_1.parseId)(body.samplerId);
        if (!samplerId) {
            throw new common_1.BadRequestException({ msg: 'Sampler is required' });
        }
        const sampler = await this.prisma.users.findFirst({
            where: { id: BigInt(samplerId), role: client_1.users_role.PCRWR_Sampler },
            select: { id: true, name: true, role: true },
        });
        if (!sampler) {
            throw new common_1.BadRequestException({ msg: 'Sampler not found or not PCRWR Sampler' });
        }
        const actor = await this.resolveActor(user);
        const now = new Date();
        await this.prisma.water_quality_samples.update({
            where: { id: sample.id },
            data: {
                assigned_sampler: sampler.id,
                assigned_sampler_name: sampler.name || 'PCRWR Sampler',
                assigned_at: now,
                status: client_1.water_quality_samples_status.awaiting_collection,
                updated_by: BigInt(actor.userId),
                updated_by_name: actor.name,
                updated_at: now,
            },
        });
        await this.prisma.water_quality_sample_status_history.create({
            data: {
                sample_id: sample.id,
                ...(0, water_quality_helpers_1.buildStatusEvent)(client_1.water_quality_sample_status_history_code.assignment, actor, `Assigned to ${sampler.name || 'PCRWR Sampler'}`),
                created_at: now,
                updated_at: now,
            },
        });
        const fullSample = await this.prisma.water_quality_samples.findUnique({
            where: { id: sample.id },
            include: water_quality_mapper_1.sampleInclude,
        });
        return (0, water_quality_mapper_1.serializeSample)(fullSample);
    }
    async updateCollection(id, user, body) {
        this.ensureRole(user, water_quality_constants_1.PCRWR_SAMPLER_ROLES);
        const sample = await this.fetchEditableSample(id, user);
        if (!['awaiting_collection', 'collecting'].includes(sample.status || '')) {
            throw new common_1.ConflictException({ msg: 'Sample is not ready for collection.' });
        }
        this.ensureSamplerOwnership(sample, user);
        const actor = await this.resolveActor(user);
        const coords = (0, water_quality_helpers_1.parseCoords)(body.location);
        const now = new Date();
        const alreadyCollecting = sample.status === client_1.water_quality_samples_status.collecting;
        await this.prisma.water_quality_samples.update({
            where: { id: sample.id },
            data: {
                collection_collected_at: (0, water_quality_helpers_1.parseDate)(body.collectedAt) || now,
                collection_field_notes: (0, water_quality_helpers_1.safeString)(body.fieldNotes),
                ...(coords
                    ? {
                        collection_location_lat: coords.lat,
                        collection_location_lng: coords.lng,
                    }
                    : {}),
                collection_collected_by: BigInt(actor.userId),
                collection_collected_by_name: actor.name,
                status: client_1.water_quality_samples_status.collecting,
                updated_by: BigInt(actor.userId),
                updated_by_name: actor.name,
                updated_at: now,
            },
        });
        if (!alreadyCollecting) {
            await this.prisma.water_quality_sample_status_history.create({
                data: {
                    sample_id: sample.id,
                    ...(0, water_quality_helpers_1.buildStatusEvent)(client_1.water_quality_sample_status_history_code.collection_started, actor, 'Field collection started'),
                    created_at: now,
                    updated_at: now,
                },
            });
        }
        const fullSample = await this.prisma.water_quality_samples.findUnique({
            where: { id: sample.id },
            include: water_quality_mapper_1.sampleInclude,
        });
        return (0, water_quality_mapper_1.serializeSample)(fullSample);
    }
    async completeCollection(id, user, body, files) {
        this.ensureRole(user, water_quality_constants_1.PCRWR_SAMPLER_ROLES);
        const sample = await this.fetchEditableSample(id, user);
        if (!['collecting', 'awaiting_collection'].includes(sample.status || '')) {
            throw new common_1.ConflictException({
                msg: 'Sample cannot be marked collected in its current status.',
            });
        }
        this.ensureSamplerOwnership(sample, user);
        await this.saveFileAttachments(sample.id, files, client_1.water_quality_sample_attachments_attachment_type.collection);
        const actor = await this.resolveActor(user);
        const coords = (0, water_quality_helpers_1.parseCoords)(body.location);
        const now = new Date();
        await this.prisma.water_quality_samples.update({
            where: { id: sample.id },
            data: {
                collection_collected_at: (0, water_quality_helpers_1.parseDate)(body.collectedAt) || now,
                collection_field_notes: (0, water_quality_helpers_1.safeString)(body.fieldNotes),
                ...(coords
                    ? {
                        collection_location_lat: coords.lat,
                        collection_location_lng: coords.lng,
                    }
                    : {}),
                collection_collected_by: BigInt(actor.userId),
                collection_collected_by_name: actor.name,
                status: client_1.water_quality_samples_status.in_lab,
                updated_by: BigInt(actor.userId),
                updated_by_name: actor.name,
                updated_at: now,
            },
        });
        await this.prisma.water_quality_sample_status_history.create({
            data: {
                sample_id: sample.id,
                ...(0, water_quality_helpers_1.buildStatusEvent)(client_1.water_quality_sample_status_history_code.collection_complete, actor, 'Sample collected and dispatched'),
                created_at: now,
                updated_at: now,
            },
        });
        const fullSample = await this.prisma.water_quality_samples.findUnique({
            where: { id: sample.id },
            include: water_quality_mapper_1.sampleInclude,
        });
        return (0, water_quality_mapper_1.serializeSample)(fullSample);
    }
    async submitLabResults(id, user, body, files) {
        this.ensureRole(user, water_quality_constants_1.PCRWR_LAB_ROLES);
        const sample = await this.fetchEditableSample(id, user);
        if (!['in_lab', 'results_ready'].includes(sample.status || '')) {
            throw new common_1.ConflictException({
                msg: 'Sample results can only be posted once received by the lab.',
            });
        }
        await this.saveFileAttachments(sample.id, files, client_1.water_quality_sample_attachments_attachment_type.lab_analysis);
        const actor = await this.resolveActor(user);
        const metrics = (0, water_quality_helpers_1.normalizeLabMetrics)((0, water_quality_helpers_1.parseMetrics)(body.metrics));
        const now = new Date();
        const { value, rating } = (0, water_quality_domain_1.computePotabilityIndex)(metrics);
        await this.prisma.water_quality_samples.update({
            where: { id: sample.id },
            data: {
                lab_analysis_received_at: (0, water_quality_helpers_1.parseDate)(body.receivedAt) || sample.lab_analysis_received_at || now,
                lab_analysis_completed_at: (0, water_quality_helpers_1.parseDate)(body.completedAt) || sample.lab_analysis_completed_at || now,
                lab_analysis_metrics: metrics,
                lab_analysis_analyst: BigInt(actor.userId),
                lab_analysis_analyst_name: actor.name,
                lab_analysis_notes: (0, water_quality_helpers_1.safeString)(body.notes),
                computed_score_index_name: 'potability-index',
                computed_score_value: value,
                computed_score_rating: rating,
                computed_score_updated_at: now,
                status: client_1.water_quality_samples_status.results_ready,
                updated_by: BigInt(actor.userId),
                updated_by_name: actor.name,
                updated_at: now,
            },
        });
        await this.prisma.water_quality_sample_status_history.create({
            data: {
                sample_id: sample.id,
                ...(0, water_quality_helpers_1.buildStatusEvent)(client_1.water_quality_sample_status_history_code.results_posted, actor, 'Lab results posted'),
                created_at: now,
                updated_at: now,
            },
        });
        await this.prisma.consultant_plans.update({
            where: { id: sample.plan_id },
            data: {
                latest_quality_status_status: rating,
                latest_quality_status_score: value,
                latest_quality_status_label: (0, water_quality_helpers_1.labelForRating)(rating),
                latest_quality_status_updated_at: now,
                updated_at: now,
            },
        });
        const fullSample = await this.prisma.water_quality_samples.findUnique({
            where: { id: sample.id },
            include: water_quality_mapper_1.sampleIncludeDetailed,
        });
        return (0, water_quality_mapper_1.serializeSample)(fullSample);
    }
    async closeSample(id, user, body) {
        this.ensureRole(user, new Set([...water_quality_constants_1.PCRWR_ROLES, ...water_quality_constants_1.RA_ROLES, ...water_quality_constants_1.MANAGER_ROLES]));
        const sample = await this.fetchEditableSample(id, user);
        if (['closed', 'cancelled'].includes(sample.status || '')) {
            throw new common_1.ConflictException({ msg: 'Sample is already closed or cancelled.' });
        }
        const actor = await this.resolveActor(user);
        const note = (0, water_quality_helpers_1.safeString)(body.note);
        const now = new Date();
        await this.prisma.water_quality_samples.update({
            where: { id: sample.id },
            data: {
                status: client_1.water_quality_samples_status.closed,
                updated_by: BigInt(actor.userId),
                updated_by_name: actor.name,
                updated_at: now,
            },
        });
        await this.prisma.water_quality_sample_status_history.create({
            data: {
                sample_id: sample.id,
                ...(0, water_quality_helpers_1.buildStatusEvent)(client_1.water_quality_sample_status_history_code.closed, actor, note || 'Sample closed'),
                created_at: now,
                updated_at: now,
            },
        });
        await this.prisma.consultant_plans.update({
            where: { id: sample.plan_id },
            data: {
                critical_flag: false,
                critical_reason: '',
                critical_marked_at: null,
                critical_marked_by: null,
                critical_marked_by_name: '',
                critical_acknowledged_at: null,
                critical_acknowledged_by: null,
                critical_acknowledged_by_name: '',
                updated_at: now,
            },
        });
        const fullSample = await this.prisma.water_quality_samples.findUnique({
            where: { id: sample.id },
            include: water_quality_mapper_1.sampleInclude,
        });
        return (0, water_quality_mapper_1.serializeSample)(fullSample);
    }
    async cancelSample(id, user, body) {
        this.ensureRole(user, new Set([...water_quality_constants_1.RA_ROLES, ...water_quality_constants_1.MANAGER_ROLES]));
        const sample = await this.fetchEditableSample(id, user);
        if (['closed', 'cancelled'].includes(sample.status || '')) {
            throw new common_1.ConflictException({ msg: 'Sample is already closed or cancelled.' });
        }
        const actor = await this.resolveActor(user);
        const note = (0, water_quality_helpers_1.safeString)(body.note);
        const now = new Date();
        await this.prisma.water_quality_samples.update({
            where: { id: sample.id },
            data: {
                status: client_1.water_quality_samples_status.cancelled,
                updated_by: BigInt(actor.userId),
                updated_by_name: actor.name,
                updated_at: now,
            },
        });
        await this.prisma.water_quality_sample_status_history.create({
            data: {
                sample_id: sample.id,
                ...(0, water_quality_helpers_1.buildStatusEvent)(client_1.water_quality_sample_status_history_code.cancelled, actor, note || 'Sample cancelled'),
                created_at: now,
                updated_at: now,
            },
        });
        const fullSample = await this.prisma.water_quality_samples.findUnique({
            where: { id: sample.id },
            include: water_quality_mapper_1.sampleInclude,
        });
        return (0, water_quality_mapper_1.serializeSample)(fullSample);
    }
    uploadAttachments(user, files) {
        this.ensureRole(user, water_quality_constants_1.PCRWR_ROLES);
        const attachments = (Array.isArray(files) ? files : []).map((file) => ({
            storedName: (0, water_quality_upload_1.storedNameForFile)(file.filename),
            originalName: file.originalname || '',
            mimeType: file.mimetype || '',
            size: file.size || 0,
        }));
        return { attachments: attachments.map((entry) => (0, water_quality_mapper_1.decorateAttachment)({
                stored_name: entry.storedName,
                original_name: entry.originalName,
                mime_type: entry.mimeType,
                size: BigInt(entry.size),
            })) };
    }
    async listByPlan(user, planId, query) {
        if (!(0, water_quality_helpers_1.isValidId)(planId)) {
            throw new common_1.BadRequestException({ msg: 'Invalid plan identifier' });
        }
        const role = user?.role || '';
        const requiresScope = this.tehsilScope.needsTehsilScope(role);
        const tehsilScope = requiresScope ? await this.tehsilScope.resolveUserTehsils(user) : [];
        if (requiresScope && tehsilScope.length === 0) {
            return [];
        }
        const requestedTehsil = query.tehsil?.toString();
        if (requestedTehsil && requiresScope && !this.tehsilScope.tehsilMatches(tehsilScope, requestedTehsil)) {
            return [];
        }
        const conditions = [
            { plan_id: BigInt(planId) },
        ];
        if (tehsilScope.length) {
            const scopeQuery = this.tehsilScope.buildTehsilScopePrismaFilter(tehsilScope, 'plan_snapshot_tehsil');
            if (scopeQuery) {
                conditions.push(scopeQuery);
            }
        }
        if (requestedTehsil) {
            conditions.push({
                plan_snapshot_tehsil: { contains: (0, water_quality_helpers_1.escapeLike)(requestedTehsil) },
            });
        }
        const where = conditions.length === 1 ? conditions[0] : { AND: conditions };
        const samples = await this.prisma.water_quality_samples.findMany({
            where,
            include: {
                water_quality_sample_status_history: {
                    orderBy: { created_at: 'asc' },
                },
                water_quality_sample_attachments: true,
            },
            orderBy: { created_at: 'desc' },
            take: (0, water_quality_helpers_1.limitInt)(query.limit, 50),
        });
        return samples.map((sample) => (0, water_quality_mapper_1.serializeSample)(sample));
    }
    buildFilter(user, query, tehsilScope) {
        const role = user?.role || '';
        const conditions = [];
        if (water_quality_constants_1.RA_ROLES.has(role)) {
            conditions.push({ created_by: BigInt(user.userId) });
        }
        if (water_quality_constants_1.PCRWR_ROLES.has(role)) {
            conditions.push({
                OR: [
                    { assigned_sampler: BigInt(user.userId) },
                    {
                        status: {
                            in: [
                                client_1.water_quality_samples_status.awaiting_collection,
                                client_1.water_quality_samples_status.collecting,
                                client_1.water_quality_samples_status.in_lab,
                            ],
                        },
                    },
                ],
            });
        }
        if (tehsilScope.length) {
            const scopeQuery = this.tehsilScope.buildTehsilScopePrismaFilter(tehsilScope, 'plan_snapshot_tehsil');
            if (scopeQuery) {
                conditions.push(scopeQuery);
            }
        }
        if (query.planId && (0, water_quality_helpers_1.isValidId)(query.planId)) {
            conditions.push({ plan_id: BigInt(query.planId) });
        }
        if (query.status) {
            conditions.push({ status: query.status });
        }
        if (query.tehsil) {
            conditions.push({
                plan_snapshot_tehsil: { contains: (0, water_quality_helpers_1.escapeLike)(query.tehsil) },
            });
        }
        if (conditions.length === 0) {
            return {};
        }
        if (conditions.length === 1) {
            return conditions[0];
        }
        return { AND: conditions };
    }
    async fetchEditableSample(id, user) {
        if (!(0, water_quality_helpers_1.isValidId)(id)) {
            throw new common_1.BadRequestException({ msg: 'Invalid sample identifier' });
        }
        const sample = await this.prisma.water_quality_samples.findUnique({
            where: { id: BigInt(id) },
        });
        if (!sample) {
            throw new common_1.NotFoundException({ msg: 'Sample not found' });
        }
        const role = user?.role || '';
        if (this.tehsilScope.needsTehsilScope(role)) {
            const tehsilScope = await this.tehsilScope.resolveUserTehsils(user);
            if (tehsilScope.length === 0 ||
                !this.tehsilScope.tehsilMatches(tehsilScope, sample.plan_snapshot_tehsil)) {
                throw new common_1.ForbiddenException({ msg: 'Forbidden' });
            }
        }
        return sample;
    }
    async maybeAutoAssignSampler(sampleId, actor) {
        try {
            const sampler = await this.resolveDefaultSampler();
            if (!sampler) {
                return;
            }
            const now = new Date();
            await this.prisma.water_quality_samples.update({
                where: { id: sampleId },
                data: {
                    assigned_sampler: sampler.id,
                    assigned_sampler_name: sampler.name || 'PCRWR Sampler',
                    assigned_at: now,
                    status: client_1.water_quality_samples_status.awaiting_collection,
                    updated_by: BigInt(actor.userId),
                    updated_by_name: actor.name,
                    updated_at: now,
                },
            });
            await this.prisma.water_quality_sample_status_history.create({
                data: {
                    sample_id: sampleId,
                    ...(0, water_quality_helpers_1.buildStatusEvent)(client_1.water_quality_sample_status_history_code.assignment, actor, `Auto-assigned to ${sampler.name || 'PCRWR Sampler'}`),
                    created_at: now,
                    updated_at: now,
                },
            });
        }
        catch (err) {
            console.error('Auto-assignment error:', err instanceof Error ? err.message : err);
        }
    }
    async resolveDefaultSampler() {
        const preferredEmail = (process.env.DEFAULT_WATER_QUALITY_SAMPLER_EMAIL || '').trim();
        if (preferredEmail) {
            const samplerByEmail = await this.prisma.users.findFirst({
                where: { email: preferredEmail, role: client_1.users_role.PCRWR_Sampler },
            });
            if (samplerByEmail) {
                return samplerByEmail;
            }
        }
        const activeSampler = await this.prisma.users.findFirst({
            where: { role: client_1.users_role.PCRWR_Sampler, active_status: 'active' },
            orderBy: { id: 'asc' },
        });
        if (activeSampler) {
            return activeSampler;
        }
        return this.prisma.users.findFirst({
            where: { role: client_1.users_role.PCRWR_Sampler },
            orderBy: { id: 'asc' },
        });
    }
    async saveFileAttachments(sampleId, files, attachmentType) {
        const safeFiles = Array.isArray(files) ? files : [];
        const now = new Date();
        for (const file of safeFiles) {
            await this.prisma.water_quality_sample_attachments.create({
                data: {
                    sample_id: sampleId,
                    attachment_type: attachmentType,
                    stored_name: (0, water_quality_upload_1.storedNameForFile)(file.filename),
                    original_name: file.originalname || '',
                    mime_type: file.mimetype || '',
                    size: BigInt(file.size || 0),
                    created_at: now,
                    updated_at: now,
                },
            });
        }
    }
    ensureRole(user, roles) {
        const role = user?.role || '';
        if (!roles.has(role)) {
            throw new common_1.ForbiddenException({ msg: 'Forbidden' });
        }
    }
    ensureSamplerOwnership(sample, user) {
        const userId = Number(user?.userId);
        const assignedSamplerId = Number(sample.assigned_sampler);
        if (!assignedSamplerId) {
            throw new common_1.ConflictException({ msg: 'Sample has not been assigned to a sampler yet.' });
        }
        if (assignedSamplerId !== userId) {
            throw new common_1.ForbiddenException({ msg: 'Sample is assigned to another sampler.' });
        }
    }
    async resolveActor(user) {
        const dbUser = await this.prisma.users.findUnique({
            where: { id: BigInt(user.userId) },
            select: { name: true },
        });
        return {
            ...user,
            name: dbUser?.name || '',
        };
    }
};
exports.WaterQualityService = WaterQualityService;
exports.WaterQualityService = WaterQualityService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        tehsil_scope_service_1.TehsilScopeService])
], WaterQualityService);
//# sourceMappingURL=water-quality.service.js.map