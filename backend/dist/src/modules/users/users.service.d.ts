import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '../../common/security/jwt.strategy';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponse } from './user.mapper';
import { UsersRepository } from './users.repository';
export declare class UsersService {
    private readonly repo;
    private readonly jwtService;
    constructor(repo: UsersRepository, jwtService: JwtService);
    listUsers(query: string | undefined, requester: JwtPayload): Promise<UserResponse[]>;
    register(dto: RegisterUserDto): Promise<{
        msg: string;
        numericId: number | null;
    }>;
    createUser(dto: CreateUserDto): Promise<UserResponse & {
        tempPassword?: string;
    }>;
    login(dto: LoginDto): Promise<{
        token: string;
        user: UserResponse;
    }>;
    getUser(id: number, requester: JwtPayload): Promise<UserResponse>;
    updateUser(id: number, dto: UpdateUserDto, requester: JwtPayload): Promise<UserResponse>;
    deleteUser(id: number): Promise<{
        msg: string;
    }>;
    resetPassword(id: number, dto: ResetPasswordDto): Promise<{
        id: bigint;
        numericId: number | null;
        tempPassword?: string;
    }>;
}
