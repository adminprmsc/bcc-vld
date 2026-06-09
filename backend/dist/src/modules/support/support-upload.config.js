"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supportUploadOptions = exports.SUPPORT_ALLOWED_MIME = void 0;
const multer_1 = require("multer");
const path_1 = require("path");
const fs_1 = require("fs");
const SUPPORT_UPLOAD_DIR = (0, path_1.join)(process.cwd(), 'uploads', 'support');
exports.SUPPORT_ALLOWED_MIME = new Set([
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
]);
function ensureDir(dir) {
    if (!(0, fs_1.existsSync)(dir)) {
        (0, fs_1.mkdirSync)(dir, { recursive: true });
    }
}
ensureDir(SUPPORT_UPLOAD_DIR);
exports.supportUploadOptions = {
    storage: (0, multer_1.diskStorage)({
        destination: (_req, _file, cb) => {
            ensureDir(SUPPORT_UPLOAD_DIR);
            cb(null, SUPPORT_UPLOAD_DIR);
        },
        filename: (_req, file, cb) => {
            const timestamp = Date.now();
            const random = Math.round(Math.random() * 1e9);
            const ext = (0, path_1.extname)(file.originalname) || '';
            cb(null, `support-${timestamp}-${random}${ext}`);
        },
    }),
    limits: { fileSize: 8 * 1024 * 1024, files: 5 },
    fileFilter: (_req, file, cb) => {
        if (exports.SUPPORT_ALLOWED_MIME.has(file.mimetype)) {
            cb(null, true);
            return;
        }
        cb(new Error('Unsupported attachment type. Allowed formats: pdf, images, word, excel, txt.'));
    },
};
//# sourceMappingURL=support-upload.config.js.map