import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const TEHSIL_SCOPE_ROLES = new Set([
  'dm tehsil',
  'tehsil dm',
  'tehsil manager',
  'tm',
  'bcc officer',
  'bcc officer tehsil',
  'ra environment',
]);

@Injectable()
export class TehsilScopeService {
  constructor(private readonly prisma: PrismaService) {}

  normaliseText(value: unknown): string {
    return (value ?? '').toString().trim();
  }

  normaliseRole(value: unknown): string {
    return this.normaliseText(value).toLowerCase();
  }

  needsTehsilScope(role: unknown): boolean {
    return TEHSIL_SCOPE_ROLES.has(this.normaliseRole(role));
  }

  collectTehsilValues(userDoc: Record<string, unknown> | null | undefined): string[] {
    const values = new Set<string>();
    const push = (input: unknown) => {
      const text = this.normaliseText(input);
      if (text) {
        values.add(text);
      }
    };

    if (!userDoc) {
      return [];
    }

    push(userDoc.address);
    push(userDoc.tehsil);
    push(userDoc.assignedTehsil);

    const profile = userDoc.profile;
    if (profile && typeof profile === 'object') {
      const profileObj = profile as Record<string, unknown>;
      push(profileObj.tehsil);
      if (Array.isArray(profileObj.tehsils)) {
        profileObj.tehsils.forEach(push);
      }
    }

    [userDoc.assignedTehsils, userDoc.tehsils, userDoc.tehsilAssignments].forEach((entry) => {
      if (Array.isArray(entry)) {
        entry.forEach(push);
      }
    });

    return Array.from(values);
  }

  async resolveUserTehsils(userContext: {
    role?: string;
    userId?: number | string | bigint;
    id?: number | string | bigint;
  }): Promise<string[]> {
    if (!this.needsTehsilScope(userContext?.role)) {
      return [];
    }
    const userId = userContext?.userId || userContext?.id;
    if (!userId) {
      return [];
    }
    const user = await this.prisma.users.findUnique({
      where: { id: BigInt(userId) },
      select: { id: true, address: true, phone: true },
    });
    if (!user) {
      return [];
    }
    return this.collectTehsilValues(user as unknown as Record<string, unknown>);
  }

  buildTehsilScopeWhere(tehsils: string[], field = 'tehsil'): Prisma.Sql | null {
    if (!Array.isArray(tehsils) || tehsils.length === 0) {
      return null;
    }
    if (tehsils.length === 1) {
      return Prisma.sql`${Prisma.raw(field)} LIKE ${tehsils[0]}`;
    }
    return Prisma.sql`${Prisma.raw(field)} IN (${Prisma.join(tehsils)})`;
  }

  tehsilMatches(tehsils: string[], candidate: unknown): boolean {
    if (!Array.isArray(tehsils) || tehsils.length === 0) {
      return false;
    }
    const candidateKey = this.normaliseText(candidate).toLowerCase();
    if (!candidateKey) {
      return false;
    }
    return tehsils.some((value) => this.normaliseText(value).toLowerCase() === candidateKey);
  }

  /** Prisma WHERE fragment matching legacy buildTehsilScopeQuery (exact match / IN). */
  buildTehsilScopePrismaFilter<T extends Record<string, unknown>>(
    tehsils: string[],
    field: string,
  ): T | null {
    if (!Array.isArray(tehsils) || tehsils.length === 0) {
      return null;
    }
    if (tehsils.length === 1) {
      return { [field]: tehsils[0] } as T;
    }
    return { [field]: { in: tehsils } } as T;
  }
}
