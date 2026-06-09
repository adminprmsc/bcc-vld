import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  users_role,
  water_quality_sample_attachments_attachment_type,
  water_quality_sample_status_history_code,
  water_quality_samples_status,
} from '@prisma/client';
import { JwtPayload } from '../../common/security/jwt.strategy';
import { computePotabilityIndex } from '../../domain/water-quality/water-quality.domain';
import { TehsilScopeService } from '../../domain/tehsil-scope/tehsil-scope.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  MANAGER_ROLES,
  PCRWR_LAB_ROLES,
  PCRWR_ROLES,
  PCRWR_SAMPLER_ROLES,
  RA_ROLES,
} from './water-quality.constants';
import {
  buildStatusEvent,
  canCreate,
  canReadSample,
  escapeLike,
  isValidId,
  labelForRating,
  limitInt,
  normalizeLabMetrics,
  parseCoords,
  parseDate,
  parseId,
  parseMetrics,
  safeString,
} from './water-quality.helpers';
import {
  decorateAttachment,
  sampleInclude,
  sampleIncludeDetailed,
  serializeSample,
} from './water-quality.mapper';
import { storedNameForFile } from './water-quality-upload';

type Actor = JwtPayload & { name: string };

@Injectable()
export class WaterQualityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tehsilScope: TehsilScopeService,
  ) {}

  async list(
    user: JwtPayload,
    query: { planId?: string; status?: string; tehsil?: string; limit?: string },
  ) {
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
      include: sampleInclude,
      orderBy: [{ updated_at: 'desc' }, { created_at: 'desc' }],
      take: limitInt(query.limit, 200),
    });

    return samples.map((sample) => serializeSample(sample));
  }

  async getById(id: string, user: JwtPayload) {
    if (!isValidId(id)) {
      throw new BadRequestException({ msg: 'Invalid sample identifier' });
    }

    const sample = await this.prisma.water_quality_samples.findUnique({
      where: { id: BigInt(id) },
      include: sampleIncludeDetailed,
    });
    if (!sample) {
      throw new NotFoundException({ msg: 'Sample not found' });
    }

    const role = user?.role || '';
    if (this.tehsilScope.needsTehsilScope(role)) {
      const tehsilScope = await this.tehsilScope.resolveUserTehsils(user);
      const tehsil =
        sample.plan_snapshot_tehsil || sample.consultant_plans?.tehsil || '';
      if (tehsilScope.length === 0 || !this.tehsilScope.tehsilMatches(tehsilScope, tehsil)) {
        throw new ForbiddenException({ msg: 'Forbidden' });
      }
    }
    if (!canReadSample(user, sample)) {
      throw new ForbiddenException({ msg: 'Forbidden' });
    }

    return serializeSample(sample);
  }

  async create(user: JwtPayload, body: { planId?: string | number; reason?: string }) {
    if (!canCreate(user?.role)) {
      throw new ForbiddenException({ msg: 'Forbidden' });
    }

    if (!isValidId(body.planId)) {
      throw new NotFoundException({ msg: 'Linked asset not found' });
    }

    const plan = await this.prisma.consultant_plans.findUnique({
      where: { id: BigInt(body.planId as string | number) },
    });
    if (!plan) {
      throw new NotFoundException({ msg: 'Linked asset not found' });
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
        status: water_quality_samples_status.awaiting_assignment,
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
        ...buildStatusEvent(
          water_quality_sample_status_history_code.critical_flagged,
          actor,
          'Critical asset flagged',
        ),
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
        critical_reason:
          safeString(body.reason) || 'Flagged for water quality sampling',
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
      include: sampleInclude,
    });

    return serializeSample(fullSample!);
  }

  async assign(id: string, user: JwtPayload, body: { samplerId?: string | number }) {
    this.ensureRole(user, RA_ROLES);

    const sample = await this.fetchEditableSample(id, user);
    if (['closed', 'cancelled', 'results_ready', 'in_lab'].includes(sample.status || '')) {
      throw new ConflictException({ msg: 'Sample has already moved past assignment.' });
    }
    if (!['awaiting_assignment', 'awaiting_collection'].includes(sample.status || '')) {
      throw new ConflictException({ msg: 'Sample is not in a state that allows assignment.' });
    }

    const samplerId = parseId(body.samplerId);
    if (!samplerId) {
      throw new BadRequestException({ msg: 'Sampler is required' });
    }

    const sampler = await this.prisma.users.findFirst({
      where: { id: BigInt(samplerId), role: users_role.PCRWR_Sampler },
      select: { id: true, name: true, role: true },
    });
    if (!sampler) {
      throw new BadRequestException({ msg: 'Sampler not found or not PCRWR Sampler' });
    }

    const actor = await this.resolveActor(user);
    const now = new Date();

    await this.prisma.water_quality_samples.update({
      where: { id: sample.id },
      data: {
        assigned_sampler: sampler.id,
        assigned_sampler_name: sampler.name || 'PCRWR Sampler',
        assigned_at: now,
        status: water_quality_samples_status.awaiting_collection,
        updated_by: BigInt(actor.userId),
        updated_by_name: actor.name,
        updated_at: now,
      },
    });

    await this.prisma.water_quality_sample_status_history.create({
      data: {
        sample_id: sample.id,
        ...buildStatusEvent(
          water_quality_sample_status_history_code.assignment,
          actor,
          `Assigned to ${sampler.name || 'PCRWR Sampler'}`,
        ),
        created_at: now,
        updated_at: now,
      },
    });

    const fullSample = await this.prisma.water_quality_samples.findUnique({
      where: { id: sample.id },
      include: sampleInclude,
    });
    return serializeSample(fullSample!);
  }

  async updateCollection(
    id: string,
    user: JwtPayload,
    body: { collectedAt?: string; fieldNotes?: string; location?: unknown },
  ) {
    this.ensureRole(user, PCRWR_SAMPLER_ROLES);

    const sample = await this.fetchEditableSample(id, user);
    if (!['awaiting_collection', 'collecting'].includes(sample.status || '')) {
      throw new ConflictException({ msg: 'Sample is not ready for collection.' });
    }
    this.ensureSamplerOwnership(sample, user);

    const actor = await this.resolveActor(user);
    const coords = parseCoords(body.location);
    const now = new Date();
    const alreadyCollecting = sample.status === water_quality_samples_status.collecting;

    await this.prisma.water_quality_samples.update({
      where: { id: sample.id },
      data: {
        collection_collected_at: parseDate(body.collectedAt) || now,
        collection_field_notes: safeString(body.fieldNotes),
        ...(coords
          ? {
              collection_location_lat: coords.lat,
              collection_location_lng: coords.lng,
            }
          : {}),
        collection_collected_by: BigInt(actor.userId),
        collection_collected_by_name: actor.name,
        status: water_quality_samples_status.collecting,
        updated_by: BigInt(actor.userId),
        updated_by_name: actor.name,
        updated_at: now,
      },
    });

    if (!alreadyCollecting) {
      await this.prisma.water_quality_sample_status_history.create({
        data: {
          sample_id: sample.id,
          ...buildStatusEvent(
            water_quality_sample_status_history_code.collection_started,
            actor,
            'Field collection started',
          ),
          created_at: now,
          updated_at: now,
        },
      });
    }

    const fullSample = await this.prisma.water_quality_samples.findUnique({
      where: { id: sample.id },
      include: sampleInclude,
    });
    return serializeSample(fullSample!);
  }

  async completeCollection(
    id: string,
    user: JwtPayload,
    body: { collectedAt?: string; fieldNotes?: string; location?: unknown },
    files: Express.Multer.File[],
  ) {
    this.ensureRole(user, PCRWR_SAMPLER_ROLES);

    const sample = await this.fetchEditableSample(id, user);
    if (!['collecting', 'awaiting_collection'].includes(sample.status || '')) {
      throw new ConflictException({
        msg: 'Sample cannot be marked collected in its current status.',
      });
    }
    this.ensureSamplerOwnership(sample, user);

    await this.saveFileAttachments(
      sample.id,
      files,
      water_quality_sample_attachments_attachment_type.collection,
    );

    const actor = await this.resolveActor(user);
    const coords = parseCoords(body.location);
    const now = new Date();

    await this.prisma.water_quality_samples.update({
      where: { id: sample.id },
      data: {
        collection_collected_at: parseDate(body.collectedAt) || now,
        collection_field_notes: safeString(body.fieldNotes),
        ...(coords
          ? {
              collection_location_lat: coords.lat,
              collection_location_lng: coords.lng,
            }
          : {}),
        collection_collected_by: BigInt(actor.userId),
        collection_collected_by_name: actor.name,
        status: water_quality_samples_status.in_lab,
        updated_by: BigInt(actor.userId),
        updated_by_name: actor.name,
        updated_at: now,
      },
    });

    await this.prisma.water_quality_sample_status_history.create({
      data: {
        sample_id: sample.id,
        ...buildStatusEvent(
          water_quality_sample_status_history_code.collection_complete,
          actor,
          'Sample collected and dispatched',
        ),
        created_at: now,
        updated_at: now,
      },
    });

    const fullSample = await this.prisma.water_quality_samples.findUnique({
      where: { id: sample.id },
      include: sampleInclude,
    });
    return serializeSample(fullSample!);
  }

  async submitLabResults(
    id: string,
    user: JwtPayload,
    body: {
      receivedAt?: string;
      completedAt?: string;
      metrics?: unknown;
      notes?: string;
    },
    files: Express.Multer.File[],
  ) {
    this.ensureRole(user, PCRWR_LAB_ROLES);

    const sample = await this.fetchEditableSample(id, user);
    if (!['in_lab', 'results_ready'].includes(sample.status || '')) {
      throw new ConflictException({
        msg: 'Sample results can only be posted once received by the lab.',
      });
    }

    await this.saveFileAttachments(
      sample.id,
      files,
      water_quality_sample_attachments_attachment_type.lab_analysis,
    );

    const actor = await this.resolveActor(user);
    const metrics = normalizeLabMetrics(parseMetrics(body.metrics));
    const now = new Date();
    const { value, rating } = computePotabilityIndex(metrics);

    await this.prisma.water_quality_samples.update({
      where: { id: sample.id },
      data: {
        lab_analysis_received_at:
          parseDate(body.receivedAt) || sample.lab_analysis_received_at || now,
        lab_analysis_completed_at:
          parseDate(body.completedAt) || sample.lab_analysis_completed_at || now,
        lab_analysis_metrics: metrics as Prisma.InputJsonValue,
        lab_analysis_analyst: BigInt(actor.userId),
        lab_analysis_analyst_name: actor.name,
        lab_analysis_notes: safeString(body.notes),
        computed_score_index_name: 'potability-index',
        computed_score_value: value,
        computed_score_rating: rating,
        computed_score_updated_at: now,
        status: water_quality_samples_status.results_ready,
        updated_by: BigInt(actor.userId),
        updated_by_name: actor.name,
        updated_at: now,
      },
    });

    await this.prisma.water_quality_sample_status_history.create({
      data: {
        sample_id: sample.id,
        ...buildStatusEvent(
          water_quality_sample_status_history_code.results_posted,
          actor,
          'Lab results posted',
        ),
        created_at: now,
        updated_at: now,
      },
    });

    await this.prisma.consultant_plans.update({
      where: { id: sample.plan_id },
      data: {
        latest_quality_status_status: rating,
        latest_quality_status_score: value,
        latest_quality_status_label: labelForRating(rating),
        latest_quality_status_updated_at: now,
        updated_at: now,
      },
    });

    const fullSample = await this.prisma.water_quality_samples.findUnique({
      where: { id: sample.id },
      include: sampleIncludeDetailed,
    });
    return serializeSample(fullSample!);
  }

  async closeSample(id: string, user: JwtPayload, body: { note?: string }) {
    this.ensureRole(user, new Set([...PCRWR_ROLES, ...RA_ROLES, ...MANAGER_ROLES]));

    const sample = await this.fetchEditableSample(id, user);
    if (['closed', 'cancelled'].includes(sample.status || '')) {
      throw new ConflictException({ msg: 'Sample is already closed or cancelled.' });
    }

    const actor = await this.resolveActor(user);
    const note = safeString(body.note);
    const now = new Date();

    await this.prisma.water_quality_samples.update({
      where: { id: sample.id },
      data: {
        status: water_quality_samples_status.closed,
        updated_by: BigInt(actor.userId),
        updated_by_name: actor.name,
        updated_at: now,
      },
    });

    await this.prisma.water_quality_sample_status_history.create({
      data: {
        sample_id: sample.id,
        ...buildStatusEvent(
          water_quality_sample_status_history_code.closed,
          actor,
          note || 'Sample closed',
        ),
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
      include: sampleInclude,
    });
    return serializeSample(fullSample!);
  }

  async cancelSample(id: string, user: JwtPayload, body: { note?: string }) {
    this.ensureRole(user, new Set([...RA_ROLES, ...MANAGER_ROLES]));

    const sample = await this.fetchEditableSample(id, user);
    if (['closed', 'cancelled'].includes(sample.status || '')) {
      throw new ConflictException({ msg: 'Sample is already closed or cancelled.' });
    }

    const actor = await this.resolveActor(user);
    const note = safeString(body.note);
    const now = new Date();

    await this.prisma.water_quality_samples.update({
      where: { id: sample.id },
      data: {
        status: water_quality_samples_status.cancelled,
        updated_by: BigInt(actor.userId),
        updated_by_name: actor.name,
        updated_at: now,
      },
    });

    await this.prisma.water_quality_sample_status_history.create({
      data: {
        sample_id: sample.id,
        ...buildStatusEvent(
          water_quality_sample_status_history_code.cancelled,
          actor,
          note || 'Sample cancelled',
        ),
        created_at: now,
        updated_at: now,
      },
    });

    const fullSample = await this.prisma.water_quality_samples.findUnique({
      where: { id: sample.id },
      include: sampleInclude,
    });
    return serializeSample(fullSample!);
  }

  uploadAttachments(user: JwtPayload, files: Express.Multer.File[]) {
    this.ensureRole(user, PCRWR_ROLES);

    const attachments = (Array.isArray(files) ? files : []).map((file) => ({
      storedName: storedNameForFile(file.filename),
      originalName: file.originalname || '',
      mimeType: file.mimetype || '',
      size: file.size || 0,
    }));

    return { attachments: attachments.map((entry) => decorateAttachment({
      stored_name: entry.storedName,
      original_name: entry.originalName,
      mime_type: entry.mimeType,
      size: BigInt(entry.size),
    })) };
  }

  async listByPlan(
    user: JwtPayload,
    planId: string,
    query: { tehsil?: string; limit?: string },
  ) {
    if (!isValidId(planId)) {
      throw new BadRequestException({ msg: 'Invalid plan identifier' });
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

    const conditions: Prisma.water_quality_samplesWhereInput[] = [
      { plan_id: BigInt(planId) },
    ];

    if (tehsilScope.length) {
      const scopeQuery = this.tehsilScope.buildTehsilScopePrismaFilter<Prisma.water_quality_samplesWhereInput>(
        tehsilScope,
        'plan_snapshot_tehsil',
      );
      if (scopeQuery) {
        conditions.push(scopeQuery);
      }
    }
    if (requestedTehsil) {
      conditions.push({
        plan_snapshot_tehsil: { contains: escapeLike(requestedTehsil) },
      });
    }

    const where: Prisma.water_quality_samplesWhereInput =
      conditions.length === 1 ? conditions[0] : { AND: conditions };

    const samples = await this.prisma.water_quality_samples.findMany({
      where,
      include: {
        water_quality_sample_status_history: {
          orderBy: { created_at: 'asc' },
        },
        water_quality_sample_attachments: true,
      },
      orderBy: { created_at: 'desc' },
      take: limitInt(query.limit, 50),
    });

    return samples.map((sample) => serializeSample(sample));
  }

  private buildFilter(
    user: JwtPayload,
    query: { planId?: string; status?: string; tehsil?: string },
    tehsilScope: string[],
  ): Prisma.water_quality_samplesWhereInput {
    const role = user?.role || '';
    const conditions: Prisma.water_quality_samplesWhereInput[] = [];

    if (RA_ROLES.has(role)) {
      conditions.push({ created_by: BigInt(user.userId) });
    }

    if (PCRWR_ROLES.has(role)) {
      conditions.push({
        OR: [
          { assigned_sampler: BigInt(user.userId) },
          {
            status: {
              in: [
                water_quality_samples_status.awaiting_collection,
                water_quality_samples_status.collecting,
                water_quality_samples_status.in_lab,
              ],
            },
          },
        ],
      });
    }

    if (tehsilScope.length) {
      const scopeQuery = this.tehsilScope.buildTehsilScopePrismaFilter<Prisma.water_quality_samplesWhereInput>(
        tehsilScope,
        'plan_snapshot_tehsil',
      );
      if (scopeQuery) {
        conditions.push(scopeQuery);
      }
    }

    if (query.planId && isValidId(query.planId)) {
      conditions.push({ plan_id: BigInt(query.planId) });
    }

    if (query.status) {
      conditions.push({ status: query.status as water_quality_samples_status });
    }

    if (query.tehsil) {
      conditions.push({
        plan_snapshot_tehsil: { contains: escapeLike(query.tehsil) },
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

  private async fetchEditableSample(id: string, user: JwtPayload) {
    if (!isValidId(id)) {
      throw new BadRequestException({ msg: 'Invalid sample identifier' });
    }

    const sample = await this.prisma.water_quality_samples.findUnique({
      where: { id: BigInt(id) },
    });
    if (!sample) {
      throw new NotFoundException({ msg: 'Sample not found' });
    }

    const role = user?.role || '';
    if (this.tehsilScope.needsTehsilScope(role)) {
      const tehsilScope = await this.tehsilScope.resolveUserTehsils(user);
      if (
        tehsilScope.length === 0 ||
        !this.tehsilScope.tehsilMatches(tehsilScope, sample.plan_snapshot_tehsil)
      ) {
        throw new ForbiddenException({ msg: 'Forbidden' });
      }
    }

    return sample;
  }

  private async maybeAutoAssignSampler(sampleId: bigint, actor: Actor) {
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
          status: water_quality_samples_status.awaiting_collection,
          updated_by: BigInt(actor.userId),
          updated_by_name: actor.name,
          updated_at: now,
        },
      });

      await this.prisma.water_quality_sample_status_history.create({
        data: {
          sample_id: sampleId,
          ...buildStatusEvent(
            water_quality_sample_status_history_code.assignment,
            actor,
            `Auto-assigned to ${sampler.name || 'PCRWR Sampler'}`,
          ),
          created_at: now,
          updated_at: now,
        },
      });
    } catch (err) {
      console.error(
        'Auto-assignment error:',
        err instanceof Error ? err.message : err,
      );
    }
  }

  private async resolveDefaultSampler() {
    const preferredEmail = (process.env.DEFAULT_WATER_QUALITY_SAMPLER_EMAIL || '').trim();
    if (preferredEmail) {
      const samplerByEmail = await this.prisma.users.findFirst({
        where: { email: preferredEmail, role: users_role.PCRWR_Sampler },
      });
      if (samplerByEmail) {
        return samplerByEmail;
      }
    }

    const activeSampler = await this.prisma.users.findFirst({
      where: { role: users_role.PCRWR_Sampler, active_status: 'active' },
      orderBy: { id: 'asc' },
    });
    if (activeSampler) {
      return activeSampler;
    }

    return this.prisma.users.findFirst({
      where: { role: users_role.PCRWR_Sampler },
      orderBy: { id: 'asc' },
    });
  }

  private async saveFileAttachments(
    sampleId: bigint,
    files: Express.Multer.File[] | undefined,
    attachmentType: water_quality_sample_attachments_attachment_type,
  ) {
    const safeFiles = Array.isArray(files) ? files : [];
    const now = new Date();
    for (const file of safeFiles) {
      await this.prisma.water_quality_sample_attachments.create({
        data: {
          sample_id: sampleId,
          attachment_type: attachmentType,
          stored_name: storedNameForFile(file.filename),
          original_name: file.originalname || '',
          mime_type: file.mimetype || '',
          size: BigInt(file.size || 0),
          created_at: now,
          updated_at: now,
        },
      });
    }
  }

  private ensureRole(user: JwtPayload, roles: Set<string>) {
    const role = user?.role || '';
    if (!roles.has(role)) {
      throw new ForbiddenException({ msg: 'Forbidden' });
    }
  }

  private ensureSamplerOwnership(
    sample: { assigned_sampler: bigint | null },
    user: JwtPayload,
  ) {
    const userId = Number(user?.userId);
    const assignedSamplerId = Number(sample.assigned_sampler);
    if (!assignedSamplerId) {
      throw new ConflictException({ msg: 'Sample has not been assigned to a sampler yet.' });
    }
    if (assignedSamplerId !== userId) {
      throw new ForbiddenException({ msg: 'Sample is assigned to another sampler.' });
    }
  }

  private async resolveActor(user: JwtPayload): Promise<Actor> {
    const dbUser = await this.prisma.users.findUnique({
      where: { id: BigInt(user.userId) },
      select: { name: true },
    });
    return {
      ...user,
      name: dbUser?.name || '',
    };
  }
}
