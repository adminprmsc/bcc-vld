export declare class LandUtilizationProgressDto {
    requisitionId: string;
    progressStatus: string;
    progressPercentage: number;
    description: string;
    workType?: string;
    challenges?: string;
    nextSteps?: string;
    location?: Record<string, unknown> | null;
    capturedAt?: string;
    offlineId?: string | number;
}
