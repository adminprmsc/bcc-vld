import { Injectable } from '@nestjs/common';
import { users_role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CounterService } from '../../common/counter/counter.service';
import { roleApiToEnum } from '../../common/utils/role.util';

@Injectable()
export class UsersRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly counters: CounterService,
  ) {}

  generateTempPassword(): string {
    return `Temp#${randomBytes(4).toString('hex')}`;
  }

  async hashPassword(plain: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(plain, salt);
  }

  async comparePassword(hashed: string, candidate: string): Promise<boolean> {
    return bcrypt.compare(candidate, hashed);
  }

  findByEmail(email: string, includePassword = false) {
    return this.prisma.users.findUnique({
      where: { email },
      select: includePassword
        ? undefined
        : {
            id: true,
            simple_id: true,
            name: true,
            email: true,
            role: true,
            gender: true,
            cnic: true,
            cnic_expiry: true,
            address: true,
            dob: true,
            phone: true,
            active_status: true,
            created_at: true,
            updated_at: true,
          },
    });
  }

  findById(id: number | bigint, includePassword = false) {
    return this.prisma.users.findUnique({
      where: { id: BigInt(id) },
      select: includePassword
        ? undefined
        : {
            id: true,
            simple_id: true,
            name: true,
            email: true,
            role: true,
            gender: true,
            cnic: true,
            cnic_expiry: true,
            address: true,
            dob: true,
            phone: true,
            active_status: true,
            created_at: true,
            updated_at: true,
          },
    });
  }

  async search(query: string) {
    const like = `%${query}%`;
    return this.prisma.$queryRaw<
      Array<{
        id: bigint;
        simple_id: number | null;
        name: string;
        email: string;
        role: users_role;
        gender: string | null;
        cnic: string | null;
        cnic_expiry: string | null;
        address: string | null;
        dob: string | null;
        phone: string | null;
        active_status: string | null;
      }>
    >`
      SELECT id, simple_id, name, email, role, gender, cnic, cnic_expiry, address, dob, phone, active_status
      FROM users
      WHERE name LIKE ${like} OR role LIKE ${like} OR email LIKE ${like}
      LIMIT 50
    `;
  }

  listAll() {
    return this.prisma.users.findMany({
      take: 200,
      select: {
        id: true,
        simple_id: true,
        name: true,
        email: true,
        role: true,
        gender: true,
        cnic: true,
        cnic_expiry: true,
        address: true,
        dob: true,
        phone: true,
        active_status: true,
      },
    });
  }

  async createUser(data: {
    name: string;
    email: string;
    password: string;
    role: string;
    gender?: string;
    cnic?: string;
    cnicExpiry?: string;
    address?: string;
    dob?: string;
    phone?: string;
    activeStatus?: string;
    simpleId?: number;
  }) {
    const simpleId = data.simpleId ?? (await this.counters.nextSequence('user-simple-id'));
    const hashed = await this.hashPassword(data.password);
    const now = new Date();
    return this.prisma.users.create({
      data: {
        simple_id: simpleId,
        name: data.name,
        email: data.email,
        password: hashed,
        role: roleApiToEnum(data.role),
        gender: data.gender,
        cnic: data.cnic,
        cnic_expiry: data.cnicExpiry,
        address: data.address,
        dob: data.dob,
        phone: data.phone,
        active_status: data.activeStatus || 'inactive',
        created_at: now,
        updated_at: now,
      },
    });
  }

  async updateUser(
    id: bigint,
    updates: Partial<{
      name: string;
      email: string;
      gender: string;
      cnic: string;
      cnicExpiry: string;
      address: string;
      dob: string;
      phone: string;
      role: string;
      activeStatus: string;
      password: string;
    }>,
  ) {
    const data: Record<string, unknown> = { updated_at: new Date() };
    if (updates.name !== undefined) data.name = updates.name;
    if (updates.email !== undefined) data.email = updates.email;
    if (updates.gender !== undefined) data.gender = updates.gender;
    if (updates.cnic !== undefined) data.cnic = updates.cnic;
    if (updates.cnicExpiry !== undefined) data.cnic_expiry = updates.cnicExpiry;
    if (updates.address !== undefined) data.address = updates.address;
    if (updates.dob !== undefined) data.dob = updates.dob;
    if (updates.phone !== undefined) data.phone = updates.phone;
    if (updates.role !== undefined) data.role = roleApiToEnum(updates.role);
    if (updates.activeStatus !== undefined) data.active_status = updates.activeStatus;
    if (updates.password) data.password = await this.hashPassword(updates.password);

    return this.prisma.users.update({
      where: { id },
      data: data as never,
    });
  }

  deleteUser(id: bigint) {
    return this.prisma.users.delete({ where: { id } });
  }
}
