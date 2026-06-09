export declare const SUPPORT_ALLOWED_MIME: Set<string>;
export declare const supportUploadOptions: {
    storage: import("multer").StorageEngine;
    limits: {
        fileSize: number;
        files: number;
    };
    fileFilter: (_req: any, file: any, cb: any) => void;
};
