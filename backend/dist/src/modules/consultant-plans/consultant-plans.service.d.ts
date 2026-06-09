import { JwtPayload } from '../../common/security/jwt.strategy';
import { TehsilScopeService } from '../../domain/tehsil-scope/tehsil-scope.service';
import { PrismaService } from '../../prisma/prisma.service';
type ListQuery = {
    tehsil?: string;
    district?: string;
    category?: string;
    assetType?: string;
    requisitionId?: string;
    search?: string;
    format?: string;
};
export declare class ConsultantPlansService {
    private readonly prisma;
    private readonly tehsilScope;
    constructor(prisma: PrismaService, tehsilScope: TehsilScopeService);
    getDefinitions(): import("./consultant-plans.constants").AssetDefinition[];
    processUpload(files: Express.Multer.File[]): {
        attachments: (import("./consultant-plans.mapper").PlanAttachmentInput & {
            url: string;
        })[];
    };
    listPlans(user: JwtPayload, query: ListQuery): Promise<{
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
    getLayers(user: JwtPayload, query: ListQuery): Promise<{
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
    getPlanById(user: JwtPayload, id: string): Promise<{
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
    assertCanRead(role: string): void;
    assertCanWrite(role: string): void;
    private buildFilter;
    private fetchConsultantPlans;
    private canModify;
    private canReadPlan;
    private ensureMaintenanceOwner;
    private findTehsilManager;
}
export {};
