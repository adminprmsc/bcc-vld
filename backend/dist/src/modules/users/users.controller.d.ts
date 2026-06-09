import { JwtPayload } from '../../common/security/jwt.strategy';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    list(query: string, user: JwtPayload): Promise<import("./user.mapper").UserResponse[]>;
    register(dto: RegisterUserDto): Promise<{
        msg: string;
        numericId: number | null;
    }>;
    create(dto: CreateUserDto): Promise<import("./user.mapper").UserResponse & {
        tempPassword?: string;
    }>;
    login(dto: LoginDto): Promise<{
        token: string;
        user: import("./user.mapper").UserResponse;
    }>;
    getOne(id: string, user: JwtPayload): Promise<import("./user.mapper").UserResponse>;
    update(id: string, dto: UpdateUserDto, user: JwtPayload): Promise<import("./user.mapper").UserResponse>;
    remove(id: string): Promise<{
        msg: string;
    }>;
    resetPassword(id: string, dto: ResetPasswordDto): Promise<{
        id: bigint;
        numericId: number | null;
        tempPassword?: string;
    }>;
}
