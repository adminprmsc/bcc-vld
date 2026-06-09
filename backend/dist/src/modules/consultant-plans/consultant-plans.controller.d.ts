import { JwtPayload } from '../../common/security/jwt.strategy';
import { ConsultantPlansService } from './consultant-plans.service';
export declare class ConsultantPlansController {
    private readonly service;
    constructor(service: ConsultantPlansService);
    getDefinitions(user: JwtPayload): import("./consultant-plans.constants").AssetDefinition[];
    uploadAttachments(user: JwtPayload, files: Express.Multer.File[]): Promise<{
        attachments: (import("./consultant-plans.mapper").PlanAttachmentInput & {
            url: string;
        })[];
    }>;
    getLayers(user: JwtPayload, tehsil?: string, district?: string, category?: string, assetType?: string, requisitionId?: string, search?: string, format?: string): Promise<{
        type: string;
        features: ({
            type: "Feature";
            geometry: any;
            properties: Record<string, unknown>;
        } | null)[];
        layers?: undefined;
    } | {
        layers: Record<string, {
            type: "Feature";
            geometry: any;
            properties: Record<string, unknown>;
        }[]>;
        type?: undefined;
        features?: undefined;
    }>;
    listPlans(user: JwtPayload, tehsil?: string, district?: string, category?: string, assetType?: string, requisitionId?: string, search?: string): Promise<{
        id: string;
        title: string;
        assetType: string;
        assetLabel: string;
        category: string;
        layerName: string | null;
        description: string;
        requisitionId: string | null;
        tehsil: string;
        district: string;
        feature: {
            type: string;
            geometry: unknown;
            properties: object;
        };
        attributes: object;
        attachments: ({
            storedName: string;
            originalName: string;
            mimeType: string;
            size: number;
            url: string;
        } | null)[];
        maintenanceOwnerRole: string;
        maintenanceOwner: {
            id: string;
            name: string;
            role: string;
        } | null;
        maintenanceOwnerName: string;
        maintenanceRecords: {
            id: string;
            performedAt: Date;
            type: string;
            status: string;
            description: string;
            cost: number;
            notes: string;
            recordedBy: {
                id: string;
                name: string;
                role: string;
            } | null;
            recordedByName: string;
        }[];
        createdBy: {
            id: string;
            name: string;
            role: string;
        } | null;
        updatedBy: {
            id: string;
            name: string;
            role: string;
        } | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    getPlan(user: JwtPayload, id: string): Promise<{
        id: string;
        title: string;
        assetType: string;
        assetLabel: string;
        category: string;
        layerName: string | null;
        description: string;
        requisitionId: string | null;
        tehsil: string;
        district: string;
        feature: {
            type: string;
            geometry: unknown;
            properties: object;
        };
        attributes: object;
        attachments: ({
            storedName: string;
            originalName: string;
            mimeType: string;
            size: number;
            url: string;
        } | null)[];
        maintenanceOwnerRole: string;
        maintenanceOwner: {
            id: string;
            name: string;
            role: string;
        } | null;
        maintenanceOwnerName: string;
        maintenanceRecords: {
            id: string;
            performedAt: Date;
            type: string;
            status: string;
            description: string;
            cost: number;
            notes: string;
            recordedBy: {
                id: string;
                name: string;
                role: string;
            } | null;
            recordedByName: string;
        }[];
        createdBy: {
            id: string;
            name: string;
            role: string;
        } | null;
        updatedBy: {
            id: string;
            name: string;
            role: string;
        } | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    createPlan(user: JwtPayload, body: Record<string, unknown>): Promise<{
        id: string;
        title: string;
        assetType: string;
        assetLabel: string;
        category: string;
        layerName: string | null;
        description: string;
        requisitionId: string | null;
        tehsil: string;
        district: string;
        feature: {
            type: string;
            geometry: unknown;
            properties: object;
        };
        attributes: object;
        attachments: ({
            storedName: string;
            originalName: string;
            mimeType: string;
            size: number;
            url: string;
        } | null)[];
        maintenanceOwnerRole: string;
        maintenanceOwner: {
            id: string;
            name: string;
            role: string;
        } | null;
        maintenanceOwnerName: string;
        maintenanceRecords: {
            id: string;
            performedAt: Date;
            type: string;
            status: string;
            description: string;
            cost: number;
            notes: string;
            recordedBy: {
                id: string;
                name: string;
                role: string;
            } | null;
            recordedByName: string;
        }[];
        createdBy: {
            id: string;
            name: string;
            role: string;
        } | null;
        updatedBy: {
            id: string;
            name: string;
            role: string;
        } | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updatePlan(user: JwtPayload, id: string, body: Record<string, unknown>): Promise<{
        id: string;
        title: string;
        assetType: string;
        assetLabel: string;
        category: string;
        layerName: string | null;
        description: string;
        requisitionId: string | null;
        tehsil: string;
        district: string;
        feature: {
            type: string;
            geometry: unknown;
            properties: object;
        };
        attributes: object;
        attachments: ({
            storedName: string;
            originalName: string;
            mimeType: string;
            size: number;
            url: string;
        } | null)[];
        maintenanceOwnerRole: string;
        maintenanceOwner: {
            id: string;
            name: string;
            role: string;
        } | null;
        maintenanceOwnerName: string;
        maintenanceRecords: {
            id: string;
            performedAt: Date;
            type: string;
            status: string;
            description: string;
            cost: number;
            notes: string;
            recordedBy: {
                id: string;
                name: string;
                role: string;
            } | null;
            recordedByName: string;
        }[];
        createdBy: {
            id: string;
            name: string;
            role: string;
        } | null;
        updatedBy: {
            id: string;
            name: string;
            role: string;
        } | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deletePlan(user: JwtPayload, id: string): Promise<{
        msg: string;
    }>;
    private cleanupUploadedFiles;
}
