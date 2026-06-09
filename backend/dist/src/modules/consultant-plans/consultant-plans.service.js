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
exports.ConsultantPlansService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const role_synonyms_1 = require("../../common/security/role-synonyms");
const tehsil_scope_service_1 = require("../../domain/tehsil-scope/tehsil-scope.service");
const prisma_service_1 = require("../../prisma/prisma.service");
const consultant_plans_constants_1 = require("./consultant-plans.constants");
const consultant_plans_mapper_1 = require("./consultant-plans.mapper");
const PLAN_INCLUDE = {
    users_consultant_plans_created_byTousers: { select: { id: true, name: true, role: true } },
    users_consultant_plans_updated_byTousers: { select: { id: true, name: true, role: true } },
    consultant_plan_attachments: true,
    consultant_plan_maintenance_records: true,
};
let ConsultantPlansService = class ConsultantPlansService {
    constructor(prisma, tehsilScope) {
        this.prisma = prisma;
        this.tehsilScope = tehsilScope;
    }
    getDefinitions() {
        return consultant_plans_constants_1.ASSET_DEFINITIONS;
    }
    processUpload(files) {
        const attachments = (0, consultant_plans_mapper_1.mapUploadedFiles)(files);
        return { attachments };
    }
    async listPlans(user, query) {
        try {
            const role = user?.role || '';
            const userId = user?.userId;
            const tehsilScope = await this.tehsilScope.resolveUserTehsils(user);
            if (this.tehsilScope.needsTehsilScope(role) &&
                tehsilScope.length === 0 &&
                role !== 'Tehsil Manager') {
                return [];
            }
            if (query.tehsil &&
                tehsilScope.length &&
                !this.tehsilScope.tehsilMatches(tehsilScope, query.tehsil)) {
                return [];
            }
            const queryPromises = [];
            if (!this.tehsilScope.needsTehsilScope(role) || tehsilScope.length > 0) {
                const scopedFilter = this.buildFilter(user, query, tehsilScope);
                queryPromises.push(this.fetchConsultantPlans(scopedFilter));
            }
            if (role === 'Tehsil Manager' && userId) {
                const ownerFilter = this.buildFilter(user, query, []);
                ownerFilter.maintenance_owner = BigInt(userId);
                queryPromises.push(this.fetchConsultantPlans(ownerFilter));
            }
            if (!queryPromises.length) {
                return [];
            }
            const resultSets = await Promise.all(queryPromises);
            const planMap = new Map();
            resultSets.forEach((list) => {
                list.forEach((plan) => {
                    const key = plan.id.toString();
                    if (key && !planMap.has(key)) {
                        planMap.set(key, plan);
                    }
                });
            });
            const combined = Array.from(planMap.values()).sort((a, b) => {
                const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
                const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
                return bTime - aTime;
            });
            return combined.map((plan) => (0, consultant_plans_mapper_1.serializePlan)(plan));
        }
        catch (err) {
            throw new common_1.InternalServerErrorException({
                msg: 'Server error',
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }
    async getLayers(user, query) {
        try {
            const tehsilScope = await this.tehsilScope.resolveUserTehsils(user);
            if (this.tehsilScope.needsTehsilScope(user?.role) && tehsilScope.length === 0) {
                return { layers: {} };
            }
            if (query.tehsil &&
                tehsilScope.length &&
                !this.tehsilScope.tehsilMatches(tehsilScope, query.tehsil)) {
                return { layers: {} };
            }
            const filter = this.buildFilter(user, query, tehsilScope);
            const plans = await this.prisma.consultant_plans.findMany({
                where: filter,
                select: {
                    id: true,
                    title: true,
                    asset_type: true,
                    asset_label: true,
                    category: true,
                    layer_name: true,
                    description: true,
                    requisition_id: true,
                    tehsil: true,
                    district: true,
                    feature_type: true,
                    feature_geometry: true,
                    feature_properties: true,
                    attributes: true,
                    maintenance_owner: true,
                    maintenance_owner_name: true,
                    maintenance_owner_role: true,
                    updated_at: true,
                    created_at: true,
                },
                orderBy: [{ updated_at: 'desc' }, { created_at: 'desc' }],
            });
            const features = plans.map((plan) => (0, consultant_plans_mapper_1.planToFeature)(plan)).filter(Boolean);
            const format = (0, consultant_plans_mapper_1.safeString)(query.format).toLowerCase();
            if (format === 'geojson') {
                return { type: 'FeatureCollection', features };
            }
            const grouped = {};
            features.forEach((feature) => {
                const layerName = feature?.properties?.layerName || 'Consultant Plans';
                if (!grouped[layerName]) {
                    grouped[layerName] = [];
                }
                grouped[layerName].push(feature);
            });
            return { layers: grouped };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException({
                msg: 'Server error',
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }
    async getPlanById(user, id) {
        try {
            const numId = Number(id);
            if (!Number.isFinite(numId) || numId < 1) {
                throw new common_1.BadRequestException({ msg: 'Invalid plan identifier' });
            }
            const role = user?.role || '';
            const scopedTehsils = this.tehsilScope.needsTehsilScope(role)
                ? await this.tehsilScope.resolveUserTehsils(user)
                : [];
            const plan = await this.prisma.consultant_plans.findUnique({
                where: { id: BigInt(numId) },
                include: PLAN_INCLUDE,
            });
            if (!plan) {
                throw new common_1.NotFoundException({ msg: 'Plan not found' });
            }
            if (this.tehsilScope.needsTehsilScope(role)) {
                if (scopedTehsils.length === 0 || !this.tehsilScope.tehsilMatches(scopedTehsils, plan.tehsil)) {
                    throw new common_1.ForbiddenException({ msg: 'Forbidden' });
                }
            }
            if (!this.canReadPlan(user, plan)) {
                throw new common_1.ForbiddenException({ msg: 'Forbidden' });
            }
            return (0, consultant_plans_mapper_1.serializePlan)(plan);
        }
        catch (err) {
            if (err instanceof common_1.BadRequestException || err instanceof common_1.NotFoundException || err instanceof common_1.ForbiddenException) {
                throw err;
            }
            throw new common_1.InternalServerErrorException({
                msg: 'Server error',
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }
    async createPlan(user, body) {
        try {
            const userId = user?.userId;
            const requesterRole = user?.role || '';
            if (!userId) {
                throw new common_1.UnauthorizedException({ msg: 'Session expired. Please log in again.' });
            }
            const assetDef = (0, consultant_plans_mapper_1.resolveAssetDefinition)(body.assetType || body.assetLabel);
            if (!assetDef) {
                throw new common_1.BadRequestException({ msg: 'Unsupported asset type.' });
            }
            let feature;
            try {
                feature = (0, consultant_plans_mapper_1.parseFeature)(body.feature);
            }
            catch (err) {
                throw new common_1.BadRequestException({
                    msg: err instanceof Error ? err.message : 'Invalid feature payload.',
                });
            }
            let attributes;
            try {
                attributes = (0, consultant_plans_mapper_1.parseAttributes)(body.attributes, body.attributesJson);
            }
            catch (err) {
                throw new common_1.BadRequestException({
                    msg: err instanceof Error ? err.message : 'Attributes must be valid JSON.',
                });
            }
            const attachments = (0, consultant_plans_mapper_1.parsePlanAttachments)(body.attachments);
            const featureData = (0, consultant_plans_mapper_1.withFeatureProperties)(feature, assetDef);
            const now = new Date();
            const planData = {
                title: (0, consultant_plans_mapper_1.safeString)(body.title) || assetDef.label,
                asset_type: assetDef.value,
                asset_label: assetDef.label,
                category: assetDef.category,
                layer_name: (0, consultant_plans_mapper_1.safeString)(body.layerName) || consultant_plans_constants_1.DEFAULT_LAYER_NAME,
                description: (0, consultant_plans_mapper_1.safeString)(body.description),
                requisition_id: (0, consultant_plans_mapper_1.resolveIntId)(body.requisition ?? body.requisitionId),
                tehsil: (0, consultant_plans_mapper_1.safeString)(body.tehsil),
                district: (0, consultant_plans_mapper_1.safeString)(body.district),
                feature_type: featureData.type || 'Feature',
                feature_geometry: featureData.geometry,
                feature_properties: (featureData.properties || {}),
                attributes: attributes,
                created_by: BigInt(userId),
                updated_by: BigInt(userId),
                created_at: now,
                updated_at: now,
            };
            await this.ensureMaintenanceOwner(planData, {
                forceReassign: consultant_plans_constants_1.CONSULTANT_CREATOR_ROLES.some((r) => (0, role_synonyms_1.roleMatches)(requesterRole, [r])),
                creatorRole: requesterRole,
                creatorId: userId,
            });
            const plan = await this.prisma.consultant_plans.create({ data: planData });
            if (attachments.length > 0) {
                await this.prisma.consultant_plan_attachments.createMany({
                    data: attachments.map((a) => ({
                        consultant_plan_id: plan.id,
                        stored_name: a.storedName,
                        original_name: a.originalName,
                        mime_type: a.mimeType,
                        size: BigInt(a.size),
                        created_at: now,
                        updated_at: now,
                    })),
                });
            }
            const reloaded = await this.prisma.consultant_plans.findUniqueOrThrow({
                where: { id: plan.id },
                include: PLAN_INCLUDE,
            });
            return (0, consultant_plans_mapper_1.serializePlan)(reloaded);
        }
        catch (err) {
            if (err instanceof common_1.BadRequestException ||
                err instanceof common_1.UnauthorizedException ||
                err instanceof common_1.ForbiddenException) {
                throw err;
            }
            throw new common_1.InternalServerErrorException({
                msg: 'Server error',
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }
    async updatePlan(user, id, body) {
        try {
            const numId = Number(id);
            if (!Number.isFinite(numId) || numId < 1) {
                throw new common_1.BadRequestException({ msg: 'Invalid plan identifier' });
            }
            const plan = await this.prisma.consultant_plans.findUnique({
                where: { id: BigInt(numId) },
            });
            if (!plan) {
                throw new common_1.NotFoundException({ msg: 'Plan not found' });
            }
            if (!this.canModify(user, plan)) {
                throw new common_1.ForbiddenException({ msg: 'Forbidden' });
            }
            const userId = user?.userId;
            if (!userId) {
                throw new common_1.UnauthorizedException({ msg: 'Session expired. Please log in again.' });
            }
            const requesterRole = user?.role || '';
            const isMaintenanceManager = consultant_plans_constants_1.MAINTENANCE_ROLES.some((r) => (0, role_synonyms_1.roleMatches)(requesterRole, [r]));
            const originalTehsil = plan.tehsil || '';
            let tehsilChanged = false;
            let maintenanceTouched = false;
            const updateData = {};
            if (body.assetType || body.assetLabel) {
                const assetDef = (0, consultant_plans_mapper_1.resolveAssetDefinition)(body.assetType || body.assetLabel);
                if (!assetDef) {
                    throw new common_1.BadRequestException({ msg: 'Unsupported asset type.' });
                }
                updateData.asset_type = assetDef.value;
                updateData.asset_label = assetDef.label;
                updateData.category = assetDef.category;
                const currentFeature = {
                    type: plan.feature_type || 'Feature',
                    geometry: plan.feature_geometry,
                    properties: plan.feature_properties &&
                        typeof plan.feature_properties === 'object' &&
                        !Array.isArray(plan.feature_properties)
                        ? plan.feature_properties
                        : {},
                };
                const updated = (0, consultant_plans_mapper_1.withFeatureProperties)(currentFeature, assetDef);
                updateData.feature_type = updated.type || 'Feature';
                updateData.feature_geometry = updated.geometry;
                updateData.feature_properties = (updated.properties || {});
            }
            if (Object.prototype.hasOwnProperty.call(body, 'title')) {
                const title = (0, consultant_plans_mapper_1.safeString)(body.title);
                updateData.title = title || plan.asset_label;
            }
            if (Object.prototype.hasOwnProperty.call(body, 'description')) {
                updateData.description = (0, consultant_plans_mapper_1.safeString)(body.description);
            }
            if (Object.prototype.hasOwnProperty.call(body, 'requisition') ||
                Object.prototype.hasOwnProperty.call(body, 'requisitionId')) {
                updateData.requisition_id = (0, consultant_plans_mapper_1.resolveIntId)(body.requisition ?? body.requisitionId);
            }
            if (Object.prototype.hasOwnProperty.call(body, 'tehsil')) {
                const nextTehsil = (0, consultant_plans_mapper_1.safeString)(body.tehsil);
                if (nextTehsil !== originalTehsil) {
                    tehsilChanged = true;
                }
                updateData.tehsil = nextTehsil;
            }
            if (Object.prototype.hasOwnProperty.call(body, 'district')) {
                updateData.district = (0, consultant_plans_mapper_1.safeString)(body.district);
            }
            if (Object.prototype.hasOwnProperty.call(body, 'layerName')) {
                updateData.layer_name = (0, consultant_plans_mapper_1.safeString)(body.layerName) || plan.layer_name;
            }
            if (Object.prototype.hasOwnProperty.call(body, 'feature')) {
                let updatedFeature;
                try {
                    updatedFeature = (0, consultant_plans_mapper_1.parseFeature)(body.feature);
                }
                catch (err) {
                    throw new common_1.BadRequestException({
                        msg: err instanceof Error ? err.message : 'Invalid feature payload.',
                    });
                }
                const finalFeature = (0, consultant_plans_mapper_1.withFeatureProperties)(updatedFeature, {
                    value: plan.asset_type,
                    label: plan.asset_label,
                    category: plan.category,
                });
                updateData.feature_type = finalFeature.type || 'Feature';
                updateData.feature_geometry = finalFeature.geometry;
                updateData.feature_properties = (finalFeature.properties || {});
            }
            if (Object.prototype.hasOwnProperty.call(body, 'attributes') ||
                Object.prototype.hasOwnProperty.call(body, 'attributesJson')) {
                try {
                    updateData.attributes = (0, consultant_plans_mapper_1.parseAttributes)(body.attributes, body.attributesJson);
                }
                catch (err) {
                    throw new common_1.BadRequestException({
                        msg: err instanceof Error ? err.message : 'Attributes must be valid JSON.',
                    });
                }
            }
            if (Object.prototype.hasOwnProperty.call(body, 'attachments')) {
                const attachments = (0, consultant_plans_mapper_1.parsePlanAttachments)(body.attachments);
                const now = new Date();
                await this.prisma.consultant_plan_attachments.deleteMany({
                    where: { consultant_plan_id: plan.id },
                });
                if (attachments.length > 0) {
                    await this.prisma.consultant_plan_attachments.createMany({
                        data: attachments.map((a) => ({
                            consultant_plan_id: plan.id,
                            stored_name: a.storedName,
                            original_name: a.originalName,
                            mime_type: a.mimeType,
                            size: BigInt(a.size),
                            created_at: now,
                            updated_at: now,
                        })),
                    });
                }
            }
            if (Object.prototype.hasOwnProperty.call(body, 'maintenanceOwner')) {
                if (!isMaintenanceManager) {
                    throw new common_1.ForbiddenException({ msg: 'Forbidden' });
                }
                const ownerId = (0, consultant_plans_mapper_1.resolveIntId)(body.maintenanceOwner);
                if (ownerId) {
                    const manager = await this.prisma.users.findFirst({
                        where: { id: ownerId, role: client_1.users_role.Tehsil_Manager },
                        select: { id: true, name: true, role: true },
                    });
                    if (!manager) {
                        throw new common_1.BadRequestException({ msg: 'Maintenance owner must be a Tehsil Manager.' });
                    }
                    updateData.maintenance_owner = manager.id;
                    updateData.maintenance_owner_name = manager.name || 'Tehsil Manager';
                    updateData.maintenance_owner_role = 'Tehsil Manager';
                }
                else {
                    updateData.maintenance_owner = null;
                    updateData.maintenance_owner_name = 'Tehsil Manager';
                    updateData.maintenance_owner_role = 'Tehsil Manager';
                }
                maintenanceTouched = true;
            }
            if (Object.prototype.hasOwnProperty.call(body, 'maintenanceOwnerName')) {
                if (!isMaintenanceManager) {
                    throw new common_1.ForbiddenException({ msg: 'Forbidden' });
                }
                updateData.maintenance_owner_name = (0, consultant_plans_mapper_1.safeString)(body.maintenanceOwnerName) || 'Tehsil Manager';
                maintenanceTouched = true;
            }
            if (Object.prototype.hasOwnProperty.call(body, 'maintenanceOwnerRole')) {
                updateData.maintenance_owner_role = 'Tehsil Manager';
                maintenanceTouched = true;
            }
            const mergedPlan = { ...plan, ...updateData };
            await this.ensureMaintenanceOwner(mergedPlan, {
                forceReassign: tehsilChanged && !maintenanceTouched,
                creatorRole: requesterRole,
                creatorId: userId,
            });
            updateData.maintenance_owner = mergedPlan.maintenance_owner ?? null;
            updateData.maintenance_owner_name = mergedPlan.maintenance_owner_name;
            updateData.maintenance_owner_role = mergedPlan.maintenance_owner_role;
            updateData.feature_properties = mergedPlan.feature_properties;
            updateData.updated_by = BigInt(userId);
            updateData.updated_at = new Date();
            await this.prisma.consultant_plans.update({
                where: { id: plan.id },
                data: updateData,
            });
            const reloaded = await this.prisma.consultant_plans.findUniqueOrThrow({
                where: { id: plan.id },
                include: PLAN_INCLUDE,
            });
            return (0, consultant_plans_mapper_1.serializePlan)(reloaded);
        }
        catch (err) {
            if (err instanceof common_1.BadRequestException ||
                err instanceof common_1.NotFoundException ||
                err instanceof common_1.ForbiddenException ||
                err instanceof common_1.UnauthorizedException) {
                throw err;
            }
            throw new common_1.InternalServerErrorException({
                msg: 'Server error',
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }
    async deletePlan(user, id) {
        try {
            const numId = Number(id);
            if (!Number.isFinite(numId) || numId < 1) {
                throw new common_1.BadRequestException({ msg: 'Invalid plan identifier' });
            }
            const plan = await this.prisma.consultant_plans.findUnique({
                where: { id: BigInt(numId) },
            });
            if (!plan) {
                throw new common_1.NotFoundException({ msg: 'Plan not found' });
            }
            if (!this.canModify(user, plan)) {
                throw new common_1.ForbiddenException({ msg: 'Forbidden' });
            }
            await this.prisma.consultant_plans.delete({ where: { id: plan.id } });
            return { msg: 'Plan removed successfully' };
        }
        catch (err) {
            if (err instanceof common_1.BadRequestException ||
                err instanceof common_1.NotFoundException ||
                err instanceof common_1.ForbiddenException) {
                throw err;
            }
            throw new common_1.InternalServerErrorException({
                msg: 'Server error',
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }
    assertCanRead(role) {
        if (!consultant_plans_constants_1.READ_ROLES.some((r) => (0, role_synonyms_1.roleMatches)(role, [r]))) {
            throw new common_1.ForbiddenException({ msg: 'Forbidden' });
        }
    }
    assertCanWrite(role) {
        if (!consultant_plans_constants_1.WRITE_ROLES.some((r) => (0, role_synonyms_1.roleMatches)(role, [r]))) {
            throw new common_1.ForbiddenException({ msg: 'Forbidden' });
        }
    }
    buildFilter(user, query, tehsilScope) {
        const role = user?.role || '';
        const userId = user?.userId;
        const andFilters = [];
        const filter = {};
        if (role === 'EDCS Consultant' || role === 'EDCS User') {
            if (userId) {
                filter.created_by = BigInt(userId);
            }
        }
        const scopedQuery = this.tehsilScope.buildTehsilScopePrismaFilter(tehsilScope, 'tehsil');
        if (scopedQuery) {
            andFilters.push(scopedQuery);
        }
        if (query.tehsil) {
            andFilters.push({ tehsil: { contains: (0, consultant_plans_mapper_1.escapeLike)(query.tehsil) } });
        }
        if (query.district) {
            andFilters.push({ district: { contains: (0, consultant_plans_mapper_1.escapeLike)(query.district) } });
        }
        if (query.category) {
            andFilters.push({ category: (0, consultant_plans_mapper_1.escapeLike)(query.category) });
        }
        if (query.assetType) {
            const assetDef = (0, consultant_plans_mapper_1.resolveAssetDefinition)(query.assetType);
            if (assetDef) {
                filter.asset_type = assetDef.value;
            }
            else {
                andFilters.push({ asset_type: { contains: (0, consultant_plans_mapper_1.escapeLike)(query.assetType) } });
            }
        }
        if (query.requisitionId) {
            const numReqId = Number(query.requisitionId);
            if (Number.isFinite(numReqId) && numReqId > 0) {
                filter.requisition_id = BigInt(numReqId);
            }
        }
        if (query.search) {
            const search = (0, consultant_plans_mapper_1.escapeLike)(query.search);
            filter.OR = [
                { title: { contains: search } },
                { description: { contains: search } },
                { asset_label: { contains: search } },
                { tehsil: { contains: search } },
            ];
        }
        if (andFilters.length) {
            filter.AND = andFilters;
        }
        return filter;
    }
    fetchConsultantPlans(where) {
        return this.prisma.consultant_plans.findMany({
            where,
            include: PLAN_INCLUDE,
            orderBy: [{ updated_at: 'desc' }, { created_at: 'desc' }],
        });
    }
    canModify(user, plan) {
        const role = user?.role || '';
        if (consultant_plans_constants_1.MANAGE_ROLES.some((r) => (0, role_synonyms_1.roleMatches)(role, [r]))) {
            return true;
        }
        if (role === 'EDCS Consultant' || role === 'EDCS User') {
            return String(plan.created_by) === String(user.userId);
        }
        return false;
    }
    canReadPlan(user, plan) {
        const role = user?.role || '';
        if (consultant_plans_constants_1.MANAGE_ROLES.some((r) => (0, role_synonyms_1.roleMatches)(role, [r]))) {
            return true;
        }
        if (role === 'EDCS Consultant' || role === 'EDCS User') {
            return String(plan.created_by) === String(user.userId);
        }
        return consultant_plans_constants_1.READ_ROLES.some((r) => (0, role_synonyms_1.roleMatches)(role, [r]));
    }
    async ensureMaintenanceOwner(planDoc, options = {}) {
        if (!planDoc) {
            return;
        }
        const { forceReassign = false, creatorRole = '', creatorId = null } = options;
        const normalisedCreatorRole = (0, consultant_plans_mapper_1.safeString)(creatorRole);
        planDoc.maintenance_owner_role = 'Tehsil Manager';
        if (normalisedCreatorRole === 'Tehsil Manager' && creatorId) {
            const manager = await this.prisma.users.findFirst({
                where: { id: BigInt(creatorId), role: client_1.users_role.Tehsil_Manager },
                select: { id: true, name: true, role: true },
            });
            if (manager) {
                planDoc.maintenance_owner = manager.id;
                planDoc.maintenance_owner_name = manager.name || 'Tehsil Manager';
                (0, consultant_plans_mapper_1.applyMaintenanceMetadata)(planDoc);
                return;
            }
        }
        if (forceReassign || !planDoc.maintenance_owner) {
            const manager = await this.findTehsilManager(planDoc.tehsil);
            if (manager) {
                planDoc.maintenance_owner = manager.id;
                planDoc.maintenance_owner_name = manager.name || 'Tehsil Manager';
            }
            else if (!planDoc.maintenance_owner_name) {
                planDoc.maintenance_owner_name = 'Tehsil Manager';
            }
        }
        (0, consultant_plans_mapper_1.applyMaintenanceMetadata)(planDoc);
    }
    async findTehsilManager(tehsil) {
        const text = (0, consultant_plans_mapper_1.safeString)(tehsil);
        const baseSelect = { id: true, name: true, role: true };
        if (text) {
            const exact = await this.prisma.users.findFirst({
                where: {
                    role: client_1.users_role.Tehsil_Manager,
                    active_status: 'active',
                    address: text,
                },
                select: baseSelect,
                orderBy: { id: 'asc' },
            });
            if (exact) {
                return exact;
            }
            const contains = await this.prisma.users.findFirst({
                where: {
                    role: client_1.users_role.Tehsil_Manager,
                    active_status: 'active',
                    address: { contains: text },
                },
                select: baseSelect,
                orderBy: { id: 'asc' },
            });
            if (contains) {
                return contains;
            }
        }
        const active = await this.prisma.users.findFirst({
            where: { role: client_1.users_role.Tehsil_Manager, active_status: 'active' },
            select: baseSelect,
            orderBy: { id: 'asc' },
        });
        if (active) {
            return active;
        }
        return this.prisma.users.findFirst({
            where: { role: client_1.users_role.Tehsil_Manager },
            select: baseSelect,
            orderBy: { id: 'asc' },
        });
    }
};
exports.ConsultantPlansService = ConsultantPlansService;
exports.ConsultantPlansService = ConsultantPlansService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        tehsil_scope_service_1.TehsilScopeService])
], ConsultantPlansService);
//# sourceMappingURL=consultant-plans.service.js.map