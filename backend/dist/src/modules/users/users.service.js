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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const user_mapper_1 = require("./user.mapper");
const users_repository_1 = require("./users.repository");
let UsersService = class UsersService {
    constructor(repo, jwtService) {
        this.repo = repo;
        this.jwtService = jwtService;
    }
    async listUsers(query, requester) {
        const q = (query || '').trim();
        const isPrivileged = ['Super Admin', 'Admin'].includes(requester.role);
        if (!q && !isPrivileged) {
            throw new common_1.ForbiddenException({ msg: 'Forbidden' });
        }
        const users = q ? await this.repo.search(q) : await this.repo.listAll();
        return users.map(user_mapper_1.toUserResponse);
    }
    async register(dto) {
        const existing = await this.repo.findByEmail(dto.email);
        if (existing) {
            throw new common_1.BadRequestException({ msg: 'User already exists' });
        }
        const user = await this.repo.createUser(dto);
        return { msg: 'User registered successfully', numericId: user.simple_id ?? null };
    }
    async createUser(dto) {
        const existing = await this.repo.findByEmail(dto.email);
        if (existing) {
            throw new common_1.BadRequestException({ msg: 'User already exists' });
        }
        const passwordToSet = dto.password || this.repo.generateTempPassword();
        const user = await this.repo.createUser({ ...dto, password: passwordToSet });
        const payload = (0, user_mapper_1.toUserResponse)(user);
        if (!dto.password) {
            return { ...payload, tempPassword: passwordToSet };
        }
        return payload;
    }
    async login(dto) {
        const user = await this.repo.findByEmail(dto.email, true);
        if (!user) {
            throw new common_1.BadRequestException({ msg: 'Invalid credentials' });
        }
        const isMatch = await this.repo.comparePassword(user.password, dto.password);
        if (!isMatch) {
            throw new common_1.BadRequestException({ msg: 'Invalid credentials' });
        }
        const token = this.jwtService.sign({
            userId: user.id.toString(),
            role: (0, user_mapper_1.toUserResponse)(user).role,
        });
        return { token, user: (0, user_mapper_1.toUserResponse)(user) };
    }
    async getUser(id, requester) {
        const user = await this.repo.findById(id);
        if (!user) {
            throw new common_1.NotFoundException({ msg: 'User not found' });
        }
        const requesterId = requester.userId?.toString();
        if (requesterId !== user.id.toString() && !['Super Admin', 'Admin'].includes(requester.role)) {
            throw new common_1.ForbiddenException({ msg: 'Forbidden' });
        }
        return (0, user_mapper_1.toUserResponse)(user);
    }
    async updateUser(id, dto, requester) {
        const user = await this.repo.findById(id, true);
        if (!user) {
            throw new common_1.NotFoundException({ msg: 'User not found' });
        }
        const requesterId = requester.userId?.toString();
        const isAdmin = ['Super Admin', 'Admin'].includes(requester.role);
        if (requesterId !== user.id.toString() && !isAdmin) {
            throw new common_1.ForbiddenException({ msg: 'Forbidden' });
        }
        const allowed = new Set(['name', 'email', 'gender', 'cnic', 'cnicExpiry', 'address', 'dob', 'phone']);
        if (isAdmin) {
            allowed.add('role');
            allowed.add('activeStatus');
        }
        const updates = {};
        for (const field of allowed) {
            if (Object.prototype.hasOwnProperty.call(dto, field)) {
                updates[field] = dto[field];
            }
        }
        if (dto.password) {
            updates.password = dto.password;
        }
        const updated = await this.repo.updateUser(user.id, updates);
        return (0, user_mapper_1.toUserResponse)(updated);
    }
    async deleteUser(id) {
        const user = await this.repo.findById(id);
        if (!user) {
            throw new common_1.NotFoundException({ msg: 'User not found' });
        }
        await this.repo.deleteUser(user.id);
        return { msg: 'User deleted successfully' };
    }
    async resetPassword(id, dto) {
        const user = await this.repo.findById(id, true);
        if (!user) {
            throw new common_1.NotFoundException({ msg: 'User not found' });
        }
        const supplied = (dto.password || '').trim();
        const nextPassword = supplied || this.repo.generateTempPassword();
        await this.repo.updateUser(user.id, { password: nextPassword });
        return {
            id: user.id,
            numericId: user.simple_id ?? null,
            tempPassword: supplied ? undefined : nextPassword,
        };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_repository_1.UsersRepository,
        jwt_1.JwtService])
], UsersService);
//# sourceMappingURL=users.service.js.map