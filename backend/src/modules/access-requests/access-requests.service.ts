import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { access_requests_status, access_requests_role_requested } from '@prisma/client';
import { JwtPayload } from '../../common/security/jwt.strategy';
import { roleApiToEnum, roleEnumToApi } from '../../common/utils/role.util';
import { UsersRepository } from '../users/users.repository';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AccessRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersRepo: UsersRepository,
  ) {}

  async create(body: {
    name?: string;
    email?: string;
    phone?: string;
    roleRequested?: string;
    tehsil?: string;
    message?: string;
  }) {
    const { name, email, phone, roleRequested, tehsil, message } = body || {};
    if (!name || !email || !phone) {
      throw new BadRequestException({ msg: 'Name, email, and phone are required.' });
    }

    const normalisedEmail = email.toString().trim().toLowerCase();
    const existingUser = await this.prisma.users.findUnique({ where: { email: normalisedEmail } });
    if (existingUser) {
      throw new ConflictException({
        msg: 'An account with this email already exists. Please contact an administrator.',
      });
    }

    const pendingRequest = await this.prisma.access_requests.findFirst({
      where: { email: normalisedEmail, status: access_requests_status.Pending },
    });
    if (pendingRequest) {
      throw new ConflictException({ msg: 'A request for this email is already pending review.' });
    }

    const now = new Date();
    const accessRequest = await this.prisma.access_requests.create({
      data: {
        name: name.toString().trim(),
        email: normalisedEmail,
        phone: phone.toString().trim(),
        role_requested: roleRequested
          ? this.mapAccessRequestRole(roleRequested)
          : access_requests_role_requested.Citizen,
        tehsil: tehsil?.toString().trim() || '',
        message: message?.toString().trim() || '',
        created_at: now,
        updated_at: now,
      },
    });

    return {
      msg: 'Request received. An administrator will review your submission shortly.',
      request: this.mapRequest(accessRequest),
    };
  }

  async listAll() {
    const requests = await this.prisma.access_requests.findMany({
      orderBy: { created_at: 'desc' },
    });
    return requests.map((r) => this.mapRequest(r));
  }

  async approve(id: string, user: JwtPayload, body: { notes?: string; role?: string }) {
    const request = await this.prisma.access_requests.findUnique({ where: { id: BigInt(id) } });
    if (!request) {
      throw new NotFoundException({ msg: 'Request not found.' });
    }
    if (request.status === access_requests_status.Approved) {
      throw new BadRequestException({ msg: 'Request already approved.' });
    }
    if (request.status === access_requests_status.Rejected) {
      throw new BadRequestException({ msg: 'Request already rejected.' });
    }

    const normalisedEmail = request.email.toLowerCase();
    let existingUser = await this.prisma.users.findUnique({ where: { email: normalisedEmail } });
    let tempPassword: string | undefined;

    if (!existingUser) {
      tempPassword = this.usersRepo.generateTempPassword();
      existingUser = await this.usersRepo.createUser({
        name: request.name,
        email: normalisedEmail,
        phone: request.phone,
        role: body.role || roleEnumToApi(request.role_requested || 'Citizen'),
        address: request.tehsil || '',
        password: tempPassword,
        activeStatus: 'inactive',
      });
    }

    const updated = await this.prisma.access_requests.update({
      where: { id: request.id },
      data: {
        status: access_requests_status.Approved,
        processed_by: user.userId ? BigInt(user.userId) : null,
        processed_at: new Date(),
        processed_notes: (body.notes || '').toString().trim(),
        updated_at: new Date(),
      },
    });

    return {
      msg: 'Request approved successfully.',
      request: this.mapRequest(updated),
      user: {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        role: roleEnumToApi(existingUser.role),
        phone: existingUser.phone,
        activeStatus: existingUser.active_status,
      },
      tempPassword,
    };
  }

  async reject(id: string, user: JwtPayload, body: { notes?: string }) {
    const request = await this.prisma.access_requests.findUnique({ where: { id: BigInt(id) } });
    if (!request) {
      throw new NotFoundException({ msg: 'Request not found.' });
    }
    if (request.status === access_requests_status.Approved) {
      throw new BadRequestException({ msg: 'Request already approved.' });
    }
    if (request.status === access_requests_status.Rejected) {
      throw new BadRequestException({ msg: 'Request already rejected.' });
    }

    const updated = await this.prisma.access_requests.update({
      where: { id: request.id },
      data: {
        status: access_requests_status.Rejected,
        processed_by: user.userId ? BigInt(user.userId) : null,
        processed_at: new Date(),
        processed_notes: (body.notes || '').toString().trim(),
        updated_at: new Date(),
      },
    });

    return { msg: 'Request rejected.', request: this.mapRequest(updated) };
  }

  private mapAccessRequestRole(role: string): access_requests_role_requested {
    const mapped = role.replace(/ /g, '_');
    if ((Object.values(access_requests_role_requested) as string[]).includes(mapped)) {
      return mapped as access_requests_role_requested;
    }
    return access_requests_role_requested.Citizen;
  }

  private mapRequest(row: {
    id: bigint;
    name: string;
    email: string;
    phone: string;
    role_requested: import('@prisma/client').access_requests_role_requested | null;
    tehsil: string | null;
    message: string | null;
    status: access_requests_status | null;
    processed_by: bigint | null;
    processed_at: Date | null;
    processed_notes: string | null;
    created_at: Date;
    updated_at: Date;
  }) {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      roleRequested: row.role_requested ? roleEnumToApi(row.role_requested) : 'Citizen',
      tehsil: row.tehsil,
      message: row.message,
      status: row.status,
      processedBy: row.processed_by,
      processedAt: row.processed_at,
      processedNotes: row.processed_notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
