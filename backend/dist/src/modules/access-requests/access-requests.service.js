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
exports.AccessRequestsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const role_util_1 = require("../../common/utils/role.util");
const users_repository_1 = require("../users/users.repository");
const prisma_service_1 = require("../../prisma/prisma.service");
let AccessRequestsService = class AccessRequestsService {
    constructor(prisma, usersRepo) {
        this.prisma = prisma;
        this.usersRepo = usersRepo;
    }
    async create(body) {
        const { name, email, phone, roleRequested, tehsil, message } = body || {};
        if (!name || !email || !phone) {
            throw new common_1.BadRequestException({ msg: 'Name, email, and phone are required.' });
        }
        const normalisedEmail = email.toString().trim().toLowerCase();
        const existingUser = await this.prisma.users.findUnique({ where: { email: normalisedEmail } });
        if (existingUser) {
            throw new common_1.ConflictException({
                msg: 'An account with this email already exists. Please contact an administrator.',
            });
        }
        const pendingRequest = await this.prisma.access_requests.findFirst({
            where: { email: normalisedEmail, status: client_1.access_requests_status.Pending },
        });
        if (pendingRequest) {
            throw new common_1.ConflictException({ msg: 'A request for this email is already pending review.' });
        }
        const now = new Date();
        const accessRequest = await this.prisma.access_requests.create({
            data: {
                name: name.toString().trim(),
                email: normalisedEmail,
                phone: phone.toString().trim(),
                role_requested: roleRequested
                    ? this.mapAccessRequestRole(roleRequested)
                    : client_1.access_requests_role_requested.Citizen,
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
    async approve(id, user, body) {
        const request = await this.prisma.access_requests.findUnique({ where: { id: BigInt(id) } });
        if (!request) {
            throw new common_1.NotFoundException({ msg: 'Request not found.' });
        }
        if (request.status === client_1.access_requests_status.Approved) {
            throw new common_1.BadRequestException({ msg: 'Request already approved.' });
        }
        if (request.status === client_1.access_requests_status.Rejected) {
            throw new common_1.BadRequestException({ msg: 'Request already rejected.' });
        }
        const normalisedEmail = request.email.toLowerCase();
        let existingUser = await this.prisma.users.findUnique({ where: { email: normalisedEmail } });
        let tempPassword;
        if (!existingUser) {
            tempPassword = this.usersRepo.generateTempPassword();
            existingUser = await this.usersRepo.createUser({
                name: request.name,
                email: normalisedEmail,
                phone: request.phone,
                role: body.role || (0, role_util_1.roleEnumToApi)(request.role_requested || 'Citizen'),
                address: request.tehsil || '',
                password: tempPassword,
                activeStatus: 'inactive',
            });
        }
        const updated = await this.prisma.access_requests.update({
            where: { id: request.id },
            data: {
                status: client_1.access_requests_status.Approved,
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
                role: (0, role_util_1.roleEnumToApi)(existingUser.role),
                phone: existingUser.phone,
                activeStatus: existingUser.active_status,
            },
            tempPassword,
        };
    }
    async reject(id, user, body) {
        const request = await this.prisma.access_requests.findUnique({ where: { id: BigInt(id) } });
        if (!request) {
            throw new common_1.NotFoundException({ msg: 'Request not found.' });
        }
        if (request.status === client_1.access_requests_status.Approved) {
            throw new common_1.BadRequestException({ msg: 'Request already approved.' });
        }
        if (request.status === client_1.access_requests_status.Rejected) {
            throw new common_1.BadRequestException({ msg: 'Request already rejected.' });
        }
        const updated = await this.prisma.access_requests.update({
            where: { id: request.id },
            data: {
                status: client_1.access_requests_status.Rejected,
                processed_by: user.userId ? BigInt(user.userId) : null,
                processed_at: new Date(),
                processed_notes: (body.notes || '').toString().trim(),
                updated_at: new Date(),
            },
        });
        return { msg: 'Request rejected.', request: this.mapRequest(updated) };
    }
    mapAccessRequestRole(role) {
        const mapped = role.replace(/ /g, '_');
        if (Object.values(client_1.access_requests_role_requested).includes(mapped)) {
            return mapped;
        }
        return client_1.access_requests_role_requested.Citizen;
    }
    mapRequest(row) {
        return {
            id: row.id,
            name: row.name,
            email: row.email,
            phone: row.phone,
            roleRequested: row.role_requested ? (0, role_util_1.roleEnumToApi)(row.role_requested) : 'Citizen',
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
};
exports.AccessRequestsService = AccessRequestsService;
exports.AccessRequestsService = AccessRequestsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        users_repository_1.UsersRepository])
], AccessRequestsService);
//# sourceMappingURL=access-requests.service.js.map