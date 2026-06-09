import { Response } from 'express';
import { JwtPayload } from '../../common/security/jwt.strategy';
import { RequisitionService } from './requisition.service';
export declare class RequisitionController {
    private readonly service;
    constructor(service: RequisitionService);
    getDashboardStats(user: JwtPayload, tehsil?: string, district?: string, startDate?: string, endDate?: string): Promise<{
        totalRequisitions: number;
        statusCounts: Record<string, number>;
        landAreaKPIs: {
            landAreaRequested: {
                sqFt: number;
                kanals: number;
                count: number;
                label: string;
            };
            landAcquired: {
                sqFt: number;
                kanals: number;
                count: number;
                label: string;
            };
        };
        workflowStages: {
            dmReview: number;
            bccOfficerReview: number;
            tmReview: number;
            bccSpecialistReview: number;
            wbPending: number;
            wbApproved: number;
            closed: number;
        };
        filters: {
            tehsil: string | undefined;
            district: string | undefined;
            startDate: string | undefined;
            endDate: string | undefined;
        };
    }>;
    findAll(user: JwtPayload): Promise<({
        id: bigint;
        _id: bigint;
        sequenceNumber: number | null;
        title: string;
        description: string | null;
        purpose: string;
        division: string | null;
        district: string | null;
        tehsil: string;
        requestedBy: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        requester: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignedTo: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignee: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        landArea: string | null;
        landType: string | null;
        landBreadth: number | null;
        landDepth: number | null;
        calculatedAreaSqFt: number | null;
        calculatedAreaMarlas: number | null;
        calculatedAreaKanals: number | null;
        govtLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        privateLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        mapFeatures: import("@prisma/client/runtime/client").JsonValue;
        requiredDate: Date | null;
        priority: import(".prisma/client").$Enums.requisitions_priority | null;
        supportingDocs: import("@prisma/client/runtime/client").JsonValue;
        status: string | null;
        estimatedValue: string | null;
        remarks: string | null;
        attachments: import("@prisma/client/runtime/client").JsonValue;
        dateCreated: Date | null;
        lastUpdated: Date | null;
        activityLog: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        activityLogs: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        location: {
            address: string;
            coordinates: {
                lat: number;
                lng: number;
            } | null;
        };
        mapMarker: {
            lat: number;
            lng: number;
        } | null;
        mapViewport: {
            center: {
                lat: number;
                lng: number;
            };
            zoom: number;
        } | null;
        landAcquisition: {
            updatedBy: bigint | null;
            updatedAt: Date | null;
            type: string;
            status: string;
        };
        landUtilization: {
            overview: {
                phase: string;
                summary: string;
                nextMilestone: string;
            };
            civilStructures: {
                id: bigint;
                _id: bigint;
                name: string;
                category: string | null;
                status: string | null;
                description: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            machinery: {
                id: bigint;
                _id: bigint;
                name: string;
                type: string | null;
                status: string | null;
                capacity: string | null;
                manufacturer: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            progressUpdates: {
                id: bigint;
                _id: bigint;
                status: string;
                description: string | null;
                progressDate: Date | null;
                completionPercentage: number | null;
                attachments: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            gallery: string | number | true | import("@prisma/client/runtime/client").JsonObject | import("@prisma/client/runtime/client").JsonArray;
            updatedBy: bigint | null;
            updatedAt: Date | null;
        };
        locationAddress: string | null;
        locationLat: number | null;
        locationLng: number | null;
        mapMarkerLat: number | null;
        mapMarkerLng: number | null;
        mapViewportCenterLat: number | null;
        mapViewportCenterLng: number | null;
        mapViewportZoom: number | null;
        landAcquisitionType: import(".prisma/client").$Enums.requisitions_land_acquisition_type | null;
        landAcquisitionStatus: string | null;
        landAcquisitionData: import("@prisma/client/runtime/client").JsonValue;
        landAcquisitionUpdatedBy: bigint | null;
        landAcquisitionUpdatedAt: Date | null;
        landUtilizationPhase: string | null;
        landUtilizationSummary: string | null;
        landUtilizationNextMilestone: string | null;
        landUtilizationGallery: import("@prisma/client/runtime/client").JsonValue;
        landUtilizationUpdatedBy: bigint | null;
        landUtilizationUpdatedAt: Date | null;
    } | null)[]>;
    dueDiligencePdf(id: string, res: Response): Promise<void>;
    workflowPdf(id: string, res: Response): Promise<void>;
    findOne(id: string, user: JwtPayload): Promise<{
        id: bigint;
        _id: bigint;
        sequenceNumber: number | null;
        title: string;
        description: string | null;
        purpose: string;
        division: string | null;
        district: string | null;
        tehsil: string;
        requestedBy: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        requester: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignedTo: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignee: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        landArea: string | null;
        landType: string | null;
        landBreadth: number | null;
        landDepth: number | null;
        calculatedAreaSqFt: number | null;
        calculatedAreaMarlas: number | null;
        calculatedAreaKanals: number | null;
        govtLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        privateLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        mapFeatures: import("@prisma/client/runtime/client").JsonValue;
        requiredDate: Date | null;
        priority: import(".prisma/client").$Enums.requisitions_priority | null;
        supportingDocs: import("@prisma/client/runtime/client").JsonValue;
        status: string | null;
        estimatedValue: string | null;
        remarks: string | null;
        attachments: import("@prisma/client/runtime/client").JsonValue;
        dateCreated: Date | null;
        lastUpdated: Date | null;
        activityLog: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        activityLogs: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        location: {
            address: string;
            coordinates: {
                lat: number;
                lng: number;
            } | null;
        };
        mapMarker: {
            lat: number;
            lng: number;
        } | null;
        mapViewport: {
            center: {
                lat: number;
                lng: number;
            };
            zoom: number;
        } | null;
        landAcquisition: {
            updatedBy: bigint | null;
            updatedAt: Date | null;
            type: string;
            status: string;
        };
        landUtilization: {
            overview: {
                phase: string;
                summary: string;
                nextMilestone: string;
            };
            civilStructures: {
                id: bigint;
                _id: bigint;
                name: string;
                category: string | null;
                status: string | null;
                description: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            machinery: {
                id: bigint;
                _id: bigint;
                name: string;
                type: string | null;
                status: string | null;
                capacity: string | null;
                manufacturer: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            progressUpdates: {
                id: bigint;
                _id: bigint;
                status: string;
                description: string | null;
                progressDate: Date | null;
                completionPercentage: number | null;
                attachments: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            gallery: string | number | true | import("@prisma/client/runtime/client").JsonObject | import("@prisma/client/runtime/client").JsonArray;
            updatedBy: bigint | null;
            updatedAt: Date | null;
        };
        locationAddress: string | null;
        locationLat: number | null;
        locationLng: number | null;
        mapMarkerLat: number | null;
        mapMarkerLng: number | null;
        mapViewportCenterLat: number | null;
        mapViewportCenterLng: number | null;
        mapViewportZoom: number | null;
        landAcquisitionType: import(".prisma/client").$Enums.requisitions_land_acquisition_type | null;
        landAcquisitionStatus: string | null;
        landAcquisitionData: import("@prisma/client/runtime/client").JsonValue;
        landAcquisitionUpdatedBy: bigint | null;
        landAcquisitionUpdatedAt: Date | null;
        landUtilizationPhase: string | null;
        landUtilizationSummary: string | null;
        landUtilizationNextMilestone: string | null;
        landUtilizationGallery: import("@prisma/client/runtime/client").JsonValue;
        landUtilizationUpdatedBy: bigint | null;
        landUtilizationUpdatedAt: Date | null;
    } | null>;
    create(user: JwtPayload, body: Record<string, unknown>, files?: Express.Multer.File[]): Promise<{
        id: bigint;
        _id: bigint;
        sequenceNumber: number | null;
        title: string;
        description: string | null;
        purpose: string;
        division: string | null;
        district: string | null;
        tehsil: string;
        requestedBy: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        requester: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignedTo: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignee: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        landArea: string | null;
        landType: string | null;
        landBreadth: number | null;
        landDepth: number | null;
        calculatedAreaSqFt: number | null;
        calculatedAreaMarlas: number | null;
        calculatedAreaKanals: number | null;
        govtLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        privateLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        mapFeatures: import("@prisma/client/runtime/client").JsonValue;
        requiredDate: Date | null;
        priority: import(".prisma/client").$Enums.requisitions_priority | null;
        supportingDocs: import("@prisma/client/runtime/client").JsonValue;
        status: string | null;
        estimatedValue: string | null;
        remarks: string | null;
        attachments: import("@prisma/client/runtime/client").JsonValue;
        dateCreated: Date | null;
        lastUpdated: Date | null;
        activityLog: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        activityLogs: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        location: {
            address: string;
            coordinates: {
                lat: number;
                lng: number;
            } | null;
        };
        mapMarker: {
            lat: number;
            lng: number;
        } | null;
        mapViewport: {
            center: {
                lat: number;
                lng: number;
            };
            zoom: number;
        } | null;
        landAcquisition: {
            updatedBy: bigint | null;
            updatedAt: Date | null;
            type: string;
            status: string;
        };
        landUtilization: {
            overview: {
                phase: string;
                summary: string;
                nextMilestone: string;
            };
            civilStructures: {
                id: bigint;
                _id: bigint;
                name: string;
                category: string | null;
                status: string | null;
                description: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            machinery: {
                id: bigint;
                _id: bigint;
                name: string;
                type: string | null;
                status: string | null;
                capacity: string | null;
                manufacturer: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            progressUpdates: {
                id: bigint;
                _id: bigint;
                status: string;
                description: string | null;
                progressDate: Date | null;
                completionPercentage: number | null;
                attachments: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            gallery: string | number | true | import("@prisma/client/runtime/client").JsonObject | import("@prisma/client/runtime/client").JsonArray;
            updatedBy: bigint | null;
            updatedAt: Date | null;
        };
        locationAddress: string | null;
        locationLat: number | null;
        locationLng: number | null;
        mapMarkerLat: number | null;
        mapMarkerLng: number | null;
        mapViewportCenterLat: number | null;
        mapViewportCenterLng: number | null;
        mapViewportZoom: number | null;
        landAcquisitionType: import(".prisma/client").$Enums.requisitions_land_acquisition_type | null;
        landAcquisitionStatus: string | null;
        landAcquisitionData: import("@prisma/client/runtime/client").JsonValue;
        landAcquisitionUpdatedBy: bigint | null;
        landAcquisitionUpdatedAt: Date | null;
        landUtilizationPhase: string | null;
        landUtilizationSummary: string | null;
        landUtilizationNextMilestone: string | null;
        landUtilizationGallery: import("@prisma/client/runtime/client").JsonValue;
        landUtilizationUpdatedBy: bigint | null;
        landUtilizationUpdatedAt: Date | null;
    } | null>;
    updateMap(id: string, user: JwtPayload, body: Record<string, unknown>): Promise<{
        id: bigint;
        _id: bigint;
        sequenceNumber: number | null;
        title: string;
        description: string | null;
        purpose: string;
        division: string | null;
        district: string | null;
        tehsil: string;
        requestedBy: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        requester: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignedTo: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignee: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        landArea: string | null;
        landType: string | null;
        landBreadth: number | null;
        landDepth: number | null;
        calculatedAreaSqFt: number | null;
        calculatedAreaMarlas: number | null;
        calculatedAreaKanals: number | null;
        govtLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        privateLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        mapFeatures: import("@prisma/client/runtime/client").JsonValue;
        requiredDate: Date | null;
        priority: import(".prisma/client").$Enums.requisitions_priority | null;
        supportingDocs: import("@prisma/client/runtime/client").JsonValue;
        status: string | null;
        estimatedValue: string | null;
        remarks: string | null;
        attachments: import("@prisma/client/runtime/client").JsonValue;
        dateCreated: Date | null;
        lastUpdated: Date | null;
        activityLog: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        activityLogs: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        location: {
            address: string;
            coordinates: {
                lat: number;
                lng: number;
            } | null;
        };
        mapMarker: {
            lat: number;
            lng: number;
        } | null;
        mapViewport: {
            center: {
                lat: number;
                lng: number;
            };
            zoom: number;
        } | null;
        landAcquisition: {
            updatedBy: bigint | null;
            updatedAt: Date | null;
            type: string;
            status: string;
        };
        landUtilization: {
            overview: {
                phase: string;
                summary: string;
                nextMilestone: string;
            };
            civilStructures: {
                id: bigint;
                _id: bigint;
                name: string;
                category: string | null;
                status: string | null;
                description: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            machinery: {
                id: bigint;
                _id: bigint;
                name: string;
                type: string | null;
                status: string | null;
                capacity: string | null;
                manufacturer: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            progressUpdates: {
                id: bigint;
                _id: bigint;
                status: string;
                description: string | null;
                progressDate: Date | null;
                completionPercentage: number | null;
                attachments: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            gallery: string | number | true | import("@prisma/client/runtime/client").JsonObject | import("@prisma/client/runtime/client").JsonArray;
            updatedBy: bigint | null;
            updatedAt: Date | null;
        };
        locationAddress: string | null;
        locationLat: number | null;
        locationLng: number | null;
        mapMarkerLat: number | null;
        mapMarkerLng: number | null;
        mapViewportCenterLat: number | null;
        mapViewportCenterLng: number | null;
        mapViewportZoom: number | null;
        landAcquisitionType: import(".prisma/client").$Enums.requisitions_land_acquisition_type | null;
        landAcquisitionStatus: string | null;
        landAcquisitionData: import("@prisma/client/runtime/client").JsonValue;
        landAcquisitionUpdatedBy: bigint | null;
        landAcquisitionUpdatedAt: Date | null;
        landUtilizationPhase: string | null;
        landUtilizationSummary: string | null;
        landUtilizationNextMilestone: string | null;
        landUtilizationGallery: import("@prisma/client/runtime/client").JsonValue;
        landUtilizationUpdatedBy: bigint | null;
        landUtilizationUpdatedAt: Date | null;
    } | null>;
    updateDonor(id: string, user: JwtPayload, body: {
        donorData?: unknown;
    }): Promise<{
        id: bigint;
        _id: bigint;
        sequenceNumber: number | null;
        title: string;
        description: string | null;
        purpose: string;
        division: string | null;
        district: string | null;
        tehsil: string;
        requestedBy: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        requester: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignedTo: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignee: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        landArea: string | null;
        landType: string | null;
        landBreadth: number | null;
        landDepth: number | null;
        calculatedAreaSqFt: number | null;
        calculatedAreaMarlas: number | null;
        calculatedAreaKanals: number | null;
        govtLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        privateLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        mapFeatures: import("@prisma/client/runtime/client").JsonValue;
        requiredDate: Date | null;
        priority: import(".prisma/client").$Enums.requisitions_priority | null;
        supportingDocs: import("@prisma/client/runtime/client").JsonValue;
        status: string | null;
        estimatedValue: string | null;
        remarks: string | null;
        attachments: import("@prisma/client/runtime/client").JsonValue;
        dateCreated: Date | null;
        lastUpdated: Date | null;
        activityLog: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        activityLogs: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        location: {
            address: string;
            coordinates: {
                lat: number;
                lng: number;
            } | null;
        };
        mapMarker: {
            lat: number;
            lng: number;
        } | null;
        mapViewport: {
            center: {
                lat: number;
                lng: number;
            };
            zoom: number;
        } | null;
        landAcquisition: {
            updatedBy: bigint | null;
            updatedAt: Date | null;
            type: string;
            status: string;
        };
        landUtilization: {
            overview: {
                phase: string;
                summary: string;
                nextMilestone: string;
            };
            civilStructures: {
                id: bigint;
                _id: bigint;
                name: string;
                category: string | null;
                status: string | null;
                description: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            machinery: {
                id: bigint;
                _id: bigint;
                name: string;
                type: string | null;
                status: string | null;
                capacity: string | null;
                manufacturer: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            progressUpdates: {
                id: bigint;
                _id: bigint;
                status: string;
                description: string | null;
                progressDate: Date | null;
                completionPercentage: number | null;
                attachments: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            gallery: string | number | true | import("@prisma/client/runtime/client").JsonObject | import("@prisma/client/runtime/client").JsonArray;
            updatedBy: bigint | null;
            updatedAt: Date | null;
        };
        locationAddress: string | null;
        locationLat: number | null;
        locationLng: number | null;
        mapMarkerLat: number | null;
        mapMarkerLng: number | null;
        mapViewportCenterLat: number | null;
        mapViewportCenterLng: number | null;
        mapViewportZoom: number | null;
        landAcquisitionType: import(".prisma/client").$Enums.requisitions_land_acquisition_type | null;
        landAcquisitionStatus: string | null;
        landAcquisitionData: import("@prisma/client/runtime/client").JsonValue;
        landAcquisitionUpdatedBy: bigint | null;
        landAcquisitionUpdatedAt: Date | null;
        landUtilizationPhase: string | null;
        landUtilizationSummary: string | null;
        landUtilizationNextMilestone: string | null;
        landUtilizationGallery: import("@prisma/client/runtime/client").JsonValue;
        landUtilizationUpdatedBy: bigint | null;
        landUtilizationUpdatedAt: Date | null;
    } | null>;
    updateDocs(id: string, user: JwtPayload, body: {
        documents?: unknown;
    }): Promise<{
        id: bigint;
        _id: bigint;
        sequenceNumber: number | null;
        title: string;
        description: string | null;
        purpose: string;
        division: string | null;
        district: string | null;
        tehsil: string;
        requestedBy: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        requester: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignedTo: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignee: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        landArea: string | null;
        landType: string | null;
        landBreadth: number | null;
        landDepth: number | null;
        calculatedAreaSqFt: number | null;
        calculatedAreaMarlas: number | null;
        calculatedAreaKanals: number | null;
        govtLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        privateLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        mapFeatures: import("@prisma/client/runtime/client").JsonValue;
        requiredDate: Date | null;
        priority: import(".prisma/client").$Enums.requisitions_priority | null;
        supportingDocs: import("@prisma/client/runtime/client").JsonValue;
        status: string | null;
        estimatedValue: string | null;
        remarks: string | null;
        attachments: import("@prisma/client/runtime/client").JsonValue;
        dateCreated: Date | null;
        lastUpdated: Date | null;
        activityLog: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        activityLogs: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        location: {
            address: string;
            coordinates: {
                lat: number;
                lng: number;
            } | null;
        };
        mapMarker: {
            lat: number;
            lng: number;
        } | null;
        mapViewport: {
            center: {
                lat: number;
                lng: number;
            };
            zoom: number;
        } | null;
        landAcquisition: {
            updatedBy: bigint | null;
            updatedAt: Date | null;
            type: string;
            status: string;
        };
        landUtilization: {
            overview: {
                phase: string;
                summary: string;
                nextMilestone: string;
            };
            civilStructures: {
                id: bigint;
                _id: bigint;
                name: string;
                category: string | null;
                status: string | null;
                description: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            machinery: {
                id: bigint;
                _id: bigint;
                name: string;
                type: string | null;
                status: string | null;
                capacity: string | null;
                manufacturer: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            progressUpdates: {
                id: bigint;
                _id: bigint;
                status: string;
                description: string | null;
                progressDate: Date | null;
                completionPercentage: number | null;
                attachments: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            gallery: string | number | true | import("@prisma/client/runtime/client").JsonObject | import("@prisma/client/runtime/client").JsonArray;
            updatedBy: bigint | null;
            updatedAt: Date | null;
        };
        locationAddress: string | null;
        locationLat: number | null;
        locationLng: number | null;
        mapMarkerLat: number | null;
        mapMarkerLng: number | null;
        mapViewportCenterLat: number | null;
        mapViewportCenterLng: number | null;
        mapViewportZoom: number | null;
        landAcquisitionType: import(".prisma/client").$Enums.requisitions_land_acquisition_type | null;
        landAcquisitionStatus: string | null;
        landAcquisitionData: import("@prisma/client/runtime/client").JsonValue;
        landAcquisitionUpdatedBy: bigint | null;
        landAcquisitionUpdatedAt: Date | null;
        landUtilizationPhase: string | null;
        landUtilizationSummary: string | null;
        landUtilizationNextMilestone: string | null;
        landUtilizationGallery: import("@prisma/client/runtime/client").JsonValue;
        landUtilizationUpdatedBy: bigint | null;
        landUtilizationUpdatedAt: Date | null;
    } | null>;
    updateLandAcquisition(id: string, user: JwtPayload, body: Record<string, unknown>, files?: {
        ownershipProof?: Express.Multer.File[];
        attachedDocuments?: Express.Multer.File[];
    }): Promise<{
        id: bigint;
        _id: bigint;
        sequenceNumber: number | null;
        title: string;
        description: string | null;
        purpose: string;
        division: string | null;
        district: string | null;
        tehsil: string;
        requestedBy: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        requester: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignedTo: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignee: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        landArea: string | null;
        landType: string | null;
        landBreadth: number | null;
        landDepth: number | null;
        calculatedAreaSqFt: number | null;
        calculatedAreaMarlas: number | null;
        calculatedAreaKanals: number | null;
        govtLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        privateLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        mapFeatures: import("@prisma/client/runtime/client").JsonValue;
        requiredDate: Date | null;
        priority: import(".prisma/client").$Enums.requisitions_priority | null;
        supportingDocs: import("@prisma/client/runtime/client").JsonValue;
        status: string | null;
        estimatedValue: string | null;
        remarks: string | null;
        attachments: import("@prisma/client/runtime/client").JsonValue;
        dateCreated: Date | null;
        lastUpdated: Date | null;
        activityLog: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        activityLogs: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        location: {
            address: string;
            coordinates: {
                lat: number;
                lng: number;
            } | null;
        };
        mapMarker: {
            lat: number;
            lng: number;
        } | null;
        mapViewport: {
            center: {
                lat: number;
                lng: number;
            };
            zoom: number;
        } | null;
        landAcquisition: {
            updatedBy: bigint | null;
            updatedAt: Date | null;
            type: string;
            status: string;
        };
        landUtilization: {
            overview: {
                phase: string;
                summary: string;
                nextMilestone: string;
            };
            civilStructures: {
                id: bigint;
                _id: bigint;
                name: string;
                category: string | null;
                status: string | null;
                description: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            machinery: {
                id: bigint;
                _id: bigint;
                name: string;
                type: string | null;
                status: string | null;
                capacity: string | null;
                manufacturer: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            progressUpdates: {
                id: bigint;
                _id: bigint;
                status: string;
                description: string | null;
                progressDate: Date | null;
                completionPercentage: number | null;
                attachments: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            gallery: string | number | true | import("@prisma/client/runtime/client").JsonObject | import("@prisma/client/runtime/client").JsonArray;
            updatedBy: bigint | null;
            updatedAt: Date | null;
        };
        locationAddress: string | null;
        locationLat: number | null;
        locationLng: number | null;
        mapMarkerLat: number | null;
        mapMarkerLng: number | null;
        mapViewportCenterLat: number | null;
        mapViewportCenterLng: number | null;
        mapViewportZoom: number | null;
        landAcquisitionType: import(".prisma/client").$Enums.requisitions_land_acquisition_type | null;
        landAcquisitionStatus: string | null;
        landAcquisitionData: import("@prisma/client/runtime/client").JsonValue;
        landAcquisitionUpdatedBy: bigint | null;
        landAcquisitionUpdatedAt: Date | null;
        landUtilizationPhase: string | null;
        landUtilizationSummary: string | null;
        landUtilizationNextMilestone: string | null;
        landUtilizationGallery: import("@prisma/client/runtime/client").JsonValue;
        landUtilizationUpdatedBy: bigint | null;
        landUtilizationUpdatedAt: Date | null;
    } | null>;
    updateLandUtilizationOverview(id: string, user: JwtPayload, body: Record<string, unknown>): Promise<{
        id: bigint;
        _id: bigint;
        sequenceNumber: number | null;
        title: string;
        description: string | null;
        purpose: string;
        division: string | null;
        district: string | null;
        tehsil: string;
        requestedBy: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        requester: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignedTo: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignee: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        landArea: string | null;
        landType: string | null;
        landBreadth: number | null;
        landDepth: number | null;
        calculatedAreaSqFt: number | null;
        calculatedAreaMarlas: number | null;
        calculatedAreaKanals: number | null;
        govtLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        privateLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        mapFeatures: import("@prisma/client/runtime/client").JsonValue;
        requiredDate: Date | null;
        priority: import(".prisma/client").$Enums.requisitions_priority | null;
        supportingDocs: import("@prisma/client/runtime/client").JsonValue;
        status: string | null;
        estimatedValue: string | null;
        remarks: string | null;
        attachments: import("@prisma/client/runtime/client").JsonValue;
        dateCreated: Date | null;
        lastUpdated: Date | null;
        activityLog: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        activityLogs: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        location: {
            address: string;
            coordinates: {
                lat: number;
                lng: number;
            } | null;
        };
        mapMarker: {
            lat: number;
            lng: number;
        } | null;
        mapViewport: {
            center: {
                lat: number;
                lng: number;
            };
            zoom: number;
        } | null;
        landAcquisition: {
            updatedBy: bigint | null;
            updatedAt: Date | null;
            type: string;
            status: string;
        };
        landUtilization: {
            overview: {
                phase: string;
                summary: string;
                nextMilestone: string;
            };
            civilStructures: {
                id: bigint;
                _id: bigint;
                name: string;
                category: string | null;
                status: string | null;
                description: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            machinery: {
                id: bigint;
                _id: bigint;
                name: string;
                type: string | null;
                status: string | null;
                capacity: string | null;
                manufacturer: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            progressUpdates: {
                id: bigint;
                _id: bigint;
                status: string;
                description: string | null;
                progressDate: Date | null;
                completionPercentage: number | null;
                attachments: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            gallery: string | number | true | import("@prisma/client/runtime/client").JsonObject | import("@prisma/client/runtime/client").JsonArray;
            updatedBy: bigint | null;
            updatedAt: Date | null;
        };
        locationAddress: string | null;
        locationLat: number | null;
        locationLng: number | null;
        mapMarkerLat: number | null;
        mapMarkerLng: number | null;
        mapViewportCenterLat: number | null;
        mapViewportCenterLng: number | null;
        mapViewportZoom: number | null;
        landAcquisitionType: import(".prisma/client").$Enums.requisitions_land_acquisition_type | null;
        landAcquisitionStatus: string | null;
        landAcquisitionData: import("@prisma/client/runtime/client").JsonValue;
        landAcquisitionUpdatedBy: bigint | null;
        landAcquisitionUpdatedAt: Date | null;
        landUtilizationPhase: string | null;
        landUtilizationSummary: string | null;
        landUtilizationNextMilestone: string | null;
        landUtilizationGallery: import("@prisma/client/runtime/client").JsonValue;
        landUtilizationUpdatedBy: bigint | null;
        landUtilizationUpdatedAt: Date | null;
    } | null>;
    addLandUtilizationCivilStructure(id: string, user: JwtPayload, body: Record<string, unknown>, files?: Express.Multer.File[]): Promise<{
        id: bigint;
        _id: bigint;
        sequenceNumber: number | null;
        title: string;
        description: string | null;
        purpose: string;
        division: string | null;
        district: string | null;
        tehsil: string;
        requestedBy: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        requester: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignedTo: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignee: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        landArea: string | null;
        landType: string | null;
        landBreadth: number | null;
        landDepth: number | null;
        calculatedAreaSqFt: number | null;
        calculatedAreaMarlas: number | null;
        calculatedAreaKanals: number | null;
        govtLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        privateLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        mapFeatures: import("@prisma/client/runtime/client").JsonValue;
        requiredDate: Date | null;
        priority: import(".prisma/client").$Enums.requisitions_priority | null;
        supportingDocs: import("@prisma/client/runtime/client").JsonValue;
        status: string | null;
        estimatedValue: string | null;
        remarks: string | null;
        attachments: import("@prisma/client/runtime/client").JsonValue;
        dateCreated: Date | null;
        lastUpdated: Date | null;
        activityLog: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        activityLogs: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        location: {
            address: string;
            coordinates: {
                lat: number;
                lng: number;
            } | null;
        };
        mapMarker: {
            lat: number;
            lng: number;
        } | null;
        mapViewport: {
            center: {
                lat: number;
                lng: number;
            };
            zoom: number;
        } | null;
        landAcquisition: {
            updatedBy: bigint | null;
            updatedAt: Date | null;
            type: string;
            status: string;
        };
        landUtilization: {
            overview: {
                phase: string;
                summary: string;
                nextMilestone: string;
            };
            civilStructures: {
                id: bigint;
                _id: bigint;
                name: string;
                category: string | null;
                status: string | null;
                description: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            machinery: {
                id: bigint;
                _id: bigint;
                name: string;
                type: string | null;
                status: string | null;
                capacity: string | null;
                manufacturer: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            progressUpdates: {
                id: bigint;
                _id: bigint;
                status: string;
                description: string | null;
                progressDate: Date | null;
                completionPercentage: number | null;
                attachments: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            gallery: string | number | true | import("@prisma/client/runtime/client").JsonObject | import("@prisma/client/runtime/client").JsonArray;
            updatedBy: bigint | null;
            updatedAt: Date | null;
        };
        locationAddress: string | null;
        locationLat: number | null;
        locationLng: number | null;
        mapMarkerLat: number | null;
        mapMarkerLng: number | null;
        mapViewportCenterLat: number | null;
        mapViewportCenterLng: number | null;
        mapViewportZoom: number | null;
        landAcquisitionType: import(".prisma/client").$Enums.requisitions_land_acquisition_type | null;
        landAcquisitionStatus: string | null;
        landAcquisitionData: import("@prisma/client/runtime/client").JsonValue;
        landAcquisitionUpdatedBy: bigint | null;
        landAcquisitionUpdatedAt: Date | null;
        landUtilizationPhase: string | null;
        landUtilizationSummary: string | null;
        landUtilizationNextMilestone: string | null;
        landUtilizationGallery: import("@prisma/client/runtime/client").JsonValue;
        landUtilizationUpdatedBy: bigint | null;
        landUtilizationUpdatedAt: Date | null;
    } | null>;
    addLandUtilizationMachinery(id: string, user: JwtPayload, body: Record<string, unknown>, files?: Express.Multer.File[]): Promise<{
        id: bigint;
        _id: bigint;
        sequenceNumber: number | null;
        title: string;
        description: string | null;
        purpose: string;
        division: string | null;
        district: string | null;
        tehsil: string;
        requestedBy: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        requester: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignedTo: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignee: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        landArea: string | null;
        landType: string | null;
        landBreadth: number | null;
        landDepth: number | null;
        calculatedAreaSqFt: number | null;
        calculatedAreaMarlas: number | null;
        calculatedAreaKanals: number | null;
        govtLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        privateLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        mapFeatures: import("@prisma/client/runtime/client").JsonValue;
        requiredDate: Date | null;
        priority: import(".prisma/client").$Enums.requisitions_priority | null;
        supportingDocs: import("@prisma/client/runtime/client").JsonValue;
        status: string | null;
        estimatedValue: string | null;
        remarks: string | null;
        attachments: import("@prisma/client/runtime/client").JsonValue;
        dateCreated: Date | null;
        lastUpdated: Date | null;
        activityLog: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        activityLogs: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        location: {
            address: string;
            coordinates: {
                lat: number;
                lng: number;
            } | null;
        };
        mapMarker: {
            lat: number;
            lng: number;
        } | null;
        mapViewport: {
            center: {
                lat: number;
                lng: number;
            };
            zoom: number;
        } | null;
        landAcquisition: {
            updatedBy: bigint | null;
            updatedAt: Date | null;
            type: string;
            status: string;
        };
        landUtilization: {
            overview: {
                phase: string;
                summary: string;
                nextMilestone: string;
            };
            civilStructures: {
                id: bigint;
                _id: bigint;
                name: string;
                category: string | null;
                status: string | null;
                description: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            machinery: {
                id: bigint;
                _id: bigint;
                name: string;
                type: string | null;
                status: string | null;
                capacity: string | null;
                manufacturer: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            progressUpdates: {
                id: bigint;
                _id: bigint;
                status: string;
                description: string | null;
                progressDate: Date | null;
                completionPercentage: number | null;
                attachments: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            gallery: string | number | true | import("@prisma/client/runtime/client").JsonObject | import("@prisma/client/runtime/client").JsonArray;
            updatedBy: bigint | null;
            updatedAt: Date | null;
        };
        locationAddress: string | null;
        locationLat: number | null;
        locationLng: number | null;
        mapMarkerLat: number | null;
        mapMarkerLng: number | null;
        mapViewportCenterLat: number | null;
        mapViewportCenterLng: number | null;
        mapViewportZoom: number | null;
        landAcquisitionType: import(".prisma/client").$Enums.requisitions_land_acquisition_type | null;
        landAcquisitionStatus: string | null;
        landAcquisitionData: import("@prisma/client/runtime/client").JsonValue;
        landAcquisitionUpdatedBy: bigint | null;
        landAcquisitionUpdatedAt: Date | null;
        landUtilizationPhase: string | null;
        landUtilizationSummary: string | null;
        landUtilizationNextMilestone: string | null;
        landUtilizationGallery: import("@prisma/client/runtime/client").JsonValue;
        landUtilizationUpdatedBy: bigint | null;
        landUtilizationUpdatedAt: Date | null;
    } | null>;
    addLandUtilizationProgress(id: string, user: JwtPayload, body: Record<string, unknown>, files?: Express.Multer.File[]): Promise<{
        id: bigint;
        _id: bigint;
        sequenceNumber: number | null;
        title: string;
        description: string | null;
        purpose: string;
        division: string | null;
        district: string | null;
        tehsil: string;
        requestedBy: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        requester: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignedTo: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignee: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        landArea: string | null;
        landType: string | null;
        landBreadth: number | null;
        landDepth: number | null;
        calculatedAreaSqFt: number | null;
        calculatedAreaMarlas: number | null;
        calculatedAreaKanals: number | null;
        govtLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        privateLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        mapFeatures: import("@prisma/client/runtime/client").JsonValue;
        requiredDate: Date | null;
        priority: import(".prisma/client").$Enums.requisitions_priority | null;
        supportingDocs: import("@prisma/client/runtime/client").JsonValue;
        status: string | null;
        estimatedValue: string | null;
        remarks: string | null;
        attachments: import("@prisma/client/runtime/client").JsonValue;
        dateCreated: Date | null;
        lastUpdated: Date | null;
        activityLog: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        activityLogs: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        location: {
            address: string;
            coordinates: {
                lat: number;
                lng: number;
            } | null;
        };
        mapMarker: {
            lat: number;
            lng: number;
        } | null;
        mapViewport: {
            center: {
                lat: number;
                lng: number;
            };
            zoom: number;
        } | null;
        landAcquisition: {
            updatedBy: bigint | null;
            updatedAt: Date | null;
            type: string;
            status: string;
        };
        landUtilization: {
            overview: {
                phase: string;
                summary: string;
                nextMilestone: string;
            };
            civilStructures: {
                id: bigint;
                _id: bigint;
                name: string;
                category: string | null;
                status: string | null;
                description: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            machinery: {
                id: bigint;
                _id: bigint;
                name: string;
                type: string | null;
                status: string | null;
                capacity: string | null;
                manufacturer: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            progressUpdates: {
                id: bigint;
                _id: bigint;
                status: string;
                description: string | null;
                progressDate: Date | null;
                completionPercentage: number | null;
                attachments: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            gallery: string | number | true | import("@prisma/client/runtime/client").JsonObject | import("@prisma/client/runtime/client").JsonArray;
            updatedBy: bigint | null;
            updatedAt: Date | null;
        };
        locationAddress: string | null;
        locationLat: number | null;
        locationLng: number | null;
        mapMarkerLat: number | null;
        mapMarkerLng: number | null;
        mapViewportCenterLat: number | null;
        mapViewportCenterLng: number | null;
        mapViewportZoom: number | null;
        landAcquisitionType: import(".prisma/client").$Enums.requisitions_land_acquisition_type | null;
        landAcquisitionStatus: string | null;
        landAcquisitionData: import("@prisma/client/runtime/client").JsonValue;
        landAcquisitionUpdatedBy: bigint | null;
        landAcquisitionUpdatedAt: Date | null;
        landUtilizationPhase: string | null;
        landUtilizationSummary: string | null;
        landUtilizationNextMilestone: string | null;
        landUtilizationGallery: import("@prisma/client/runtime/client").JsonValue;
        landUtilizationUpdatedBy: bigint | null;
        landUtilizationUpdatedAt: Date | null;
    } | null>;
    updateUtilizationOverview(id: string, user: JwtPayload, body: Record<string, unknown>): Promise<{
        id: bigint;
        _id: bigint;
        sequenceNumber: number | null;
        title: string;
        description: string | null;
        purpose: string;
        division: string | null;
        district: string | null;
        tehsil: string;
        requestedBy: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        requester: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignedTo: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignee: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        landArea: string | null;
        landType: string | null;
        landBreadth: number | null;
        landDepth: number | null;
        calculatedAreaSqFt: number | null;
        calculatedAreaMarlas: number | null;
        calculatedAreaKanals: number | null;
        govtLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        privateLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        mapFeatures: import("@prisma/client/runtime/client").JsonValue;
        requiredDate: Date | null;
        priority: import(".prisma/client").$Enums.requisitions_priority | null;
        supportingDocs: import("@prisma/client/runtime/client").JsonValue;
        status: string | null;
        estimatedValue: string | null;
        remarks: string | null;
        attachments: import("@prisma/client/runtime/client").JsonValue;
        dateCreated: Date | null;
        lastUpdated: Date | null;
        activityLog: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        activityLogs: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        location: {
            address: string;
            coordinates: {
                lat: number;
                lng: number;
            } | null;
        };
        mapMarker: {
            lat: number;
            lng: number;
        } | null;
        mapViewport: {
            center: {
                lat: number;
                lng: number;
            };
            zoom: number;
        } | null;
        landAcquisition: {
            updatedBy: bigint | null;
            updatedAt: Date | null;
            type: string;
            status: string;
        };
        landUtilization: {
            overview: {
                phase: string;
                summary: string;
                nextMilestone: string;
            };
            civilStructures: {
                id: bigint;
                _id: bigint;
                name: string;
                category: string | null;
                status: string | null;
                description: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            machinery: {
                id: bigint;
                _id: bigint;
                name: string;
                type: string | null;
                status: string | null;
                capacity: string | null;
                manufacturer: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            progressUpdates: {
                id: bigint;
                _id: bigint;
                status: string;
                description: string | null;
                progressDate: Date | null;
                completionPercentage: number | null;
                attachments: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            gallery: string | number | true | import("@prisma/client/runtime/client").JsonObject | import("@prisma/client/runtime/client").JsonArray;
            updatedBy: bigint | null;
            updatedAt: Date | null;
        };
        locationAddress: string | null;
        locationLat: number | null;
        locationLng: number | null;
        mapMarkerLat: number | null;
        mapMarkerLng: number | null;
        mapViewportCenterLat: number | null;
        mapViewportCenterLng: number | null;
        mapViewportZoom: number | null;
        landAcquisitionType: import(".prisma/client").$Enums.requisitions_land_acquisition_type | null;
        landAcquisitionStatus: string | null;
        landAcquisitionData: import("@prisma/client/runtime/client").JsonValue;
        landAcquisitionUpdatedBy: bigint | null;
        landAcquisitionUpdatedAt: Date | null;
        landUtilizationPhase: string | null;
        landUtilizationSummary: string | null;
        landUtilizationNextMilestone: string | null;
        landUtilizationGallery: import("@prisma/client/runtime/client").JsonValue;
        landUtilizationUpdatedBy: bigint | null;
        landUtilizationUpdatedAt: Date | null;
    } | null>;
    addUtilizationStructure(id: string, user: JwtPayload, body: Record<string, unknown>, files?: Express.Multer.File[]): Promise<{
        id: bigint;
        _id: bigint;
        sequenceNumber: number | null;
        title: string;
        description: string | null;
        purpose: string;
        division: string | null;
        district: string | null;
        tehsil: string;
        requestedBy: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        requester: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignedTo: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignee: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        landArea: string | null;
        landType: string | null;
        landBreadth: number | null;
        landDepth: number | null;
        calculatedAreaSqFt: number | null;
        calculatedAreaMarlas: number | null;
        calculatedAreaKanals: number | null;
        govtLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        privateLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        mapFeatures: import("@prisma/client/runtime/client").JsonValue;
        requiredDate: Date | null;
        priority: import(".prisma/client").$Enums.requisitions_priority | null;
        supportingDocs: import("@prisma/client/runtime/client").JsonValue;
        status: string | null;
        estimatedValue: string | null;
        remarks: string | null;
        attachments: import("@prisma/client/runtime/client").JsonValue;
        dateCreated: Date | null;
        lastUpdated: Date | null;
        activityLog: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        activityLogs: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        location: {
            address: string;
            coordinates: {
                lat: number;
                lng: number;
            } | null;
        };
        mapMarker: {
            lat: number;
            lng: number;
        } | null;
        mapViewport: {
            center: {
                lat: number;
                lng: number;
            };
            zoom: number;
        } | null;
        landAcquisition: {
            updatedBy: bigint | null;
            updatedAt: Date | null;
            type: string;
            status: string;
        };
        landUtilization: {
            overview: {
                phase: string;
                summary: string;
                nextMilestone: string;
            };
            civilStructures: {
                id: bigint;
                _id: bigint;
                name: string;
                category: string | null;
                status: string | null;
                description: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            machinery: {
                id: bigint;
                _id: bigint;
                name: string;
                type: string | null;
                status: string | null;
                capacity: string | null;
                manufacturer: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            progressUpdates: {
                id: bigint;
                _id: bigint;
                status: string;
                description: string | null;
                progressDate: Date | null;
                completionPercentage: number | null;
                attachments: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            gallery: string | number | true | import("@prisma/client/runtime/client").JsonObject | import("@prisma/client/runtime/client").JsonArray;
            updatedBy: bigint | null;
            updatedAt: Date | null;
        };
        locationAddress: string | null;
        locationLat: number | null;
        locationLng: number | null;
        mapMarkerLat: number | null;
        mapMarkerLng: number | null;
        mapViewportCenterLat: number | null;
        mapViewportCenterLng: number | null;
        mapViewportZoom: number | null;
        landAcquisitionType: import(".prisma/client").$Enums.requisitions_land_acquisition_type | null;
        landAcquisitionStatus: string | null;
        landAcquisitionData: import("@prisma/client/runtime/client").JsonValue;
        landAcquisitionUpdatedBy: bigint | null;
        landAcquisitionUpdatedAt: Date | null;
        landUtilizationPhase: string | null;
        landUtilizationSummary: string | null;
        landUtilizationNextMilestone: string | null;
        landUtilizationGallery: import("@prisma/client/runtime/client").JsonValue;
        landUtilizationUpdatedBy: bigint | null;
        landUtilizationUpdatedAt: Date | null;
    } | null>;
    updateUtilizationStructure(id: string, structureId: string, user: JwtPayload, body: Record<string, unknown>, files?: Express.Multer.File[]): Promise<{
        id: bigint;
        _id: bigint;
        sequenceNumber: number | null;
        title: string;
        description: string | null;
        purpose: string;
        division: string | null;
        district: string | null;
        tehsil: string;
        requestedBy: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        requester: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignedTo: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignee: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        landArea: string | null;
        landType: string | null;
        landBreadth: number | null;
        landDepth: number | null;
        calculatedAreaSqFt: number | null;
        calculatedAreaMarlas: number | null;
        calculatedAreaKanals: number | null;
        govtLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        privateLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        mapFeatures: import("@prisma/client/runtime/client").JsonValue;
        requiredDate: Date | null;
        priority: import(".prisma/client").$Enums.requisitions_priority | null;
        supportingDocs: import("@prisma/client/runtime/client").JsonValue;
        status: string | null;
        estimatedValue: string | null;
        remarks: string | null;
        attachments: import("@prisma/client/runtime/client").JsonValue;
        dateCreated: Date | null;
        lastUpdated: Date | null;
        activityLog: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        activityLogs: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        location: {
            address: string;
            coordinates: {
                lat: number;
                lng: number;
            } | null;
        };
        mapMarker: {
            lat: number;
            lng: number;
        } | null;
        mapViewport: {
            center: {
                lat: number;
                lng: number;
            };
            zoom: number;
        } | null;
        landAcquisition: {
            updatedBy: bigint | null;
            updatedAt: Date | null;
            type: string;
            status: string;
        };
        landUtilization: {
            overview: {
                phase: string;
                summary: string;
                nextMilestone: string;
            };
            civilStructures: {
                id: bigint;
                _id: bigint;
                name: string;
                category: string | null;
                status: string | null;
                description: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            machinery: {
                id: bigint;
                _id: bigint;
                name: string;
                type: string | null;
                status: string | null;
                capacity: string | null;
                manufacturer: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            progressUpdates: {
                id: bigint;
                _id: bigint;
                status: string;
                description: string | null;
                progressDate: Date | null;
                completionPercentage: number | null;
                attachments: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            gallery: string | number | true | import("@prisma/client/runtime/client").JsonObject | import("@prisma/client/runtime/client").JsonArray;
            updatedBy: bigint | null;
            updatedAt: Date | null;
        };
        locationAddress: string | null;
        locationLat: number | null;
        locationLng: number | null;
        mapMarkerLat: number | null;
        mapMarkerLng: number | null;
        mapViewportCenterLat: number | null;
        mapViewportCenterLng: number | null;
        mapViewportZoom: number | null;
        landAcquisitionType: import(".prisma/client").$Enums.requisitions_land_acquisition_type | null;
        landAcquisitionStatus: string | null;
        landAcquisitionData: import("@prisma/client/runtime/client").JsonValue;
        landAcquisitionUpdatedBy: bigint | null;
        landAcquisitionUpdatedAt: Date | null;
        landUtilizationPhase: string | null;
        landUtilizationSummary: string | null;
        landUtilizationNextMilestone: string | null;
        landUtilizationGallery: import("@prisma/client/runtime/client").JsonValue;
        landUtilizationUpdatedBy: bigint | null;
        landUtilizationUpdatedAt: Date | null;
    } | null>;
    addUtilizationMachinery(id: string, user: JwtPayload, body: Record<string, unknown>, files?: Express.Multer.File[]): Promise<{
        id: bigint;
        _id: bigint;
        sequenceNumber: number | null;
        title: string;
        description: string | null;
        purpose: string;
        division: string | null;
        district: string | null;
        tehsil: string;
        requestedBy: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        requester: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignedTo: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignee: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        landArea: string | null;
        landType: string | null;
        landBreadth: number | null;
        landDepth: number | null;
        calculatedAreaSqFt: number | null;
        calculatedAreaMarlas: number | null;
        calculatedAreaKanals: number | null;
        govtLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        privateLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        mapFeatures: import("@prisma/client/runtime/client").JsonValue;
        requiredDate: Date | null;
        priority: import(".prisma/client").$Enums.requisitions_priority | null;
        supportingDocs: import("@prisma/client/runtime/client").JsonValue;
        status: string | null;
        estimatedValue: string | null;
        remarks: string | null;
        attachments: import("@prisma/client/runtime/client").JsonValue;
        dateCreated: Date | null;
        lastUpdated: Date | null;
        activityLog: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        activityLogs: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        location: {
            address: string;
            coordinates: {
                lat: number;
                lng: number;
            } | null;
        };
        mapMarker: {
            lat: number;
            lng: number;
        } | null;
        mapViewport: {
            center: {
                lat: number;
                lng: number;
            };
            zoom: number;
        } | null;
        landAcquisition: {
            updatedBy: bigint | null;
            updatedAt: Date | null;
            type: string;
            status: string;
        };
        landUtilization: {
            overview: {
                phase: string;
                summary: string;
                nextMilestone: string;
            };
            civilStructures: {
                id: bigint;
                _id: bigint;
                name: string;
                category: string | null;
                status: string | null;
                description: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            machinery: {
                id: bigint;
                _id: bigint;
                name: string;
                type: string | null;
                status: string | null;
                capacity: string | null;
                manufacturer: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            progressUpdates: {
                id: bigint;
                _id: bigint;
                status: string;
                description: string | null;
                progressDate: Date | null;
                completionPercentage: number | null;
                attachments: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            gallery: string | number | true | import("@prisma/client/runtime/client").JsonObject | import("@prisma/client/runtime/client").JsonArray;
            updatedBy: bigint | null;
            updatedAt: Date | null;
        };
        locationAddress: string | null;
        locationLat: number | null;
        locationLng: number | null;
        mapMarkerLat: number | null;
        mapMarkerLng: number | null;
        mapViewportCenterLat: number | null;
        mapViewportCenterLng: number | null;
        mapViewportZoom: number | null;
        landAcquisitionType: import(".prisma/client").$Enums.requisitions_land_acquisition_type | null;
        landAcquisitionStatus: string | null;
        landAcquisitionData: import("@prisma/client/runtime/client").JsonValue;
        landAcquisitionUpdatedBy: bigint | null;
        landAcquisitionUpdatedAt: Date | null;
        landUtilizationPhase: string | null;
        landUtilizationSummary: string | null;
        landUtilizationNextMilestone: string | null;
        landUtilizationGallery: import("@prisma/client/runtime/client").JsonValue;
        landUtilizationUpdatedBy: bigint | null;
        landUtilizationUpdatedAt: Date | null;
    } | null>;
    updateUtilizationMachinery(id: string, machineryId: string, user: JwtPayload, body: Record<string, unknown>, files?: Express.Multer.File[]): Promise<{
        id: bigint;
        _id: bigint;
        sequenceNumber: number | null;
        title: string;
        description: string | null;
        purpose: string;
        division: string | null;
        district: string | null;
        tehsil: string;
        requestedBy: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        requester: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignedTo: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignee: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        landArea: string | null;
        landType: string | null;
        landBreadth: number | null;
        landDepth: number | null;
        calculatedAreaSqFt: number | null;
        calculatedAreaMarlas: number | null;
        calculatedAreaKanals: number | null;
        govtLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        privateLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        mapFeatures: import("@prisma/client/runtime/client").JsonValue;
        requiredDate: Date | null;
        priority: import(".prisma/client").$Enums.requisitions_priority | null;
        supportingDocs: import("@prisma/client/runtime/client").JsonValue;
        status: string | null;
        estimatedValue: string | null;
        remarks: string | null;
        attachments: import("@prisma/client/runtime/client").JsonValue;
        dateCreated: Date | null;
        lastUpdated: Date | null;
        activityLog: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        activityLogs: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        location: {
            address: string;
            coordinates: {
                lat: number;
                lng: number;
            } | null;
        };
        mapMarker: {
            lat: number;
            lng: number;
        } | null;
        mapViewport: {
            center: {
                lat: number;
                lng: number;
            };
            zoom: number;
        } | null;
        landAcquisition: {
            updatedBy: bigint | null;
            updatedAt: Date | null;
            type: string;
            status: string;
        };
        landUtilization: {
            overview: {
                phase: string;
                summary: string;
                nextMilestone: string;
            };
            civilStructures: {
                id: bigint;
                _id: bigint;
                name: string;
                category: string | null;
                status: string | null;
                description: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            machinery: {
                id: bigint;
                _id: bigint;
                name: string;
                type: string | null;
                status: string | null;
                capacity: string | null;
                manufacturer: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            progressUpdates: {
                id: bigint;
                _id: bigint;
                status: string;
                description: string | null;
                progressDate: Date | null;
                completionPercentage: number | null;
                attachments: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            gallery: string | number | true | import("@prisma/client/runtime/client").JsonObject | import("@prisma/client/runtime/client").JsonArray;
            updatedBy: bigint | null;
            updatedAt: Date | null;
        };
        locationAddress: string | null;
        locationLat: number | null;
        locationLng: number | null;
        mapMarkerLat: number | null;
        mapMarkerLng: number | null;
        mapViewportCenterLat: number | null;
        mapViewportCenterLng: number | null;
        mapViewportZoom: number | null;
        landAcquisitionType: import(".prisma/client").$Enums.requisitions_land_acquisition_type | null;
        landAcquisitionStatus: string | null;
        landAcquisitionData: import("@prisma/client/runtime/client").JsonValue;
        landAcquisitionUpdatedBy: bigint | null;
        landAcquisitionUpdatedAt: Date | null;
        landUtilizationPhase: string | null;
        landUtilizationSummary: string | null;
        landUtilizationNextMilestone: string | null;
        landUtilizationGallery: import("@prisma/client/runtime/client").JsonValue;
        landUtilizationUpdatedBy: bigint | null;
        landUtilizationUpdatedAt: Date | null;
    } | null>;
    addUtilizationProgress(id: string, user: JwtPayload, body: Record<string, unknown>, files?: Express.Multer.File[]): Promise<{
        id: bigint;
        _id: bigint;
        sequenceNumber: number | null;
        title: string;
        description: string | null;
        purpose: string;
        division: string | null;
        district: string | null;
        tehsil: string;
        requestedBy: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        requester: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignedTo: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignee: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        landArea: string | null;
        landType: string | null;
        landBreadth: number | null;
        landDepth: number | null;
        calculatedAreaSqFt: number | null;
        calculatedAreaMarlas: number | null;
        calculatedAreaKanals: number | null;
        govtLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        privateLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        mapFeatures: import("@prisma/client/runtime/client").JsonValue;
        requiredDate: Date | null;
        priority: import(".prisma/client").$Enums.requisitions_priority | null;
        supportingDocs: import("@prisma/client/runtime/client").JsonValue;
        status: string | null;
        estimatedValue: string | null;
        remarks: string | null;
        attachments: import("@prisma/client/runtime/client").JsonValue;
        dateCreated: Date | null;
        lastUpdated: Date | null;
        activityLog: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        activityLogs: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        location: {
            address: string;
            coordinates: {
                lat: number;
                lng: number;
            } | null;
        };
        mapMarker: {
            lat: number;
            lng: number;
        } | null;
        mapViewport: {
            center: {
                lat: number;
                lng: number;
            };
            zoom: number;
        } | null;
        landAcquisition: {
            updatedBy: bigint | null;
            updatedAt: Date | null;
            type: string;
            status: string;
        };
        landUtilization: {
            overview: {
                phase: string;
                summary: string;
                nextMilestone: string;
            };
            civilStructures: {
                id: bigint;
                _id: bigint;
                name: string;
                category: string | null;
                status: string | null;
                description: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            machinery: {
                id: bigint;
                _id: bigint;
                name: string;
                type: string | null;
                status: string | null;
                capacity: string | null;
                manufacturer: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            progressUpdates: {
                id: bigint;
                _id: bigint;
                status: string;
                description: string | null;
                progressDate: Date | null;
                completionPercentage: number | null;
                attachments: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            gallery: string | number | true | import("@prisma/client/runtime/client").JsonObject | import("@prisma/client/runtime/client").JsonArray;
            updatedBy: bigint | null;
            updatedAt: Date | null;
        };
        locationAddress: string | null;
        locationLat: number | null;
        locationLng: number | null;
        mapMarkerLat: number | null;
        mapMarkerLng: number | null;
        mapViewportCenterLat: number | null;
        mapViewportCenterLng: number | null;
        mapViewportZoom: number | null;
        landAcquisitionType: import(".prisma/client").$Enums.requisitions_land_acquisition_type | null;
        landAcquisitionStatus: string | null;
        landAcquisitionData: import("@prisma/client/runtime/client").JsonValue;
        landAcquisitionUpdatedBy: bigint | null;
        landAcquisitionUpdatedAt: Date | null;
        landUtilizationPhase: string | null;
        landUtilizationSummary: string | null;
        landUtilizationNextMilestone: string | null;
        landUtilizationGallery: import("@prisma/client/runtime/client").JsonValue;
        landUtilizationUpdatedBy: bigint | null;
        landUtilizationUpdatedAt: Date | null;
    } | null>;
    dmForwardBcc(id: string, user: JwtPayload, body: {
        officerId?: unknown;
        remarks?: unknown;
    }): Promise<{
        id: bigint;
        _id: bigint;
        sequenceNumber: number | null;
        title: string;
        description: string | null;
        purpose: string;
        division: string | null;
        district: string | null;
        tehsil: string;
        requestedBy: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        requester: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignedTo: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignee: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        landArea: string | null;
        landType: string | null;
        landBreadth: number | null;
        landDepth: number | null;
        calculatedAreaSqFt: number | null;
        calculatedAreaMarlas: number | null;
        calculatedAreaKanals: number | null;
        govtLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        privateLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        mapFeatures: import("@prisma/client/runtime/client").JsonValue;
        requiredDate: Date | null;
        priority: import(".prisma/client").$Enums.requisitions_priority | null;
        supportingDocs: import("@prisma/client/runtime/client").JsonValue;
        status: string | null;
        estimatedValue: string | null;
        remarks: string | null;
        attachments: import("@prisma/client/runtime/client").JsonValue;
        dateCreated: Date | null;
        lastUpdated: Date | null;
        activityLog: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        activityLogs: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        location: {
            address: string;
            coordinates: {
                lat: number;
                lng: number;
            } | null;
        };
        mapMarker: {
            lat: number;
            lng: number;
        } | null;
        mapViewport: {
            center: {
                lat: number;
                lng: number;
            };
            zoom: number;
        } | null;
        landAcquisition: {
            updatedBy: bigint | null;
            updatedAt: Date | null;
            type: string;
            status: string;
        };
        landUtilization: {
            overview: {
                phase: string;
                summary: string;
                nextMilestone: string;
            };
            civilStructures: {
                id: bigint;
                _id: bigint;
                name: string;
                category: string | null;
                status: string | null;
                description: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            machinery: {
                id: bigint;
                _id: bigint;
                name: string;
                type: string | null;
                status: string | null;
                capacity: string | null;
                manufacturer: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            progressUpdates: {
                id: bigint;
                _id: bigint;
                status: string;
                description: string | null;
                progressDate: Date | null;
                completionPercentage: number | null;
                attachments: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            gallery: string | number | true | import("@prisma/client/runtime/client").JsonObject | import("@prisma/client/runtime/client").JsonArray;
            updatedBy: bigint | null;
            updatedAt: Date | null;
        };
        locationAddress: string | null;
        locationLat: number | null;
        locationLng: number | null;
        mapMarkerLat: number | null;
        mapMarkerLng: number | null;
        mapViewportCenterLat: number | null;
        mapViewportCenterLng: number | null;
        mapViewportZoom: number | null;
        landAcquisitionType: import(".prisma/client").$Enums.requisitions_land_acquisition_type | null;
        landAcquisitionStatus: string | null;
        landAcquisitionData: import("@prisma/client/runtime/client").JsonValue;
        landAcquisitionUpdatedBy: bigint | null;
        landAcquisitionUpdatedAt: Date | null;
        landUtilizationPhase: string | null;
        landUtilizationSummary: string | null;
        landUtilizationNextMilestone: string | null;
        landUtilizationGallery: import("@prisma/client/runtime/client").JsonValue;
        landUtilizationUpdatedBy: bigint | null;
        landUtilizationUpdatedAt: Date | null;
    } | null>;
    bccForwardTm(id: string, user: JwtPayload, body: {
        officerId?: unknown;
        remarks?: unknown;
    }): Promise<{
        id: bigint;
        _id: bigint;
        sequenceNumber: number | null;
        title: string;
        description: string | null;
        purpose: string;
        division: string | null;
        district: string | null;
        tehsil: string;
        requestedBy: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        requester: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignedTo: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignee: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        landArea: string | null;
        landType: string | null;
        landBreadth: number | null;
        landDepth: number | null;
        calculatedAreaSqFt: number | null;
        calculatedAreaMarlas: number | null;
        calculatedAreaKanals: number | null;
        govtLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        privateLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        mapFeatures: import("@prisma/client/runtime/client").JsonValue;
        requiredDate: Date | null;
        priority: import(".prisma/client").$Enums.requisitions_priority | null;
        supportingDocs: import("@prisma/client/runtime/client").JsonValue;
        status: string | null;
        estimatedValue: string | null;
        remarks: string | null;
        attachments: import("@prisma/client/runtime/client").JsonValue;
        dateCreated: Date | null;
        lastUpdated: Date | null;
        activityLog: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        activityLogs: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        location: {
            address: string;
            coordinates: {
                lat: number;
                lng: number;
            } | null;
        };
        mapMarker: {
            lat: number;
            lng: number;
        } | null;
        mapViewport: {
            center: {
                lat: number;
                lng: number;
            };
            zoom: number;
        } | null;
        landAcquisition: {
            updatedBy: bigint | null;
            updatedAt: Date | null;
            type: string;
            status: string;
        };
        landUtilization: {
            overview: {
                phase: string;
                summary: string;
                nextMilestone: string;
            };
            civilStructures: {
                id: bigint;
                _id: bigint;
                name: string;
                category: string | null;
                status: string | null;
                description: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            machinery: {
                id: bigint;
                _id: bigint;
                name: string;
                type: string | null;
                status: string | null;
                capacity: string | null;
                manufacturer: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            progressUpdates: {
                id: bigint;
                _id: bigint;
                status: string;
                description: string | null;
                progressDate: Date | null;
                completionPercentage: number | null;
                attachments: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            gallery: string | number | true | import("@prisma/client/runtime/client").JsonObject | import("@prisma/client/runtime/client").JsonArray;
            updatedBy: bigint | null;
            updatedAt: Date | null;
        };
        locationAddress: string | null;
        locationLat: number | null;
        locationLng: number | null;
        mapMarkerLat: number | null;
        mapMarkerLng: number | null;
        mapViewportCenterLat: number | null;
        mapViewportCenterLng: number | null;
        mapViewportZoom: number | null;
        landAcquisitionType: import(".prisma/client").$Enums.requisitions_land_acquisition_type | null;
        landAcquisitionStatus: string | null;
        landAcquisitionData: import("@prisma/client/runtime/client").JsonValue;
        landAcquisitionUpdatedBy: bigint | null;
        landAcquisitionUpdatedAt: Date | null;
        landUtilizationPhase: string | null;
        landUtilizationSummary: string | null;
        landUtilizationNextMilestone: string | null;
        landUtilizationGallery: import("@prisma/client/runtime/client").JsonValue;
        landUtilizationUpdatedBy: bigint | null;
        landUtilizationUpdatedAt: Date | null;
    } | null>;
    tmForwardChief(id: string, user: JwtPayload, body: {
        officerId?: unknown;
        remarks?: unknown;
    }): Promise<{
        id: bigint;
        _id: bigint;
        sequenceNumber: number | null;
        title: string;
        description: string | null;
        purpose: string;
        division: string | null;
        district: string | null;
        tehsil: string;
        requestedBy: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        requester: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignedTo: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignee: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        landArea: string | null;
        landType: string | null;
        landBreadth: number | null;
        landDepth: number | null;
        calculatedAreaSqFt: number | null;
        calculatedAreaMarlas: number | null;
        calculatedAreaKanals: number | null;
        govtLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        privateLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        mapFeatures: import("@prisma/client/runtime/client").JsonValue;
        requiredDate: Date | null;
        priority: import(".prisma/client").$Enums.requisitions_priority | null;
        supportingDocs: import("@prisma/client/runtime/client").JsonValue;
        status: string | null;
        estimatedValue: string | null;
        remarks: string | null;
        attachments: import("@prisma/client/runtime/client").JsonValue;
        dateCreated: Date | null;
        lastUpdated: Date | null;
        activityLog: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        activityLogs: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        location: {
            address: string;
            coordinates: {
                lat: number;
                lng: number;
            } | null;
        };
        mapMarker: {
            lat: number;
            lng: number;
        } | null;
        mapViewport: {
            center: {
                lat: number;
                lng: number;
            };
            zoom: number;
        } | null;
        landAcquisition: {
            updatedBy: bigint | null;
            updatedAt: Date | null;
            type: string;
            status: string;
        };
        landUtilization: {
            overview: {
                phase: string;
                summary: string;
                nextMilestone: string;
            };
            civilStructures: {
                id: bigint;
                _id: bigint;
                name: string;
                category: string | null;
                status: string | null;
                description: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            machinery: {
                id: bigint;
                _id: bigint;
                name: string;
                type: string | null;
                status: string | null;
                capacity: string | null;
                manufacturer: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            progressUpdates: {
                id: bigint;
                _id: bigint;
                status: string;
                description: string | null;
                progressDate: Date | null;
                completionPercentage: number | null;
                attachments: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            gallery: string | number | true | import("@prisma/client/runtime/client").JsonObject | import("@prisma/client/runtime/client").JsonArray;
            updatedBy: bigint | null;
            updatedAt: Date | null;
        };
        locationAddress: string | null;
        locationLat: number | null;
        locationLng: number | null;
        mapMarkerLat: number | null;
        mapMarkerLng: number | null;
        mapViewportCenterLat: number | null;
        mapViewportCenterLng: number | null;
        mapViewportZoom: number | null;
        landAcquisitionType: import(".prisma/client").$Enums.requisitions_land_acquisition_type | null;
        landAcquisitionStatus: string | null;
        landAcquisitionData: import("@prisma/client/runtime/client").JsonValue;
        landAcquisitionUpdatedBy: bigint | null;
        landAcquisitionUpdatedAt: Date | null;
        landUtilizationPhase: string | null;
        landUtilizationSummary: string | null;
        landUtilizationNextMilestone: string | null;
        landUtilizationGallery: import("@prisma/client/runtime/client").JsonValue;
        landUtilizationUpdatedBy: bigint | null;
        landUtilizationUpdatedAt: Date | null;
    } | null>;
    chiefForwardBcc(id: string, user: JwtPayload, body: {
        officerId?: unknown;
        remarks?: unknown;
    }): Promise<{
        id: bigint;
        _id: bigint;
        sequenceNumber: number | null;
        title: string;
        description: string | null;
        purpose: string;
        division: string | null;
        district: string | null;
        tehsil: string;
        requestedBy: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        requester: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignedTo: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignee: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        landArea: string | null;
        landType: string | null;
        landBreadth: number | null;
        landDepth: number | null;
        calculatedAreaSqFt: number | null;
        calculatedAreaMarlas: number | null;
        calculatedAreaKanals: number | null;
        govtLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        privateLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        mapFeatures: import("@prisma/client/runtime/client").JsonValue;
        requiredDate: Date | null;
        priority: import(".prisma/client").$Enums.requisitions_priority | null;
        supportingDocs: import("@prisma/client/runtime/client").JsonValue;
        status: string | null;
        estimatedValue: string | null;
        remarks: string | null;
        attachments: import("@prisma/client/runtime/client").JsonValue;
        dateCreated: Date | null;
        lastUpdated: Date | null;
        activityLog: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        activityLogs: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        location: {
            address: string;
            coordinates: {
                lat: number;
                lng: number;
            } | null;
        };
        mapMarker: {
            lat: number;
            lng: number;
        } | null;
        mapViewport: {
            center: {
                lat: number;
                lng: number;
            };
            zoom: number;
        } | null;
        landAcquisition: {
            updatedBy: bigint | null;
            updatedAt: Date | null;
            type: string;
            status: string;
        };
        landUtilization: {
            overview: {
                phase: string;
                summary: string;
                nextMilestone: string;
            };
            civilStructures: {
                id: bigint;
                _id: bigint;
                name: string;
                category: string | null;
                status: string | null;
                description: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            machinery: {
                id: bigint;
                _id: bigint;
                name: string;
                type: string | null;
                status: string | null;
                capacity: string | null;
                manufacturer: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            progressUpdates: {
                id: bigint;
                _id: bigint;
                status: string;
                description: string | null;
                progressDate: Date | null;
                completionPercentage: number | null;
                attachments: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            gallery: string | number | true | import("@prisma/client/runtime/client").JsonObject | import("@prisma/client/runtime/client").JsonArray;
            updatedBy: bigint | null;
            updatedAt: Date | null;
        };
        locationAddress: string | null;
        locationLat: number | null;
        locationLng: number | null;
        mapMarkerLat: number | null;
        mapMarkerLng: number | null;
        mapViewportCenterLat: number | null;
        mapViewportCenterLng: number | null;
        mapViewportZoom: number | null;
        landAcquisitionType: import(".prisma/client").$Enums.requisitions_land_acquisition_type | null;
        landAcquisitionStatus: string | null;
        landAcquisitionData: import("@prisma/client/runtime/client").JsonValue;
        landAcquisitionUpdatedBy: bigint | null;
        landAcquisitionUpdatedAt: Date | null;
        landUtilizationPhase: string | null;
        landUtilizationSummary: string | null;
        landUtilizationNextMilestone: string | null;
        landUtilizationGallery: import("@prisma/client/runtime/client").JsonValue;
        landUtilizationUpdatedBy: bigint | null;
        landUtilizationUpdatedAt: Date | null;
    } | null>;
    bccForwardWb(id: string, user: JwtPayload, body: {
        officerId?: unknown;
        remarks?: unknown;
    }): Promise<{
        id: bigint;
        _id: bigint;
        sequenceNumber: number | null;
        title: string;
        description: string | null;
        purpose: string;
        division: string | null;
        district: string | null;
        tehsil: string;
        requestedBy: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        requester: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignedTo: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignee: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        landArea: string | null;
        landType: string | null;
        landBreadth: number | null;
        landDepth: number | null;
        calculatedAreaSqFt: number | null;
        calculatedAreaMarlas: number | null;
        calculatedAreaKanals: number | null;
        govtLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        privateLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        mapFeatures: import("@prisma/client/runtime/client").JsonValue;
        requiredDate: Date | null;
        priority: import(".prisma/client").$Enums.requisitions_priority | null;
        supportingDocs: import("@prisma/client/runtime/client").JsonValue;
        status: string | null;
        estimatedValue: string | null;
        remarks: string | null;
        attachments: import("@prisma/client/runtime/client").JsonValue;
        dateCreated: Date | null;
        lastUpdated: Date | null;
        activityLog: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        activityLogs: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        location: {
            address: string;
            coordinates: {
                lat: number;
                lng: number;
            } | null;
        };
        mapMarker: {
            lat: number;
            lng: number;
        } | null;
        mapViewport: {
            center: {
                lat: number;
                lng: number;
            };
            zoom: number;
        } | null;
        landAcquisition: {
            updatedBy: bigint | null;
            updatedAt: Date | null;
            type: string;
            status: string;
        };
        landUtilization: {
            overview: {
                phase: string;
                summary: string;
                nextMilestone: string;
            };
            civilStructures: {
                id: bigint;
                _id: bigint;
                name: string;
                category: string | null;
                status: string | null;
                description: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            machinery: {
                id: bigint;
                _id: bigint;
                name: string;
                type: string | null;
                status: string | null;
                capacity: string | null;
                manufacturer: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            progressUpdates: {
                id: bigint;
                _id: bigint;
                status: string;
                description: string | null;
                progressDate: Date | null;
                completionPercentage: number | null;
                attachments: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            gallery: string | number | true | import("@prisma/client/runtime/client").JsonObject | import("@prisma/client/runtime/client").JsonArray;
            updatedBy: bigint | null;
            updatedAt: Date | null;
        };
        locationAddress: string | null;
        locationLat: number | null;
        locationLng: number | null;
        mapMarkerLat: number | null;
        mapMarkerLng: number | null;
        mapViewportCenterLat: number | null;
        mapViewportCenterLng: number | null;
        mapViewportZoom: number | null;
        landAcquisitionType: import(".prisma/client").$Enums.requisitions_land_acquisition_type | null;
        landAcquisitionStatus: string | null;
        landAcquisitionData: import("@prisma/client/runtime/client").JsonValue;
        landAcquisitionUpdatedBy: bigint | null;
        landAcquisitionUpdatedAt: Date | null;
        landUtilizationPhase: string | null;
        landUtilizationSummary: string | null;
        landUtilizationNextMilestone: string | null;
        landUtilizationGallery: import("@prisma/client/runtime/client").JsonValue;
        landUtilizationUpdatedBy: bigint | null;
        landUtilizationUpdatedAt: Date | null;
    } | null>;
    wbApprove(id: string, user: JwtPayload, body: {
        officerId?: unknown;
        remarks?: unknown;
    }): Promise<{
        id: bigint;
        _id: bigint;
        sequenceNumber: number | null;
        title: string;
        description: string | null;
        purpose: string;
        division: string | null;
        district: string | null;
        tehsil: string;
        requestedBy: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        requester: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignedTo: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignee: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        landArea: string | null;
        landType: string | null;
        landBreadth: number | null;
        landDepth: number | null;
        calculatedAreaSqFt: number | null;
        calculatedAreaMarlas: number | null;
        calculatedAreaKanals: number | null;
        govtLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        privateLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        mapFeatures: import("@prisma/client/runtime/client").JsonValue;
        requiredDate: Date | null;
        priority: import(".prisma/client").$Enums.requisitions_priority | null;
        supportingDocs: import("@prisma/client/runtime/client").JsonValue;
        status: string | null;
        estimatedValue: string | null;
        remarks: string | null;
        attachments: import("@prisma/client/runtime/client").JsonValue;
        dateCreated: Date | null;
        lastUpdated: Date | null;
        activityLog: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        activityLogs: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        location: {
            address: string;
            coordinates: {
                lat: number;
                lng: number;
            } | null;
        };
        mapMarker: {
            lat: number;
            lng: number;
        } | null;
        mapViewport: {
            center: {
                lat: number;
                lng: number;
            };
            zoom: number;
        } | null;
        landAcquisition: {
            updatedBy: bigint | null;
            updatedAt: Date | null;
            type: string;
            status: string;
        };
        landUtilization: {
            overview: {
                phase: string;
                summary: string;
                nextMilestone: string;
            };
            civilStructures: {
                id: bigint;
                _id: bigint;
                name: string;
                category: string | null;
                status: string | null;
                description: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            machinery: {
                id: bigint;
                _id: bigint;
                name: string;
                type: string | null;
                status: string | null;
                capacity: string | null;
                manufacturer: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            progressUpdates: {
                id: bigint;
                _id: bigint;
                status: string;
                description: string | null;
                progressDate: Date | null;
                completionPercentage: number | null;
                attachments: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            gallery: string | number | true | import("@prisma/client/runtime/client").JsonObject | import("@prisma/client/runtime/client").JsonArray;
            updatedBy: bigint | null;
            updatedAt: Date | null;
        };
        locationAddress: string | null;
        locationLat: number | null;
        locationLng: number | null;
        mapMarkerLat: number | null;
        mapMarkerLng: number | null;
        mapViewportCenterLat: number | null;
        mapViewportCenterLng: number | null;
        mapViewportZoom: number | null;
        landAcquisitionType: import(".prisma/client").$Enums.requisitions_land_acquisition_type | null;
        landAcquisitionStatus: string | null;
        landAcquisitionData: import("@prisma/client/runtime/client").JsonValue;
        landAcquisitionUpdatedBy: bigint | null;
        landAcquisitionUpdatedAt: Date | null;
        landUtilizationPhase: string | null;
        landUtilizationSummary: string | null;
        landUtilizationNextMilestone: string | null;
        landUtilizationGallery: import("@prisma/client/runtime/client").JsonValue;
        landUtilizationUpdatedBy: bigint | null;
        landUtilizationUpdatedAt: Date | null;
    } | null>;
    chiefMarkTm(id: string, user: JwtPayload, body: {
        officerId?: unknown;
        remarks?: unknown;
    }): Promise<{
        id: bigint;
        _id: bigint;
        sequenceNumber: number | null;
        title: string;
        description: string | null;
        purpose: string;
        division: string | null;
        district: string | null;
        tehsil: string;
        requestedBy: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        requester: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignedTo: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignee: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        landArea: string | null;
        landType: string | null;
        landBreadth: number | null;
        landDepth: number | null;
        calculatedAreaSqFt: number | null;
        calculatedAreaMarlas: number | null;
        calculatedAreaKanals: number | null;
        govtLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        privateLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        mapFeatures: import("@prisma/client/runtime/client").JsonValue;
        requiredDate: Date | null;
        priority: import(".prisma/client").$Enums.requisitions_priority | null;
        supportingDocs: import("@prisma/client/runtime/client").JsonValue;
        status: string | null;
        estimatedValue: string | null;
        remarks: string | null;
        attachments: import("@prisma/client/runtime/client").JsonValue;
        dateCreated: Date | null;
        lastUpdated: Date | null;
        activityLog: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        activityLogs: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        location: {
            address: string;
            coordinates: {
                lat: number;
                lng: number;
            } | null;
        };
        mapMarker: {
            lat: number;
            lng: number;
        } | null;
        mapViewport: {
            center: {
                lat: number;
                lng: number;
            };
            zoom: number;
        } | null;
        landAcquisition: {
            updatedBy: bigint | null;
            updatedAt: Date | null;
            type: string;
            status: string;
        };
        landUtilization: {
            overview: {
                phase: string;
                summary: string;
                nextMilestone: string;
            };
            civilStructures: {
                id: bigint;
                _id: bigint;
                name: string;
                category: string | null;
                status: string | null;
                description: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            machinery: {
                id: bigint;
                _id: bigint;
                name: string;
                type: string | null;
                status: string | null;
                capacity: string | null;
                manufacturer: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            progressUpdates: {
                id: bigint;
                _id: bigint;
                status: string;
                description: string | null;
                progressDate: Date | null;
                completionPercentage: number | null;
                attachments: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            gallery: string | number | true | import("@prisma/client/runtime/client").JsonObject | import("@prisma/client/runtime/client").JsonArray;
            updatedBy: bigint | null;
            updatedAt: Date | null;
        };
        locationAddress: string | null;
        locationLat: number | null;
        locationLng: number | null;
        mapMarkerLat: number | null;
        mapMarkerLng: number | null;
        mapViewportCenterLat: number | null;
        mapViewportCenterLng: number | null;
        mapViewportZoom: number | null;
        landAcquisitionType: import(".prisma/client").$Enums.requisitions_land_acquisition_type | null;
        landAcquisitionStatus: string | null;
        landAcquisitionData: import("@prisma/client/runtime/client").JsonValue;
        landAcquisitionUpdatedBy: bigint | null;
        landAcquisitionUpdatedAt: Date | null;
        landUtilizationPhase: string | null;
        landUtilizationSummary: string | null;
        landUtilizationNextMilestone: string | null;
        landUtilizationGallery: import("@prisma/client/runtime/client").JsonValue;
        landUtilizationUpdatedBy: bigint | null;
        landUtilizationUpdatedAt: Date | null;
    } | null>;
    tmForwardBcc(id: string, user: JwtPayload, body: {
        officerId?: unknown;
        remarks?: unknown;
    }): Promise<{
        id: bigint;
        _id: bigint;
        sequenceNumber: number | null;
        title: string;
        description: string | null;
        purpose: string;
        division: string | null;
        district: string | null;
        tehsil: string;
        requestedBy: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        requester: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignedTo: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignee: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        landArea: string | null;
        landType: string | null;
        landBreadth: number | null;
        landDepth: number | null;
        calculatedAreaSqFt: number | null;
        calculatedAreaMarlas: number | null;
        calculatedAreaKanals: number | null;
        govtLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        privateLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        mapFeatures: import("@prisma/client/runtime/client").JsonValue;
        requiredDate: Date | null;
        priority: import(".prisma/client").$Enums.requisitions_priority | null;
        supportingDocs: import("@prisma/client/runtime/client").JsonValue;
        status: string | null;
        estimatedValue: string | null;
        remarks: string | null;
        attachments: import("@prisma/client/runtime/client").JsonValue;
        dateCreated: Date | null;
        lastUpdated: Date | null;
        activityLog: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        activityLogs: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        location: {
            address: string;
            coordinates: {
                lat: number;
                lng: number;
            } | null;
        };
        mapMarker: {
            lat: number;
            lng: number;
        } | null;
        mapViewport: {
            center: {
                lat: number;
                lng: number;
            };
            zoom: number;
        } | null;
        landAcquisition: {
            updatedBy: bigint | null;
            updatedAt: Date | null;
            type: string;
            status: string;
        };
        landUtilization: {
            overview: {
                phase: string;
                summary: string;
                nextMilestone: string;
            };
            civilStructures: {
                id: bigint;
                _id: bigint;
                name: string;
                category: string | null;
                status: string | null;
                description: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            machinery: {
                id: bigint;
                _id: bigint;
                name: string;
                type: string | null;
                status: string | null;
                capacity: string | null;
                manufacturer: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            progressUpdates: {
                id: bigint;
                _id: bigint;
                status: string;
                description: string | null;
                progressDate: Date | null;
                completionPercentage: number | null;
                attachments: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            gallery: string | number | true | import("@prisma/client/runtime/client").JsonObject | import("@prisma/client/runtime/client").JsonArray;
            updatedBy: bigint | null;
            updatedAt: Date | null;
        };
        locationAddress: string | null;
        locationLat: number | null;
        locationLng: number | null;
        mapMarkerLat: number | null;
        mapMarkerLng: number | null;
        mapViewportCenterLat: number | null;
        mapViewportCenterLng: number | null;
        mapViewportZoom: number | null;
        landAcquisitionType: import(".prisma/client").$Enums.requisitions_land_acquisition_type | null;
        landAcquisitionStatus: string | null;
        landAcquisitionData: import("@prisma/client/runtime/client").JsonValue;
        landAcquisitionUpdatedBy: bigint | null;
        landAcquisitionUpdatedAt: Date | null;
        landUtilizationPhase: string | null;
        landUtilizationSummary: string | null;
        landUtilizationNextMilestone: string | null;
        landUtilizationGallery: import("@prisma/client/runtime/client").JsonValue;
        landUtilizationUpdatedBy: bigint | null;
        landUtilizationUpdatedAt: Date | null;
    } | null>;
    bccClose(id: string, user: JwtPayload, body: {
        remarks?: unknown;
    }): Promise<{
        id: bigint;
        _id: bigint;
        sequenceNumber: number | null;
        title: string;
        description: string | null;
        purpose: string;
        division: string | null;
        district: string | null;
        tehsil: string;
        requestedBy: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        requester: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignedTo: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignee: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        landArea: string | null;
        landType: string | null;
        landBreadth: number | null;
        landDepth: number | null;
        calculatedAreaSqFt: number | null;
        calculatedAreaMarlas: number | null;
        calculatedAreaKanals: number | null;
        govtLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        privateLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        mapFeatures: import("@prisma/client/runtime/client").JsonValue;
        requiredDate: Date | null;
        priority: import(".prisma/client").$Enums.requisitions_priority | null;
        supportingDocs: import("@prisma/client/runtime/client").JsonValue;
        status: string | null;
        estimatedValue: string | null;
        remarks: string | null;
        attachments: import("@prisma/client/runtime/client").JsonValue;
        dateCreated: Date | null;
        lastUpdated: Date | null;
        activityLog: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        activityLogs: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        location: {
            address: string;
            coordinates: {
                lat: number;
                lng: number;
            } | null;
        };
        mapMarker: {
            lat: number;
            lng: number;
        } | null;
        mapViewport: {
            center: {
                lat: number;
                lng: number;
            };
            zoom: number;
        } | null;
        landAcquisition: {
            updatedBy: bigint | null;
            updatedAt: Date | null;
            type: string;
            status: string;
        };
        landUtilization: {
            overview: {
                phase: string;
                summary: string;
                nextMilestone: string;
            };
            civilStructures: {
                id: bigint;
                _id: bigint;
                name: string;
                category: string | null;
                status: string | null;
                description: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            machinery: {
                id: bigint;
                _id: bigint;
                name: string;
                type: string | null;
                status: string | null;
                capacity: string | null;
                manufacturer: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            progressUpdates: {
                id: bigint;
                _id: bigint;
                status: string;
                description: string | null;
                progressDate: Date | null;
                completionPercentage: number | null;
                attachments: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            gallery: string | number | true | import("@prisma/client/runtime/client").JsonObject | import("@prisma/client/runtime/client").JsonArray;
            updatedBy: bigint | null;
            updatedAt: Date | null;
        };
        locationAddress: string | null;
        locationLat: number | null;
        locationLng: number | null;
        mapMarkerLat: number | null;
        mapMarkerLng: number | null;
        mapViewportCenterLat: number | null;
        mapViewportCenterLng: number | null;
        mapViewportZoom: number | null;
        landAcquisitionType: import(".prisma/client").$Enums.requisitions_land_acquisition_type | null;
        landAcquisitionStatus: string | null;
        landAcquisitionData: import("@prisma/client/runtime/client").JsonValue;
        landAcquisitionUpdatedBy: bigint | null;
        landAcquisitionUpdatedAt: Date | null;
        landUtilizationPhase: string | null;
        landUtilizationSummary: string | null;
        landUtilizationNextMilestone: string | null;
        landUtilizationGallery: import("@prisma/client/runtime/client").JsonValue;
        landUtilizationUpdatedBy: bigint | null;
        landUtilizationUpdatedAt: Date | null;
    } | null>;
    revert(id: string, user: JwtPayload, body: {
        remarks?: unknown;
        toStatus?: unknown;
        officerId?: unknown;
    }): Promise<{
        id: bigint;
        _id: bigint;
        sequenceNumber: number | null;
        title: string;
        description: string | null;
        purpose: string;
        division: string | null;
        district: string | null;
        tehsil: string;
        requestedBy: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        requester: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignedTo: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        assignee: {
            id: bigint;
            simpleId: number | null;
            name: string;
            email: string | undefined;
            role: string;
        } | null;
        landArea: string | null;
        landType: string | null;
        landBreadth: number | null;
        landDepth: number | null;
        calculatedAreaSqFt: number | null;
        calculatedAreaMarlas: number | null;
        calculatedAreaKanals: number | null;
        govtLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        privateLandChecklist: import("@prisma/client/runtime/client").JsonValue;
        mapFeatures: import("@prisma/client/runtime/client").JsonValue;
        requiredDate: Date | null;
        priority: import(".prisma/client").$Enums.requisitions_priority | null;
        supportingDocs: import("@prisma/client/runtime/client").JsonValue;
        status: string | null;
        estimatedValue: string | null;
        remarks: string | null;
        attachments: import("@prisma/client/runtime/client").JsonValue;
        dateCreated: Date | null;
        lastUpdated: Date | null;
        activityLog: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        activityLogs: {
            id: bigint;
            _id: bigint;
            action: string | null;
            userId: bigint | null;
            user: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            actor: {
                id: bigint;
                simpleId: number | null;
                name: string;
                email: string | undefined;
                role: string;
            } | null;
            timestamp: Date | null;
            remarks: string | null;
            meta: import("@prisma/client/runtime/client").JsonValue;
        }[];
        location: {
            address: string;
            coordinates: {
                lat: number;
                lng: number;
            } | null;
        };
        mapMarker: {
            lat: number;
            lng: number;
        } | null;
        mapViewport: {
            center: {
                lat: number;
                lng: number;
            };
            zoom: number;
        } | null;
        landAcquisition: {
            updatedBy: bigint | null;
            updatedAt: Date | null;
            type: string;
            status: string;
        };
        landUtilization: {
            overview: {
                phase: string;
                summary: string;
                nextMilestone: string;
            };
            civilStructures: {
                id: bigint;
                _id: bigint;
                name: string;
                category: string | null;
                status: string | null;
                description: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            machinery: {
                id: bigint;
                _id: bigint;
                name: string;
                type: string | null;
                status: string | null;
                capacity: string | null;
                manufacturer: string | null;
                attributes: import("@prisma/client/runtime/client").JsonValue;
                photos: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            progressUpdates: {
                id: bigint;
                _id: bigint;
                status: string;
                description: string | null;
                progressDate: Date | null;
                completionPercentage: number | null;
                attachments: import("@prisma/client/runtime/client").JsonValue;
                updatedBy: {
                    id: bigint;
                    name: string;
                    role: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            gallery: string | number | true | import("@prisma/client/runtime/client").JsonObject | import("@prisma/client/runtime/client").JsonArray;
            updatedBy: bigint | null;
            updatedAt: Date | null;
        };
        locationAddress: string | null;
        locationLat: number | null;
        locationLng: number | null;
        mapMarkerLat: number | null;
        mapMarkerLng: number | null;
        mapViewportCenterLat: number | null;
        mapViewportCenterLng: number | null;
        mapViewportZoom: number | null;
        landAcquisitionType: import(".prisma/client").$Enums.requisitions_land_acquisition_type | null;
        landAcquisitionStatus: string | null;
        landAcquisitionData: import("@prisma/client/runtime/client").JsonValue;
        landAcquisitionUpdatedBy: bigint | null;
        landAcquisitionUpdatedAt: Date | null;
        landUtilizationPhase: string | null;
        landUtilizationSummary: string | null;
        landUtilizationNextMilestone: string | null;
        landUtilizationGallery: import("@prisma/client/runtime/client").JsonValue;
        landUtilizationUpdatedBy: bigint | null;
        landUtilizationUpdatedAt: Date | null;
    } | null>;
}
