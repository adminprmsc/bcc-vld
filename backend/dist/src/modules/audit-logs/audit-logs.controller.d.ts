import { AuditLogsService } from './audit-logs.service';
export declare class AuditLogsController {
    private readonly service;
    constructor(service: AuditLogsService);
    stats(query: Record<string, string>): Promise<{
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
    metaActions(): Promise<string[]>;
    metaEntities(): Promise<string[]>;
    entityTrail(entityType: string, entityId: string, limit?: string): Promise<{
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
    userLogs(userId: string, page?: string, limit?: string): Promise<{
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
    list(query: Record<string, string>): Promise<{
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
}
