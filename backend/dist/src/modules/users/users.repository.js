"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersRepository = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcryptjs"));
const crypto_1 = require("crypto");
const prisma_service_1 = require("../../prisma/prisma.service");
const counter_service_1 = require("../../common/counter/counter.service");
const role_util_1 = require("../../common/utils/role.util");
let UsersRepository = class UsersRepository {
    constructor(prisma, counters) {
        this.prisma = prisma;
        this.counters = counters;
    }
    generateTempPassword() {
        return `Temp#${(0, crypto_1.randomBytes)(4).toString('hex')}`;
    }
    async hashPassword(plain) {
        const salt = await bcrypt.genSalt(10);
        return bcrypt.hash(plain, salt);
    }
    async comparePassword(hashed, candidate) {
        return bcrypt.compare(candidate, hashed);
    }
    findByEmail(email, includePassword = false) {
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
    findById(id, includePassword = false) {
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
    async search(query) {
        const like = `%${query}%`;
        return this.prisma.$queryRaw `
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
    async createUser(data) {
        const simpleId = data.simpleId ?? (await this.counters.nextSequence('user-simple-id'));
        const hashed = await this.hashPassword(data.password);
        const now = new Date();
        return this.prisma.users.create({
            data: {
                simple_id: simpleId,
                name: data.name,
                email: data.email,
                password: hashed,
                role: (0, role_util_1.roleApiToEnum)(data.role),
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
    async updateUser(id, updates) {
        const data = { updated_at: new Date() };
        if (updates.name !== undefined)
            data.name = updates.name;
        if (updates.email !== undefined)
            data.email = updates.email;
        if (updates.gender !== undefined)
            data.gender = updates.gender;
        if (updates.cnic !== undefined)
            data.cnic = updates.cnic;
        if (updates.cnicExpiry !== undefined)
            data.cnic_expiry = updates.cnicExpiry;
        if (updates.address !== undefined)
            data.address = updates.address;
        if (updates.dob !== undefined)
            data.dob = updates.dob;
        if (updates.phone !== undefined)
            data.phone = updates.phone;
        if (updates.role !== undefined)
            data.role = (0, role_util_1.roleApiToEnum)(updates.role);
        if (updates.activeStatus !== undefined)
            data.active_status = updates.activeStatus;
        if (updates.password)
            data.password = await this.hashPassword(updates.password);
        return this.prisma.users.update({
            where: { id },
            data: data,
        });
    }
    deleteUser(id) {
        return this.prisma.users.delete({ where: { id } });
    }
};
exports.UsersRepository = UsersRepository;
exports.UsersRepository = UsersRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        counter_service_1.CounterService])
], UsersRepository);
//# sourceMappingURL=users.repository.js.map