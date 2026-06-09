export declare const MOBILE_UPLOAD_DIR: string;
export declare const mobileMulterOptions: {
    storage: import("multer").StorageEngine;
    limits: {
        fileSize: number;
        files: number;
    };
    fileFilter: (_req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => void;
};
