declare class LocationDto {
    address?: string;
    lat?: number | null;
    lng?: number | null;
}
export declare class CreateRequisitionDto {
    title: string;
    purpose: string;
    tehsil: string;
    district?: string;
    description?: string;
    landArea?: string;
    landType?: string;
    priority?: string;
    location?: LocationDto;
    mapMarker?: {
        lat?: number | null;
        lng?: number | null;
    };
    offlineId?: string | number;
}
export {};
