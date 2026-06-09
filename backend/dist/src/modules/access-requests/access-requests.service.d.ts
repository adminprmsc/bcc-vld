import { JwtPayload } from '../../common/security/jwt.strategy';
import { UsersRepository } from '../users/users.repository';
import { PrismaService } from '../../prisma/prisma.service';
export declare class AccessRequestsService {
    private readonly prisma;
    private readonly usersRepo;
    constructor(prisma: PrismaService, usersRepo: UsersRepository);
    create(body: {
        name?: string;
        email?: string;
        phone?: string;
        roleRequested?: string;
        tehsil?: string;
        message?: string;
    }): Promise<{
        msg: string;
        request: {
            id: bigint;
            name: string;
            email: string;
            phone: string;
            roleRequested: string;
            tehsil: string | null;
            message: string | null;
            status: import(".prisma/client").$Enums.access_requests_status | null;
            processedBy: bigint | null;
            processedAt: Date | null;
            processedNotes: string | null;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    listAll(): Promise<{
        id: bigint;
        name: string;
        email: string;
        phone: string;
        roleRequested: string;
        tehsil: string | null;
        message: string | null;
        status: import(".prisma/client").$Enums.access_requests_status | null;
        processedBy: bigint | null;
        processedAt: Date | null;
        processedNotes: string | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    approve(id: string, user: JwtPayload, body: {
        notes?: string;
        role?: string;
    }): Promise<{
        msg: string;
        request: {
            id: bigint;
            name: string;
            email: string;
            phone: string;
            roleRequested: string;
            tehsil: string | null;
            message: string | null;
            status: import(".prisma/client").$Enums.access_requests_status | null;
            processedBy: bigint | null;
            processedAt: Date | null;
            processedNotes: string | null;
            createdAt: Date;
            updatedAt: Date;
        };
        user: {
            id: bigint;
            name: string;
            email: string;
            role: string;
            phone: string | null;
            activeStatus: string | null;
        };
        tempPassword: string | undefined;
    }>;
    reject(id: string, user: JwtPayload, body: {
        notes?: string;
    }): Promise<{
        msg: string;
        request: {
            id: bigint;
            name: string;
            email: string;
            phone: string;
            roleRequested: string;
            tehsil: string | null;
            message: string | null;
            status: import(".prisma/client").$Enums.access_requests_status | null;
            processedBy: bigint | null;
            processedAt: Date | null;
            processedNotes: string | null;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    private mapAccessRequestRole;
    private mapRequest;
}
