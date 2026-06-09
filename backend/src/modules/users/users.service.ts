import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '../../common/security/jwt.strategy';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { toUserResponse, UserResponse } from './user.mapper';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly repo: UsersRepository,
    private readonly jwtService: JwtService,
  ) {}

  async listUsers(query: string | undefined, requester: JwtPayload): Promise<UserResponse[]> {
    const q = (query || '').trim();
    const isPrivileged = ['Super Admin', 'Admin'].includes(requester.role);
    if (!q && !isPrivileged) {
      throw new ForbiddenException({ msg: 'Forbidden' });
    }

    const users = q ? await this.repo.search(q) : await this.repo.listAll();
    return users.map(toUserResponse);
  }

  async register(dto: RegisterUserDto): Promise<{ msg: string; numericId: number | null }> {
    const existing = await this.repo.findByEmail(dto.email);
    if (existing) {
      throw new BadRequestException({ msg: 'User already exists' });
    }

    const user = await this.repo.createUser(dto);
    return { msg: 'User registered successfully', numericId: user.simple_id ?? null };
  }

  async createUser(dto: CreateUserDto): Promise<UserResponse & { tempPassword?: string }> {
    const existing = await this.repo.findByEmail(dto.email);
    if (existing) {
      throw new BadRequestException({ msg: 'User already exists' });
    }

    const passwordToSet = dto.password || this.repo.generateTempPassword();
    const user = await this.repo.createUser({ ...dto, password: passwordToSet });

    const payload = toUserResponse(user);
    if (!dto.password) {
      return { ...payload, tempPassword: passwordToSet };
    }
    return payload;
  }

  async login(dto: LoginDto): Promise<{ token: string; user: UserResponse }> {
    const user = await this.repo.findByEmail(dto.email, true);
    if (!user) {
      throw new BadRequestException({ msg: 'Invalid credentials' });
    }

    const isMatch = await this.repo.comparePassword(user.password, dto.password);
    if (!isMatch) {
      throw new BadRequestException({ msg: 'Invalid credentials' });
    }

    const token = this.jwtService.sign({
      userId: user.id.toString(),
      role: toUserResponse(user).role,
    });
    return { token, user: toUserResponse(user) };
  }

  async getUser(id: number, requester: JwtPayload): Promise<UserResponse> {
    const user = await this.repo.findById(id);
    if (!user) {
      throw new NotFoundException({ msg: 'User not found' });
    }

    const requesterId = requester.userId?.toString();
    if (requesterId !== user.id.toString() && !['Super Admin', 'Admin'].includes(requester.role)) {
      throw new ForbiddenException({ msg: 'Forbidden' });
    }

    return toUserResponse(user);
  }

  async updateUser(id: number, dto: UpdateUserDto, requester: JwtPayload): Promise<UserResponse> {
    const user = await this.repo.findById(id, true);
    if (!user) {
      throw new NotFoundException({ msg: 'User not found' });
    }

    const requesterId = requester.userId?.toString();
    const isAdmin = ['Super Admin', 'Admin'].includes(requester.role);
    if (requesterId !== user.id.toString() && !isAdmin) {
      throw new ForbiddenException({ msg: 'Forbidden' });
    }

    const allowed = new Set(['name', 'email', 'gender', 'cnic', 'cnicExpiry', 'address', 'dob', 'phone']);
    if (isAdmin) {
      allowed.add('role');
      allowed.add('activeStatus');
    }

    const updates: Record<string, string> = {};
    for (const field of allowed) {
      if (Object.prototype.hasOwnProperty.call(dto, field)) {
        updates[field] = (dto as Record<string, string>)[field];
      }
    }
    if (dto.password) {
      updates.password = dto.password;
    }

    const updated = await this.repo.updateUser(user.id, updates);
    return toUserResponse(updated);
  }

  async deleteUser(id: number): Promise<{ msg: string }> {
    const user = await this.repo.findById(id);
    if (!user) {
      throw new NotFoundException({ msg: 'User not found' });
    }
    await this.repo.deleteUser(user.id);
    return { msg: 'User deleted successfully' };
  }

  async resetPassword(
    id: number,
    dto: ResetPasswordDto,
  ): Promise<{ id: bigint; numericId: number | null; tempPassword?: string }> {
    const user = await this.repo.findById(id, true);
    if (!user) {
      throw new NotFoundException({ msg: 'User not found' });
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
}
