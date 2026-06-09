export declare const SAMPLE_UPLOAD_DIR: string;
export declare function ensureUploadDirectory(): void;
export declare const waterQualityUploadOptions: {
    storage: import("multer").StorageEngine;
    fileFilter(_req: unknown, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void): void;
    limits: {
        fileSize: number;
        files: number;
    };
};
export declare function storedNameForFile(filename: string): string;
export declare function cleanupFiles(files: Express.Multer.File[] | undefined): void;
export declare const WATER_QUALITY_FILES_INTERCEPTOR: {
    fieldName: string;
    maxCount: number;
};
