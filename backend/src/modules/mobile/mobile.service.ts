import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  consultant_plan_maintenance_records_status,
  consultant_plan_maintenance_records_type,
  Prisma,
  requisitions_priority,
  water_quality_sample_attachments_attachment_type,
  water_quality_sample_status_history_code,
  water_quality_sample_status_history_tone,
  water_quality_samples_status,
} from '@prisma/client';
import { CounterService } from '../../common/counter/counter.service';
import { roleMatches } from '../../common/security/role-synonyms';
import { JwtPayload } from '../../common/security/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { CreateRequisitionDto } from './dto/create-requisition.dto';
import { LandUtilizationProgressDto } from './dto/land-utilization-progress.dto';
import { MaintenanceFormDto } from './dto/maintenance-form.dto';
import { RedbookOperationalDto } from './dto/redbook-operational.dto';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { WaterSampleCollectionDto } from './dto/water-sample-collection.dto';

interface MobileUserContext {
  userId: bigint;
  userName: string;
  role: string;
}

@Injectable()
export class MobileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly counters: CounterService,
  ) {}

  async getDashboard(user: JwtPayload) {
    try {
      const ctx = await this.resolveUser(user);
      const [requisitionCount, assetCount, pendingTasks, recentRequisitions] = await Promise.all([
        this.prisma.requisitions.count(),
        this.prisma.consultant_plans.count(),
        this.getTaskCount(ctx.userId, ctx.role),
        this.prisma.requisitions.findMany({
          select: {
            id: true,
            title: true,
            status: true,
            tehsil: true,
            date_created: true,
          },
          orderBy: { date_created: 'desc' },
          take: 5,
        }),
      ]);

      return {
        metrics: [
          { id: 'requisitions', label: 'Requisitions', value: requisitionCount, tone: 'primary' },
          { id: 'assets', label: 'Assets', value: assetCount, tone: 'success' },
          {
            id: 'tasks',
            label: 'Pending Tasks',
            value: pendingTasks,
            tone: pendingTasks > 0 ? 'warning' : 'neutral',
          },
        ],
        recentActivity: recentRequisitions.map((r) => ({
          id: r.id,
          title: r.title,
          status: r.status,
          tehsil: r.tehsil,
          date: r.date_created,
        })),
        lastSync: new Date().toISOString(),
      };
    } catch (err) {
      console.error('Mobile dashboard error:', err);
      throw new InternalServerErrorException({ msg: 'Failed to load dashboard' });
    }
  }

  async getTasks(user: JwtPayload) {
    try {
      const ctx = await this.resolveUser(user);
      return this.fetchTasks(ctx.userId, ctx.role);
    } catch (err) {
      console.error('Mobile tasks error:', err);
      throw new InternalServerErrorException({ msg: 'Failed to load tasks' });
    }
  }

  async completeTask(id: string, dto: CompleteTaskDto, user: JwtPayload) {
    try {
      const ctx = await this.resolveUser(user);
      const entityId = BigInt(id);
      const now = new Date();

      const sample = await this.prisma.water_quality_samples.findUnique({ where: { id: entityId } });
      if (sample) {
        await this.prisma.water_quality_sample_status_history.create({
          data: {
            sample_id: sample.id,
            code: water_quality_sample_status_history_code.closed,
            label: 'Task completed via mobile',
            note: dto.notes || '',
            tone: water_quality_sample_status_history_tone.success,
            created_by: ctx.userId,
            created_by_name: ctx.userName,
            created_at: now,
            updated_at: now,
          },
        });
        await this.prisma.water_quality_samples.update({
          where: { id: sample.id },
          data: {
            status: (dto.status as water_quality_samples_status) || water_quality_samples_status.closed,
            updated_by: ctx.userId,
            updated_by_name: ctx.userName,
            updated_at: now,
          },
        });
        return { success: true, type: 'water-quality' };
      }

      const plan = await this.prisma.consultant_plans.findUnique({ where: { id: entityId } });
      if (plan) {
        await this.prisma.consultant_plan_maintenance_records.create({
          data: {
            consultant_plan_id: plan.id,
            performed_at: now,
            type: consultant_plan_maintenance_records_type.inspection,
            status: consultant_plan_maintenance_records_status.completed,
            description: dto.notes || 'Completed via mobile app',
            recorded_by: ctx.userId,
            recorded_by_name: ctx.userName,
            created_at: now,
            updated_at: now,
          },
        });
        await this.prisma.consultant_plans.update({
          where: { id: plan.id },
          data: { updated_by: ctx.userId, updated_at: now },
        });
        return { success: true, type: 'maintenance' };
      }

      throw new NotFoundException({ msg: 'Task not found' });
    } catch (err) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      console.error('Task complete error:', err);
      throw new InternalServerErrorException({ msg: 'Failed to complete task' });
    }
  }

  getSyncStatus() {
    const now = new Date().toISOString();
    return [
      { id: 'requisitions', name: 'Requisitions', status: 'synced', lastSync: now },
      { id: 'assets', name: 'Assets', status: 'synced', lastSync: now },
      { id: 'tasks', name: 'Tasks', status: 'synced', lastSync: now },
    ];
  }

  retrySync() {
    return { success: true };
  }

  async getMapOverlays() {
    try {
      const plans = await this.prisma.consultant_plans.findMany({
        select: {
          id: true,
          title: true,
          category: true,
          tehsil: true,
          feature_geometry: true,
          critical_flag: true,
          latest_quality_status_status: true,
        },
        take: 500,
      });

      const features = plans
        .filter((p) => p.feature_geometry)
        .map((p) => ({
          type: 'Feature' as const,
          id: String(p.id),
          geometry: p.feature_geometry,
          properties: {
            title: p.title,
            category: p.category,
            tehsil: p.tehsil,
            critical: p.critical_flag || false,
            qualityStatus: p.latest_quality_status_status || 'unknown',
          },
        }));

      return { type: 'FeatureCollection' as const, features };
    } catch (err) {
      console.error('Map overlays error:', err);
      throw new InternalServerErrorException({ msg: 'Failed to load map data' });
    }
  }

  async createRequisition(dto: CreateRequisitionDto, user: JwtPayload) {
    try {
      const ctx = await this.resolveUser(user);
      const now = new Date();
      const sequenceNumber = await this.counters.nextSequence('requisition-sequence');

      const requisition = await this.prisma.requisitions.create({
        data: {
          sequence_number: sequenceNumber,
          title: dto.title.trim(),
          purpose: dto.purpose.trim(),
          tehsil: dto.tehsil.trim(),
          district: dto.district || '',
          description: dto.description || '',
          land_area: dto.landArea || '',
          land_type: dto.landType || '',
          priority: (dto.priority as requisitions_priority) || requisitions_priority.Medium,
          location_address: dto.location?.address || '',
          location_lat: dto.location?.lat ?? null,
          location_lng: dto.location?.lng ?? null,
          map_marker_lat: dto.mapMarker?.lat ?? null,
          map_marker_lng: dto.mapMarker?.lng ?? null,
          requested_by: ctx.userId,
          status: 'Pending',
          date_created: now,
          last_updated: now,
        },
      });

      await this.prisma.requisition_activity_logs.create({
        data: {
          requisition_id: requisition.id,
          action: 'Created via mobile app',
          user_id: ctx.userId,
          timestamp: now,
        },
      });

      return {
        success: true,
        id: requisition.id,
        sequenceNumber: requisition.sequence_number,
        offlineId: dto.offlineId,
      };
    } catch (err) {
      console.error('Mobile requisition create error:', err);
      throw new InternalServerErrorException({ msg: 'Failed to create requisition' });
    }
  }

  async uploadRequisitionAttachments(id: string, files: Express.Multer.File[]) {
    try {
      const requisition = await this.prisma.requisitions.findUnique({
        where: { id: BigInt(id) },
      });
      if (!requisition) {
        throw new NotFoundException({ msg: 'Requisition not found' });
      }

      const uploaded = (files || []).map((f) => `/uploads/mobile/${f.filename}`);
      const existing = Array.isArray(requisition.attachments)
        ? (requisition.attachments as string[])
        : [];
      const now = new Date();

      await this.prisma.requisitions.update({
        where: { id: requisition.id },
        data: {
          attachments: [...existing, ...uploaded],
          last_updated: now,
        },
      });

      return { success: true, attachments: uploaded };
    } catch (err) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      console.error('Attachment upload error:', err);
      throw new InternalServerErrorException({ msg: 'Failed to upload attachments' });
    }
  }

  async createMaintenanceRecord(dto: MaintenanceFormDto, user: JwtPayload) {
    try {
      const ctx = await this.resolveUser(user);
      const planId = BigInt(dto.planId);
      const now = new Date();

      const plan = await this.prisma.consultant_plans.findUnique({ where: { id: planId } });
      if (!plan) {
        throw new NotFoundException({ msg: 'Asset not found' });
      }

      const record = await this.prisma.consultant_plan_maintenance_records.create({
        data: {
          consultant_plan_id: plan.id,
          performed_at: dto.performedAt ? new Date(dto.performedAt) : now,
          type: dto.type,
          status: consultant_plan_maintenance_records_status.completed,
          description: dto.description.trim(),
          cost: dto.cost || 0,
          notes: dto.notes || '',
          recorded_by: ctx.userId,
          recorded_by_name: ctx.userName,
          created_at: now,
          updated_at: now,
        },
      });

      await this.prisma.consultant_plans.update({
        where: { id: plan.id },
        data: { updated_by: ctx.userId, updated_at: now },
      });

      return {
        success: true,
        recordId: record.id,
        offlineId: dto.offlineId,
      };
    } catch (err) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      console.error('Mobile maintenance error:', err);
      throw new InternalServerErrorException({ msg: 'Failed to record maintenance' });
    }
  }

  async submitWaterSampleCollection(dto: WaterSampleCollectionDto, user: JwtPayload) {
    try {
      const ctx = await this.resolveUser(user);
      const sampleId = BigInt(dto.sampleId);
      const now = new Date();

      const sample = await this.prisma.water_quality_samples.findUnique({ where: { id: sampleId } });
      if (!sample) {
        throw new NotFoundException({ msg: 'Sample not found' });
      }

      await this.prisma.water_quality_samples.update({
        where: { id: sample.id },
        data: {
          collection_collected_at: new Date(dto.collectedAt),
          collection_field_notes: dto.fieldNotes || '',
          collection_location_lat: dto.location?.lat ?? null,
          collection_location_lng: dto.location?.lng ?? null,
          collection_collected_by: ctx.userId,
          collection_collected_by_name: ctx.userName,
          status: water_quality_samples_status.in_lab,
          updated_by: ctx.userId,
          updated_by_name: ctx.userName,
          updated_at: now,
        },
      });

      await this.prisma.water_quality_sample_status_history.create({
        data: {
          sample_id: sample.id,
          code: water_quality_sample_status_history_code.collection_complete,
          label: 'Sample collected in field',
          note: dto.fieldNotes || '',
          tone: water_quality_sample_status_history_tone.success,
          created_by: ctx.userId,
          created_by_name: ctx.userName,
          created_at: now,
          updated_at: now,
        },
      });

      return {
        success: true,
        status: water_quality_samples_status.in_lab,
        offlineId: dto.offlineId,
      };
    } catch (err) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      console.error('Sample collection error:', err);
      throw new InternalServerErrorException({ msg: 'Failed to submit collection data' });
    }
  }

  async uploadWaterSampleAttachments(id: string, files: Express.Multer.File[], user: JwtPayload) {
    try {
      const ctx = await this.resolveUser(user);
      const sampleId = BigInt(id);
      const now = new Date();

      const sample = await this.prisma.water_quality_samples.findUnique({ where: { id: sampleId } });
      if (!sample) {
        throw new NotFoundException({ msg: 'Sample not found' });
      }

      const uploaded: Array<{
        id: bigint;
        storedName: string;
        originalName: string;
        mimeType: string;
        size: number;
      }> = [];
      for (const f of files || []) {
        const attachment = await this.prisma.water_quality_sample_attachments.create({
          data: {
            sample_id: sample.id,
            attachment_type: water_quality_sample_attachments_attachment_type.collection,
            stored_name: f.filename,
            original_name: f.originalname,
            mime_type: f.mimetype,
            size: BigInt(f.size),
            created_at: now,
            updated_at: now,
          },
        });
        uploaded.push({
          id: attachment.id,
          storedName: f.filename,
          originalName: f.originalname,
          mimeType: f.mimetype,
          size: f.size,
        });
      }

      await this.prisma.water_quality_samples.update({
        where: { id: sample.id },
        data: { updated_by: ctx.userId, updated_at: now },
      });

      return { success: true, attachments: uploaded };
    } catch (err) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      console.error('Sample attachment error:', err);
      throw new InternalServerErrorException({ msg: 'Failed to upload attachments' });
    }
  }

  async submitLandUtilizationProgress(dto: LandUtilizationProgressDto, user: JwtPayload) {
    try {
      const ctx = await this.resolveUser(user);
      const requisitionId = BigInt(dto.requisitionId);
      const capturedAt = dto.capturedAt ? new Date(dto.capturedAt) : new Date();
      const now = new Date();

      const requisition = await this.prisma.requisitions.findUnique({ where: { id: requisitionId } });
      if (!requisition) {
        throw new NotFoundException({ msg: 'Requisition not found' });
      }

      await this.prisma.requisition_activity_logs.create({
        data: {
          requisition_id: requisition.id,
          action: 'Progress Update',
          user_id: ctx.userId,
          timestamp: capturedAt,
          meta: {
            status: dto.progressStatus,
            percentage: dto.progressPercentage,
            workType: dto.workType || '',
            description: dto.description,
            challenges: dto.challenges || '',
            nextSteps: dto.nextSteps || '',
            location: dto.location || null,
            submittedVia: 'mobile',
          } as Prisma.InputJsonValue,
        },
      });

      await this.prisma.requisition_progress_updates.create({
        data: {
          requisition_id: requisition.id,
          status: dto.progressStatus,
          description: dto.description,
          progress_date: capturedAt,
          completion_percentage: dto.progressPercentage,
          updated_by: ctx.userId,
          created_at: now,
          updated_at: now,
        },
      });

      await this.prisma.requisitions.update({
        where: { id: requisition.id },
        data: {
          land_utilization_phase: dto.progressStatus,
          land_utilization_summary: dto.description,
          land_utilization_next_milestone: dto.nextSteps || '',
          land_utilization_updated_by: ctx.userId,
          land_utilization_updated_at: now,
          last_updated: now,
        },
      });

      return {
        success: true,
        requisitionId: requisition.id,
        offlineId: dto.offlineId,
      };
    } catch (err) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      console.error('Land utilization progress error:', err);
      throw new InternalServerErrorException({ msg: 'Failed to submit progress update' });
    }
  }

  async submitRedbookOperational(dto: RedbookOperationalDto, user: JwtPayload) {
    try {
      const ctx = await this.resolveUser(user);
      const capturedAt = dto.capturedAt ? new Date(dto.capturedAt) : new Date();
      const now = new Date();

      let asset = /^\d+$/.test(dto.assetId)
        ? await this.prisma.consultant_plans.findUnique({ where: { id: BigInt(dto.assetId) } })
        : null;

      if (!asset) {
        asset = await this.prisma.consultant_plans.findFirst({ where: { title: dto.assetId } });
      }

      if (!asset) {
        throw new NotFoundException({ msg: 'Asset not found' });
      }

      const operationalRecord = {
        recordedAt: capturedAt,
        recordedBy: ctx.userId,
        recordedByName: ctx.userName,
        assetType: dto.assetType,
        operationalStatus: dto.operationalStatus,
        capacityUtilization: dto.capacityUtilization ?? null,
        condition: dto.condition,
        operator: dto.operator || {},
        remarks: dto.remarks || '',
        issues: dto.issues || [],
        location: dto.location || null,
        submittedVia: 'mobile',
      };

      const attrs =
        asset.attributes && typeof asset.attributes === 'object' && !Array.isArray(asset.attributes)
          ? { ...(asset.attributes as Record<string, unknown>) }
          : {};

      const redbookRecords = Array.isArray(attrs.redbookRecords) ? [...attrs.redbookRecords] : [];
      redbookRecords.push(operationalRecord);
      attrs.redbookRecords = redbookRecords;
      attrs.operationalStatus = dto.operationalStatus;
      attrs.condition = dto.condition;
      attrs.lastRedbookUpdate = now;

      const updateData: Prisma.consultant_plansUncheckedUpdateInput = {
        attributes: attrs as Prisma.InputJsonValue,
        updated_by: ctx.userId,
        updated_at: now,
      };

      if (['poor', 'critical'].includes(dto.condition)) {
        updateData.critical_flag = true;
        updateData.critical_reason = `Condition: ${dto.condition}. Issues: ${dto.issues?.length || 0}`;
      }

      if (dto.nextMaintenanceDue) {
        await this.prisma.consultant_plan_maintenance_records.create({
          data: {
            consultant_plan_id: asset.id,
            performed_at: capturedAt,
            type: consultant_plan_maintenance_records_type.inspection,
            status: consultant_plan_maintenance_records_status.completed,
            description: `Redbook inspection: ${dto.condition}`,
            recorded_by: ctx.userId,
            recorded_by_name: ctx.userName,
            created_at: now,
            updated_at: now,
          },
        });
      }

      await this.prisma.consultant_plans.update({
        where: { id: asset.id },
        data: updateData,
      });

      return {
        success: true,
        assetId: asset.id,
        offlineId: dto.offlineId,
      };
    } catch (err) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      console.error('Redbook operational error:', err);
      throw new InternalServerErrorException({ msg: 'Failed to submit redbook data' });
    }
  }

  async getNotifications(user: JwtPayload) {
    try {
      const ctx = await this.resolveUser(user);
      const notifications: Array<{
        id: string;
        title: string;
        body: string;
        type: string;
        data: Record<string, unknown>;
        read: boolean;
        createdAt: string;
      }> = [];

      if (roleMatches(ctx.role, ['PCRWR Sampler', 'PCRWR Lab'])) {
        const pendingSamples = await this.prisma.water_quality_samples.count({
          where: {
            OR: [
              { assigned_sampler: ctx.userId },
              { lab_analysis_analyst: ctx.userId },
            ],
            status: {
              in: [
                water_quality_samples_status.awaiting_collection,
                water_quality_samples_status.awaiting_assignment,
              ],
            },
          },
        });

        if (pendingSamples > 0) {
          notifications.push({
            id: `notif_samples_${Date.now()}`,
            title: 'Pending Sample Collections',
            body: `You have ${pendingSamples} sample(s) awaiting collection.`,
            type: 'sample',
            data: { count: pendingSamples },
            read: false,
            createdAt: new Date().toISOString(),
          });
        }
      }

      if (roleMatches(ctx.role, ['DM Tehsil', 'Tehsil Manager'])) {
        const criticalAssets = await this.prisma.consultant_plans.count({
          where: { critical_flag: true },
        });

        if (criticalAssets > 0) {
          notifications.push({
            id: `notif_critical_${Date.now()}`,
            title: 'Critical Assets Alert',
            body: `${criticalAssets} asset(s) require immediate attention.`,
            type: 'system',
            data: { count: criticalAssets },
            read: false,
            createdAt: new Date().toISOString(),
          });
        }
      }

      notifications.push({
        id: 'notif_welcome',
        title: 'Welcome to LDS Field Operations',
        body: 'You can submit forms, view tasks, and sync data from this app.',
        type: 'system',
        data: {},
        read: true,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      });

      return { notifications };
    } catch (err) {
      console.error('Notifications error:', err);
      throw new InternalServerErrorException({ msg: 'Failed to load notifications' });
    }
  }

  async registerPushToken(dto: RegisterPushTokenDto, user: JwtPayload) {
    try {
      const userId = BigInt(user.userId);
      console.log(`Push token registered for user ${userId}: ${dto.token} (${dto.platform})`);

      await this.prisma.users.update({
        where: { id: userId },
        data: {
          push_token: dto.token,
          push_platform: dto.platform,
          push_device_name: dto.deviceName,
          push_token_updated_at: new Date(),
        },
      });

      return { success: true };
    } catch (err) {
      console.error('Push token registration error:', err);
      throw new InternalServerErrorException({ msg: 'Failed to register push token' });
    }
  }

  markNotificationRead() {
    return { success: true };
  }

  private async resolveUser(user: JwtPayload): Promise<MobileUserContext> {
    const userId = BigInt(user.userId);
    const dbUser = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { name: true, role: true },
    });

    return {
      userId,
      userName: dbUser?.name || '',
      role: user.role || (dbUser?.role ? dbUser.role.toString().replace(/_/g, ' ') : ''),
    };
  }

  private async getTaskCount(userId: bigint, role: string): Promise<number> {
    let count = 0;

    if (roleMatches(role, ['PCRWR Sampler', 'PCRWR Lab'])) {
      count += await this.prisma.water_quality_samples.count({
        where: {
          OR: [{ assigned_sampler: userId }, { lab_analysis_analyst: userId }],
          status: { notIn: [water_quality_samples_status.closed, water_quality_samples_status.cancelled] },
        },
      });
    }

    if (roleMatches(role, ['Tehsil Manager'])) {
      count += await this.prisma.consultant_plans.count({
        where: {
          maintenance_owner: userId,
          critical_flag: true,
        },
      });
    }

    return count;
  }

  private async fetchTasks(userId: bigint, role: string) {
    const tasks: Array<{
      id: bigint;
      title: string;
      type: string;
      status: string;
      priority: string;
      dueDate: null;
      location: string;
      note?: string;
    }> = [];

    if (roleMatches(role, ['PCRWR Sampler', 'PCRWR Lab', 'RA Environment'])) {
      const samples = await this.prisma.water_quality_samples.findMany({
        where: {
          OR: [
            { assigned_sampler: userId },
            { lab_analysis_analyst: userId },
            { created_by: userId },
          ],
          status: { notIn: [water_quality_samples_status.closed, water_quality_samples_status.cancelled] },
        },
        include: {
          consultant_plans: {
            select: { id: true, title: true, tehsil: true },
          },
        },
        take: 50,
      });

      for (const s of samples) {
        tasks.push({
          id: s.id,
          title: `Water Sample: ${s.plan_snapshot_title || s.consultant_plans?.title || 'Unknown'}`,
          type: 'water-quality',
          status: this.mapSampleStatus(s.status),
          priority: s.status === water_quality_samples_status.awaiting_collection ? 'high' : 'medium',
          dueDate: null,
          location: s.plan_snapshot_tehsil || s.consultant_plans?.tehsil || '',
        });
      }
    }

    if (roleMatches(role, ['Tehsil Manager'])) {
      const plans = await this.prisma.consultant_plans.findMany({
        where: {
          OR: [{ maintenance_owner: userId }, { critical_flag: true }],
        },
        select: {
          id: true,
          title: true,
          tehsil: true,
          critical_flag: true,
          critical_reason: true,
        },
        take: 50,
      });

      for (const p of plans) {
        if (p.critical_flag) {
          tasks.push({
            id: p.id,
            title: `Critical Asset: ${p.title}`,
            type: 'maintenance',
            status: 'pending',
            priority: 'high',
            dueDate: null,
            location: p.tehsil || '',
            note: p.critical_reason || '',
          });
        }
      }
    }

    return tasks;
  }

  private mapSampleStatus(status: water_quality_samples_status | null | undefined): string {
    const map: Record<string, string> = {
      awaiting_assignment: 'pending',
      awaiting_collection: 'pending',
      collecting: 'in-progress',
      in_lab: 'in-progress',
      results_ready: 'review',
      closed: 'completed',
      cancelled: 'cancelled',
    };
    return map[status || ''] || 'pending';
  }
}
