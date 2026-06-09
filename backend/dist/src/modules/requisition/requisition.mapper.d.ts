import { Prisma } from '@prisma/client';
export declare const REQUISITION_INCLUDE: {
    users_requisitions_requested_byTousers: {
        select: {
            id: true;
            simple_id: true;
            name: true;
            email: true;
            role: true;
        };
    };
    users_requisitions_assigned_toTousers: {
        select: {
            id: true;
            simple_id: true;
            name: true;
            email: true;
            role: true;
        };
    };
    requisition_activity_logs: {
        orderBy: {
            timestamp: "asc";
        };
        include: {
            users: {
                select: {
                    id: true;
                    simple_id: true;
                    name: true;
                    role: true;
                };
            };
        };
    };
    requisition_civil_structures: {
        include: {
            users: {
                select: {
                    id: true;
                    name: true;
                    role: true;
                };
            };
        };
    };
    requisition_machinery: {
        include: {
            users: {
                select: {
                    id: true;
                    name: true;
                    role: true;
                };
            };
        };
    };
    requisition_progress_updates: {
        include: {
            users: {
                select: {
                    id: true;
                    name: true;
                    role: true;
                };
            };
        };
    };
};
export type RequisitionWithRelations = Prisma.requisitionsGetPayload<{
    include: typeof REQUISITION_INCLUDE;
}>;
export declare function serializeRequisition(row: RequisitionWithRelations | null): {
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
    govtLandChecklist: Prisma.JsonValue;
    privateLandChecklist: Prisma.JsonValue;
    mapFeatures: Prisma.JsonValue;
    requiredDate: Date | null;
    priority: import(".prisma/client").$Enums.requisitions_priority | null;
    supportingDocs: Prisma.JsonValue;
    status: string | null;
    estimatedValue: string | null;
    remarks: string | null;
    attachments: Prisma.JsonValue;
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
        meta: Prisma.JsonValue;
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
        meta: Prisma.JsonValue;
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
            attributes: Prisma.JsonValue;
            photos: Prisma.JsonValue;
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
            attributes: Prisma.JsonValue;
            photos: Prisma.JsonValue;
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
            attachments: Prisma.JsonValue;
            updatedBy: {
                id: bigint;
                name: string;
                role: string;
            } | null;
            createdAt: Date;
            updatedAt: Date;
        }[];
        gallery: string | number | true | Prisma.JsonObject | Prisma.JsonArray;
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
    landAcquisitionData: Prisma.JsonValue;
    landAcquisitionUpdatedBy: bigint | null;
    landAcquisitionUpdatedAt: Date | null;
    landUtilizationPhase: string | null;
    landUtilizationSummary: string | null;
    landUtilizationNextMilestone: string | null;
    landUtilizationGallery: Prisma.JsonValue;
    landUtilizationUpdatedBy: bigint | null;
    landUtilizationUpdatedAt: Date | null;
} | null;
export declare function serializeMany(requisitions: RequisitionWithRelations[]): ({
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
    govtLandChecklist: Prisma.JsonValue;
    privateLandChecklist: Prisma.JsonValue;
    mapFeatures: Prisma.JsonValue;
    requiredDate: Date | null;
    priority: import(".prisma/client").$Enums.requisitions_priority | null;
    supportingDocs: Prisma.JsonValue;
    status: string | null;
    estimatedValue: string | null;
    remarks: string | null;
    attachments: Prisma.JsonValue;
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
        meta: Prisma.JsonValue;
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
        meta: Prisma.JsonValue;
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
            attributes: Prisma.JsonValue;
            photos: Prisma.JsonValue;
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
            attributes: Prisma.JsonValue;
            photos: Prisma.JsonValue;
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
            attachments: Prisma.JsonValue;
            updatedBy: {
                id: bigint;
                name: string;
                role: string;
            } | null;
            createdAt: Date;
            updatedAt: Date;
        }[];
        gallery: string | number | true | Prisma.JsonObject | Prisma.JsonArray;
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
    landAcquisitionData: Prisma.JsonValue;
    landAcquisitionUpdatedBy: bigint | null;
    landAcquisitionUpdatedAt: Date | null;
    landUtilizationPhase: string | null;
    landUtilizationSummary: string | null;
    landUtilizationNextMilestone: string | null;
    landUtilizationGallery: Prisma.JsonValue;
    landUtilizationUpdatedBy: bigint | null;
    landUtilizationUpdatedAt: Date | null;
} | null)[];
export declare function summarizeUser(user: unknown): string;
