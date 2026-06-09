import { Prisma } from '@prisma/client';
import { CounterService } from '../../common/counter/counter.service';
import { JwtPayload } from '../../common/security/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { CreateRequisitionDto } from './dto/create-requisition.dto';
import { LandUtilizationProgressDto } from './dto/land-utilization-progress.dto';
import { MaintenanceFormDto } from './dto/maintenance-form.dto';
import { RedbookOperationalDto } from './dto/redbook-operational.dto';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { WaterSampleCollectionDto } from './dto/water-sample-collection.dto';
export declare class MobileService {
    private readonly prisma;
    private readonly counters;
    constructor(prisma: PrismaService, counters: CounterService);
    getDashboard(user: JwtPayload): Promise<{
        metrics: {
            id: string;
            label: string;
            value: number;
            tone: string;
        }[];
        recentActivity: {
            id: bigint;
            title: string;
            status: string | null;
            tehsil: string;
            date: Date | null;
        }[];
        lastSync: string;
    }>;
    getTasks(user: JwtPayload): Promise<{
        id: bigint;
        title: string;
        type: string;
        status: string;
        priority: string;
        dueDate: null;
        location: string;
        note?: string;
    }[]>;
    completeTask(id: string, dto: CompleteTaskDto, user: JwtPayload): Promise<{
        success: boolean;
        type: string;
    }>;
    getSyncStatus(): {
        id: string;
        name: string;
        status: string;
        lastSync: string;
    }[];
    retrySync(): {
        success: boolean;
    };
    getMapOverlays(): Promise<{
        type: "FeatureCollection";
        features: {
            type: "Feature";
            id: string;
            geometry: Prisma.JsonValue;
            properties: {
                title: string;
                category: string;
                tehsil: string | null;
                critical: boolean;
                qualityStatus: string;
            };
        }[];
    }>;
    createRequisition(dto: CreateRequisitionDto, user: JwtPayload): Promise<{
        success: boolean;
        id: bigint;
        sequenceNumber: number | null;
        offlineId: string | number | undefined;
    }>;
    uploadRequisitionAttachments(id: string, files: Express.Multer.File[]): Promise<{
        success: boolean;
        attachments: string[];
    }>;
    createMaintenanceRecord(dto: MaintenanceFormDto, user: JwtPayload): Promise<{
        success: boolean;
        recordId: bigint;
        offlineId: string | number | undefined;
    }>;
    submitWaterSampleCollection(dto: WaterSampleCollectionDto, user: JwtPayload): Promise<{
        success: boolean;
        status: "in_lab";
        offlineId: string | number | undefined;
    }>;
    uploadWaterSampleAttachments(id: string, files: Express.Multer.File[], user: JwtPayload): Promise<{
        success: boolean;
        attachments: {
            id: bigint;
            storedName: string;
            originalName: string;
            mimeType: string;
            size: number;
        }[];
    }>;
    submitLandUtilizationProgress(dto: LandUtilizationProgressDto, user: JwtPayload): Promise<{
        success: boolean;
        requisitionId: bigint;
        offlineId: string | number | undefined;
    }>;
    submitRedbookOperational(dto: RedbookOperationalDto, user: JwtPayload): Promise<{
        success: boolean;
        assetId: bigint;
        offlineId: string | number | undefined;
    }>;
    getNotifications(user: JwtPayload): Promise<{
        notifications: {
            id: string;
            title: string;
            body: string;
            type: string;
            data: Record<string, unknown>;
            read: boolean;
            createdAt: string;
        }[];
    }>;
    registerPushToken(dto: RegisterPushTokenDto, user: JwtPayload): Promise<{
        success: boolean;
    }>;
    markNotificationRead(): {
        success: boolean;
    };
    private resolveUser;
    private getTaskCount;
    private fetchTasks;
    private mapSampleStatus;
}
