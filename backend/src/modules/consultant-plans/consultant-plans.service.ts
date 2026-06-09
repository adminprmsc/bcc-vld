import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, users_role } from '@prisma/client';
import { JwtPayload } from '../../common/security/jwt.strategy';
import { roleMatches } from '../../common/security/role-synonyms';
import { TehsilScopeService } from '../../domain/tehsil-scope/tehsil-scope.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ASSET_DEFINITIONS,
  CONSULTANT_CREATOR_ROLES,
  DEFAULT_LAYER_NAME,
  MAINTENANCE_ROLES,
  MANAGE_ROLES,
  READ_ROLES,
  WRITE_ROLES,
} from './consultant-plans.constants';
import {
  applyMaintenanceMetadata,
  escapeLike,
  mapUploadedFiles,
  parseAttributes,
  parseFeature,
  parsePlanAttachments,
  planToFeature,
  resolveAssetDefinition,
  resolveIntId,
  safeString,
  serializePlan,
  withFeatureProperties,
} from './consultant-plans.mapper';

const PLAN_INCLUDE = {
  users_consultant_plans_created_byTousers: { select: { id: true, name: true, role: true } },
  users_consultant_plans_updated_byTousers: { select: { id: true, name: true, role: true } },
  consultant_plan_attachments: true,
  consultant_plan_maintenance_records: true,
} satisfies Prisma.consultant_plansInclude;

type ListQuery = {
  tehsil?: string;
  district?: string;
  category?: string;
  assetType?: string;
  requisitionId?: string;
  search?: string;
  format?: string;
};

@Injectable()
export class ConsultantPlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tehsilScope: TehsilScopeService,
  ) {}

  getDefinitions() {
    return ASSET_DEFINITIONS;
  }

  processUpload(files: Express.Multer.File[]) {
    const attachments = mapUploadedFiles(files);
    return { attachments };
  }

  async listPlans(user: JwtPayload, query: ListQuery) {
    try {
      const role = user?.role || '';
      const userId = user?.userId;
      const tehsilScope = await this.tehsilScope.resolveUserTehsils(user);

      if (
        this.tehsilScope.needsTehsilScope(role) &&
        tehsilScope.length === 0 &&
        role !== 'Tehsil Manager'
      ) {
        return [];
      }

      if (
        query.tehsil &&
        tehsilScope.length &&
        !this.tehsilScope.tehsilMatches(tehsilScope, query.tehsil)
      ) {
        return [];
      }

      const queryPromises: ReturnType<ConsultantPlansService['fetchConsultantPlans']>[] = [];
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
      const planMap = new Map<string, Awaited<ReturnType<typeof this.fetchConsultantPlans>>[number]>();
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

      return combined.map((plan) => serializePlan(plan));
    } catch (err) {
      throw new InternalServerErrorException({
        msg: 'Server error',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async getLayers(user: JwtPayload, query: ListQuery) {
    try {
      const tehsilScope = await this.tehsilScope.resolveUserTehsils(user);
      if (this.tehsilScope.needsTehsilScope(user?.role) && tehsilScope.length === 0) {
        return { layers: {} };
      }

      if (
        query.tehsil &&
        tehsilScope.length &&
        !this.tehsilScope.tehsilMatches(tehsilScope, query.tehsil)
      ) {
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

      const features = plans.map((plan) => planToFeature(plan)).filter(Boolean);
      const format = safeString(query.format).toLowerCase();
      if (format === 'geojson') {
        return { type: 'FeatureCollection', features };
      }

      const grouped: Record<string, NonNullable<ReturnType<typeof planToFeature>>[]> = {};
      features.forEach((feature) => {
        const layerName = (feature?.properties?.layerName as string) || 'Consultant Plans';
        if (!grouped[layerName]) {
          grouped[layerName] = [];
        }
        grouped[layerName].push(feature!);
      });

      return { layers: grouped };
    } catch (err) {
      throw new InternalServerErrorException({
        msg: 'Server error',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async getPlanById(user: JwtPayload, id: string) {
    try {
      const numId = Number(id);
      if (!Number.isFinite(numId) || numId < 1) {
        throw new BadRequestException({ msg: 'Invalid plan identifier' });
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
        throw new NotFoundException({ msg: 'Plan not found' });
      }

      if (this.tehsilScope.needsTehsilScope(role)) {
        if (scopedTehsils.length === 0 || !this.tehsilScope.tehsilMatches(scopedTehsils, plan.tehsil)) {
          throw new ForbiddenException({ msg: 'Forbidden' });
        }
      }

      if (!this.canReadPlan(user, plan)) {
        throw new ForbiddenException({ msg: 'Forbidden' });
      }

      return serializePlan(plan);
    } catch (err) {
      if (err instanceof BadRequestException || err instanceof NotFoundException || err instanceof ForbiddenException) {
        throw err;
      }
      throw new InternalServerErrorException({
        msg: 'Server error',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async createPlan(user: JwtPayload, body: Record<string, unknown>) {
    try {
      const userId = user?.userId;
      const requesterRole = user?.role || '';
      if (!userId) {
        throw new UnauthorizedException({ msg: 'Session expired. Please log in again.' });
      }

      const assetDef = resolveAssetDefinition(body.assetType || body.assetLabel);
      if (!assetDef) {
        throw new BadRequestException({ msg: 'Unsupported asset type.' });
      }

      let feature;
      try {
        feature = parseFeature(body.feature);
      } catch (err) {
        throw new BadRequestException({
          msg: err instanceof Error ? err.message : 'Invalid feature payload.',
        });
      }

      let attributes: Record<string, unknown>;
      try {
        attributes = parseAttributes(body.attributes, body.attributesJson);
      } catch (err) {
        throw new BadRequestException({
          msg: err instanceof Error ? err.message : 'Attributes must be valid JSON.',
        });
      }

      const attachments = parsePlanAttachments(body.attachments);
      const featureData = withFeatureProperties(feature, assetDef);
      const now = new Date();

      const planData: Prisma.consultant_plansUncheckedCreateInput & {
        maintenance_owner?: bigint | null;
        maintenance_owner_name?: string | null;
        maintenance_owner_role?: string | null;
        feature_properties?: unknown;
      } = {
        title: safeString(body.title) || assetDef.label,
        asset_type: assetDef.value,
        asset_label: assetDef.label,
        category: assetDef.category,
        layer_name: safeString(body.layerName) || DEFAULT_LAYER_NAME,
        description: safeString(body.description),
        requisition_id: resolveIntId(body.requisition ?? body.requisitionId),
        tehsil: safeString(body.tehsil),
        district: safeString(body.district),
        feature_type: featureData.type || 'Feature',
        feature_geometry: featureData.geometry as Prisma.InputJsonValue,
        feature_properties: (featureData.properties || {}) as Prisma.InputJsonValue,
        attributes: attributes as Prisma.InputJsonValue,
        created_by: BigInt(userId),
        updated_by: BigInt(userId),
        created_at: now,
        updated_at: now,
      };

      await this.ensureMaintenanceOwner(planData, {
        forceReassign: CONSULTANT_CREATOR_ROLES.some((r) => roleMatches(requesterRole, [r])),
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

      return serializePlan(reloaded);
    } catch (err) {
      if (
        err instanceof BadRequestException ||
        err instanceof UnauthorizedException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      throw new InternalServerErrorException({
        msg: 'Server error',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async updatePlan(user: JwtPayload, id: string, body: Record<string, unknown>) {
    try {
      const numId = Number(id);
      if (!Number.isFinite(numId) || numId < 1) {
        throw new BadRequestException({ msg: 'Invalid plan identifier' });
      }

      const plan = await this.prisma.consultant_plans.findUnique({
        where: { id: BigInt(numId) },
      });
      if (!plan) {
        throw new NotFoundException({ msg: 'Plan not found' });
      }
      if (!this.canModify(user, plan)) {
        throw new ForbiddenException({ msg: 'Forbidden' });
      }

      const userId = user?.userId;
      if (!userId) {
        throw new UnauthorizedException({ msg: 'Session expired. Please log in again.' });
      }

      const requesterRole = user?.role || '';
      const isMaintenanceManager = MAINTENANCE_ROLES.some((r) => roleMatches(requesterRole, [r]));
      const originalTehsil = plan.tehsil || '';
      let tehsilChanged = false;
      let maintenanceTouched = false;

      const updateData: Prisma.consultant_plansUncheckedUpdateInput = {};

      if (body.assetType || body.assetLabel) {
        const assetDef = resolveAssetDefinition(body.assetType || body.assetLabel);
        if (!assetDef) {
          throw new BadRequestException({ msg: 'Unsupported asset type.' });
        }
        updateData.asset_type = assetDef.value;
        updateData.asset_label = assetDef.label;
        updateData.category = assetDef.category;
        const currentFeature = {
          type: plan.feature_type || 'Feature',
          geometry: plan.feature_geometry,
          properties:
            plan.feature_properties &&
            typeof plan.feature_properties === 'object' &&
            !Array.isArray(plan.feature_properties)
              ? (plan.feature_properties as Record<string, unknown>)
              : {},
        };
        const updated = withFeatureProperties(currentFeature, assetDef);
        updateData.feature_type = updated.type || 'Feature';
        updateData.feature_geometry = updated.geometry as Prisma.InputJsonValue;
        updateData.feature_properties = (updated.properties || {}) as Prisma.InputJsonValue;
      }

      if (Object.prototype.hasOwnProperty.call(body, 'title')) {
        const title = safeString(body.title);
        updateData.title = title || plan.asset_label;
      }

      if (Object.prototype.hasOwnProperty.call(body, 'description')) {
        updateData.description = safeString(body.description);
      }

      if (
        Object.prototype.hasOwnProperty.call(body, 'requisition') ||
        Object.prototype.hasOwnProperty.call(body, 'requisitionId')
      ) {
        updateData.requisition_id = resolveIntId(body.requisition ?? body.requisitionId);
      }

      if (Object.prototype.hasOwnProperty.call(body, 'tehsil')) {
        const nextTehsil = safeString(body.tehsil);
        if (nextTehsil !== originalTehsil) {
          tehsilChanged = true;
        }
        updateData.tehsil = nextTehsil;
      }

      if (Object.prototype.hasOwnProperty.call(body, 'district')) {
        updateData.district = safeString(body.district);
      }

      if (Object.prototype.hasOwnProperty.call(body, 'layerName')) {
        updateData.layer_name = safeString(body.layerName) || plan.layer_name;
      }

      if (Object.prototype.hasOwnProperty.call(body, 'feature')) {
        let updatedFeature;
        try {
          updatedFeature = parseFeature(body.feature);
        } catch (err) {
          throw new BadRequestException({
            msg: err instanceof Error ? err.message : 'Invalid feature payload.',
          });
        }
        const finalFeature = withFeatureProperties(updatedFeature, {
          value: plan.asset_type,
          label: plan.asset_label,
          category: plan.category,
        });
        updateData.feature_type = finalFeature.type || 'Feature';
        updateData.feature_geometry = finalFeature.geometry as Prisma.InputJsonValue;
        updateData.feature_properties = (finalFeature.properties || {}) as Prisma.InputJsonValue;
      }

      if (
        Object.prototype.hasOwnProperty.call(body, 'attributes') ||
        Object.prototype.hasOwnProperty.call(body, 'attributesJson')
      ) {
        try {
          updateData.attributes = parseAttributes(body.attributes, body.attributesJson) as Prisma.InputJsonValue;
        } catch (err) {
          throw new BadRequestException({
            msg: err instanceof Error ? err.message : 'Attributes must be valid JSON.',
          });
        }
      }

      if (Object.prototype.hasOwnProperty.call(body, 'attachments')) {
        const attachments = parsePlanAttachments(body.attachments);
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
          throw new ForbiddenException({ msg: 'Forbidden' });
        }
        const ownerId = resolveIntId(body.maintenanceOwner);
        if (ownerId) {
          const manager = await this.prisma.users.findFirst({
            where: { id: ownerId, role: users_role.Tehsil_Manager },
            select: { id: true, name: true, role: true },
          });
          if (!manager) {
            throw new BadRequestException({ msg: 'Maintenance owner must be a Tehsil Manager.' });
          }
          updateData.maintenance_owner = manager.id;
          updateData.maintenance_owner_name = manager.name || 'Tehsil Manager';
          updateData.maintenance_owner_role = 'Tehsil Manager';
        } else {
          updateData.maintenance_owner = null;
          updateData.maintenance_owner_name = 'Tehsil Manager';
          updateData.maintenance_owner_role = 'Tehsil Manager';
        }
        maintenanceTouched = true;
      }

      if (Object.prototype.hasOwnProperty.call(body, 'maintenanceOwnerName')) {
        if (!isMaintenanceManager) {
          throw new ForbiddenException({ msg: 'Forbidden' });
        }
        updateData.maintenance_owner_name = safeString(body.maintenanceOwnerName) || 'Tehsil Manager';
        maintenanceTouched = true;
      }

      if (Object.prototype.hasOwnProperty.call(body, 'maintenanceOwnerRole')) {
        updateData.maintenance_owner_role = 'Tehsil Manager';
        maintenanceTouched = true;
      }

      const mergedPlan = { ...plan, ...updateData } as typeof plan & typeof updateData;
      await this.ensureMaintenanceOwner(mergedPlan, {
        forceReassign: tehsilChanged && !maintenanceTouched,
        creatorRole: requesterRole,
        creatorId: userId,
      });

      updateData.maintenance_owner = mergedPlan.maintenance_owner ?? null;
      updateData.maintenance_owner_name = mergedPlan.maintenance_owner_name;
      updateData.maintenance_owner_role = mergedPlan.maintenance_owner_role;
      updateData.feature_properties = mergedPlan.feature_properties as Prisma.InputJsonValue;
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

      return serializePlan(reloaded);
    } catch (err) {
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException ||
        err instanceof ForbiddenException ||
        err instanceof UnauthorizedException
      ) {
        throw err;
      }
      throw new InternalServerErrorException({
        msg: 'Server error',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async deletePlan(user: JwtPayload, id: string) {
    try {
      const numId = Number(id);
      if (!Number.isFinite(numId) || numId < 1) {
        throw new BadRequestException({ msg: 'Invalid plan identifier' });
      }

      const plan = await this.prisma.consultant_plans.findUnique({
        where: { id: BigInt(numId) },
      });
      if (!plan) {
        throw new NotFoundException({ msg: 'Plan not found' });
      }
      if (!this.canModify(user, plan)) {
        throw new ForbiddenException({ msg: 'Forbidden' });
      }

      await this.prisma.consultant_plans.delete({ where: { id: plan.id } });
      return { msg: 'Plan removed successfully' };
    } catch (err) {
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      throw new InternalServerErrorException({
        msg: 'Server error',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  assertCanRead(role: string) {
    if (!READ_ROLES.some((r) => roleMatches(role, [r]))) {
      throw new ForbiddenException({ msg: 'Forbidden' });
    }
  }

  assertCanWrite(role: string) {
    if (!WRITE_ROLES.some((r) => roleMatches(role, [r]))) {
      throw new ForbiddenException({ msg: 'Forbidden' });
    }
  }

  private buildFilter(
    user: JwtPayload,
    query: ListQuery,
    tehsilScope: string[],
  ): Prisma.consultant_plansWhereInput {
    const role = user?.role || '';
    const userId = user?.userId;
    const andFilters: Prisma.consultant_plansWhereInput[] = [];
    const filter: Prisma.consultant_plansWhereInput = {};

    if (role === 'EDCS Consultant' || role === 'EDCS User') {
      if (userId) {
        filter.created_by = BigInt(userId);
      }
    }

    const scopedQuery = this.tehsilScope.buildTehsilScopePrismaFilter<Prisma.consultant_plansWhereInput>(
      tehsilScope,
      'tehsil',
    );
    if (scopedQuery) {
      andFilters.push(scopedQuery);
    }

    if (query.tehsil) {
      andFilters.push({ tehsil: { contains: escapeLike(query.tehsil) } });
    }
    if (query.district) {
      andFilters.push({ district: { contains: escapeLike(query.district) } });
    }
    if (query.category) {
      andFilters.push({ category: escapeLike(query.category) });
    }
    if (query.assetType) {
      const assetDef = resolveAssetDefinition(query.assetType);
      if (assetDef) {
        filter.asset_type = assetDef.value;
      } else {
        andFilters.push({ asset_type: { contains: escapeLike(query.assetType) } });
      }
    }
    if (query.requisitionId) {
      const numReqId = Number(query.requisitionId);
      if (Number.isFinite(numReqId) && numReqId > 0) {
        filter.requisition_id = BigInt(numReqId);
      }
    }
    if (query.search) {
      const search = escapeLike(query.search);
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

  private fetchConsultantPlans(where: Prisma.consultant_plansWhereInput) {
    return this.prisma.consultant_plans.findMany({
      where,
      include: PLAN_INCLUDE,
      orderBy: [{ updated_at: 'desc' }, { created_at: 'desc' }],
    });
  }

  private canModify(
    user: JwtPayload,
    plan: { created_by: bigint },
  ): boolean {
    const role = user?.role || '';
    if (MANAGE_ROLES.some((r) => roleMatches(role, [r]))) {
      return true;
    }
    if (role === 'EDCS Consultant' || role === 'EDCS User') {
      return String(plan.created_by) === String(user.userId);
    }
    return false;
  }

  private canReadPlan(user: JwtPayload, plan: { created_by: bigint }): boolean {
    const role = user?.role || '';
    if (MANAGE_ROLES.some((r) => roleMatches(role, [r]))) {
      return true;
    }
    if (role === 'EDCS Consultant' || role === 'EDCS User') {
      return String(plan.created_by) === String(user.userId);
    }
    return READ_ROLES.some((r) => roleMatches(role, [r]));
  }

  private async ensureMaintenanceOwner(
    planDoc: {
      tehsil?: string | null;
      maintenance_owner?: bigint | null;
      maintenance_owner_name?: string | null;
      maintenance_owner_role?: string | null;
      feature_properties?: unknown;
    },
    options: { forceReassign?: boolean; creatorRole?: string; creatorId?: number | string | null } = {},
  ) {
    if (!planDoc) {
      return;
    }
    const { forceReassign = false, creatorRole = '', creatorId = null } = options;
    const normalisedCreatorRole = safeString(creatorRole);
    planDoc.maintenance_owner_role = 'Tehsil Manager';

    if (normalisedCreatorRole === 'Tehsil Manager' && creatorId) {
      const manager = await this.prisma.users.findFirst({
        where: { id: BigInt(creatorId), role: users_role.Tehsil_Manager },
        select: { id: true, name: true, role: true },
      });
      if (manager) {
        planDoc.maintenance_owner = manager.id;
        planDoc.maintenance_owner_name = manager.name || 'Tehsil Manager';
        applyMaintenanceMetadata(planDoc);
        return;
      }
    }

    if (forceReassign || !planDoc.maintenance_owner) {
      const manager = await this.findTehsilManager(planDoc.tehsil);
      if (manager) {
        planDoc.maintenance_owner = manager.id;
        planDoc.maintenance_owner_name = manager.name || 'Tehsil Manager';
      } else if (!planDoc.maintenance_owner_name) {
        planDoc.maintenance_owner_name = 'Tehsil Manager';
      }
    }

    applyMaintenanceMetadata(planDoc);
  }

  private async findTehsilManager(tehsil: string | null | undefined) {
    const text = safeString(tehsil);
    const baseSelect = { id: true, name: true, role: true } as const;

    if (text) {
      const exact = await this.prisma.users.findFirst({
        where: {
          role: users_role.Tehsil_Manager,
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
          role: users_role.Tehsil_Manager,
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
      where: { role: users_role.Tehsil_Manager, active_status: 'active' },
      select: baseSelect,
      orderBy: { id: 'asc' },
    });
    if (active) {
      return active;
    }

    return this.prisma.users.findFirst({
      where: { role: users_role.Tehsil_Manager },
      select: baseSelect,
      orderBy: { id: 'asc' },
    });
  }
}
