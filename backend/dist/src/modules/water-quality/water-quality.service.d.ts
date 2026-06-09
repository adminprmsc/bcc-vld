import { Prisma } from '@prisma/client';
import { JwtPayload } from '../../common/security/jwt.strategy';
import { TehsilScopeService } from '../../domain/tehsil-scope/tehsil-scope.service';
import { PrismaService } from '../../prisma/prisma.service';
export declare class WaterQualityService {
    private readonly prisma;
    private readonly tehsilScope;
    constructor(prisma: PrismaService, tehsilScope: TehsilScopeService);
    list(user: JwtPayload, query: {
        planId?: string;
        status?: string;
        tehsil?: string;
        limit?: string;
    }): Promise<({
        id: bigint;
        planId: bigint;
        plan: bigint | {
            id: bigint;
            title: string;
            category: string;
            tehsil: string | null;
            district: string | null;
            criticalFlag: boolean | null;
            latestQualityStatus: {
                status: string | null;
                score: number | null;
                label: string | null;
                updatedAt: Date | null;
            };
        };
        planSnapshot: {
            planId: bigint;
            title: string | null;
            category: string | null;
            tehsil: string | null;
            district: string | null;
        };
        status: import(".prisma/client").$Enums.water_quality_samples_status | null;
        assignedSampler: bigint | {
            id: bigint;
            name: string;
            role: string;
        } | null;
        assignedSamplerName: string | null;
        assignedSamplerId: bigint | null;
        assignedAt: Date | null;
        collection: {
            collectedAt: Date | null;
            fieldNotes: string | null;
            location: {
                lat: number;
                lng: number;
            } | null;
            collectedBy: bigint | null;
            collectedByName: string | null;
            attachments: {
                id: bigint | undefined;
                storedName: string;
                originalName: string;
                mimeType: string;
                size: number;
                url: string;
            }[];
        };
        labAnalysis: {
            receivedAt: Date | null;
            completedAt: Date | null;
            analyst: bigint | {
                id: bigint;
                name: string;
                role: string;
            } | null;
            analystName: string | null;
            metrics: Prisma.JsonValue;
            notes: string | null;
            attachments: {
                id: bigint | undefined;
                storedName: string;
                originalName: string;
                mimeType: string;
                size: number;
                url: string;
            }[];
        };
        computedScore: {
            indexName: string | null;
            value: number | null;
            rating: string | null;
            updatedAt: Date | null;
        };
        statusHistory: {
            id: bigint;
            code: string;
            label: string;
            note: string | null;
            tone: string | null;
            createdAt: Date;
            createdBy: bigint;
            createdByName: string | null;
        }[];
        attachments: {
            id: bigint | undefined;
            storedName: string;
            originalName: string;
            mimeType: string;
            size: number;
            url: string;
        }[];
        createdBy: bigint | {
            id: bigint;
            name: string;
            role: string;
        };
        createdByName: string | null;
        updatedBy: bigint | null;
        updatedByName: string | null;
        createdAt: Date;
        updatedAt: Date;
    } | null)[]>;
    getById(id: string, user: JwtPayload): Promise<{
        id: bigint;
        planId: bigint;
        plan: bigint | {
            id: bigint;
            title: string;
            category: string;
            tehsil: string | null;
            district: string | null;
            criticalFlag: boolean | null;
            latestQualityStatus: {
                status: string | null;
                score: number | null;
                label: string | null;
                updatedAt: Date | null;
            };
        };
        planSnapshot: {
            planId: bigint;
            title: string | null;
            category: string | null;
            tehsil: string | null;
            district: string | null;
        };
        status: import(".prisma/client").$Enums.water_quality_samples_status | null;
        assignedSampler: bigint | {
            id: bigint;
            name: string;
            role: string;
        } | null;
        assignedSamplerName: string | null;
        assignedSamplerId: bigint | null;
        assignedAt: Date | null;
        collection: {
            collectedAt: Date | null;
            fieldNotes: string | null;
            location: {
                lat: number;
                lng: number;
            } | null;
            collectedBy: bigint | null;
            collectedByName: string | null;
            attachments: {
                id: bigint | undefined;
                storedName: string;
                originalName: string;
                mimeType: string;
                size: number;
                url: string;
            }[];
        };
        labAnalysis: {
            receivedAt: Date | null;
            completedAt: Date | null;
            analyst: bigint | {
                id: bigint;
                name: string;
                role: string;
            } | null;
            analystName: string | null;
            metrics: Prisma.JsonValue;
            notes: string | null;
            attachments: {
                id: bigint | undefined;
                storedName: string;
                originalName: string;
                mimeType: string;
                size: number;
                url: string;
            }[];
        };
        computedScore: {
            indexName: string | null;
            value: number | null;
            rating: string | null;
            updatedAt: Date | null;
        };
        statusHistory: {
            id: bigint;
            code: string;
            label: string;
            note: string | null;
            tone: string | null;
            createdAt: Date;
            createdBy: bigint;
            createdByName: string | null;
        }[];
        attachments: {
            id: bigint | undefined;
            storedName: string;
            originalName: string;
            mimeType: string;
            size: number;
            url: string;
        }[];
        createdBy: bigint | {
            id: bigint;
            name: string;
            role: string;
        };
        createdByName: string | null;
        updatedBy: bigint | null;
        updatedByName: string | null;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    create(user: JwtPayload, body: {
        planId?: string | number;
        reason?: string;
    }): Promise<{
        id: bigint;
        planId: bigint;
        plan: bigint | {
            id: bigint;
            title: string;
            category: string;
            tehsil: string | null;
            district: string | null;
            criticalFlag: boolean | null;
            latestQualityStatus: {
                status: string | null;
                score: number | null;
                label: string | null;
                updatedAt: Date | null;
            };
        };
        planSnapshot: {
            planId: bigint;
            title: string | null;
            category: string | null;
            tehsil: string | null;
            district: string | null;
        };
        status: import(".prisma/client").$Enums.water_quality_samples_status | null;
        assignedSampler: bigint | {
            id: bigint;
            name: string;
            role: string;
        } | null;
        assignedSamplerName: string | null;
        assignedSamplerId: bigint | null;
        assignedAt: Date | null;
        collection: {
            collectedAt: Date | null;
            fieldNotes: string | null;
            location: {
                lat: number;
                lng: number;
            } | null;
            collectedBy: bigint | null;
            collectedByName: string | null;
            attachments: {
                id: bigint | undefined;
                storedName: string;
                originalName: string;
                mimeType: string;
                size: number;
                url: string;
            }[];
        };
        labAnalysis: {
            receivedAt: Date | null;
            completedAt: Date | null;
            analyst: bigint | {
                id: bigint;
                name: string;
                role: string;
            } | null;
            analystName: string | null;
            metrics: Prisma.JsonValue;
            notes: string | null;
            attachments: {
                id: bigint | undefined;
                storedName: string;
                originalName: string;
                mimeType: string;
                size: number;
                url: string;
            }[];
        };
        computedScore: {
            indexName: string | null;
            value: number | null;
            rating: string | null;
            updatedAt: Date | null;
        };
        statusHistory: {
            id: bigint;
            code: string;
            label: string;
            note: string | null;
            tone: string | null;
            createdAt: Date;
            createdBy: bigint;
            createdByName: string | null;
        }[];
        attachments: {
            id: bigint | undefined;
            storedName: string;
            originalName: string;
            mimeType: string;
            size: number;
            url: string;
        }[];
        createdBy: bigint | {
            id: bigint;
            name: string;
            role: string;
        };
        createdByName: string | null;
        updatedBy: bigint | null;
        updatedByName: string | null;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    assign(id: string, user: JwtPayload, body: {
        samplerId?: string | number;
    }): Promise<{
        id: bigint;
        planId: bigint;
        plan: bigint | {
            id: bigint;
            title: string;
            category: string;
            tehsil: string | null;
            district: string | null;
            criticalFlag: boolean | null;
            latestQualityStatus: {
                status: string | null;
                score: number | null;
                label: string | null;
                updatedAt: Date | null;
            };
        };
        planSnapshot: {
            planId: bigint;
            title: string | null;
            category: string | null;
            tehsil: string | null;
            district: string | null;
        };
        status: import(".prisma/client").$Enums.water_quality_samples_status | null;
        assignedSampler: bigint | {
            id: bigint;
            name: string;
            role: string;
        } | null;
        assignedSamplerName: string | null;
        assignedSamplerId: bigint | null;
        assignedAt: Date | null;
        collection: {
            collectedAt: Date | null;
            fieldNotes: string | null;
            location: {
                lat: number;
                lng: number;
            } | null;
            collectedBy: bigint | null;
            collectedByName: string | null;
            attachments: {
                id: bigint | undefined;
                storedName: string;
                originalName: string;
                mimeType: string;
                size: number;
                url: string;
            }[];
        };
        labAnalysis: {
            receivedAt: Date | null;
            completedAt: Date | null;
            analyst: bigint | {
                id: bigint;
                name: string;
                role: string;
            } | null;
            analystName: string | null;
            metrics: Prisma.JsonValue;
            notes: string | null;
            attachments: {
                id: bigint | undefined;
                storedName: string;
                originalName: string;
                mimeType: string;
                size: number;
                url: string;
            }[];
        };
        computedScore: {
            indexName: string | null;
            value: number | null;
            rating: string | null;
            updatedAt: Date | null;
        };
        statusHistory: {
            id: bigint;
            code: string;
            label: string;
            note: string | null;
            tone: string | null;
            createdAt: Date;
            createdBy: bigint;
            createdByName: string | null;
        }[];
        attachments: {
            id: bigint | undefined;
            storedName: string;
            originalName: string;
            mimeType: string;
            size: number;
            url: string;
        }[];
        createdBy: bigint | {
            id: bigint;
            name: string;
            role: string;
        };
        createdByName: string | null;
        updatedBy: bigint | null;
        updatedByName: string | null;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    updateCollection(id: string, user: JwtPayload, body: {
        collectedAt?: string;
        fieldNotes?: string;
        location?: unknown;
    }): Promise<{
        id: bigint;
        planId: bigint;
        plan: bigint | {
            id: bigint;
            title: string;
            category: string;
            tehsil: string | null;
            district: string | null;
            criticalFlag: boolean | null;
            latestQualityStatus: {
                status: string | null;
                score: number | null;
                label: string | null;
                updatedAt: Date | null;
            };
        };
        planSnapshot: {
            planId: bigint;
            title: string | null;
            category: string | null;
            tehsil: string | null;
            district: string | null;
        };
        status: import(".prisma/client").$Enums.water_quality_samples_status | null;
        assignedSampler: bigint | {
            id: bigint;
            name: string;
            role: string;
        } | null;
        assignedSamplerName: string | null;
        assignedSamplerId: bigint | null;
        assignedAt: Date | null;
        collection: {
            collectedAt: Date | null;
            fieldNotes: string | null;
            location: {
                lat: number;
                lng: number;
            } | null;
            collectedBy: bigint | null;
            collectedByName: string | null;
            attachments: {
                id: bigint | undefined;
                storedName: string;
                originalName: string;
                mimeType: string;
                size: number;
                url: string;
            }[];
        };
        labAnalysis: {
            receivedAt: Date | null;
            completedAt: Date | null;
            analyst: bigint | {
                id: bigint;
                name: string;
                role: string;
            } | null;
            analystName: string | null;
            metrics: Prisma.JsonValue;
            notes: string | null;
            attachments: {
                id: bigint | undefined;
                storedName: string;
                originalName: string;
                mimeType: string;
                size: number;
                url: string;
            }[];
        };
        computedScore: {
            indexName: string | null;
            value: number | null;
            rating: string | null;
            updatedAt: Date | null;
        };
        statusHistory: {
            id: bigint;
            code: string;
            label: string;
            note: string | null;
            tone: string | null;
            createdAt: Date;
            createdBy: bigint;
            createdByName: string | null;
        }[];
        attachments: {
            id: bigint | undefined;
            storedName: string;
            originalName: string;
            mimeType: string;
            size: number;
            url: string;
        }[];
        createdBy: bigint | {
            id: bigint;
            name: string;
            role: string;
        };
        createdByName: string | null;
        updatedBy: bigint | null;
        updatedByName: string | null;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    completeCollection(id: string, user: JwtPayload, body: {
        collectedAt?: string;
        fieldNotes?: string;
        location?: unknown;
    }, files: Express.Multer.File[]): Promise<{
        id: bigint;
        planId: bigint;
        plan: bigint | {
            id: bigint;
            title: string;
            category: string;
            tehsil: string | null;
            district: string | null;
            criticalFlag: boolean | null;
            latestQualityStatus: {
                status: string | null;
                score: number | null;
                label: string | null;
                updatedAt: Date | null;
            };
        };
        planSnapshot: {
            planId: bigint;
            title: string | null;
            category: string | null;
            tehsil: string | null;
            district: string | null;
        };
        status: import(".prisma/client").$Enums.water_quality_samples_status | null;
        assignedSampler: bigint | {
            id: bigint;
            name: string;
            role: string;
        } | null;
        assignedSamplerName: string | null;
        assignedSamplerId: bigint | null;
        assignedAt: Date | null;
        collection: {
            collectedAt: Date | null;
            fieldNotes: string | null;
            location: {
                lat: number;
                lng: number;
            } | null;
            collectedBy: bigint | null;
            collectedByName: string | null;
            attachments: {
                id: bigint | undefined;
                storedName: string;
                originalName: string;
                mimeType: string;
                size: number;
                url: string;
            }[];
        };
        labAnalysis: {
            receivedAt: Date | null;
            completedAt: Date | null;
            analyst: bigint | {
                id: bigint;
                name: string;
                role: string;
            } | null;
            analystName: string | null;
            metrics: Prisma.JsonValue;
            notes: string | null;
            attachments: {
                id: bigint | undefined;
                storedName: string;
                originalName: string;
                mimeType: string;
                size: number;
                url: string;
            }[];
        };
        computedScore: {
            indexName: string | null;
            value: number | null;
            rating: string | null;
            updatedAt: Date | null;
        };
        statusHistory: {
            id: bigint;
            code: string;
            label: string;
            note: string | null;
            tone: string | null;
            createdAt: Date;
            createdBy: bigint;
            createdByName: string | null;
        }[];
        attachments: {
            id: bigint | undefined;
            storedName: string;
            originalName: string;
            mimeType: string;
            size: number;
            url: string;
        }[];
        createdBy: bigint | {
            id: bigint;
            name: string;
            role: string;
        };
        createdByName: string | null;
        updatedBy: bigint | null;
        updatedByName: string | null;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    submitLabResults(id: string, user: JwtPayload, body: {
        receivedAt?: string;
        completedAt?: string;
        metrics?: unknown;
        notes?: string;
    }, files: Express.Multer.File[]): Promise<{
        id: bigint;
        planId: bigint;
        plan: bigint | {
            id: bigint;
            title: string;
            category: string;
            tehsil: string | null;
            district: string | null;
            criticalFlag: boolean | null;
            latestQualityStatus: {
                status: string | null;
                score: number | null;
                label: string | null;
                updatedAt: Date | null;
            };
        };
        planSnapshot: {
            planId: bigint;
            title: string | null;
            category: string | null;
            tehsil: string | null;
            district: string | null;
        };
        status: import(".prisma/client").$Enums.water_quality_samples_status | null;
        assignedSampler: bigint | {
            id: bigint;
            name: string;
            role: string;
        } | null;
        assignedSamplerName: string | null;
        assignedSamplerId: bigint | null;
        assignedAt: Date | null;
        collection: {
            collectedAt: Date | null;
            fieldNotes: string | null;
            location: {
                lat: number;
                lng: number;
            } | null;
            collectedBy: bigint | null;
            collectedByName: string | null;
            attachments: {
                id: bigint | undefined;
                storedName: string;
                originalName: string;
                mimeType: string;
                size: number;
                url: string;
            }[];
        };
        labAnalysis: {
            receivedAt: Date | null;
            completedAt: Date | null;
            analyst: bigint | {
                id: bigint;
                name: string;
                role: string;
            } | null;
            analystName: string | null;
            metrics: Prisma.JsonValue;
            notes: string | null;
            attachments: {
                id: bigint | undefined;
                storedName: string;
                originalName: string;
                mimeType: string;
                size: number;
                url: string;
            }[];
        };
        computedScore: {
            indexName: string | null;
            value: number | null;
            rating: string | null;
            updatedAt: Date | null;
        };
        statusHistory: {
            id: bigint;
            code: string;
            label: string;
            note: string | null;
            tone: string | null;
            createdAt: Date;
            createdBy: bigint;
            createdByName: string | null;
        }[];
        attachments: {
            id: bigint | undefined;
            storedName: string;
            originalName: string;
            mimeType: string;
            size: number;
            url: string;
        }[];
        createdBy: bigint | {
            id: bigint;
            name: string;
            role: string;
        };
        createdByName: string | null;
        updatedBy: bigint | null;
        updatedByName: string | null;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    closeSample(id: string, user: JwtPayload, body: {
        note?: string;
    }): Promise<{
        id: bigint;
        planId: bigint;
        plan: bigint | {
            id: bigint;
            title: string;
            category: string;
            tehsil: string | null;
            district: string | null;
            criticalFlag: boolean | null;
            latestQualityStatus: {
                status: string | null;
                score: number | null;
                label: string | null;
                updatedAt: Date | null;
            };
        };
        planSnapshot: {
            planId: bigint;
            title: string | null;
            category: string | null;
            tehsil: string | null;
            district: string | null;
        };
        status: import(".prisma/client").$Enums.water_quality_samples_status | null;
        assignedSampler: bigint | {
            id: bigint;
            name: string;
            role: string;
        } | null;
        assignedSamplerName: string | null;
        assignedSamplerId: bigint | null;
        assignedAt: Date | null;
        collection: {
            collectedAt: Date | null;
            fieldNotes: string | null;
            location: {
                lat: number;
                lng: number;
            } | null;
            collectedBy: bigint | null;
            collectedByName: string | null;
            attachments: {
                id: bigint | undefined;
                storedName: string;
                originalName: string;
                mimeType: string;
                size: number;
                url: string;
            }[];
        };
        labAnalysis: {
            receivedAt: Date | null;
            completedAt: Date | null;
            analyst: bigint | {
                id: bigint;
                name: string;
                role: string;
            } | null;
            analystName: string | null;
            metrics: Prisma.JsonValue;
            notes: string | null;
            attachments: {
                id: bigint | undefined;
                storedName: string;
                originalName: string;
                mimeType: string;
                size: number;
                url: string;
            }[];
        };
        computedScore: {
            indexName: string | null;
            value: number | null;
            rating: string | null;
            updatedAt: Date | null;
        };
        statusHistory: {
            id: bigint;
            code: string;
            label: string;
            note: string | null;
            tone: string | null;
            createdAt: Date;
            createdBy: bigint;
            createdByName: string | null;
        }[];
        attachments: {
            id: bigint | undefined;
            storedName: string;
            originalName: string;
            mimeType: string;
            size: number;
            url: string;
        }[];
        createdBy: bigint | {
            id: bigint;
            name: string;
            role: string;
        };
        createdByName: string | null;
        updatedBy: bigint | null;
        updatedByName: string | null;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    cancelSample(id: string, user: JwtPayload, body: {
        note?: string;
    }): Promise<{
        id: bigint;
        planId: bigint;
        plan: bigint | {
            id: bigint;
            title: string;
            category: string;
            tehsil: string | null;
            district: string | null;
            criticalFlag: boolean | null;
            latestQualityStatus: {
                status: string | null;
                score: number | null;
                label: string | null;
                updatedAt: Date | null;
            };
        };
        planSnapshot: {
            planId: bigint;
            title: string | null;
            category: string | null;
            tehsil: string | null;
            district: string | null;
        };
        status: import(".prisma/client").$Enums.water_quality_samples_status | null;
        assignedSampler: bigint | {
            id: bigint;
            name: string;
            role: string;
        } | null;
        assignedSamplerName: string | null;
        assignedSamplerId: bigint | null;
        assignedAt: Date | null;
        collection: {
            collectedAt: Date | null;
            fieldNotes: string | null;
            location: {
                lat: number;
                lng: number;
            } | null;
            collectedBy: bigint | null;
            collectedByName: string | null;
            attachments: {
                id: bigint | undefined;
                storedName: string;
                originalName: string;
                mimeType: string;
                size: number;
                url: string;
            }[];
        };
        labAnalysis: {
            receivedAt: Date | null;
            completedAt: Date | null;
            analyst: bigint | {
                id: bigint;
                name: string;
                role: string;
            } | null;
            analystName: string | null;
            metrics: Prisma.JsonValue;
            notes: string | null;
            attachments: {
                id: bigint | undefined;
                storedName: string;
                originalName: string;
                mimeType: string;
                size: number;
                url: string;
            }[];
        };
        computedScore: {
            indexName: string | null;
            value: number | null;
            rating: string | null;
            updatedAt: Date | null;
        };
        statusHistory: {
            id: bigint;
            code: string;
            label: string;
            note: string | null;
            tone: string | null;
            createdAt: Date;
            createdBy: bigint;
            createdByName: string | null;
        }[];
        attachments: {
            id: bigint | undefined;
            storedName: string;
            originalName: string;
            mimeType: string;
            size: number;
            url: string;
        }[];
        createdBy: bigint | {
            id: bigint;
            name: string;
            role: string;
        };
        createdByName: string | null;
        updatedBy: bigint | null;
        updatedByName: string | null;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    uploadAttachments(user: JwtPayload, files: Express.Multer.File[]): {
        attachments: {
            id: bigint | undefined;
            storedName: string;
            originalName: string;
            mimeType: string;
            size: number;
            url: string;
        }[];
    };
    listByPlan(user: JwtPayload, planId: string, query: {
        tehsil?: string;
        limit?: string;
    }): Promise<({
        id: bigint;
        planId: bigint;
        plan: bigint | {
            id: bigint;
            title: string;
            category: string;
            tehsil: string | null;
            district: string | null;
            criticalFlag: boolean | null;
            latestQualityStatus: {
                status: string | null;
                score: number | null;
                label: string | null;
                updatedAt: Date | null;
            };
        };
        planSnapshot: {
            planId: bigint;
            title: string | null;
            category: string | null;
            tehsil: string | null;
            district: string | null;
        };
        status: import(".prisma/client").$Enums.water_quality_samples_status | null;
        assignedSampler: bigint | {
            id: bigint;
            name: string;
            role: string;
        } | null;
        assignedSamplerName: string | null;
        assignedSamplerId: bigint | null;
        assignedAt: Date | null;
        collection: {
            collectedAt: Date | null;
            fieldNotes: string | null;
            location: {
                lat: number;
                lng: number;
            } | null;
            collectedBy: bigint | null;
            collectedByName: string | null;
            attachments: {
                id: bigint | undefined;
                storedName: string;
                originalName: string;
                mimeType: string;
                size: number;
                url: string;
            }[];
        };
        labAnalysis: {
            receivedAt: Date | null;
            completedAt: Date | null;
            analyst: bigint | {
                id: bigint;
                name: string;
                role: string;
            } | null;
            analystName: string | null;
            metrics: Prisma.JsonValue;
            notes: string | null;
            attachments: {
                id: bigint | undefined;
                storedName: string;
                originalName: string;
                mimeType: string;
                size: number;
                url: string;
            }[];
        };
        computedScore: {
            indexName: string | null;
            value: number | null;
            rating: string | null;
            updatedAt: Date | null;
        };
        statusHistory: {
            id: bigint;
            code: string;
            label: string;
            note: string | null;
            tone: string | null;
            createdAt: Date;
            createdBy: bigint;
            createdByName: string | null;
        }[];
        attachments: {
            id: bigint | undefined;
            storedName: string;
            originalName: string;
            mimeType: string;
            size: number;
            url: string;
        }[];
        createdBy: bigint | {
            id: bigint;
            name: string;
            role: string;
        };
        createdByName: string | null;
        updatedBy: bigint | null;
        updatedByName: string | null;
        createdAt: Date;
        updatedAt: Date;
    } | null)[]>;
    private buildFilter;
    private fetchEditableSample;
    private maybeAutoAssignSampler;
    private resolveDefaultSampler;
    private saveFileAttachments;
    private ensureRole;
    private ensureSamplerOwnership;
    private resolveActor;
}
