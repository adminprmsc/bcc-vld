export declare class WaterSampleCollectionDto {
    sampleId: string | number;
    collectedAt: string;
    fieldNotes?: string;
    location?: {
        lat?: number | null;
        lng?: number | null;
    };
    offlineId?: string | number;
}
