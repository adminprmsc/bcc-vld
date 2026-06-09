export declare const WATER_SUPPLY_ASSETS: readonly [{
    readonly value: "water-pipeline";
    readonly label: "Water Pipeline";
    readonly category: "Water Supply";
}, {
    readonly value: "overhead-reservoir";
    readonly label: "Overhead Reservoir (OHR)";
    readonly category: "Water Supply";
}, {
    readonly value: "stand-post";
    readonly label: "Stand Post";
    readonly category: "Water Supply";
}, {
    readonly value: "ro-plant";
    readonly label: "RO Plant";
    readonly category: "Water Supply";
}, {
    readonly value: "bore-hole";
    readonly label: "Bore Hole Location";
    readonly category: "Water Supply";
}, {
    readonly value: "tubewell-pump-room";
    readonly label: "Tubewell Pump Room";
    readonly category: "Water Supply";
}];
export declare const SEWERAGE_ASSETS: readonly [{
    readonly value: "abr";
    readonly label: "ABR";
    readonly category: "Sewerage";
}, {
    readonly value: "sewage-line";
    readonly label: "Sewage Line";
    readonly category: "Sewerage";
}, {
    readonly value: "manhole";
    readonly label: "Manhole";
    readonly category: "Sewerage";
}, {
    readonly value: "other-sewerage-asset";
    readonly label: "Other Sewerage Asset";
    readonly category: "Sewerage";
}];
export declare const SUPPORT_ASSETS: readonly [{
    readonly value: "guard-room";
    readonly label: "Guard Room";
    readonly category: "Support Facility";
}, {
    readonly value: "solar-installation";
    readonly label: "Solar Installation";
    readonly category: "Support Facility";
}, {
    readonly value: "water-support-asset";
    readonly label: "Other Water Support Asset";
    readonly category: "Support Facility";
}];
export declare const CUSTOM_ASSETS: readonly [{
    readonly value: "custom-asset";
    readonly label: "Custom Asset";
    readonly category: "Custom";
}];
export type AssetDefinition = {
    value: string;
    label: string;
    category: string;
};
export declare const ASSET_DEFINITIONS: AssetDefinition[];
export declare const DEFAULT_LAYER_NAME = "PRMSC Red Book Assets";
export declare const READ_ROLES: readonly ["Super Admin", "Admin", "DM Tehsil", "Tehsil DM", "Infra Engineer", "CID", "BCC Specialist", "BCC Officer Tehsil", "BCC Officer", "EDCS Consultant", "EDCS User", "Tehsil Manager", "RA Environment", "PCRWR Sampler", "PCRWR Lab"];
export declare const WRITE_ROLES: readonly ["EDCS Consultant", "EDCS User", "Super Admin", "Admin", "Tehsil Manager"];
export declare const MANAGE_ROLES: readonly ["Super Admin", "Admin", "Tehsil Manager"];
export declare const MAINTENANCE_ROLES: readonly ["Super Admin", "Admin", "Tehsil Manager"];
export declare const CONSULTANT_CREATOR_ROLES: readonly ["EDCS Consultant", "EDCS User"];
export declare const PLAN_ALLOWED_MIME_TYPES: Set<string>;
export declare const UPLOAD_SUBDIR = "documents";
export declare const MAX_UPLOAD_FILE_SIZE: number;
export declare const MAX_UPLOAD_FILES = 5;
