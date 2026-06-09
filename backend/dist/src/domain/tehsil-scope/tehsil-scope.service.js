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
exports.TehsilScopeService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const TEHSIL_SCOPE_ROLES = new Set([
    'dm tehsil',
    'tehsil dm',
    'tehsil manager',
    'tm',
    'bcc officer',
    'bcc officer tehsil',
    'ra environment',
]);
let TehsilScopeService = class TehsilScopeService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    normaliseText(value) {
        return (value ?? '').toString().trim();
    }
    normaliseRole(value) {
        return this.normaliseText(value).toLowerCase();
    }
    needsTehsilScope(role) {
        return TEHSIL_SCOPE_ROLES.has(this.normaliseRole(role));
    }
    collectTehsilValues(userDoc) {
        const values = new Set();
        const push = (input) => {
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
            const profileObj = profile;
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
    async resolveUserTehsils(userContext) {
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
        return this.collectTehsilValues(user);
    }
    buildTehsilScopeWhere(tehsils, field = 'tehsil') {
        if (!Array.isArray(tehsils) || tehsils.length === 0) {
            return null;
        }
        if (tehsils.length === 1) {
            return client_1.Prisma.sql `${client_1.Prisma.raw(field)} LIKE ${tehsils[0]}`;
        }
        return client_1.Prisma.sql `${client_1.Prisma.raw(field)} IN (${client_1.Prisma.join(tehsils)})`;
    }
    tehsilMatches(tehsils, candidate) {
        if (!Array.isArray(tehsils) || tehsils.length === 0) {
            return false;
        }
        const candidateKey = this.normaliseText(candidate).toLowerCase();
        if (!candidateKey) {
            return false;
        }
        return tehsils.some((value) => this.normaliseText(value).toLowerCase() === candidateKey);
    }
    buildTehsilScopePrismaFilter(tehsils, field) {
        if (!Array.isArray(tehsils) || tehsils.length === 0) {
            return null;
        }
        if (tehsils.length === 1) {
            return { [field]: tehsils[0] };
        }
        return { [field]: { in: tehsils } };
    }
};
exports.TehsilScopeService = TehsilScopeService;
exports.TehsilScopeService = TehsilScopeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TehsilScopeService);
//# sourceMappingURL=tehsil-scope.service.js.map