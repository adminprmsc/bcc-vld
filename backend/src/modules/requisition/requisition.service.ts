import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, requisitions_land_acquisition_type, requisitions_priority } from '@prisma/client';
import { unlink } from 'fs/promises';
import { Response } from 'express';
import { CounterService } from '../../common/counter/counter.service';
import { JwtPayload } from '../../common/security/jwt.strategy';
import { TehsilScopeService } from '../../domain/tehsil-scope/tehsil-scope.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BCC_LAND_STATUS_SET,
  LAND_ACQUISITION_STATUS_SET,
  WORKFLOW_ASSIGNMENT_ROLES,
  WORKFLOW_STATUSES,
  WORKFLOW_STATUS_LIST,
} from './requisition.constants';
import {
  buildLocationPayload,
  cleanString,
  ensureRemarks,
  mergeGallery,
  normalizeStatus,
  parseJsonField,
  parseLatLngInput,
  parseMapFeatures,
  parseMapViewport,
  resolveId,
  resolveRoleEnums,
  sanitizeChecklistInput,
  statusIn,
  toNumber,
} from './requisition.helpers';
import {
  REQUISITION_INCLUDE,
  RequisitionWithRelations,
  serializeMany,
  serializeRequisition,
  summarizeUser,
} from './requisition.mapper';
import { RequisitionPdfService } from './requisition-pdf.service';
import { getRequisitionUploadPath } from './requisition-upload.config';

@Injectable()
export class RequisitionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly counters: CounterService,
    private readonly tehsilScope: TehsilScopeService,
    private readonly pdfService: RequisitionPdfService,
  ) {}

  private async reloadRequisition(id: bigint): Promise<RequisitionWithRelations> {
    const row = await this.prisma.requisitions.findUnique({
      where: { id },
      include: REQUISITION_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException({ msg: 'Not found' });
    }
    return row;
  }

  private async findFirstUserByRole(roleInput: string | string[]) {
    const roleEnums = resolveRoleEnums(roleInput);
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

  private async pickOfficerId(preferredId: unknown, fallbackRoles: string[]) {
    const resolved = resolveId(preferredId);
    if (resolved) {
      return resolved;
    }
    if (!fallbackRoles?.length) {
      return '';
    }
    const fallback = await this.findFirstUserByRole(fallbackRoles);
    return fallback?.id?.toString() || '';
  }

  private async deleteFilesQuietly(fileNames: string[]) {
    if (!Array.isArray(fileNames) || !fileNames.length) {
      return;
    }
    await Promise.all(
      fileNames.map(async (name) => {
        if (!name) {
          return;
        }
        try {
          await unlink(getRequisitionUploadPath(name));
        } catch {
          // ignore missing files
        }
      }),
    );
  }

  async getDashboardStats(
    user: JwtPayload,
    query: { tehsil?: string; district?: string; startDate?: string; endDate?: string },
  ) {
    const where: Prisma.requisitionsWhereInput = {};
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

    const statusCounts: Record<string, number> = {};
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

    const completedStatuses = ['WB Approved', 'Closed', 'Approved', 'Acquisition Complete'].map(
      (s) => s.toLowerCase(),
    );

    const parseLandArea = (areaStr: unknown) => {
      if (!areaStr) {
        return { value: 0, unit: 'sqft' };
      }
      const str = areaStr.toString().toLowerCase().trim();
      const numMatch = str.match(/[\d.]+/);
      const value = numMatch ? parseFloat(numMatch[0]) : 0;
      let unit = 'sqft';
      if (str.includes('kanal')) {
        unit = 'kanals';
      } else if (str.includes('marla')) {
        unit = 'marlas';
      } else if (str.includes('acre')) {
        unit = 'acres';
      } else if (str.includes('sqft') || str.includes('sq ft') || str.includes('square feet')) {
        unit = 'sqft';
      }
      return { value, unit };
    };

    const toSqFt = (value: number, unit: string) => {
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
      } else if (completedStatuses.some((cs) => status.includes(cs) || cs.includes(status))) {
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
      wbPending:
        (statusCounts['Pending WB Dispatch'] || 0) + (statusCounts['Pending WB Approval'] || 0),
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

  async findAll(user: JwtPayload) {
    const where: Prisma.requisitionsWhereInput = {};
    if (user?.role === 'CID') {
      where.assigned_to = BigInt(user.userId);
    }
    const rows = await this.prisma.requisitions.findMany({
      where,
      include: REQUISITION_INCLUDE,
    });
    return serializeMany(rows);
  }

  async findOne(id: string, user: JwtPayload) {
    const row = await this.prisma.requisitions.findUnique({
      where: { id: BigInt(id) },
      include: REQUISITION_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException({ msg: `Requisition not found for id ${id}` });
    }
    if (user?.role === 'CID' && resolveId(row.assigned_to) !== resolveId(user.userId)) {
      throw new ForbiddenException({
        msg: 'Forbidden: requisition not assigned to this CID officer',
      });
    }
    return serializeRequisition(row);
  }

  async create(user: JwtPayload, body: Record<string, unknown>, files?: Express.Multer.File[]) {
    const location = buildLocationPayload(body.location);
    if (!location.address && typeof body.locationAddress === 'string') {
      location.address = body.locationAddress;
    }
    if (!location.coordinates) {
      const fallbackCoords =
        parseLatLngInput(body.location) || parseLatLngInput(body.mapMarker);
      if (fallbackCoords) {
        location.coordinates = fallbackCoords;
      }
    }

    let mapMarker = parseLatLngInput(body.mapMarker);
    if (!mapMarker && location.coordinates) {
      mapMarker = location.coordinates;
    }

    let mapFeatures = parseMapFeatures(body.mapFeatures);
    if (mapMarker) {
      const hasMarkerFeature = mapFeatures.some((feature) => {
        const f = feature as {
          type?: string;
          geometry?: { type?: string; coordinates?: number[] };
        };
        if (!f || f.type !== 'Feature' || !f.geometry) {
          return false;
        }
        if (f.geometry.type === 'Point' && Array.isArray(f.geometry.coordinates)) {
          const [lng, lat] = f.geometry.coordinates;
          return Number(lat) === Number(mapMarker!.lat) && Number(lng) === Number(mapMarker!.lng);
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

    const parsedViewport = parseMapViewport(body.mapViewport);
    const mapViewport =
      parsedViewport ||
      (mapMarker ? { center: mapMarker, zoom: 13 } : undefined);

    const division = cleanString(body.division);
    const district = cleanString(body.district);

    let supportingDocs = body.supportingDocs;
    if (typeof supportingDocs === 'string') {
      supportingDocs = supportingDocs ? [supportingDocs] : [];
    }

    let attachments: string[] = [];
    if (files && files.length > 0) {
      attachments = files.map((f) => f.filename);
    } else if (body.attachments) {
      if (Array.isArray(body.attachments)) {
        attachments = body.attachments as string[];
      } else if (typeof body.attachments === 'string') {
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
    const activityLogEntries: Array<{
      action: string;
      userId: bigint;
      remarks: string;
      timestamp: Date;
    }> = [
      {
        action: 'Created',
        userId: BigInt(user.userId),
        remarks: 'Requisition created',
        timestamp: now,
      },
    ];

    let assignedOfficerId: bigint | null = null;
    const computedStatus = WORKFLOW_STATUSES.PENDING_DM;

    const autoDm = await this.findFirstUserByRole(['DM Tehsil', 'Tehsil DM']);
    if (autoDm) {
      assignedOfficerId = autoDm.id;
      activityLogEntries.push({
        action: 'Submitted to DM Review',
        userId: BigInt(user.userId),
        remarks: `Auto-assigned to ${summarizeUser({
          simpleId: autoDm.simple_id,
          name: autoDm.name,
          email: autoDm.email,
          role: autoDm.role?.toString().replace(/_/g, ' '),
        })} for DM review.`,
        timestamp: now,
      });
    } else {
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
      ? (priorityRaw as requisitions_priority)
      : requisitions_priority.Medium;

    const landTypeOptions = ['Govt Land', 'Private Land'];
    const rawLandType = typeof body.landType === 'string' ? body.landType.trim() : '';
    const landTypeValue = landTypeOptions.includes(rawLandType) ? rawLandType : undefined;
    const govtLandChecklist = sanitizeChecklistInput(body.govtLandChecklist);
    const privateLandChecklist = sanitizeChecklistInput(body.privateLandChecklist);

    const sequenceNumber = await this.counters.nextSequence('requisition-sequence');

    const created = await this.prisma.requisitions.create({
      data: {
        sequence_number: sequenceNumber,
        title: cleanString(body.title),
        description: cleanString(body.description) || null,
        purpose: cleanString(body.purpose),
        division,
        district,
        requested_by: BigInt(user.userId),
        assigned_to: assignedOfficerId,
        tehsil: cleanString(body.tehsil),
        land_area: cleanString(body.landArea) || null,
        land_type: landTypeValue || null,
        govt_land_checklist:
          Object.keys(govtLandChecklist).length > 0 ? govtLandChecklist : undefined,
        private_land_checklist:
          Object.keys(privateLandChecklist).length > 0 ? privateLandChecklist : undefined,
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
        map_features: mapFeatures.length ? (mapFeatures as Prisma.InputJsonValue) : undefined,
        land_acquisition_type: landTypeValue
          ? landTypeValue === 'Govt Land'
            ? requisitions_land_acquisition_type.Govt_Land
            : requisitions_land_acquisition_type.Private_Land
          : undefined,
        required_date: body.requiredDate ? new Date(cleanString(body.requiredDate)) : null,
        priority: priorityValue,
        supporting_docs: supportingDocs as Prisma.InputJsonValue,
        estimated_value: cleanString(body.estimatedValue) || null,
        remarks: cleanString(body.remarks) || null,
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
    return serializeRequisition(full);
  }

  async updateMap(id: string, user: JwtPayload, body: Record<string, unknown>) {
    const requisition = await this.prisma.requisitions.findUnique({ where: { id: BigInt(id) } });
    if (!requisition) {
      throw new NotFoundException({ msg: 'Not found' });
    }

    const mapFeaturesInput = parseMapFeatures(body.mapFeatures);
    const viewport = parseMapViewport(body.mapViewport);
    let mapMarker = parseLatLngInput(body.mapMarker);

    const existingLocation = {
      address: requisition.location_address || '',
      coordinates:
        requisition.location_lat != null && requisition.location_lng != null
          ? { lat: Number(requisition.location_lat), lng: Number(requisition.location_lng) }
          : null,
    };
    const locationUpdate = buildLocationPayload(body.location);
    const locationAddressRaw =
      body.locationAddress !== undefined ? cleanString(body.locationAddress) : undefined;

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
        const f = feature as {
          type?: string;
          geometry?: { type?: string; coordinates?: number[] };
        };
        if (!f || f.type !== 'Feature' || !f.geometry) {
          return false;
        }
        if (f.geometry.type === 'Point' && Array.isArray(f.geometry.coordinates)) {
          const [lng, lat] = f.geometry.coordinates;
          if (Number(lat) === Number(mapMarker!.lat) && Number(lng) === Number(mapMarker!.lng)) {
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
    } else {
      sanitizedFeatures = mapFeaturesInput.filter((feature) => {
        const f = feature as { type?: string; properties?: { kind?: string } };
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
          map_features: sanitizedFeatures as Prisma.InputJsonValue,
          map_viewport_center_lat: viewport?.center?.lat ?? requisition.map_viewport_center_lat,
          map_viewport_center_lng: viewport?.center?.lng ?? requisition.map_viewport_center_lng,
          map_viewport_zoom: viewport?.zoom ?? requisition.map_viewport_zoom,
          last_updated: now,
        },
      }),
    ]);

    const full = await this.reloadRequisition(requisition.id);
    return serializeRequisition(full);
  }

  async updateDonor(id: string, user: JwtPayload, body: { donorData?: unknown }) {
    const requisition = await this.prisma.requisitions.findUnique({ where: { id: BigInt(id) } });
    if (!requisition) {
      throw new NotFoundException({ msg: 'Not found' });
    }

    const existing = (requisition.land_acquisition_data || {}) as Record<string, unknown>;
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
          land_acquisition_data: { ...existing, donorData: body.donorData } as Prisma.InputJsonValue,
          last_updated: now,
        },
      }),
    ]);

    const full = await this.reloadRequisition(requisition.id);
    return serializeRequisition(full);
  }

  async updateDocs(id: string, user: JwtPayload, body: { documents?: unknown }) {
    const requisition = await this.prisma.requisitions.findUnique({ where: { id: BigInt(id) } });
    if (!requisition) {
      throw new NotFoundException({ msg: 'Not found' });
    }

    const existing = (requisition.land_acquisition_data || {}) as Record<string, unknown>;
    const donorData = existing.donorData;
    const updatedData = { ...existing };
    if (donorData && Array.isArray(donorData) && donorData.length > 0) {
      const first = { ...(donorData[0] as Record<string, unknown>), documents: body.documents };
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
          land_acquisition_data: updatedData as Prisma.InputJsonValue,
          last_updated: now,
        },
      }),
    ]);

    const full = await this.reloadRequisition(requisition.id);
    return serializeRequisition(full);
  }

  async updateLandAcquisition(
    id: string,
    user: JwtPayload,
    body: Record<string, unknown>,
    files?: { ownershipProof?: Express.Multer.File[]; attachedDocuments?: Express.Multer.File[] },
  ) {
    const requisition = await this.prisma.requisitions.findUnique({ where: { id: BigInt(id) } });
    if (!requisition) {
      throw new NotFoundException({ msg: 'Not found' });
    }

    const existingData = (requisition.land_acquisition_data || {}) as Record<string, Record<string, unknown>>;
    const existingType = requisition.land_acquisition_type?.toString().replace(/_/g, ' ') || '';
    const existingStatus = requisition.land_acquisition_status || '';
    const typeRaw =
      cleanString(body.type) || existingType || requisition.land_type || 'Private Land';
    const type = typeRaw === 'Govt Land' ? 'Govt Land' : 'Private Land';
    const statusRaw = cleanString(body.status);
    if (statusRaw && !LAND_ACQUISITION_STATUS_SET.has(statusRaw.toLowerCase())) {
      throw new BadRequestException({ msg: `Invalid land acquisition status: ${statusRaw}` });
    }

    const donorDetails = parseJsonField(body.donorDetails, {});
    const landDetails = parseJsonField(body.landDetails, {});
    const donationDetails = parseJsonField(body.donationDetails, {});
    const verificationDetails = parseJsonField(body.verification, {});
    const keepAttachments = parseJsonField(body.keepAttachments, []);

    const willingnessRaw = cleanString(
      (donationDetails as Record<string, unknown>).willingnessDate,
    );
    const verifiedDateRaw = cleanString(
      (verificationDetails as Record<string, unknown>).verifiedDate,
    );

    const donor = {
      ...(existingData.donor || {}),
      fullName: cleanString(
        (donorDetails as Record<string, unknown>).fullName ||
          (donorDetails as Record<string, unknown>).name ||
          existingData.donor?.fullName ||
          '',
      ),
      cnic: cleanString(
        (donorDetails as Record<string, unknown>).cnic ||
          (donorDetails as Record<string, unknown>).cnicNumber ||
          existingData.donor?.cnic ||
          '',
      ),
      contactNumber: cleanString(
        (donorDetails as Record<string, unknown>).contactNumber ||
          (donorDetails as Record<string, unknown>).phone ||
          existingData.donor?.contactNumber ||
          '',
      ),
      address: cleanString(
        (donorDetails as Record<string, unknown>).address || existingData.donor?.address || '',
      ),
      villageName: cleanString(
        (donorDetails as Record<string, unknown>).villageName ||
          (donorDetails as Record<string, unknown>).village ||
          existingData.donor?.villageName ||
          '',
      ),
      tehsil: cleanString(
        (donorDetails as Record<string, unknown>).tehsil || existingData.donor?.tehsil || '',
      ),
      district: cleanString(
        (donorDetails as Record<string, unknown>).district || existingData.donor?.district || '',
      ),
    };

    const land: Record<string, unknown> = {
      ...(existingData.land || {}),
      khasraNumber: cleanString(
        (landDetails as Record<string, unknown>).khasraNumber ||
          existingData.land?.khasraNumber ||
          '',
      ),
      area: cleanString(
        (landDetails as Record<string, unknown>).area || existingData.land?.area || '',
      ),
      landCategory: cleanString(
        (landDetails as Record<string, unknown>).landCategory ||
          (landDetails as Record<string, unknown>).landType ||
          existingData.land?.landCategory ||
          '',
      ),
      latitude:
        toNumber((landDetails as Record<string, unknown>).latitude) ??
        (existingData.land?.latitude as number | null) ??
        null,
      longitude:
        toNumber((landDetails as Record<string, unknown>).longitude) ??
        (existingData.land?.longitude as number | null) ??
        null,
      mutationNumber: cleanString(
        (landDetails as Record<string, unknown>).mutationNumber ||
          existingData.land?.mutationNumber ||
          '',
      ),
      currentUse: cleanString(
        (landDetails as Record<string, unknown>).currentUse ||
          existingData.land?.currentUse ||
          '',
      ),
    };

    const donation = {
      ...(existingData.donation || {}),
      donationType: cleanString(
        (donationDetails as Record<string, unknown>).donationType ||
          existingData.donation?.donationType ||
          '',
      ),
      purpose: cleanString(
        (donationDetails as Record<string, unknown>).purpose ||
          existingData.donation?.purpose ||
          '',
      ),
      willingnessDate: willingnessRaw
        ? new Date(willingnessRaw)
        : (existingData.donation?.willingnessDate as Date | null) || null,
      remarks: cleanString(
        (donationDetails as Record<string, unknown>).remarks ||
          existingData.donation?.remarks ||
          '',
      ),
      attachedDocuments: [] as string[],
    };

    const verification = {
      ...(existingData.verification || {}),
      verifiedBy: cleanString(
        (verificationDetails as Record<string, unknown>).verifiedBy ||
          existingData.verification?.verifiedBy ||
          '',
      ),
      verifiedDate: verifiedDateRaw
        ? new Date(verifiedDateRaw)
        : (existingData.verification?.verifiedDate as Date | null) || null,
      approvedBy: cleanString(
        (verificationDetails as Record<string, unknown>).approvedBy ||
          existingData.verification?.approvedBy ||
          '',
      ),
      approvalStatus: cleanString(
        (verificationDetails as Record<string, unknown>).approvalStatus ||
          existingData.verification?.approvalStatus ||
          '',
      ),
    };

    const keepList = Array.isArray(keepAttachments)
      ? (keepAttachments as unknown[]).map((item) => cleanString(item)).filter(Boolean)
      : [];
    const newAttachmentFiles = (files?.attachedDocuments || []).map((file) => file.filename);
    donation.attachedDocuments = [...keepList, ...newAttachmentFiles];

    const ownershipFiles = files?.ownershipProof || [];
    if (ownershipFiles.length) {
      const newFile = ownershipFiles[0].filename;
      const previousFile = existingData.land?.ownershipProof as string | undefined;
      land.ownershipProof = newFile;
      if (previousFile && previousFile !== newFile) {
        await this.deleteFilesQuietly([previousFile]);
      }
    } else if (existingData.land?.ownershipProof) {
      land.ownershipProof = existingData.land.ownershipProof;
    }

    const acqStatus = statusRaw || existingStatus || 'Identification Pending';
    const nextStageLabel = cleanString(acqStatus);
    const normalizedNextStage = normalizeStatus(nextStageLabel);
    const normalizedCurrentStatus = normalizeStatus(requisition.status);
    const stageIsSyncable = Boolean(normalizedNextStage && BCC_LAND_STATUS_SET.has(normalizedNextStage));
    const currentlyInBccFlow =
      !normalizedCurrentStatus || BCC_LAND_STATUS_SET.has(normalizedCurrentStatus);

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
          land_acquisition_type:
            type === 'Govt Land'
              ? requisitions_land_acquisition_type.Govt_Land
              : requisitions_land_acquisition_type.Private_Land,
          land_acquisition_status: acqStatus,
          land_acquisition_data: { donor, land, donation, verification } as Prisma.InputJsonValue,
          land_acquisition_updated_by: BigInt(user.userId),
          land_acquisition_updated_at: now,
          status: nextStatus,
          last_updated: now,
        },
      }),
    ]);

    const full = await this.reloadRequisition(requisition.id);
    return serializeRequisition(full);
  }

  async updateLandUtilizationOverview(id: string, user: JwtPayload, body: Record<string, unknown>) {
    const requisition = await this.prisma.requisitions.findUnique({ where: { id: BigInt(id) } });
    if (!requisition) {
      throw new NotFoundException({ msg: 'Not found' });
    }

    const now = new Date();
    const phase = cleanString(body.phase);

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
          land_utilization_summary: cleanString(body.summary),
          land_utilization_next_milestone: cleanString(body.nextMilestone),
          land_utilization_updated_by: BigInt(user.userId),
          land_utilization_updated_at: now,
          last_updated: now,
        },
      }),
    ]);

    const full = await this.reloadRequisition(requisition.id);
    return serializeRequisition(full);
  }

  async addCivilStructure(
    id: string,
    user: JwtPayload,
    body: Record<string, unknown>,
    files?: Express.Multer.File[],
  ) {
    const name = cleanString(body.name);
    if (!name) {
      throw new BadRequestException({ msg: 'Structure name is required.' });
    }

    let attributes: Record<string, unknown> | undefined;
    if (body.attributes) {
      try {
        attributes =
          typeof body.attributes === 'string'
            ? JSON.parse(body.attributes)
            : (body.attributes as Record<string, unknown>);
      } catch {
        throw new BadRequestException({ msg: 'Structure attributes must be valid JSON.' });
      }
    }

    const requisition = await this.prisma.requisitions.findUnique({ where: { id: BigInt(id) } });
    if (!requisition) {
      throw new NotFoundException({ msg: 'Not found' });
    }

    const now = new Date();
    const photos = Array.isArray(files) ? files.map((file) => file.filename) : [];
    const gallery = mergeGallery(requisition.land_utilization_gallery, photos);

    await this.prisma.$transaction([
      this.prisma.requisition_civil_structures.create({
        data: {
          requisition_id: requisition.id,
          name,
          category: cleanString(body.category) || null,
          status: cleanString(body.status) || 'Planned',
          description: cleanString(body.description) || null,
          attributes:
            attributes && Object.keys(attributes).length
              ? (attributes as Prisma.InputJsonValue)
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
    return serializeRequisition(full);
  }

  async addMachinery(
    id: string,
    user: JwtPayload,
    body: Record<string, unknown>,
    files?: Express.Multer.File[],
  ) {
    const name = cleanString(body.name);
    if (!name) {
      throw new BadRequestException({ msg: 'Machinery name is required.' });
    }

    let attributes: Record<string, unknown> | undefined;
    if (body.attributes) {
      try {
        attributes =
          typeof body.attributes === 'string'
            ? JSON.parse(body.attributes)
            : (body.attributes as Record<string, unknown>);
      } catch {
        throw new BadRequestException({ msg: 'Machinery attributes must be valid JSON.' });
      }
    }

    const requisition = await this.prisma.requisitions.findUnique({ where: { id: BigInt(id) } });
    if (!requisition) {
      throw new NotFoundException({ msg: 'Not found' });
    }

    const now = new Date();
    const photos = Array.isArray(files) ? files.map((file) => file.filename) : [];
    const gallery = mergeGallery(requisition.land_utilization_gallery, photos);

    await this.prisma.$transaction([
      this.prisma.requisition_machinery.create({
        data: {
          requisition_id: requisition.id,
          name,
          type: cleanString(body.type) || null,
          status: cleanString(body.status) || 'Idle',
          capacity: cleanString(body.capacity) || null,
          manufacturer: cleanString(body.manufacturer) || null,
          attributes:
            attributes && Object.keys(attributes).length
              ? (attributes as Prisma.InputJsonValue)
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
    return serializeRequisition(full);
  }

  async addProgressUpdate(
    id: string,
    user: JwtPayload,
    body: Record<string, unknown>,
    files?: Express.Multer.File[],
    actionLabel = 'Progress Update Logged',
  ) {
    const statusText = cleanString(body.status);
    if (!statusText) {
      throw new BadRequestException({ msg: 'Progress status is required.' });
    }

    const requisition = await this.prisma.requisitions.findUnique({ where: { id: BigInt(id) } });
    if (!requisition) {
      throw new NotFoundException({ msg: 'Not found' });
    }

    const now = new Date();
    const attachments = Array.isArray(files) ? files.map((file) => file.filename) : [];
    const progressDateRaw = cleanString(body.progressDate);
    const completionRaw = cleanString(body.completionPercentage);
    let completion: number | undefined;
    if (completionRaw) {
      completion = Number(completionRaw);
      if (!Number.isFinite(completion)) {
        throw new BadRequestException({ msg: 'Completion percentage must be numeric.' });
      }
      if (completion < 0 || completion > 100) {
        throw new BadRequestException({
          msg: 'Completion percentage must be between 0 and 100.',
        });
      }
    }

    const gallery = mergeGallery(requisition.land_utilization_gallery, attachments);

    await this.prisma.$transaction([
      this.prisma.requisition_progress_updates.create({
        data: {
          requisition_id: requisition.id,
          status: statusText,
          description: cleanString(body.description) || null,
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
    return serializeRequisition(full);
  }

  async updateUtilizationOverview(id: string, user: JwtPayload, body: Record<string, unknown>) {
    const requisition = await this.prisma.requisitions.findUnique({ where: { id: BigInt(id) } });
    if (!requisition) {
      throw new NotFoundException({ msg: 'Not found' });
    }

    const phase = cleanString(body.phase) || requisition.land_utilization_phase || '';
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
          land_utilization_summary:
            cleanString(body.summary) || requisition.land_utilization_summary || '',
          land_utilization_next_milestone:
            cleanString(body.nextMilestone) || requisition.land_utilization_next_milestone || '',
          land_utilization_updated_by: BigInt(user.userId),
          land_utilization_updated_at: now,
          last_updated: now,
        },
      }),
    ]);

    const full = await this.reloadRequisition(requisition.id);
    return serializeRequisition(full);
  }

  async updateCivilStructure(
    id: string,
    structureId: string,
    user: JwtPayload,
    body: Record<string, unknown>,
    files?: Express.Multer.File[],
  ) {
    const requisition = await this.prisma.requisitions.findUnique({ where: { id: BigInt(id) } });
    if (!requisition) {
      throw new NotFoundException({ msg: 'Not found' });
    }

    const structure = await this.prisma.requisition_civil_structures.findFirst({
      where: { id: BigInt(structureId), requisition_id: requisition.id },
    });
    if (!structure) {
      throw new NotFoundException({ msg: 'Structure not found' });
    }

    const updates: Prisma.requisition_civil_structuresUpdateInput = {
      users: { connect: { id: BigInt(user.userId) } },
      updated_at: new Date(),
    };

    if (Object.prototype.hasOwnProperty.call(body, 'name')) {
      const updatedName = cleanString(body.name);
      if (!updatedName) {
        throw new BadRequestException({ msg: 'Structure name cannot be empty.' });
      }
      updates.name = updatedName;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'category')) {
      updates.category = cleanString(body.category);
    }
    if (Object.prototype.hasOwnProperty.call(body, 'status')) {
      updates.status = cleanString(body.status) || structure.status;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'description')) {
      updates.description = cleanString(body.description);
    }
    if (Object.prototype.hasOwnProperty.call(body, 'attributes')) {
      updates.attributes = parseJsonField(
        body.attributes,
        (structure.attributes as Record<string, unknown>) || {},
      ) as Prisma.InputJsonValue;
    }

    const keepPhotos = parseJsonField(body.keepPhotos, [] as string[]);
    const keepSet = new Set<string>(
      Array.isArray(keepPhotos) ? keepPhotos.map((item) => String(item)) : [],
    );
    const existingPhotos = Array.isArray(structure.photos) ? (structure.photos as string[]) : [];
    const retained = existingPhotos.filter((photo) => keepSet.has(photo));
    const removed = existingPhotos.filter((photo) => !keepSet.has(photo));
    const newPhotos = (files || []).map((file) => file.filename);
    updates.photos = [...retained, ...newPhotos];
    await this.deleteFilesQuietly(removed);

    const currentGallery = Array.isArray(requisition.land_utilization_gallery)
      ? (requisition.land_utilization_gallery as string[])
      : [];
    const gallery = Array.from(
      new Set([...currentGallery.filter((photo) => !removed.includes(photo)), ...newPhotos]),
    );

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
          remarks: (updates.name as string) || structure.name,
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
    return serializeRequisition(full);
  }

  async updateMachinery(
    id: string,
    machineryId: string,
    user: JwtPayload,
    body: Record<string, unknown>,
    files?: Express.Multer.File[],
  ) {
    const requisition = await this.prisma.requisitions.findUnique({ where: { id: BigInt(id) } });
    if (!requisition) {
      throw new NotFoundException({ msg: 'Not found' });
    }

    const machinery = await this.prisma.requisition_machinery.findFirst({
      where: { id: BigInt(machineryId), requisition_id: requisition.id },
    });
    if (!machinery) {
      throw new NotFoundException({ msg: 'Machinery not found' });
    }

    const updates: Prisma.requisition_machineryUpdateInput = {
      users: { connect: { id: BigInt(user.userId) } },
      updated_at: new Date(),
    };

    if (Object.prototype.hasOwnProperty.call(body, 'name')) {
      const updatedName = cleanString(body.name);
      if (!updatedName) {
        throw new BadRequestException({ msg: 'Machinery name cannot be empty.' });
      }
      updates.name = updatedName;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'type')) {
      updates.type = cleanString(body.type);
    }
    if (Object.prototype.hasOwnProperty.call(body, 'status')) {
      updates.status = cleanString(body.status) || machinery.status;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'capacity')) {
      updates.capacity = cleanString(body.capacity);
    }
    if (Object.prototype.hasOwnProperty.call(body, 'manufacturer')) {
      updates.manufacturer = cleanString(body.manufacturer);
    }
    if (Object.prototype.hasOwnProperty.call(body, 'attributes')) {
      updates.attributes = parseJsonField(
        body.attributes,
        (machinery.attributes as Record<string, unknown>) || {},
      ) as Prisma.InputJsonValue;
    }

    const keepPhotos = parseJsonField(body.keepPhotos, [] as string[]);
    const keepSet = new Set<string>(
      Array.isArray(keepPhotos) ? keepPhotos.map((item) => String(item)) : [],
    );
    const existingPhotos = Array.isArray(machinery.photos) ? (machinery.photos as string[]) : [];
    const retained = existingPhotos.filter((photo) => keepSet.has(photo));
    const removed = existingPhotos.filter((photo) => !keepSet.has(photo));
    const newPhotos = (files || []).map((file) => file.filename);
    updates.photos = [...retained, ...newPhotos];
    await this.deleteFilesQuietly(removed);

    const currentGallery = Array.isArray(requisition.land_utilization_gallery)
      ? (requisition.land_utilization_gallery as string[])
      : [];
    const gallery = Array.from(
      new Set([...currentGallery.filter((photo) => !removed.includes(photo)), ...newPhotos]),
    );

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
          remarks: (updates.name as string) || machinery.name,
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
    return serializeRequisition(full);
  }

  async addUtilizationProgress(
    id: string,
    user: JwtPayload,
    body: Record<string, unknown>,
    files?: Express.Multer.File[],
  ) {
    const status = cleanString(body.status);
    if (!status) {
      throw new BadRequestException({ msg: 'Progress status is required.' });
    }

    const requisition = await this.prisma.requisitions.findUnique({ where: { id: BigInt(id) } });
    if (!requisition) {
      throw new NotFoundException({ msg: 'Not found' });
    }

    const description = cleanString(body.description);
    const progressDateRaw = cleanString(body.progressDate);
    const progressDate = progressDateRaw ? new Date(progressDateRaw) : new Date();
    const percentageRaw = body.completionPercentage;
    const percentageNum =
      percentageRaw === undefined || percentageRaw === null ? null : Number(percentageRaw);
    const completionPercentage = Number.isFinite(percentageNum)
      ? Math.min(100, Math.max(0, Number((percentageNum as number).toFixed(2))))
      : undefined;
    const attachments = (files || []).map((file) => file.filename);
    const gallery = Array.from(
      new Set([...(Array.isArray(requisition.land_utilization_gallery) ? (requisition.land_utilization_gallery as string[]) : []), ...attachments]),
    );
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
    return serializeRequisition(full);
  }

  async streamDueDiligencePdf(id: string, res: Response) {
    const row = await this.prisma.requisitions.findUnique({
      where: { id: BigInt(id) },
      include: REQUISITION_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException({ msg: 'Requisition not found.' });
    }
    try {
      const serialized = serializeRequisition(row) as Record<string, unknown>;
      this.pdfService.streamDueDiligencePdf(serialized, res);
    } catch (err) {
      if (!res.headersSent) {
        throw new InternalServerErrorException({
          msg: 'Unable to generate Due Diligence PDF.',
          error: (err as Error).message,
        });
      }
    }
  }

  async streamWorkflowPdf(id: string, res: Response) {
    const row = await this.prisma.requisitions.findUnique({
      where: { id: BigInt(id) },
      include: REQUISITION_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException({ msg: 'Requisition not found.' });
    }
    try {
      const serialized = serializeRequisition(row) as Record<string, unknown>;
      this.pdfService.streamWorkflowPdf(serialized, res);
    } catch (err) {
      if (!res.headersSent) {
        throw new InternalServerErrorException({
          msg: 'Unable to prepare requisition PDF.',
          error: (err as Error).message,
        });
      }
    }
  }

  private async forwardWorkflow(
    id: string,
    user: JwtPayload,
    options: {
      expectedStatus: string;
      expectedStatusMessage: string;
      nextStatus: string;
      action: string;
      fallbackRoles: string[];
      defaultRemarks: string;
      officerId?: unknown;
      remarks?: unknown;
      queueMessage?: string;
      notAssignedMessage?: string;
      noOfficerMessage: string;
      checkDmQueue?: boolean;
    },
  ) {
    const remarksText = ensureRemarks(options.remarks, options.defaultRemarks);
    const requisition = await this.prisma.requisitions.findUnique({ where: { id: BigInt(id) } });
    if (!requisition) {
      throw new NotFoundException({ msg: 'Not found' });
    }
    if (!statusIn(requisition.status, options.expectedStatus)) {
      throw new BadRequestException({ msg: options.expectedStatusMessage });
    }

    const isSuperAdmin = user?.role === 'Super Admin';
    const currentAssignee = resolveId(requisition.assigned_to);
    if (options.checkDmQueue) {
      if (!isSuperAdmin && currentAssignee && currentAssignee !== resolveId(user.userId)) {
        throw new ForbiddenException({ msg: options.queueMessage || 'Forbidden' });
      }
    } else if (!isSuperAdmin && currentAssignee !== resolveId(user.userId)) {
      throw new ForbiddenException({
        msg: options.notAssignedMessage || 'This requisition is not assigned to you.',
      });
    }

    const targetOfficerId = await this.pickOfficerId(options.officerId, options.fallbackRoles);
    if (!targetOfficerId) {
      throw new NotFoundException({ msg: options.noOfficerMessage });
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
    return serializeRequisition(full);
  }

  dmForwardBcc(id: string, user: JwtPayload, body: { officerId?: unknown; remarks?: unknown }) {
    return this.forwardWorkflow(id, user, {
      expectedStatus: WORKFLOW_STATUSES.PENDING_DM,
      expectedStatusMessage: 'Case is not awaiting DM review.',
      nextStatus: WORKFLOW_STATUSES.PENDING_BCC,
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

  bccForwardTm(id: string, user: JwtPayload, body: { officerId?: unknown; remarks?: unknown }) {
    return this.forwardWorkflow(id, user, {
      expectedStatus: WORKFLOW_STATUSES.PENDING_BCC,
      expectedStatusMessage: 'Case is not awaiting BCC officer review.',
      nextStatus: WORKFLOW_STATUSES.PENDING_TM,
      action: 'Forwarded to TM',
      fallbackRoles: ['Tehsil Manager'],
      defaultRemarks: 'Forwarded to Tehsil Manager.',
      officerId: body.officerId,
      remarks: body.remarks,
      noOfficerMessage: 'No Tehsil Manager available for assignment.',
    });
  }

  tmForwardChief(id: string, user: JwtPayload, body: { officerId?: unknown; remarks?: unknown }) {
    return this.forwardWorkflow(id, user, {
      expectedStatus: WORKFLOW_STATUSES.PENDING_TM,
      expectedStatusMessage: 'Case is not awaiting TM review.',
      nextStatus: WORKFLOW_STATUSES.PENDING_CHIEF,
      action: 'Forwarded to BCC Specialist',
      fallbackRoles: ['BCC Specialist'],
      defaultRemarks: 'Forwarded to BCC Specialist.',
      officerId: body.officerId,
      remarks: body.remarks,
      noOfficerMessage: 'No BCC Specialist available for assignment.',
    });
  }

  chiefForwardBcc(id: string, user: JwtPayload, body: { officerId?: unknown; remarks?: unknown }) {
    return this.forwardWorkflow(id, user, {
      expectedStatus: WORKFLOW_STATUSES.PENDING_CHIEF,
      expectedStatusMessage: 'Case is not awaiting BCC Specialist review.',
      nextStatus: WORKFLOW_STATUSES.PENDING_WB_DISPATCH,
      action: 'Sent to BCC for WB dispatch',
      fallbackRoles: ['BCC Officer Tehsil', 'BCC Officer'],
      defaultRemarks: 'Returned to BCC officer for WB dispatch.',
      officerId: body.officerId,
      remarks: body.remarks,
      noOfficerMessage: 'No BCC officer available for assignment.',
    });
  }

  bccForwardWb(id: string, user: JwtPayload, body: { officerId?: unknown; remarks?: unknown }) {
    return this.forwardWorkflow(id, user, {
      expectedStatus: WORKFLOW_STATUSES.PENDING_WB_DISPATCH,
      expectedStatusMessage: 'Case is not ready for WB dispatch.',
      nextStatus: WORKFLOW_STATUSES.PENDING_WB_APPROVAL,
      action: 'Forwarded to WB User',
      fallbackRoles: ['WB User'],
      defaultRemarks: 'Forwarded to WB user.',
      officerId: body.officerId,
      remarks: body.remarks,
      noOfficerMessage: 'No WB user available for assignment.',
    });
  }

  wbApprove(id: string, user: JwtPayload, body: { officerId?: unknown; remarks?: unknown }) {
    return this.forwardWorkflow(id, user, {
      expectedStatus: WORKFLOW_STATUSES.PENDING_WB_APPROVAL,
      expectedStatusMessage: 'Case is not awaiting WB approval.',
      nextStatus: WORKFLOW_STATUSES.WB_APPROVED,
      action: 'WB Approval Granted',
      fallbackRoles: ['BCC Specialist'],
      defaultRemarks: 'Approved by WB user.',
      officerId: body.officerId,
      remarks: body.remarks,
      noOfficerMessage: 'No BCC Specialist available for reassignment.',
    });
  }

  chiefMarkTm(id: string, user: JwtPayload, body: { officerId?: unknown; remarks?: unknown }) {
    return this.forwardWorkflow(id, user, {
      expectedStatus: WORKFLOW_STATUSES.WB_APPROVED,
      expectedStatusMessage: 'Case is not in WB approved state.',
      nextStatus: WORKFLOW_STATUSES.MARKED_TO_TM,
      action: 'Marked to TM',
      fallbackRoles: ['Tehsil Manager'],
      defaultRemarks: 'Marked back to TM.',
      officerId: body.officerId,
      remarks: body.remarks,
      noOfficerMessage: 'No Tehsil Manager available for assignment.',
    });
  }

  tmForwardBccClosure(id: string, user: JwtPayload, body: { officerId?: unknown; remarks?: unknown }) {
    return this.forwardWorkflow(id, user, {
      expectedStatus: WORKFLOW_STATUSES.MARKED_TO_TM,
      expectedStatusMessage: 'Case is not marked to TM.',
      nextStatus: WORKFLOW_STATUSES.PENDING_BCC_CLOSURE,
      action: 'Forwarded to BCC for closure',
      fallbackRoles: ['BCC Officer Tehsil', 'BCC Officer'],
      defaultRemarks: 'Forwarded to BCC officer for closure.',
      officerId: body.officerId,
      remarks: body.remarks,
      noOfficerMessage: 'No BCC officer available for closure.',
    });
  }

  async bccClose(id: string, user: JwtPayload, body: { remarks?: unknown }) {
    const remarksText = ensureRemarks(body.remarks, 'Case closed by BCC officer.');
    const requisition = await this.prisma.requisitions.findUnique({ where: { id: BigInt(id) } });
    if (!requisition) {
      throw new NotFoundException({ msg: 'Not found' });
    }
    if (!statusIn(requisition.status, WORKFLOW_STATUSES.PENDING_BCC_CLOSURE)) {
      throw new BadRequestException({ msg: 'Case is not in BCC closure stage.' });
    }
    const isSuperAdmin = user?.role === 'Super Admin';
    if (!isSuperAdmin && resolveId(requisition.assigned_to) !== resolveId(user.userId)) {
      throw new ForbiddenException({ msg: 'This requisition is not assigned to you.' });
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
          status: WORKFLOW_STATUSES.CLOSED,
          assigned_to: null,
          last_updated: now,
        },
      }),
    ]);

    const full = await this.reloadRequisition(requisition.id);
    return serializeRequisition(full);
  }

  async revert(
    id: string,
    user: JwtPayload,
    body: { remarks?: unknown; toStatus?: unknown; officerId?: unknown },
  ) {
    const remarksText = (body.remarks || '').toString().trim();
    if (!remarksText) {
      throw new BadRequestException({ msg: 'Remarks are required to revert a requisition.' });
    }

    const requisition = await this.prisma.requisitions.findUnique({ where: { id: BigInt(id) } });
    if (!requisition) {
      throw new NotFoundException({ msg: 'Not found' });
    }

    const targetStatusRaw = (body.toStatus || '').toString().trim();
    const normalizedTarget = normalizeStatus(targetStatusRaw);
    const matchedStatus = normalizedTarget
      ? WORKFLOW_STATUS_LIST.find((status) => normalizeStatus(status) === normalizedTarget)
      : null;
    const effectiveStatus = matchedStatus || (targetStatusRaw || 'Reverted');
    const assignmentRoles = matchedStatus
      ? WORKFLOW_ASSIGNMENT_ROLES[matchedStatus] || []
      : [];

    let nextAssignedTo: bigint | null = requisition.assigned_to;
    if (matchedStatus === WORKFLOW_STATUSES.CLOSED) {
      nextAssignedTo = null;
    } else if (assignmentRoles.length) {
      const resolvedAssignee = await this.pickOfficerId(body.officerId, assignmentRoles);
      if (!resolvedAssignee) {
        throw new BadRequestException({
          msg: `Unable to revert to ${matchedStatus}: no eligible officer available for reassignment.`,
        });
      }
      nextAssignedTo = BigInt(resolvedAssignee);
    } else if (body.officerId) {
      const resolvedManualId = resolveId(body.officerId);
      if (resolvedManualId) {
        nextAssignedTo = BigInt(resolvedManualId);
      }
    } else if (!matchedStatus) {
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
    return serializeRequisition(full);
  }
}
