"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let AuditLogsService = class AuditLogsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(query) {
        const page = parseInt(query.page || '1', 10);
        const limit = parseInt(query.limit || '50', 10);
        const skip = (page - 1) * limit;
        const where = this.buildWhere(query);
        const [logs, total] = await Promise.all([
            this.prisma.audit_logs.findMany({
                where,
                orderBy: { created_at: 'desc' },
                take: limit,
                skip,
            }),
            this.prisma.audit_logs.count({ where }),
        ]);
        return {
            logs: logs.map((log) => this.mapLog(log)),
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        };
    }
    async stats(query) {
        const where = this.buildWhere(query);
        const [actionStats, entityStats, statusStats, topUsers, totalLogs] = await Promise.all([
            this.prisma.audit_logs.groupBy({
                by: ['action'],
                where,
                _count: { id: true },
            }),
            this.prisma.audit_logs.groupBy({
                by: ['entity_type'],
                where,
                _count: { id: true },
            }),
            this.prisma.audit_logs.groupBy({
                by: ['status'],
                where,
                _count: { id: true },
            }),
            this.prisma.audit_logs.groupBy({
                by: ['user_id', 'user_name', 'user_role'],
                where: { ...where, user_id: { not: null } },
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } },
                take: 10,
            }),
            this.prisma.audit_logs.count({ where }),
        ]);
        return {
            totalLogs,
            byAction: actionStats.map((r) => ({ action: r.action, count: r._count.id })),
            byEntityType: entityStats.map((r) => ({ entityType: r.entity_type, count: r._count.id })),
            byStatus: statusStats.map((r) => ({ status: r.status, count: r._count.id })),
            topUsers: topUsers.map((r) => ({
                userId: r.user_id,
                userName: r.user_name,
                userRole: r.user_role,
                count: r._count.id,
            })),
        };
    }
    async entityTrail(entityType, entityId, limit = 100) {
        const logs = await this.prisma.audit_logs.findMany({
            where: { entity_type: entityType, entity_id: entityId },
            orderBy: { created_at: 'desc' },
            take: limit,
        });
        return logs.map((log) => this.mapLog(log));
    }
    async userLogs(userId, page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        const where = { user_id: BigInt(userId) };
        const [logs, total] = await Promise.all([
            this.prisma.audit_logs.findMany({
                where,
                orderBy: { created_at: 'desc' },
                take: limit,
                skip,
            }),
            this.prisma.audit_logs.count({ where }),
        ]);
        return {
            logs: logs.map((log) => this.mapLog(log)),
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        };
    }
    async getOne(id) {
        const log = await this.prisma.audit_logs.findUnique({ where: { id: BigInt(id) } });
        if (!log) {
            throw new common_1.NotFoundException({ message: 'Audit log not found' });
        }
        return this.mapLog(log);
    }
    async listActions() {
        const rows = await this.prisma.audit_logs.findMany({
            distinct: ['action'],
            select: { action: true },
        });
        return rows.map((r) => r.action);
    }
    async listEntityTypes() {
        const rows = await this.prisma.audit_logs.findMany({
            distinct: ['entity_type'],
            select: { entity_type: true },
        });
        return rows.map((r) => r.entity_type);
    }
    buildWhere(query) {
        const where = {};
        if (query.action)
            where.action = query.action;
        if (query.entityType)
            where.entity_type = query.entityType;
        if (query.entityId)
            where.entity_id = query.entityId;
        if (query.userId)
            where.user_id = BigInt(query.userId);
        if (query.status)
            where.status = query.status;
        if (query.startDate || query.endDate) {
            where.created_at = {};
            if (query.startDate)
                where.created_at.gte = new Date(query.startDate);
            if (query.endDate)
                where.created_at.lte = new Date(query.endDate);
        }
        if (query.search) {
            const like = `%${query.search}%`;
            where.OR = [
                { description: { contains: query.search } },
                { user_name: { contains: query.search } },
                { user_email: { contains: query.search } },
                { request_path: { contains: query.search } },
            ];
            void like;
        }
        return where;
    }
    mapLog(log) {
        return {
            id: log.id,
            action: log.action,
            entityType: log.entity_type,
            entityId: log.entity_id,
            description: log.description,
            userId: log.user_id,
            userName: log.user_name,
            userEmail: log.user_email,
            userRole: log.user_role,
            ipAddress: log.ip_address,
            userAgent: log.user_agent,
            requestMethod: log.request_method,
            requestPath: log.request_path,
            oldValues: log.old_values,
            newValues: log.new_values,
            metadata: log.metadata,
            status: log.status,
            errorMessage: log.error_message,
            durationMs: log.duration_ms,
            sessionId: log.session_id,
            createdAt: log.created_at,
        };
    }
};
exports.AuditLogsService = AuditLogsService;
exports.AuditLogsService = AuditLogsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditLogsService);
//# sourceMappingURL=audit-logs.service.js.map