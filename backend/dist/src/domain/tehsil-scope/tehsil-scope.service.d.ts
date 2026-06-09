import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
export declare class TehsilScopeService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    normaliseText(value: unknown): string;
    normaliseRole(value: unknown): string;
    needsTehsilScope(role: unknown): boolean;
    collectTehsilValues(userDoc: Record<string, unknown> | null | undefined): string[];
    resolveUserTehsils(userContext: {
        role?: string;
        userId?: number | string | bigint;
        id?: number | string | bigint;
    }): Promise<string[]>;
    buildTehsilScopeWhere(tehsils: string[], field?: string): Prisma.Sql | null;
    tehsilMatches(tehsils: string[], candidate: unknown): boolean;
    buildTehsilScopePrismaFilter<T extends Record<string, unknown>>(tehsils: string[], field: string): T | null;
}
