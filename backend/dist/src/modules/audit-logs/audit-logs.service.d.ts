import { PrismaService } from '../../prisma/prisma.service';
export declare class AuditLogsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(query: Record<string, string | undefined>): Promise<{
        logs: {
            id: bigint;
            action: string;
            entityType: string;
            entityId: string | null;
            description: string | null;
            userId: bigint | null;
            userName: string | null;
            userEmail: string | null;
            userRole: string | null;
            ipAddress: string | null;
            userAgent: string | null;
            requestMethod: string | null;
            requestPath: string | null;
            oldValues: unknown;
            newValues: unknown;
            metadata: unknown;
            status: string | null;
            errorMessage: string | null;
            durationMs: number | null;
            sessionId: string | null;
            createdAt: Date;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    stats(query: Record<string, string | undefined>): Promise<{
        totalLogs: number;
        byAction: {
            action: string;
            count: number;
        }[];
        byEntityType: {
            entityType: string;
            count: number;
        }[];
        byStatus: {
            status: import(".prisma/client").$Enums.audit_logs_status | null;
            count: number;
        }[];
        topUsers: {
            userId: bigint | null;
            userName: string | null;
            userRole: string | null;
            count: number;
        }[];
    }>;
    entityTrail(entityType: string, entityId: string, limit?: number): Promise<{
        id: bigint;
        action: string;
        entityType: string;
        entityId: string | null;
        description: string | null;
        userId: bigint | null;
        userName: string | null;
        userEmail: string | null;
        userRole: string | null;
        ipAddress: string | null;
        userAgent: string | null;
        requestMethod: string | null;
        requestPath: string | null;
        oldValues: unknown;
        newValues: unknown;
        metadata: unknown;
        status: string | null;
        errorMessage: string | null;
        durationMs: number | null;
        sessionId: string | null;
        createdAt: Date;
    }[]>;
    userLogs(userId: string, page?: number, limit?: number): Promise<{
        logs: {
            id: bigint;
            action: string;
            entityType: string;
            entityId: string | null;
            description: string | null;
            userId: bigint | null;
            userName: string | null;
            userEmail: string | null;
            userRole: string | null;
            ipAddress: string | null;
            userAgent: string | null;
            requestMethod: string | null;
            requestPath: string | null;
            oldValues: unknown;
            newValues: unknown;
            metadata: unknown;
            status: string | null;
            errorMessage: string | null;
            durationMs: number | null;
            sessionId: string | null;
            createdAt: Date;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    getOne(id: string): Promise<{
        id: bigint;
        action: string;
        entityType: string;
        entityId: string | null;
        description: string | null;
        userId: bigint | null;
        userName: string | null;
        userEmail: string | null;
        userRole: string | null;
        ipAddress: string | null;
        userAgent: string | null;
        requestMethod: string | null;
        requestPath: string | null;
        oldValues: unknown;
        newValues: unknown;
        metadata: unknown;
        status: string | null;
        errorMessage: string | null;
        durationMs: number | null;
        sessionId: string | null;
        createdAt: Date;
    }>;
    listActions(): Promise<string[]>;
    listEntityTypes(): Promise<string[]>;
    private buildWhere;
    private mapLog;
}
