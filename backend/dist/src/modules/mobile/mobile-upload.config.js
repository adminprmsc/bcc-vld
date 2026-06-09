"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mobileMulterOptions = exports.MOBILE_UPLOAD_DIR = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const multer_1 = require("multer");
exports.MOBILE_UPLOAD_DIR = (0, path_1.join)(process.cwd(), 'uploads', 'mobile');
if (!(0, fs_1.existsSync)(exports.MOBILE_UPLOAD_DIR)) {
    (0, fs_1.mkdirSync)(exports.MOBILE_UPLOAD_DIR, { recursive: true });
}
exports.mobileMulterOptions = {
    storage: (0, multer_1.diskStorage)({
        destination: (_req, _file, cb) => cb(null, exports.MOBILE_UPLOAD_DIR),
        filename: (_req, file, cb) => {
            const timestamp = Date.now();
            const random = Math.round(Math.random() * 1e9);
            const ext = (0, path_1.extname)(file.originalname) || '';
            cb(null, `mobile-${timestamp}-${random}${ext}`);
        },
    }),
    limits: { fileSize: 10 * 1024 * 1024, files: 10 },
    fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Unsupported file type'), false);
        }
    },
};
//# sourceMappingURL=mobile-upload.config.js.map