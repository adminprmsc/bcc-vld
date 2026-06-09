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
exports.RequisitionService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const promises_1 = require("fs/promises");
const counter_service_1 = require("../../common/counter/counter.service");
const tehsil_scope_service_1 = require("../../domain/tehsil-scope/tehsil-scope.service");
const prisma_service_1 = require("../../prisma/prisma.service");
const requisition_constants_1 = require("./requisition.constants");
const requisition_helpers_1 = require("./requisition.helpers");
const requisition_mapper_1 = require("./requisition.mapper");
const requisition_pdf_service_1 = require("./requisition-pdf.service");
const requisition_upload_config_1 = require("./requisition-upload.config");
let RequisitionService = class RequisitionService {
    constructor(prisma, counters, tehsilScope, pdfService) {
        this.prisma = prisma;
        this.counters = counters;
        this.tehsilScope = tehsilScope;
        this.pdfService = pdfService;
    }
    async reloadRequisition(id) {
        const row = await this.prisma.requisitions.findUnique({
            where: { id },
            include: requisition_mapper_1.REQUISITION_INCLUDE,
        });
        if (!row) {
            throw new common_1.NotFoundException({ msg: 'Not found' });
        }
        return row;
    }
    async findFirstUserByRole(roleInput) {
        const roleEnums = (0, requisition_helpers_1.resolveRoleEnums)(roleInput);
        if (!roleEnums.length) {
            return null;
        }
        const active = await this.prisma.users.findFirst({
            where: {
                role: { in: roleEnums },
                active_status: { in: ['active', 'Active', 'ACTIVE'] },
            },
            orderBy: { name: 'asc' },
        });
        if (active) {
            return active;
        }
        return this.prisma.users.findFirst({
            where: { role: { in: roleEnums } },
            orderBy: { name: 'asc' },
        });
    }
    async pickOfficerId(preferredId, fallbackRoles) {
        const resolved = (0, requisition_helpers_1.resolveId)(preferredId);
        if (resolved) {
            return resolved;
        }
        if (!fallbackRoles?.length) {
            return '';
        }
        const fallback = await this.findFirstUserByRole(fallbackRoles);
        return fallback?.id?.toString() || '';
    }
    async deleteFilesQuietly(fileNames) {
        if (!Array.isArray(fileNames) || !fileNames.length) {
            return;
        }
        await Promise.all(fileNames.map(async (name) => {
            if (!name) {
                return;
            }
            try {
                await (0, promises_1.unlink)((0, requisition_upload_config_1.getRequisitionUploadPath)(name));
            }
            catch {
            }
        }));
    }
    async getDashboardStats(user, query) {
        const where = {};
        if (query.tehsil) {
            where.tehsil = query.tehsil;
        }
        if (query.district) {
            where.district = query.district;
        }
        if (query.startDate || query.endDate) {
            where.date_created = {};
            if (query.startDate) {
                where.date_created.gte = new Date(query.startDate);
            }
            if (query.endDate) {
                where.date_created.lte = new Date(query.endDate);
            }
        }
        if (user?.role === 'DM Tehsil' || user?.role === 'Tehsil DM') {
            const tehsils = await this.tehsilScope.resolveUserTehsils(user);
            if (tehsils.length) {
                where.tehsil = { in: tehsils };
            }
        }
        const requisitions = await this.prisma.requisitions.findMany({ where });
        const statusCounts = {};
        requisitions.forEach((r) => {
            const status = r.status || 'Unknown';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        const pendingStatuses = [
            'Pending',
            'Pending DM Review',
            'Pending BCC Officer Review',
            'Pending TM Review',
            'Pending BCC Specialist Review',
            'Pending WB Dispatch',
            'Pending WB Approval',
            'Marked to TM',
            'Assigned to BCC',
            'Land Acquisition Updated',
            'Donor Data Uploaded',
        ].map((s) => s.toLowerCase());
        const completedStatuses = ['WB Approved', 'Closed', 'Approved', 'Acquisition Complete'].map((s) => s.toLowerCase());
        const parseLandArea = (areaStr) => {
            if (!areaStr) {
                return { value: 0, unit: 'sqft' };
            }
            const str = areaStr.toString().toLowerCase().trim();
            const numMatch = str.match(/[\d.]+/);
            const value = numMatch ? parseFloat(numMatch[0]) : 0;
            let unit = 'sqft';
            if (str.includes('kanal')) {
                unit = 'kanals';
            }
            else if (str.includes('marla')) {
                unit = 'marlas';
            }
            else if (str.includes('acre')) {
                unit = 'acres';
            }
            else if (str.includes('sqft') || str.includes('sq ft') || str.includes('square feet')) {
                unit = 'sqft';
            }
            return { value, unit };
        };
        const toSqFt = (value, unit) => {
            switch (unit) {
                case 'kanals':
                    return value * 5445;
                case 'marlas':
                    return value * 272.25;
                case 'acres':
                    return value * 43560;
                default:
                    return value;
            }
        };
        let landAreaRequestedSqFt = 0;
        let landAcquiredSqFt = 0;
        let pendingCount = 0;
        let completedCount = 0;
        requisitions.forEach((r) => {
            const status = (r.status || '').toLowerCase();
            const { value, unit } = parseLandArea(r.land_area);
            const sqft = toSqFt(value, unit);
            const calculatedSqFt = Number(r.calculated_area_sq_ft) || 0;
            const effectiveSqFt = calculatedSqFt > 0 ? calculatedSqFt : sqft;
            if (pendingStatuses.some((ps) => status.includes(ps) || ps.includes(status))) {
                landAreaRequestedSqFt += effectiveSqFt;
                pendingCount++;
            }
            else if (completedStatuses.some((cs) => status.includes(cs) || cs.includes(status))) {
                landAcquiredSqFt += effectiveSqFt;
                completedCount++;
            }
        });
        const landAreaRequestedKanals = (landAreaRequestedSqFt / 5445).toFixed(2);
        const landAcquiredKanals = (landAcquiredSqFt / 5445).toFixed(2);
        const workflowStages = {
            dmReview: statusCounts['Pending DM Review'] || 0,
            bccOfficerReview: statusCounts['Pending BCC Officer Review'] || 0,
            tmReview: statusCounts['Pending TM Review'] || 0,
            bccSpecialistReview: statusCounts['Pending BCC Specialist Review'] || 0,
            wbPending: (statusCounts['Pending WB Dispatch'] || 0) + (statusCounts['Pending WB Approval'] || 0),
            wbApproved: statusCounts['WB Approved'] || 0,
            closed: statusCounts['Closed'] || 0,
        };
        return {
            totalRequisitions: requisitions.length,
            statusCounts,
            landAreaKPIs: {
                landAreaRequested: {
                    sqFt: Math.round(landAreaRequestedSqFt),
                    kanals: parseFloat(landAreaRequestedKanals),
                    count: pendingCount,
                    label: 'Land Area Requested (Pending)',
                },
                landAcquired: {
                    sqFt: Math.round(landAcquiredSqFt),
                    kanals: parseFloat(landAcquiredKanals),
                    count: completedCount,
                    label: 'Land Acquired (Approved/Closed)',
                },
            },
            workflowStages,
            filters: {
                tehsil: query.tehsil,
                district: query.district,
                startDate: query.startDate,
                endDate: query.endDate,
            },
        };
    }
    async findAll(user) {
        const where = {};
        if (user?.role === 'CID') {
            where.assigned_to = BigInt(user.userId);
        }
        const rows = await this.prisma.requisitions.findMany({
            where,
            include: requisition_mapper_1.REQUISITION_INCLUDE,
        });
        return (0, requisition_mapper_1.serializeMany)(rows);
    }
    async findOne(id, user) {
        const row = await this.prisma.requisitions.findUnique({
            where: { id: BigInt(id) },
            include: requisition_mapper_1.REQUISITION_INCLUDE,
        });
        if (!row) {
            throw new common_1.NotFoundException({ msg: `Requisition not found for id ${id}` });
        }
        if (user?.role === 'CID' && (0, requisition_helpers_1.resolveId)(row.assigned_to) !== (0, requisition_helpers_1.resolveId)(user.userId)) {
            throw new common_1.ForbiddenException({
                msg: 'Forbidden: requisition not assigned to this CID officer',
            });
        }
        return (0, requisition_mapper_1.serializeRequisition)(row);
    }
    async create(user, body, files) {
        const location = (0, requisition_helpers_1.buildLocationPayload)(body.location);
        if (!location.address && typeof body.locationAddress === 'string') {
            location.address = body.locationAddress;
        }
        if (!location.coordinates) {
            const fallbackCoords = (0, requisition_helpers_1.parseLatLngInput)(body.location) || (0, requisition_helpers_1.parseLatLngInput)(body.mapMarker);
            if (fallbackCoords) {
                location.coordinates = fallbackCoords;
            }
        }
        let mapMarker = (0, requisition_helpers_1.parseLatLngInput)(body.mapMarker);
        if (!mapMarker && location.coordinates) {
            mapMarker = location.coordinates;
        }
        let mapFeatures = (0, requisition_helpers_1.parseMapFeatures)(body.mapFeatures);
        if (mapMarker) {
            const hasMarkerFeature = mapFeatures.some((feature) => {
                const f = feature;
                if (!f || f.type !== 'Feature' || !f.geometry) {
                    return false;
                }
                if (f.geometry.type === 'Point' && Array.isArray(f.geometry.coordinates)) {
                    const [lng, lat] = f.geometry.coordinates;
                    return Number(lat) === Number(mapMarker.lat) && Number(lng) === Number(mapMarker.lng);
                }
                return false;
            });
            if (!hasMarkerFeature) {
                mapFeatures = [
                    ...mapFeatures,
                    {
                        type: 'Feature',
                        properties: { kind: 'site-marker' },
                        geometry: {
                            type: 'Point',
                            coordinates: [mapMarker.lng, mapMarker.lat],
                        },
                    },
                ];
            }
        }
        const parsedViewport = (0, requisition_helpers_1.parseMapViewport)(body.mapViewport);
        const mapViewport = parsedViewport ||
            (mapMarker ? { center: mapMarker, zoom: 13 } : undefined);
        const division = (0, requisition_helpers_1.cleanString)(body.division);
        const district = (0, requisition_helpers_1.cleanString)(body.district);
        let supportingDocs = body.supportingDocs;
        if (typeof supportingDocs === 'string') {
            supportingDocs = supportingDocs ? [supportingDocs] : [];
        }
        let attachments = [];
        if (files && files.length > 0) {
            attachments = files.map((f) => f.filename);
        }
        else if (body.attachments) {
            if (Array.isArray(body.attachments)) {
                attachments = body.attachments;
            }
            else if (typeof body.attachments === 'string') {
                attachments = [body.attachments];
            }
        }
        const landBreadth = Number(body.landBreadth) || 0;
        const landDepth = Number(body.landDepth) || 0;
        const calculatedAreaSqFt = landBreadth && landDepth ? landBreadth * landDepth : 0;
        const calculatedAreaMarlas = calculatedAreaSqFt
            ? Number((calculatedAreaSqFt / 272.25).toFixed(2))
            : 0;
        const calculatedAreaKanals = calculatedAreaSqFt
            ? Number((calculatedAreaSqFt / 5445).toFixed(2))
            : 0;
        const now = new Date();
        const activityLogEntries = [
            {
                action: 'Created',
                userId: BigInt(user.userId),
                remarks: 'Requisition created',
                timestamp: now,
            },
        ];
        let assignedOfficerId = null;
        const computedStatus = requisition_constants_1.WORKFLOW_STATUSES.PENDING_DM;
        const autoDm = await this.findFirstUserByRole(['DM Tehsil', 'Tehsil DM']);
        if (autoDm) {
            assignedOfficerId = autoDm.id;
            activityLogEntries.push({
                action: 'Submitted to DM Review',
                userId: BigInt(user.userId),
                remarks: `Auto-assigned to ${(0, requisition_mapper_1.summarizeUser)({
                    simpleId: autoDm.simple_id,
                    name: autoDm.name,
                    email: autoDm.email,
                    role: autoDm.role?.toString().replace(/_/g, ' '),
                })} for DM review.`,
                timestamp: now,
            });
        }
        else {
            assignedOfficerId = BigInt(user.userId);
            activityLogEntries.push({
                action: 'Awaiting DM Assignment',
                userId: BigInt(user.userId),
                remarks: 'No DM Tehsil user configured. Assigned back to requester until DM is created.',
                timestamp: now,
            });
        }
        const validPriorities = ['Low', 'Medium', 'High'];
        const priorityRaw = typeof body.priority === 'string' ? body.priority.trim() : '';
        const priorityValue = validPriorities.includes(priorityRaw)
            ? priorityRaw
            : client_1.requisitions_priority.Medium;
        const landTypeOptions = ['Govt Land', 'Private Land'];
        const rawLandType = typeof body.landType === 'string' ? body.landType.trim() : '';
        const landTypeValue = landTypeOptions.includes(rawLandType) ? rawLandType : undefined;
        const govtLandChecklist = (0, requisition_helpers_1.sanitizeChecklistInput)(body.govtLandChecklist);
        const privateLandChecklist = (0, requisition_helpers_1.sanitizeChecklistInput)(body.privateLandChecklist);
        const sequenceNumber = await this.counters.nextSequence('requisition-sequence');
        const created = await this.prisma.requisitions.create({
            data: {
                sequence_number: sequenceNumber,
                title: (0, requisition_helpers_1.cleanString)(body.title),
                description: (0, requisition_helpers_1.cleanString)(body.description) || null,
                purpose: (0, requisition_helpers_1.cleanString)(body.purpose),
                division,
                district,
                requested_by: BigInt(user.userId),
                assigned_to: assignedOfficerId,
                tehsil: (0, requisition_helpers_1.cleanString)(body.tehsil),
                land_area: (0, requisition_helpers_1.cleanString)(body.landArea) || null,
                land_type: landTypeValue || null,
                govt_land_checklist: Object.keys(govtLandChecklist).length > 0 ? govtLandChecklist : undefined,
                private_land_checklist: Object.keys(privateLandChecklist).length > 0 ? privateLandChecklist : undefined,
                land_breadth: landBreadth,
                land_depth: landDepth,
                calculated_area_sq_ft: calculatedAreaSqFt,
                calculated_area_marlas: calculatedAreaMarlas,
                calculated_area_kanals: calculatedAreaKanals,
                location_address: location.address || '',
                location_lat: location.coordinates?.lat ?? null,
                location_lng: location.coordinates?.lng ?? null,
                map_marker_lat: mapMarker?.lat ?? null,
                map_marker_lng: mapMarker?.lng ?? null,
                map_viewport_center_lat: mapViewport?.center?.lat ?? null,
                map_viewport_center_lng: mapViewport?.center?.lng ?? null,
                map_viewport_zoom: mapViewport?.zoom ?? 0,
                map_features: mapFeatures.length ? mapFeatures : undefined,
                land_acquisition_type: landTypeValue
                    ? landTypeValue === 'Govt Land'
                        ? client_1.requisitions_land_acquisition_type.Govt_Land
                        : client_1.requisitions_land_acquisition_type.Private_Land
                    : undefined,
                required_date: body.requiredDate ? new Date((0, requisition_helpers_1.cleanString)(body.requiredDate)) : null,
                priority: priorityValue,
                supporting_docs: supportingDocs,
                estimated_value: (0, requisition_helpers_1.cleanString)(body.estimatedValue) || null,
                remarks: (0, requisition_helpers_1.cleanString)(body.remarks) || null,
                attachments: attachments.length ? attachments : undefined,
                status: computedStatus,
                date_created: now,
                last_updated: now,
                requisition_activity_logs: {
                    create: activityLogEntries.map((entry) => ({
                        action: entry.action,
                        user_id: entry.userId,
                        remarks: entry.remarks,
                        timestamp: entry.timestamp,
                    })),
                },
            },
        });
        const full = await this.reloadRequisition(created.id);
        return (0, requisition_mapper_1.serializeRequisition)(full);
    }
    async updateMap(id, user, body) {
        const requisition = await this.prisma.requisitions.findUnique({ where: { id: BigInt(id) } });
        if (!requisition) {
            throw new common_1.NotFoundException({ msg: 'Not found' });
        }
        const mapFeaturesInput = (0, requisition_helpers_1.parseMapFeatures)(body.mapFeatures);
        const viewport = (0, requisition_helpers_1.parseMapViewport)(body.mapViewport);
        let mapMarker = (0, requisition_helpers_1.parseLatLngInput)(body.mapMarker);
        const existingLocation = {
            address: requisition.location_address || '',
            coordinates: requisition.location_lat != null && requisition.location_lng != null
                ? { lat: Number(requisition.location_lat), lng: Number(requisition.location_lng) }
                : null,
        };
        const locationUpdate = (0, requisition_helpers_1.buildLocationPayload)(body.location);
        const locationAddressRaw = body.locationAddress !== undefined ? (0, requisition_helpers_1.cleanString)(body.locationAddress) : undefined;
        const updatedLocation = { ...existingLocation, ...locationUpdate };
        if (locationAddressRaw !== undefined) {
            updatedLocation.address = locationAddressRaw;
        }
        if (!mapMarker && updatedLocation.coordinates) {
            mapMarker = updatedLocation.coordinates;
        }
        if (mapMarker) {
            updatedLocation.coordinates = mapMarker;
        }
        let sanitizedFeatures = mapFeaturesInput;
        if (mapMarker) {
            let hasMarkerFeature = false;
            sanitizedFeatures = mapFeaturesInput.filter((feature) => {
                const f = feature;
                if (!f || f.type !== 'Feature' || !f.geometry) {
                    return false;
                }
                if (f.geometry.type === 'Point' && Array.isArray(f.geometry.coordinates)) {
                    const [lng, lat] = f.geometry.coordinates;
                    if (Number(lat) === Number(mapMarker.lat) && Number(lng) === Number(mapMarker.lng)) {
                        hasMarkerFeature = true;
                    }
                }
                return true;
            });
            if (!hasMarkerFeature) {
                sanitizedFeatures = [
                    ...sanitizedFeatures,
                    {
                        type: 'Feature',
                        properties: { kind: 'site-marker' },
                        geometry: {
                            type: 'Point',
                            coordinates: [mapMarker.lng, mapMarker.lat],
                        },
                    },
                ];
            }
        }
        else {
            sanitizedFeatures = mapFeaturesInput.filter((feature) => {
                const f = feature;
                if (!f || f.type !== 'Feature') {
                    return false;
                }
                return f.properties?.kind !== 'site-marker';
            });
        }
        const now = new Date();
        await this.prisma.$transaction([
            this.prisma.requisition_activity_logs.create({
                data: {
                    requisition_id: requisition.id,
                    action: 'Map Updated',
                    user_id: BigInt(user.userId),
                    timestamp: now,
                    remarks: sanitizedFeatures.length
                        ? `${sanitizedFeatures.length} map feature${sanitizedFeatures.length === 1 ? '' : 's'} captured`
                        : mapMarker
                            ? 'Pushpin updated'
                            : 'Map cleared',
                },
            }),
            this.prisma.requisitions.update({
                where: { id: requisition.id },
                data: {
                    location_address: updatedLocation.address || '',
                    location_lat: updatedLocation.coordinates?.lat ?? null,
                    location_lng: updatedLocation.coordinates?.lng ?? null,
                    map_marker_lat: mapMarker?.lat ?? null,
                    map_marker_lng: mapMarker?.lng ?? null,
                    map_features: sanitizedFeatures,
                    map_viewport_center_lat: viewport?.center?.lat ?? requisition.map_viewport_center_lat,
                    map_viewport_center_lng: viewport?.center?.lng ?? requisition.map_viewport_center_lng,
                    map_viewport_zoom: viewport?.zoom ?? requisition.map_viewport_zoom,
                    last_updated: now,
                },
            }),
        ]);
        const full = await this.reloadRequisition(requisition.id);
        return (0, requisition_mapper_1.serializeRequisition)(full);
    }
    async updateDonor(id, user, body) {
        const requisition = await this.prisma.requisitions.findUnique({ where: { id: BigInt(id) } });
        if (!requisition) {
            throw new common_1.NotFoundException({ msg: 'Not found' });
        }
        const existing = (requisition.land_acquisition_data || {});
        const now = new Date();
        await this.prisma.$transaction([
            this.prisma.requisition_activity_logs.create({
                data: {
                    requisition_id: requisition.id,
                    action: 'Donor Data Uploaded',
                    user_id: BigInt(user.userId),
                    timestamp: now,
                },
            }),
            this.prisma.requisitions.update({
                where: { id: requisition.id },
                data: {
                    status: 'Donor Data Uploaded',
                    land_acquisition_data: { ...existing, donorData: body.donorData },
                    last_updated: now,
                },
            }),
        ]);
        const full = await this.reloadRequisition(requisition.id);
        return (0, requisition_mapper_1.serializeRequisition)(full);
    }
    async updateDocs(id, user, body) {
        const requisition = await this.prisma.requisitions.findUnique({ where: { id: BigInt(id) } });
        if (!requisition) {
            throw new common_1.NotFoundException({ msg: 'Not found' });
        }
        const existing = (requisition.land_acquisition_data || {});
        const donorData = existing.donorData;
        const updatedData = { ...existing };
        if (donorData && Array.isArray(donorData) && donorData.length > 0) {
            const first = { ...donorData[0], documents: body.documents };
            updatedData.donorData = [first, ...donorData.slice(1)];
        }
        const now = new Date();
        await this.prisma.$transaction([
            this.prisma.requisition_activity_logs.create({
                data: {
                    requisition_id: requisition.id,
                    action: 'Documentation Added',
                    user_id: BigInt(user.userId),
                    timestamp: now,
                },
            }),
            this.prisma.requisitions.update({
                where: { id: requisition.id },
                data: {
                    status: 'Documentation Added',
                    land_acquisition_data: updatedData,
                    last_updated: now,
                },
            }),
        ]);
        const full = await this.reloadRequisition(requisition.id);
        return (0, requisition_mapper_1.serializeRequisition)(full);
    }
    async updateLandAcquisition(id, user, body, files) {
        const requisition = await this.prisma.requisitions.findUnique({ where: { id: BigInt(id) } });
        if (!requisition) {
            throw new common_1.NotFoundException({ msg: 'Not found' });
        }
        const existingData = (requisition.land_acquisition_data || {});
        const existingType = requisition.land_acquisition_type?.toString().replace(/_/g, ' ') || '';
        const existingStatus = requisition.land_acquisition_status || '';
        const typeRaw = (0, requisition_helpers_1.cleanString)(body.type) || existingType || requisition.land_type || 'Private Land';
        const type = typeRaw === 'Govt Land' ? 'Govt Land' : 'Private Land';
        const statusRaw = (0, requisition_helpers_1.cleanString)(body.status);
        if (statusRaw && !requisition_constants_1.LAND_ACQUISITION_STATUS_SET.has(statusRaw.toLowerCase())) {
            throw new common_1.BadRequestException({ msg: `Invalid land acquisition status: ${statusRaw}` });
        }
        const donorDetails = (0, requisition_helpers_1.parseJsonField)(body.donorDetails, {});
        const landDetails = (0, requisition_helpers_1.parseJsonField)(body.landDetails, {});
        const donationDetails = (0, requisition_helpers_1.parseJsonField)(body.donationDetails, {});
        const verificationDetails = (0, requisition_helpers_1.parseJsonField)(body.verification, {});
        const keepAttachments = (0, requisition_helpers_1.parseJsonField)(body.keepAttachments, []);
        const willingnessRaw = (0, requisition_helpers_1.cleanString)(donationDetails.willingnessDate);
        const verifiedDateRaw = (0, requisition_helpers_1.cleanString)(verificationDetails.verifiedDate);
        const donor = {
            ...(existingData.donor || {}),
            fullName: (0, requisition_helpers_1.cleanString)(donorDetails.fullName ||
                donorDetails.name ||
                existingData.donor?.fullName ||
                ''),
            cnic: (0, requisition_helpers_1.cleanString)(donorDetails.cnic ||
                donorDetails.cnicNumber ||
                existingData.donor?.cnic ||
                ''),
            contactNumber: (0, requisition_helpers_1.cleanString)(donorDetails.contactNumber ||
                donorDetails.phone ||
                existingData.donor?.contactNumber ||
                ''),
            address: (0, requisition_helpers_1.cleanString)(donorDetails.address || existingData.donor?.address || ''),
            villageName: (0, requisition_helpers_1.cleanString)(donorDetails.villageName ||
                donorDetails.village ||
                existingData.donor?.villageName ||
                ''),
            tehsil: (0, requisition_helpers_1.cleanString)(donorDetails.tehsil || existingData.donor?.tehsil || ''),
            district: (0, requisition_helpers_1.cleanString)(donorDetails.district || existingData.donor?.district || ''),
        };
        const land = {
            ...(existingData.land || {}),
            khasraNumber: (0, requisition_helpers_1.cleanString)(landDetails.khasraNumber ||
                existingData.land?.khasraNumber ||
                ''),
            area: (0, requisition_helpers_1.cleanString)(landDetails.area || existingData.land?.area || ''),
            landCategory: (0, requisition_helpers_1.cleanString)(landDetails.landCategory ||
                landDetails.landType ||
                existingData.land?.landCategory ||
                ''),
            latitude: (0, requisition_helpers_1.toNumber)(landDetails.latitude) ??
                existingData.land?.latitude ??
                null,
            longitude: (0, requisition_helpers_1.toNumber)(landDetails.longitude) ??
                existingData.land?.longitude ??
                null,
            mutationNumber: (0, requisition_helpers_1.cleanString)(landDetails.mutationNumber ||
                existingData.land?.mutationNumber ||
                ''),
            currentUse: (0, requisition_helpers_1.cleanString)(landDetails.currentUse ||
                existingData.land?.currentUse ||
                ''),
        };
        const donation = {
            ...(existingData.donation || {}),
            donationType: (0, requisition_helpers_1.cleanString)(donationDetails.donationType ||
                existingData.donation?.donationType ||
                ''),
            purpose: (0, requisition_helpers_1.cleanString)(donationDetails.purpose ||
                existingData.donation?.purpose ||
                ''),
            willingnessDate: willingnessRaw
                ? new Date(willingnessRaw)
                : existingData.donation?.willingnessDate || null,
            remarks: (0, requisition_helpers_1.cleanString)(donationDetails.remarks ||
                existingData.donation?.remarks ||
                ''),
            attachedDocuments: [],
        };
        const verification = {
            ...(existingData.verification || {}),
            verifiedBy: (0, requisition_helpers_1.cleanString)(verificationDetails.verifiedBy ||
                existingData.verification?.verifiedBy ||
                ''),
            verifiedDate: verifiedDateRaw
                ? new Date(verifiedDateRaw)
                : existingData.verification?.verifiedDate || null,
            approvedBy: (0, requisition_helpers_1.cleanString)(verificationDetails.approvedBy ||
                existingData.verification?.approvedBy ||
                ''),
            approvalStatus: (0, requisition_helpers_1.cleanString)(verificationDetails.approvalStatus ||
                existingData.verification?.approvalStatus ||
                ''),
        };
        const keepList = Array.isArray(keepAttachments)
            ? keepAttachments.map((item) => (0, requisition_helpers_1.cleanString)(item)).filter(Boolean)
            : [];
        const newAttachmentFiles = (files?.attachedDocuments || []).map((file) => file.filename);
        donation.attachedDocuments = [...keepList, ...newAttachmentFiles];
        const ownershipFiles = files?.ownershipProof || [];
        if (ownershipFiles.length) {
            const newFile = ownershipFiles[0].filename;
            const previousFile = existingData.land?.ownershipProof;
            land.ownershipProof = newFile;
            if (previousFile && previousFile !== newFile) {
                await this.deleteFilesQuietly([previousFile]);
            }
        }
        else if (existingData.land?.ownershipProof) {
            land.ownershipProof = existingData.land.ownershipProof;
        }
        const acqStatus = statusRaw || existingStatus || 'Identification Pending';
        const nextStageLabel = (0, requisition_helpers_1.cleanString)(acqStatus);
        const normalizedNextStage = (0, requisition_helpers_1.normalizeStatus)(nextStageLabel);
        const normalizedCurrentStatus = (0, requisition_helpers_1.normalizeStatus)(requisition.status);
        const stageIsSyncable = Boolean(normalizedNextStage && requisition_constants_1.BCC_LAND_STATUS_SET.has(normalizedNextStage));
        const currentlyInBccFlow = !normalizedCurrentStatus || requisition_constants_1.BCC_LAND_STATUS_SET.has(normalizedCurrentStatus);
        let nextStatus = requisition.status;
        if (stageIsSyncable && currentlyInBccFlow) {
            nextStatus = nextStageLabel;
        }
        const now = new Date();
        await this.prisma.$transaction([
            this.prisma.requisition_activity_logs.create({
                data: {
                    requisition_id: requisition.id,
                    action: 'Land Acquisition Updated',
                    user_id: BigInt(user.userId),
                    timestamp: now,
                    remarks: `Stage set to ${acqStatus}`,
                },
            }),
            this.prisma.requisitions.update({
                where: { id: requisition.id },
                data: {
                    land_acquisition_type: type === 'Govt Land'
                        ? client_1.requisitions_land_acquisition_type.Govt_Land
                        : client_1.requisitions_land_acquisition_type.Private_Land,
                    land_acquisition_status: acqStatus,
                    land_acquisition_data: { donor, land, donation, verification },
                    land_acquisition_updated_by: BigInt(user.userId),
                    land_acquisition_updated_at: now,
                    status: nextStatus,
                    last_updated: now,
                },
            }),
        ]);
        const full = await this.reloadRequisition(requisition.id);
        return (0, requisition_mapper_1.serializeRequisition)(full);
    }
    async updateLandUtilizationOverview(id, user, body) {
        const requisition = await this.prisma.requisitions.findUnique({ where: { id: BigInt(id) } });
        if (!requisition) {
            throw new common_1.NotFoundException({ msg: 'Not found' });
        }
        const now = new Date();
        const phase = (0, requisition_helpers_1.cleanString)(body.phase);
        await this.prisma.$transaction([
            this.prisma.requisition_activity_logs.create({
                data: {
                    requisition_id: requisition.id,
                    action: 'Land Utilization Overview Updated',
                    user_id: BigInt(user.userId),
                    timestamp: now,
                    remarks: phase || 'Phase updated',
                },
            }),
            this.prisma.requisitions.update({
                where: { id: requisition.id },
                data: {
                    land_utilization_phase: phase,
                    land_utilization_summary: (0, requisition_helpers_1.cleanString)(body.summary),
                    land_utilization_next_milestone: (0, requisition_helpers_1.cleanString)(body.nextMilestone),
                    land_utilization_updated_by: BigInt(user.userId),
                    land_utilization_updated_at: now,
                    last_updated: now,
                },
            }),
        ]);
        const full = await this.reloadRequisition(requisition.id);
        return (0, requisition_mapper_1.serializeRequisition)(full);
    }
    async addCivilStructure(id, user, body, files) {
        const name = (0, requisition_helpers_1.cleanString)(body.name);
        if (!name) {
            throw new common_1.BadRequestException({ msg: 'Structure name is required.' });
        }
        let attributes;
        if (body.attributes) {
            try {
                attributes =
                    typeof body.attributes === 'string'
                        ? JSON.parse(body.attributes)
                        : body.attributes;
            }
            catch {
                throw new common_1.BadRequestException({ msg: 'Structure attributes must be valid JSON.' });
            }
        }
        const requisition = await this.prisma.requisitions.findUnique({ where: { id: BigInt(id) } });
        if (!requisition) {
            throw new common_1.NotFoundException({ msg: 'Not found' });
        }
        const now = new Date();
        const photos = Array.isArray(files) ? files.map((file) => file.filename) : [];
        const gallery = (0, requisition_helpers_1.mergeGallery)(requisition.land_utilization_gallery, photos);
        await this.prisma.$transaction([
            this.prisma.requisition_civil_structures.create({
                data: {
                    requisition_id: requisition.id,
                    name,
                    category: (0, requisition_helpers_1.cleanString)(body.category) || null,
                    status: (0, requisition_helpers_1.cleanString)(body.status) || 'Planned',
                    description: (0, requisition_helpers_1.cleanString)(body.description) || null,
                    attributes: attributes && Object.keys(attributes).length
                        ? attributes
                        : undefined,
                    photos: photos.length ? photos : undefined,
                    updated_by: BigInt(user.userId),
                    created_at: now,
                    updated_at: now,
                },
            }),
            this.prisma.requisition_activity_logs.create({
                data: {
                    requisition_id: requisition.id,
                    action: 'Civil Structure Added',
                    user_id: BigInt(user.userId),
                    timestamp: now,
                    remarks: name,
                },
            }),
            this.prisma.requisitions.update({
                where: { id: requisition.id },
                data: {
                    land_utilization_gallery: gallery,
                    land_utilization_updated_by: BigInt(user.userId),
                    land_utilization_updated_at: now,
                    last_updated: now,
                },
            }),
        ]);
        const full = await this.reloadRequisition(requisition.id);
        return (0, requisition_mapper_1.serializeRequisition)(full);
    }
    async addMachinery(id, user, body, files) {
        const name = (0, requisition_helpers_1.cleanString)(body.name);
        if (!name) {
            throw new common_1.BadRequestException({ msg: 'Machinery name is required.' });
        }
        let attributes;
        if (body.attributes) {
            try {
                attributes =
                    typeof body.attributes === 'string'
                        ? JSON.parse(body.attributes)
                        : body.attributes;
            }
            catch {
                throw new common_1.BadRequestException({ msg: 'Machinery attributes must be valid JSON.' });
            }
        }
        const requisition = await this.prisma.requisitions.findUnique({ where: { id: BigInt(id) } });
        if (!requisition) {
            throw new common_1.NotFoundException({ msg: 'Not found' });
        }
        const now = new Date();
        const photos = Array.isArray(files) ? files.map((file) => file.filename) : [];
        const gallery = (0, requisition_helpers_1.mergeGallery)(requisition.land_utilization_gallery, photos);
        await this.prisma.$transaction([
            this.prisma.requisition_machinery.create({
                data: {
                    requisition_id: requisition.id,
                    name,
                    type: (0, requisition_helpers_1.cleanString)(body.type) || null,
                    status: (0, requisition_helpers_1.cleanString)(body.status) || 'Idle',
                    capacity: (0, requisition_helpers_1.cleanString)(body.capacity) || null,
                    manufacturer: (0, requisition_helpers_1.cleanString)(body.manufacturer) || null,
                    attributes: attributes && Object.keys(attributes).length
                        ? attributes
                        : undefined,
                    photos: photos.length ? photos : undefined,
                    updated_by: BigInt(user.userId),
                    created_at: now,
                    updated_at: now,
                },
            }),
            this.prisma.requisition_activity_logs.create({
                data: {
                    requisition_id: requisition.id,
                    action: 'Machinery Added',
                    user_id: BigInt(user.userId),
                    timestamp: now,
                    remarks: name,
                },
            }),
            this.prisma.requisitions.update({
                where: { id: requisition.id },
                data: {
                    land_utilization_gallery: gallery,
                    land_utilization_updated_by: BigInt(user.userId),
                    land_utilization_updated_at: now,
                    last_updated: now,
                },
            }),
        ]);
        const full = await this.reloadRequisition(requisition.id);
        return (0, requisition_mapper_1.serializeRequisition)(full);
    }
    async addProgressUpdate(id, user, body, files, actionLabel = 'Progress Update Logged') {
        const statusText = (0, requisition_helpers_1.cleanString)(body.status);
        if (!statusText) {
            throw new common_1.BadRequestException({ msg: 'Progress status is required.' });
        }
        const requisition = await this.prisma.requisitions.findUnique({ where: { id: BigInt(id) } });
        if (!requisition) {
            throw new common_1.NotFoundException({ msg: 'Not found' });
        }
        const now = new Date();
        const attachments = Array.isArray(files) ? files.map((file) => file.filename) : [];
        const progressDateRaw = (0, requisition_helpers_1.cleanString)(body.progressDate);
        const completionRaw = (0, requisition_helpers_1.cleanString)(body.completionPercentage);
        let completion;
        if (completionRaw) {
            completion = Number(completionRaw);
            if (!Number.isFinite(completion)) {
                throw new common_1.BadRequestException({ msg: 'Completion percentage must be numeric.' });
            }
            if (completion < 0 || completion > 100) {
                throw new common_1.BadRequestException({
                    msg: 'Completion percentage must be between 0 and 100.',
                });
            }
        }
        const gallery = (0, requisition_helpers_1.mergeGallery)(requisition.land_utilization_gallery, attachments);
        await this.prisma.$transaction([
            this.prisma.requisition_progress_updates.create({
                data: {
                    requisition_id: requisition.id,
                    status: statusText,
                    description: (0, requisition_helpers_1.cleanString)(body.description) || null,
                    progress_date: progressDateRaw ? new Date(progressDateRaw) : now,
                    completion_percentage: completion,
                    attachments: attachments.length ? attachments : undefined,
                    updated_by: BigInt(user.userId),
                    created_at: now,
                    updated_at: now,
                },
            }),
            this.prisma.requisition_activity_logs.create({
                data: {
                    requisition_id: requisition.id,
                    action: actionLabel,
                    user_id: BigInt(user.userId),
                    timestamp: now,
                    remarks: statusText,
                },
            }),
            this.prisma.requisitions.update({
                where: { id: requisition.id },
                data: {
                    land_utilization_gallery: gallery,
                    land_utilization_updated_by: BigInt(user.userId),
                    land_utilization_updated_at: now,
                    last_updated: now,
                },
            }),
        ]);
        const full = await this.reloadRequisition(requisition.id);
        return (0, requisition_mapper_1.serializeRequisition)(full);
    }
    async updateUtilizationOverview(id, user, body) {
        const requisition = await this.prisma.requisitions.findUnique({ where: { id: BigInt(id) } });
        if (!requisition) {
            throw new common_1.NotFoundException({ msg: 'Not found' });
        }
        const phase = (0, requisition_helpers_1.cleanString)(body.phase) || requisition.land_utilization_phase || '';
        const now = new Date();
        await this.prisma.$transaction([
            this.prisma.requisition_activity_logs.create({
                data: {
                    requisition_id: requisition.id,
                    action: 'Land Utilization Overview Updated',
                    user_id: BigInt(user.userId),
                    timestamp: now,
                    remarks: phase ? `Phase set to ${phase}` : 'Overview updated',
                },
            }),
            this.prisma.requisitions.update({
                where: { id: requisition.id },
                data: {
                    land_utilization_phase: phase,
                    land_utilization_summary: (0, requisition_helpers_1.cleanString)(body.summary) || requisition.land_utilization_summary || '',
                    land_utilization_next_milestone: (0, requisition_helpers_1.cleanString)(body.nextMilestone) || requisition.land_utilization_next_milestone || '',
                    land_utilization_updated_by: BigInt(user.userId),
                    land_utilization_updated_at: now,
                    last_updated: now,
                },
            }),
        ]);
        const full = await this.reloadRequisition(requisition.id);
        return (0, requisition_mapper_1.serializeRequisition)(full);
    }
    async updateCivilStructure(id, structureId, user, body, files) {
        const requisition = await this.prisma.requisitions.findUnique({ where: { id: BigInt(id) } });
        if (!requisition) {
            throw new common_1.NotFoundException({ msg: 'Not found' });
        }
        const structure = await this.prisma.requisition_civil_structures.findFirst({
            where: { id: BigInt(structureId), requisition_id: requisition.id },
        });
        if (!structure) {
            throw new common_1.NotFoundException({ msg: 'Structure not found' });
        }
        const updates = {
            users: { connect: { id: BigInt(user.userId) } },
            updated_at: new Date(),
        };
        if (Object.prototype.hasOwnProperty.call(body, 'name')) {
            const updatedName = (0, requisition_helpers_1.cleanString)(body.name);
            if (!updatedName) {
                throw new common_1.BadRequestException({ msg: 'Structure name cannot be empty.' });
            }
            updates.name = updatedName;
        }
        if (Object.prototype.hasOwnProperty.call(body, 'category')) {
            updates.category = (0, requisition_helpers_1.cleanString)(body.category);
        }
        if (Object.prototype.hasOwnProperty.call(body, 'status')) {
            updates.status = (0, requisition_helpers_1.cleanString)(body.status) || structure.status;
        }
        if (Object.prototype.hasOwnProperty.call(body, 'description')) {
            updates.description = (0, requisition_helpers_1.cleanString)(body.description);
        }
        if (Object.prototype.hasOwnProperty.call(body, 'attributes')) {
            updates.attributes = (0, requisition_helpers_1.parseJsonField)(body.attributes, structure.attributes || {});
        }
        const keepPhotos = (0, requisition_helpers_1.parseJsonField)(body.keepPhotos, []);
        const keepSet = new Set(Array.isArray(keepPhotos) ? keepPhotos.map((item) => String(item)) : []);
        const existingPhotos = Array.isArray(structure.photos) ? structure.photos : [];
        const retained = existingPhotos.filter((photo) => keepSet.has(photo));
        const removed = existingPhotos.filter((photo) => !keepSet.has(photo));
        const newPhotos = (files || []).map((file) => file.filename);
        updates.photos = [...retained, ...newPhotos];
        await this.deleteFilesQuietly(removed);
        const currentGallery = Array.isArray(requisition.land_utilization_gallery)
            ? requisition.land_utilization_gallery
            : [];
        const gallery = Array.from(new Set([...currentGallery.filter((photo) => !removed.includes(photo)), ...newPhotos]));
        const now = new Date();
        await this.prisma.$transaction([
            this.prisma.requisition_civil_structures.update({
                where: { id: structure.id },
                data: updates,
            }),
            this.prisma.requisition_activity_logs.create({
                data: {
                    requisition_id: requisition.id,
                    action: 'Civil Structure Updated',
                    user_id: BigInt(user.userId),
                    timestamp: now,
                    remarks: updates.name || structure.name,
                },
            }),
            this.prisma.requisitions.update({
                where: { id: requisition.id },
                data: {
                    land_utilization_gallery: gallery,
                    land_utilization_updated_by: BigInt(user.userId),
                    land_utilization_updated_at: now,
                    last_updated: now,
                },
            }),
        ]);
        const full = await this.reloadRequisition(requisition.id);
        return (0, requisition_mapper_1.serializeRequisition)(full);
    }
    async updateMachinery(id, machineryId, user, body, files) {
        const requisition = await this.prisma.requisitions.findUnique({ where: { id: BigInt(id) } });
        if (!requisition) {
            throw new common_1.NotFoundException({ msg: 'Not found' });
        }
        const machinery = await this.prisma.requisition_machinery.findFirst({
            where: { id: BigInt(machineryId), requisition_id: requisition.id },
        });
        if (!machinery) {
            throw new common_1.NotFoundException({ msg: 'Machinery not found' });
        }
        const updates = {
            users: { connect: { id: BigInt(user.userId) } },
            updated_at: new Date(),
        };
        if (Object.prototype.hasOwnProperty.call(body, 'name')) {
            const updatedName = (0, requisition_helpers_1.cleanString)(body.name);
            if (!updatedName) {
                throw new common_1.BadRequestException({ msg: 'Machinery name cannot be empty.' });
            }
            updates.name = updatedName;
        }
        if (Object.prototype.hasOwnProperty.call(body, 'type')) {
            updates.type = (0, requisition_helpers_1.cleanString)(body.type);
        }
        if (Object.prototype.hasOwnProperty.call(body, 'status')) {
            updates.status = (0, requisition_helpers_1.cleanString)(body.status) || machinery.status;
        }
        if (Object.prototype.hasOwnProperty.call(body, 'capacity')) {
            updates.capacity = (0, requisition_helpers_1.cleanString)(body.capacity);
        }
        if (Object.prototype.hasOwnProperty.call(body, 'manufacturer')) {
            updates.manufacturer = (0, requisition_helpers_1.cleanString)(body.manufacturer);
        }
        if (Object.prototype.hasOwnProperty.call(body, 'attributes')) {
            updates.attributes = (0, requisition_helpers_1.parseJsonField)(body.attributes, machinery.attributes || {});
        }
        const keepPhotos = (0, requisition_helpers_1.parseJsonField)(body.keepPhotos, []);
        const keepSet = new Set(Array.isArray(keepPhotos) ? keepPhotos.map((item) => String(item)) : []);
        const existingPhotos = Array.isArray(machinery.photos) ? machinery.photos : [];
        const retained = existingPhotos.filter((photo) => keepSet.has(photo));
        const removed = existingPhotos.filter((photo) => !keepSet.has(photo));
        const newPhotos = (files || []).map((file) => file.filename);
        updates.photos = [...retained, ...newPhotos];
        await this.deleteFilesQuietly(removed);
        const currentGallery = Array.isArray(requisition.land_utilization_gallery)
            ? requisition.land_utilization_gallery
            : [];
        const gallery = Array.from(new Set([...currentGallery.filter((photo) => !removed.includes(photo)), ...newPhotos]));
        const now = new Date();
        await this.prisma.$transaction([
            this.prisma.requisition_machinery.update({
                where: { id: machinery.id },
                data: updates,
            }),
            this.prisma.requisition_activity_logs.create({
                data: {
                    requisition_id: requisition.id,
                    action: 'Machinery Updated',
                    user_id: BigInt(user.userId),
                    timestamp: now,
                    remarks: updates.name || machinery.name,
                },
            }),
            this.prisma.requisitions.update({
                where: { id: requisition.id },
                data: {
                    land_utilization_gallery: gallery,
                    land_utilization_updated_by: BigInt(user.userId),
                    land_utilization_updated_at: now,
                    last_updated: now,
                },
            }),
        ]);
        const full = await this.reloadRequisition(requisition.id);
        return (0, requisition_mapper_1.serializeRequisition)(full);
    }
    async addUtilizationProgress(id, user, body, files) {
        const status = (0, requisition_helpers_1.cleanString)(body.status);
        if (!status) {
            throw new common_1.BadRequestException({ msg: 'Progress status is required.' });
        }
        const requisition = await this.prisma.requisitions.findUnique({ where: { id: BigInt(id) } });
        if (!requisition) {
            throw new common_1.NotFoundException({ msg: 'Not found' });
        }
        const description = (0, requisition_helpers_1.cleanString)(body.description);
        const progressDateRaw = (0, requisition_helpers_1.cleanString)(body.progressDate);
        const progressDate = progressDateRaw ? new Date(progressDateRaw) : new Date();
        const percentageRaw = body.completionPercentage;
        const percentageNum = percentageRaw === undefined || percentageRaw === null ? null : Number(percentageRaw);
        const completionPercentage = Number.isFinite(percentageNum)
            ? Math.min(100, Math.max(0, Number(percentageNum.toFixed(2))))
            : undefined;
        const attachments = (files || []).map((file) => file.filename);
        const gallery = Array.from(new Set([...(Array.isArray(requisition.land_utilization_gallery) ? requisition.land_utilization_gallery : []), ...attachments]));
        const now = new Date();
        await this.prisma.$transaction([
            this.prisma.requisition_progress_updates.create({
                data: {
                    requisition_id: requisition.id,
                    status,
                    description,
                    progress_date: progressDate,
                    completion_percentage: completionPercentage,
                    attachments: attachments.length ? attachments : undefined,
                    updated_by: BigInt(user.userId),
                    created_at: now,
                    updated_at: now,
                },
            }),
            this.prisma.requisition_activity_logs.create({
                data: {
                    requisition_id: requisition.id,
                    action: 'Physical Progress Logged',
                    user_id: BigInt(user.userId),
                    timestamp: now,
                    remarks: status,
                },
            }),
            this.prisma.requisitions.update({
                where: { id: requisition.id },
                data: {
                    land_utilization_gallery: gallery,
                    land_utilization_updated_by: BigInt(user.userId),
                    land_utilization_updated_at: now,
                    last_updated: now,
                },
            }),
        ]);
        const full = await this.reloadRequisition(requisition.id);
        return (0, requisition_mapper_1.serializeRequisition)(full);
    }
    async streamDueDiligencePdf(id, res) {
        const row = await this.prisma.requisitions.findUnique({
            where: { id: BigInt(id) },
            include: requisition_mapper_1.REQUISITION_INCLUDE,
        });
        if (!row) {
            throw new common_1.NotFoundException({ msg: 'Requisition not found.' });
        }
        try {
            const serialized = (0, requisition_mapper_1.serializeRequisition)(row);
            this.pdfService.streamDueDiligencePdf(serialized, res);
        }
        catch (err) {
            if (!res.headersSent) {
                throw new common_1.InternalServerErrorException({
                    msg: 'Unable to generate Due Diligence PDF.',
                    error: err.message,
                });
            }
        }
    }
    async streamWorkflowPdf(id, res) {
        const row = await this.prisma.requisitions.findUnique({
            where: { id: BigInt(id) },
            include: requisition_mapper_1.REQUISITION_INCLUDE,
        });
        if (!row) {
            throw new common_1.NotFoundException({ msg: 'Requisition not found.' });
        }
        try {
            const serialized = (0, requisition_mapper_1.serializeRequisition)(row);
            this.pdfService.streamWorkflowPdf(serialized, res);
        }
        catch (err) {
            if (!res.headersSent) {
                throw new common_1.InternalServerErrorException({
                    msg: 'Unable to prepare requisition PDF.',
                    error: err.message,
                });
            }
        }
    }
    async forwardWorkflow(id, user, options) {
        const remarksText = (0, requisition_helpers_1.ensureRemarks)(options.remarks, options.defaultRemarks);
        const requisition = await this.prisma.requisitions.findUnique({ where: { id: BigInt(id) } });
        if (!requisition) {
            throw new common_1.NotFoundException({ msg: 'Not found' });
        }
        if (!(0, requisition_helpers_1.statusIn)(requisition.status, options.expectedStatus)) {
            throw new common_1.BadRequestException({ msg: options.expectedStatusMessage });
        }
        const isSuperAdmin = user?.role === 'Super Admin';
        const currentAssignee = (0, requisition_helpers_1.resolveId)(requisition.assigned_to);
        if (options.checkDmQueue) {
            if (!isSuperAdmin && currentAssignee && currentAssignee !== (0, requisition_helpers_1.resolveId)(user.userId)) {
                throw new common_1.ForbiddenException({ msg: options.queueMessage || 'Forbidden' });
            }
        }
        else if (!isSuperAdmin && currentAssignee !== (0, requisition_helpers_1.resolveId)(user.userId)) {
            throw new common_1.ForbiddenException({
                msg: options.notAssignedMessage || 'This requisition is not assigned to you.',
            });
        }
        const targetOfficerId = await this.pickOfficerId(options.officerId, options.fallbackRoles);
        if (!targetOfficerId) {
            throw new common_1.NotFoundException({ msg: options.noOfficerMessage });
        }
        const now = new Date();
        await this.prisma.$transaction([
            this.prisma.requisition_activity_logs.create({
                data: {
                    requisition_id: requisition.id,
                    action: options.action,
                    user_id: BigInt(user.userId),
                    timestamp: now,
                    remarks: remarksText,
                },
            }),
            this.prisma.requisitions.update({
                where: { id: requisition.id },
                data: {
                    status: options.nextStatus,
                    assigned_to: BigInt(targetOfficerId),
                    last_updated: now,
                },
            }),
        ]);
        const full = await this.reloadRequisition(requisition.id);
        return (0, requisition_mapper_1.serializeRequisition)(full);
    }
    dmForwardBcc(id, user, body) {
        return this.forwardWorkflow(id, user, {
            expectedStatus: requisition_constants_1.WORKFLOW_STATUSES.PENDING_DM,
            expectedStatusMessage: 'Case is not awaiting DM review.',
            nextStatus: requisition_constants_1.WORKFLOW_STATUSES.PENDING_BCC,
            action: 'Forwarded to BCC Officer',
            fallbackRoles: ['BCC Officer Tehsil', 'BCC Officer'],
            defaultRemarks: 'Forwarded to BCC officer.',
            officerId: body.officerId,
            remarks: body.remarks,
            checkDmQueue: true,
            queueMessage: 'This requisition is not in your DM queue.',
            noOfficerMessage: 'No BCC officer available for assignment.',
        });
    }
    bccForwardTm(id, user, body) {
        return this.forwardWorkflow(id, user, {
            expectedStatus: requisition_constants_1.WORKFLOW_STATUSES.PENDING_BCC,
            expectedStatusMessage: 'Case is not awaiting BCC officer review.',
            nextStatus: requisition_constants_1.WORKFLOW_STATUSES.PENDING_TM,
            action: 'Forwarded to TM',
            fallbackRoles: ['Tehsil Manager'],
            defaultRemarks: 'Forwarded to Tehsil Manager.',
            officerId: body.officerId,
            remarks: body.remarks,
            noOfficerMessage: 'No Tehsil Manager available for assignment.',
        });
    }
    tmForwardChief(id, user, body) {
        return this.forwardWorkflow(id, user, {
            expectedStatus: requisition_constants_1.WORKFLOW_STATUSES.PENDING_TM,
            expectedStatusMessage: 'Case is not awaiting TM review.',
            nextStatus: requisition_constants_1.WORKFLOW_STATUSES.PENDING_CHIEF,
            action: 'Forwarded to BCC Specialist',
            fallbackRoles: ['BCC Specialist'],
            defaultRemarks: 'Forwarded to BCC Specialist.',
            officerId: body.officerId,
            remarks: body.remarks,
            noOfficerMessage: 'No BCC Specialist available for assignment.',
        });
    }
    chiefForwardBcc(id, user, body) {
        return this.forwardWorkflow(id, user, {
            expectedStatus: requisition_constants_1.WORKFLOW_STATUSES.PENDING_CHIEF,
            expectedStatusMessage: 'Case is not awaiting BCC Specialist review.',
            nextStatus: requisition_constants_1.WORKFLOW_STATUSES.PENDING_WB_DISPATCH,
            action: 'Sent to BCC for WB dispatch',
            fallbackRoles: ['BCC Officer Tehsil', 'BCC Officer'],
            defaultRemarks: 'Returned to BCC officer for WB dispatch.',
            officerId: body.officerId,
            remarks: body.remarks,
            noOfficerMessage: 'No BCC officer available for assignment.',
        });
    }
    bccForwardWb(id, user, body) {
        return this.forwardWorkflow(id, user, {
            expectedStatus: requisition_constants_1.WORKFLOW_STATUSES.PENDING_WB_DISPATCH,
            expectedStatusMessage: 'Case is not ready for WB dispatch.',
            nextStatus: requisition_constants_1.WORKFLOW_STATUSES.PENDING_WB_APPROVAL,
            action: 'Forwarded to WB User',
            fallbackRoles: ['WB User'],
            defaultRemarks: 'Forwarded to WB user.',
            officerId: body.officerId,
            remarks: body.remarks,
            noOfficerMessage: 'No WB user available for assignment.',
        });
    }
    wbApprove(id, user, body) {
        return this.forwardWorkflow(id, user, {
            expectedStatus: requisition_constants_1.WORKFLOW_STATUSES.PENDING_WB_APPROVAL,
            expectedStatusMessage: 'Case is not awaiting WB approval.',
            nextStatus: requisition_constants_1.WORKFLOW_STATUSES.WB_APPROVED,
            action: 'WB Approval Granted',
            fallbackRoles: ['BCC Specialist'],
            defaultRemarks: 'Approved by WB user.',
            officerId: body.officerId,
            remarks: body.remarks,
            noOfficerMessage: 'No BCC Specialist available for reassignment.',
        });
    }
    chiefMarkTm(id, user, body) {
        return this.forwardWorkflow(id, user, {
            expectedStatus: requisition_constants_1.WORKFLOW_STATUSES.WB_APPROVED,
            expectedStatusMessage: 'Case is not in WB approved state.',
            nextStatus: requisition_constants_1.WORKFLOW_STATUSES.MARKED_TO_TM,
            action: 'Marked to TM',
            fallbackRoles: ['Tehsil Manager'],
            defaultRemarks: 'Marked back to TM.',
            officerId: body.officerId,
            remarks: body.remarks,
            noOfficerMessage: 'No Tehsil Manager available for assignment.',
        });
    }
    tmForwardBccClosure(id, user, body) {
        return this.forwardWorkflow(id, user, {
            expectedStatus: requisition_constants_1.WORKFLOW_STATUSES.MARKED_TO_TM,
            expectedStatusMessage: 'Case is not marked to TM.',
            nextStatus: requisition_constants_1.WORKFLOW_STATUSES.PENDING_BCC_CLOSURE,
            action: 'Forwarded to BCC for closure',
            fallbackRoles: ['BCC Officer Tehsil', 'BCC Officer'],
            defaultRemarks: 'Forwarded to BCC officer for closure.',
            officerId: body.officerId,
            remarks: body.remarks,
            noOfficerMessage: 'No BCC officer available for closure.',
        });
    }
    async bccClose(id, user, body) {
        const remarksText = (0, requisition_helpers_1.ensureRemarks)(body.remarks, 'Case closed by BCC officer.');
        const requisition = await this.prisma.requisitions.findUnique({ where: { id: BigInt(id) } });
        if (!requisition) {
            throw new common_1.NotFoundException({ msg: 'Not found' });
        }
        if (!(0, requisition_helpers_1.statusIn)(requisition.status, requisition_constants_1.WORKFLOW_STATUSES.PENDING_BCC_CLOSURE)) {
            throw new common_1.BadRequestException({ msg: 'Case is not in BCC closure stage.' });
        }
        const isSuperAdmin = user?.role === 'Super Admin';
        if (!isSuperAdmin && (0, requisition_helpers_1.resolveId)(requisition.assigned_to) !== (0, requisition_helpers_1.resolveId)(user.userId)) {
            throw new common_1.ForbiddenException({ msg: 'This requisition is not assigned to you.' });
        }
        const now = new Date();
        await this.prisma.$transaction([
            this.prisma.requisition_activity_logs.create({
                data: {
                    requisition_id: requisition.id,
                    action: 'Case Closed by BCC',
                    user_id: BigInt(user.userId),
                    timestamp: now,
                    remarks: remarksText,
                },
            }),
            this.prisma.requisitions.update({
                where: { id: requisition.id },
                data: {
                    status: requisition_constants_1.WORKFLOW_STATUSES.CLOSED,
                    assigned_to: null,
                    last_updated: now,
                },
            }),
        ]);
        const full = await this.reloadRequisition(requisition.id);
        return (0, requisition_mapper_1.serializeRequisition)(full);
    }
    async revert(id, user, body) {
        const remarksText = (body.remarks || '').toString().trim();
        if (!remarksText) {
            throw new common_1.BadRequestException({ msg: 'Remarks are required to revert a requisition.' });
        }
        const requisition = await this.prisma.requisitions.findUnique({ where: { id: BigInt(id) } });
        if (!requisition) {
            throw new common_1.NotFoundException({ msg: 'Not found' });
        }
        const targetStatusRaw = (body.toStatus || '').toString().trim();
        const normalizedTarget = (0, requisition_helpers_1.normalizeStatus)(targetStatusRaw);
        const matchedStatus = normalizedTarget
            ? requisition_constants_1.WORKFLOW_STATUS_LIST.find((status) => (0, requisition_helpers_1.normalizeStatus)(status) === normalizedTarget)
            : null;
        const effectiveStatus = matchedStatus || (targetStatusRaw || 'Reverted');
        const assignmentRoles = matchedStatus
            ? requisition_constants_1.WORKFLOW_ASSIGNMENT_ROLES[matchedStatus] || []
            : [];
        let nextAssignedTo = requisition.assigned_to;
        if (matchedStatus === requisition_constants_1.WORKFLOW_STATUSES.CLOSED) {
            nextAssignedTo = null;
        }
        else if (assignmentRoles.length) {
            const resolvedAssignee = await this.pickOfficerId(body.officerId, assignmentRoles);
            if (!resolvedAssignee) {
                throw new common_1.BadRequestException({
                    msg: `Unable to revert to ${matchedStatus}: no eligible officer available for reassignment.`,
                });
            }
            nextAssignedTo = BigInt(resolvedAssignee);
        }
        else if (body.officerId) {
            const resolvedManualId = (0, requisition_helpers_1.resolveId)(body.officerId);
            if (resolvedManualId) {
                nextAssignedTo = BigInt(resolvedManualId);
            }
        }
        else if (!matchedStatus) {
            nextAssignedTo = null;
        }
        const previousStatus = requisition.status || '';
        const now = new Date();
        await this.prisma.$transaction([
            this.prisma.requisition_activity_logs.create({
                data: {
                    requisition_id: requisition.id,
                    action: 'Reverted',
                    user_id: BigInt(user.userId),
                    timestamp: now,
                    remarks: remarksText,
                    meta: {
                        fromStatus: previousStatus || undefined,
                        toStatus: effectiveStatus,
                        assignedTo: nextAssignedTo?.toString() || undefined,
                    },
                },
            }),
            this.prisma.requisitions.update({
                where: { id: requisition.id },
                data: {
                    status: effectiveStatus,
                    assigned_to: nextAssignedTo,
                    last_updated: now,
                },
            }),
        ]);
        const full = await this.reloadRequisition(requisition.id);
        return (0, requisition_mapper_1.serializeRequisition)(full);
    }
};
exports.RequisitionService = RequisitionService;
exports.RequisitionService = RequisitionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        counter_service_1.CounterService,
        tehsil_scope_service_1.TehsilScopeService,
        requisition_pdf_service_1.RequisitionPdfService])
], RequisitionService);
//# sourceMappingURL=requisition.service.js.map