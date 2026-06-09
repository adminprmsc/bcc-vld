import { JwtPayload } from '../../common/security/jwt.strategy';
import { WaterQualityService } from './water-quality.service';
export declare class WaterQualityController {
    private readonly service;
    constructor(service: WaterQualityService);
    list(user: JwtPayload, planId?: string, status?: string, tehsil?: string, limit?: string): Promise<({
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
            metrics: import("@prisma/client/runtime/client").JsonValue;
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
    listByPlan(user: JwtPayload, planId: string, tehsil?: string, limit?: string): Promise<({
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
            metrics: import("@prisma/client/runtime/client").JsonValue;
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
    getById(user: JwtPayload, id: string): Promise<{
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
            metrics: import("@prisma/client/runtime/client").JsonValue;
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
            metrics: import("@prisma/client/runtime/client").JsonValue;
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
    assign(user: JwtPayload, id: string, body: {
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
            metrics: import("@prisma/client/runtime/client").JsonValue;
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
    updateCollection(user: JwtPayload, id: string, body: {
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
            metrics: import("@prisma/client/runtime/client").JsonValue;
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
    completeCollection(user: JwtPayload, id: string, body: {
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
            metrics: import("@prisma/client/runtime/client").JsonValue;
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
    submitLabResults(user: JwtPayload, id: string, body: {
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
            metrics: import("@prisma/client/runtime/client").JsonValue;
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
    close(user: JwtPayload, id: string, body: {
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
            metrics: import("@prisma/client/runtime/client").JsonValue;
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
    cancel(user: JwtPayload, id: string, body: {
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
            metrics: import("@prisma/client/runtime/client").JsonValue;
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
}
