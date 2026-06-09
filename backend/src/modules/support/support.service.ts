import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { support_requests_priority, support_requests_status } from '@prisma/client';
import { join } from 'path';
import { JwtPayload } from '../../common/security/jwt.strategy';
import { roleEnumToApi } from '../../common/utils/role.util';
import { PrismaService } from '../../prisma/prisma.service';

const PRIORITY_VALUES: support_requests_priority[] = ['low', 'medium', 'high'];

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  private includes() {
    return {
      users_support_requests_created_byTousers: {
        select: { id: true, name: true, email: true, role: true },
      },
      users_support_requests_assigned_toTousers: {
        select: { id: true, name: true, email: true, role: true },
      },
      support_request_updates: {
        include: {
          users: { select: { id: true, name: true, email: true, role: true } },
        },
      },
      support_request_attachments: true,
    };
  }

  private mapRequest(row: Awaited<ReturnType<typeof this.reload>>) {
    if (!row) return null;
    return {
      ...row,
      creator: row.users_support_requests_created_byTousers
        ? {
            id: row.users_support_requests_created_byTousers.id,
            name: row.users_support_requests_created_byTousers.name,
            email: row.users_support_requests_created_byTousers.email,
            role: roleEnumToApi(row.users_support_requests_created_byTousers.role),
          }
        : null,
      assignee: row.users_support_requests_assigned_toTousers
        ? {
            id: row.users_support_requests_assigned_toTousers.id,
            name: row.users_support_requests_assigned_toTousers.name,
            email: row.users_support_requests_assigned_toTousers.email,
            role: roleEnumToApi(row.users_support_requests_assigned_toTousers.role),
          }
        : null,
      updates: row.support_request_updates.map((u) => ({
        id: u.id,
        supportRequestId: u.support_request_id,
        actorId: u.actor_id,
        action: u.action,
        notes: u.notes,
        createdAt: u.created_at,
        actor: u.users
          ? {
              id: u.users.id,
              name: u.users.name,
              email: u.users.email,
              role: roleEnumToApi(u.users.role),
            }
          : null,
      })),
      attachments: row.support_request_attachments,
      createdBy: row.created_by,
      requesterName: row.requester_name,
      requesterEmail: row.requester_email,
      requesterRole: row.requester_role,
      ticketNumber: row.ticket_number,
      resolutionNotes: row.resolution_notes,
      assignedTo: row.assigned_to,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private reload(id: bigint) {
    return this.prisma.support_requests.findUnique({
      where: { id },
      include: this.includes(),
    });
  }

  private async resolveDefaultAdmin() {
    return this.prisma.users.findFirst({
      where: { role: { in: ['Super_Admin', 'Admin'] }, active_status: 'active' },
      orderBy: { role: 'asc' },
      select: { id: true, name: true, email: true, role: true },
    });
  }

  private generateTicketNumber() {
    return `SUP-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)
      .toString(36)
      .toUpperCase()}`;
  }

  async create(
    user: JwtPayload,
    body: { category?: string; subject?: string; message?: string; priority?: string },
    files: Express.Multer.File[] = [],
  ) {
    const category = (body.category || '').trim();
    const subject = (body.subject || '').trim();
    const message = (body.message || '').trim();
    const requestedPriority = (body.priority || 'medium').trim().toLowerCase();

    if (!category || !message) {
      throw new BadRequestException({ msg: 'Category and message are required.' });
    }

    const priority = PRIORITY_VALUES.includes(requestedPriority as support_requests_priority)
      ? (requestedPriority as support_requests_priority)
      : support_requests_priority.medium;

    const dbUser = await this.prisma.users.findUnique({
      where: { id: BigInt(user.userId) },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!dbUser) {
      throw new NotFoundException({ msg: 'User not found' });
    }

    const defaultAdmin = await this.resolveDefaultAdmin();
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const supportRequest = await tx.support_requests.create({
        data: {
          ticket_number: this.generateTicketNumber(),
          created_by: dbUser.id,
          requester_name: dbUser.name,
          requester_email: dbUser.email,
          requester_role: roleEnumToApi(dbUser.role),
          category,
          priority,
          subject: subject || '',
          message,
          assigned_to: defaultAdmin?.id || null,
          created_at: now,
          updated_at: now,
        },
      });

      await tx.support_request_updates.create({
        data: {
          support_request_id: supportRequest.id,
          actor_id: dbUser.id,
          action: 'Ticket created',
          notes: subject ? `${subject} :: ${message}` : message,
          created_at: now,
          updated_at: now,
        },
      });

      if (defaultAdmin?.id) {
        await tx.support_request_updates.create({
          data: {
            support_request_id: supportRequest.id,
            actor_id: defaultAdmin.id,
            action: defaultAdmin.name ? `Assigned to ${defaultAdmin.name}` : 'Assigned to admin team',
            notes: '',
            created_at: now,
            updated_at: now,
          },
        });
      }

      const attachmentRecords = files.map((file) => ({
        support_request_id: supportRequest.id,
        stored_name: join('support', file.filename).replace(/\\/g, '/'),
        original_name: file.originalname,
        mime_type: file.mimetype,
        size: BigInt(file.size),
        created_at: now,
        updated_at: now,
      }));

      if (attachmentRecords.length) {
        await tx.support_request_attachments.createMany({ data: attachmentRecords });
        await tx.support_request_updates.create({
          data: {
            support_request_id: supportRequest.id,
            actor_id: dbUser.id,
            action: 'Attachments added',
            notes: attachmentRecords.map((a) => a.original_name).join(', '),
            created_at: now,
            updated_at: now,
          },
        });
      }

      const result = await tx.support_requests.findUnique({
        where: { id: supportRequest.id },
        include: this.includes(),
      });
      return this.mapRequest(result);
    });
  }

  async listMine(user: JwtPayload) {
    const rows = await this.prisma.support_requests.findMany({
      where: { created_by: BigInt(user.userId) },
      include: this.includes(),
      orderBy: { created_at: 'desc' },
    });
    return rows.map((r) => this.mapRequest(r));
  }

  async listAdmin(user: JwtPayload, query: { status?: string; assigned?: string }) {
    const where: { status?: support_requests_status; assigned_to?: bigint } = {};
    const status = (query.status || '').trim();
    if (status) {
      where.status = status as support_requests_status;
    }
    const assigned = (query.assigned || '').trim();
    if (assigned === 'me') {
      where.assigned_to = BigInt(user.userId);
    } else if (assigned) {
      where.assigned_to = BigInt(assigned);
    }

    const rows = await this.prisma.support_requests.findMany({
      where,
      include: this.includes(),
      orderBy: { created_at: 'desc' },
      take: 200,
    });
    return rows.map((r) => this.mapRequest(r));
  }

  async patchAdmin(
    id: string,
    user: JwtPayload,
    body: {
      status?: support_requests_status;
      resolutionNotes?: string;
      assignedTo?: string | number;
      priority?: support_requests_priority;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const supportRequest = await tx.support_requests.findUnique({
        where: { id: BigInt(id) },
      });
      if (!supportRequest) {
        throw new NotFoundException({ msg: 'Support request not found' });
      }

      const pendingUpdates: Array<{ action: string; notes: string }> = [];
      const data: Record<string, unknown> = { updated_at: new Date() };

      if (body.status && body.status !== supportRequest.status) {
        data.status = body.status;
        pendingUpdates.push({ action: `Status changed to ${body.status}`, notes: '' });
      }
      if (typeof body.resolutionNotes === 'string' && body.resolutionNotes !== supportRequest.resolution_notes) {
        data.resolution_notes = body.resolutionNotes;
        pendingUpdates.push({ action: 'Resolution updated', notes: body.resolutionNotes });
      }
      if (body.assignedTo && BigInt(body.assignedTo) !== supportRequest.assigned_to) {
        const assignee = await tx.users.findUnique({
          where: { id: BigInt(body.assignedTo) },
          select: { id: true, name: true, email: true },
        });
        data.assigned_to = BigInt(body.assignedTo);
        const assigneeNote = assignee?.name || assignee?.email || body.assignedTo;
        pendingUpdates.push({ action: 'Ticket reassigned', notes: `Reassigned to ${assigneeNote}` });
      }
      if (body.priority && body.priority !== supportRequest.priority) {
        if (!PRIORITY_VALUES.includes(body.priority)) {
          throw new BadRequestException({ msg: 'Invalid priority supplied.' });
        }
        data.priority = body.priority;
        pendingUpdates.push({ action: `Priority set to ${body.priority}`, notes: '' });
      }

      const now = new Date();
      for (const update of pendingUpdates) {
        await tx.support_request_updates.create({
          data: {
            support_request_id: supportRequest.id,
            actor_id: BigInt(user.userId),
            action: update.action,
            notes: update.notes,
            created_at: now,
            updated_at: now,
          },
        });
      }

      await tx.support_requests.update({
        where: { id: supportRequest.id },
        data: data as never,
      });

      const result = await tx.support_requests.findUnique({
        where: { id: supportRequest.id },
        include: this.includes(),
      });
      return this.mapRequest(result);
    });
  }

  async addComment(id: string, user: JwtPayload, note: string) {
    if (!note?.trim()) {
      throw new BadRequestException({ msg: 'Note is required.' });
    }

    const supportRequest = await this.prisma.support_requests.findUnique({
      where: { id: BigInt(id) },
    });
    if (!supportRequest) {
      throw new NotFoundException({ msg: 'Support request not found' });
    }

    const isOwner = supportRequest.created_by === BigInt(user.userId);
    const isAdmin = ['Super Admin', 'Admin'].includes(user.role);
    const isAssigned =
      supportRequest.assigned_to && supportRequest.assigned_to === BigInt(user.userId);
    if (!isOwner && !isAdmin && !isAssigned) {
      throw new ForbiddenException({ msg: 'Forbidden' });
    }

    const now = new Date();
    await this.prisma.support_request_updates.create({
      data: {
        support_request_id: supportRequest.id,
        actor_id: BigInt(user.userId),
        action: 'Comment added',
        notes: note.trim(),
        created_at: now,
        updated_at: now,
      },
    });

    const result = await this.reload(supportRequest.id);
    return this.mapRequest(result);
  }
}
