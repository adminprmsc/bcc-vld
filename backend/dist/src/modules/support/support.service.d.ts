import { support_requests_priority, support_requests_status } from '@prisma/client';
import { JwtPayload } from '../../common/security/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
export declare class SupportService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private includes;
    private mapRequest;
    private reload;
    private resolveDefaultAdmin;
    private generateTicketNumber;
    create(user: JwtPayload, body: {
        category?: string;
        subject?: string;
        message?: string;
        priority?: string;
    }, files?: Express.Multer.File[]): Promise<{
        creator: {
            id: bigint;
            name: string;
            email: string;
            role: string;
        } | null;
        assignee: {
            id: bigint;
            name: string;
            email: string;
            role: string;
        } | null;
        updates: {
            id: bigint;
            supportRequestId: bigint;
            actorId: bigint;
            action: string;
            notes: string | null;
            createdAt: Date;
            actor: {
                id: bigint;
                name: string;
                email: string;
                role: string;
            } | null;
        }[];
        attachments: {
            id: bigint;
            created_at: Date;
            updated_at: Date;
            size: bigint | null;
            stored_name: string;
            original_name: string;
            mime_type: string | null;
            support_request_id: bigint;
        }[];
        createdBy: bigint;
        requesterName: string;
        requesterEmail: string;
        requesterRole: string | null;
        ticketNumber: string;
        resolutionNotes: string | null;
        assignedTo: bigint | null;
        createdAt: Date;
        updatedAt: Date;
        support_request_attachments: {
            id: bigint;
            created_at: Date;
            updated_at: Date;
            size: bigint | null;
            stored_name: string;
            original_name: string;
            mime_type: string | null;
            support_request_id: bigint;
        }[];
        support_request_updates: ({
            users: {
                id: bigint;
                email: string;
                name: string;
                role: import(".prisma/client").$Enums.users_role;
            };
        } & {
            id: bigint;
            created_at: Date;
            updated_at: Date;
            action: string;
            notes: string | null;
            support_request_id: bigint;
            actor_id: bigint;
        })[];
        users_support_requests_created_byTousers: {
            id: bigint;
            email: string;
            name: string;
            role: import(".prisma/client").$Enums.users_role;
        };
        users_support_requests_assigned_toTousers: {
            id: bigint;
            email: string;
            name: string;
            role: import(".prisma/client").$Enums.users_role;
        } | null;
        id: bigint;
        created_at: Date;
        updated_at: Date;
        message: string;
        status: import(".prisma/client").$Enums.support_requests_status | null;
        category: string;
        created_by: bigint;
        assigned_to: bigint | null;
        priority: import(".prisma/client").$Enums.support_requests_priority | null;
        ticket_number: string;
        requester_name: string;
        requester_email: string;
        requester_role: string | null;
        subject: string | null;
        resolution_notes: string | null;
    } | null>;
    listMine(user: JwtPayload): Promise<({
        creator: {
            id: bigint;
            name: string;
            email: string;
            role: string;
        } | null;
        assignee: {
            id: bigint;
            name: string;
            email: string;
            role: string;
        } | null;
        updates: {
            id: bigint;
            supportRequestId: bigint;
            actorId: bigint;
            action: string;
            notes: string | null;
            createdAt: Date;
            actor: {
                id: bigint;
                name: string;
                email: string;
                role: string;
            } | null;
        }[];
        attachments: {
            id: bigint;
            created_at: Date;
            updated_at: Date;
            size: bigint | null;
            stored_name: string;
            original_name: string;
            mime_type: string | null;
            support_request_id: bigint;
        }[];
        createdBy: bigint;
        requesterName: string;
        requesterEmail: string;
        requesterRole: string | null;
        ticketNumber: string;
        resolutionNotes: string | null;
        assignedTo: bigint | null;
        createdAt: Date;
        updatedAt: Date;
        support_request_attachments: {
            id: bigint;
            created_at: Date;
            updated_at: Date;
            size: bigint | null;
            stored_name: string;
            original_name: string;
            mime_type: string | null;
            support_request_id: bigint;
        }[];
        support_request_updates: ({
            users: {
                id: bigint;
                email: string;
                name: string;
                role: import(".prisma/client").$Enums.users_role;
            };
        } & {
            id: bigint;
            created_at: Date;
            updated_at: Date;
            action: string;
            notes: string | null;
            support_request_id: bigint;
            actor_id: bigint;
        })[];
        users_support_requests_created_byTousers: {
            id: bigint;
            email: string;
            name: string;
            role: import(".prisma/client").$Enums.users_role;
        };
        users_support_requests_assigned_toTousers: {
            id: bigint;
            email: string;
            name: string;
            role: import(".prisma/client").$Enums.users_role;
        } | null;
        id: bigint;
        created_at: Date;
        updated_at: Date;
        message: string;
        status: import(".prisma/client").$Enums.support_requests_status | null;
        category: string;
        created_by: bigint;
        assigned_to: bigint | null;
        priority: import(".prisma/client").$Enums.support_requests_priority | null;
        ticket_number: string;
        requester_name: string;
        requester_email: string;
        requester_role: string | null;
        subject: string | null;
        resolution_notes: string | null;
    } | null)[]>;
    listAdmin(user: JwtPayload, query: {
        status?: string;
        assigned?: string;
    }): Promise<({
        creator: {
            id: bigint;
            name: string;
            email: string;
            role: string;
        } | null;
        assignee: {
            id: bigint;
            name: string;
            email: string;
            role: string;
        } | null;
        updates: {
            id: bigint;
            supportRequestId: bigint;
            actorId: bigint;
            action: string;
            notes: string | null;
            createdAt: Date;
            actor: {
                id: bigint;
                name: string;
                email: string;
                role: string;
            } | null;
        }[];
        attachments: {
            id: bigint;
            created_at: Date;
            updated_at: Date;
            size: bigint | null;
            stored_name: string;
            original_name: string;
            mime_type: string | null;
            support_request_id: bigint;
        }[];
        createdBy: bigint;
        requesterName: string;
        requesterEmail: string;
        requesterRole: string | null;
        ticketNumber: string;
        resolutionNotes: string | null;
        assignedTo: bigint | null;
        createdAt: Date;
        updatedAt: Date;
        support_request_attachments: {
            id: bigint;
            created_at: Date;
            updated_at: Date;
            size: bigint | null;
            stored_name: string;
            original_name: string;
            mime_type: string | null;
            support_request_id: bigint;
        }[];
        support_request_updates: ({
            users: {
                id: bigint;
                email: string;
                name: string;
                role: import(".prisma/client").$Enums.users_role;
            };
        } & {
            id: bigint;
            created_at: Date;
            updated_at: Date;
            action: string;
            notes: string | null;
            support_request_id: bigint;
            actor_id: bigint;
        })[];
        users_support_requests_created_byTousers: {
            id: bigint;
            email: string;
            name: string;
            role: import(".prisma/client").$Enums.users_role;
        };
        users_support_requests_assigned_toTousers: {
            id: bigint;
            email: string;
            name: string;
            role: import(".prisma/client").$Enums.users_role;
        } | null;
        id: bigint;
        created_at: Date;
        updated_at: Date;
        message: string;
        status: import(".prisma/client").$Enums.support_requests_status | null;
        category: string;
        created_by: bigint;
        assigned_to: bigint | null;
        priority: import(".prisma/client").$Enums.support_requests_priority | null;
        ticket_number: string;
        requester_name: string;
        requester_email: string;
        requester_role: string | null;
        subject: string | null;
        resolution_notes: string | null;
    } | null)[]>;
    patchAdmin(id: string, user: JwtPayload, body: {
        status?: support_requests_status;
        resolutionNotes?: string;
        assignedTo?: string | number;
        priority?: support_requests_priority;
    }): Promise<{
        creator: {
            id: bigint;
            name: string;
            email: string;
            role: string;
        } | null;
        assignee: {
            id: bigint;
            name: string;
            email: string;
            role: string;
        } | null;
        updates: {
            id: bigint;
            supportRequestId: bigint;
            actorId: bigint;
            action: string;
            notes: string | null;
            createdAt: Date;
            actor: {
                id: bigint;
                name: string;
                email: string;
                role: string;
            } | null;
        }[];
        attachments: {
            id: bigint;
            created_at: Date;
            updated_at: Date;
            size: bigint | null;
            stored_name: string;
            original_name: string;
            mime_type: string | null;
            support_request_id: bigint;
        }[];
        createdBy: bigint;
        requesterName: string;
        requesterEmail: string;
        requesterRole: string | null;
        ticketNumber: string;
        resolutionNotes: string | null;
        assignedTo: bigint | null;
        createdAt: Date;
        updatedAt: Date;
        support_request_attachments: {
            id: bigint;
            created_at: Date;
            updated_at: Date;
            size: bigint | null;
            stored_name: string;
            original_name: string;
            mime_type: string | null;
            support_request_id: bigint;
        }[];
        support_request_updates: ({
            users: {
                id: bigint;
                email: string;
                name: string;
                role: import(".prisma/client").$Enums.users_role;
            };
        } & {
            id: bigint;
            created_at: Date;
            updated_at: Date;
            action: string;
            notes: string | null;
            support_request_id: bigint;
            actor_id: bigint;
        })[];
        users_support_requests_created_byTousers: {
            id: bigint;
            email: string;
            name: string;
            role: import(".prisma/client").$Enums.users_role;
        };
        users_support_requests_assigned_toTousers: {
            id: bigint;
            email: string;
            name: string;
            role: import(".prisma/client").$Enums.users_role;
        } | null;
        id: bigint;
        created_at: Date;
        updated_at: Date;
        message: string;
        status: import(".prisma/client").$Enums.support_requests_status | null;
        category: string;
        created_by: bigint;
        assigned_to: bigint | null;
        priority: import(".prisma/client").$Enums.support_requests_priority | null;
        ticket_number: string;
        requester_name: string;
        requester_email: string;
        requester_role: string | null;
        subject: string | null;
        resolution_notes: string | null;
    } | null>;
    addComment(id: string, user: JwtPayload, note: string): Promise<{
        creator: {
            id: bigint;
            name: string;
            email: string;
            role: string;
        } | null;
        assignee: {
            id: bigint;
            name: string;
            email: string;
            role: string;
        } | null;
        updates: {
            id: bigint;
            supportRequestId: bigint;
            actorId: bigint;
            action: string;
            notes: string | null;
            createdAt: Date;
            actor: {
                id: bigint;
                name: string;
                email: string;
                role: string;
            } | null;
        }[];
        attachments: {
            id: bigint;
            created_at: Date;
            updated_at: Date;
            size: bigint | null;
            stored_name: string;
            original_name: string;
            mime_type: string | null;
            support_request_id: bigint;
        }[];
        createdBy: bigint;
        requesterName: string;
        requesterEmail: string;
        requesterRole: string | null;
        ticketNumber: string;
        resolutionNotes: string | null;
        assignedTo: bigint | null;
        createdAt: Date;
        updatedAt: Date;
        support_request_attachments: {
            id: bigint;
            created_at: Date;
            updated_at: Date;
            size: bigint | null;
            stored_name: string;
            original_name: string;
            mime_type: string | null;
            support_request_id: bigint;
        }[];
        support_request_updates: ({
            users: {
                id: bigint;
                email: string;
                name: string;
                role: import(".prisma/client").$Enums.users_role;
            };
        } & {
            id: bigint;
            created_at: Date;
            updated_at: Date;
            action: string;
            notes: string | null;
            support_request_id: bigint;
            actor_id: bigint;
        })[];
        users_support_requests_created_byTousers: {
            id: bigint;
            email: string;
            name: string;
            role: import(".prisma/client").$Enums.users_role;
        };
        users_support_requests_assigned_toTousers: {
            id: bigint;
            email: string;
            name: string;
            role: import(".prisma/client").$Enums.users_role;
        } | null;
        id: bigint;
        created_at: Date;
        updated_at: Date;
        message: string;
        status: import(".prisma/client").$Enums.support_requests_status | null;
        category: string;
        created_by: bigint;
        assigned_to: bigint | null;
        priority: import(".prisma/client").$Enums.support_requests_priority | null;
        ticket_number: string;
        requester_name: string;
        requester_email: string;
        requester_role: string | null;
        subject: string | null;
        resolution_notes: string | null;
    } | null>;
}
