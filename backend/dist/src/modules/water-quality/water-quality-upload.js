"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WATER_QUALITY_FILES_INTERCEPTOR = exports.waterQualityUploadOptions = exports.SAMPLE_UPLOAD_DIR = void 0;
exports.ensureUploadDirectory = ensureUploadDirectory;
exports.storedNameForFile = storedNameForFile;
exports.cleanupFiles = cleanupFiles;
const fs_1 = require("fs");
const multer_1 = require("multer");
const path_1 = require("path");
const water_quality_constants_1 = require("./water-quality.constants");
exports.SAMPLE_UPLOAD_DIR = (0, path_1.join)(process.cwd(), 'uploads', 'water-quality');
function ensureUploadDirectory() {
    if (!(0, fs_1.existsSync)(exports.SAMPLE_UPLOAD_DIR)) {
        (0, fs_1.mkdirSync)(exports.SAMPLE_UPLOAD_DIR, { recursive: true });
    }
}
ensureUploadDirectory();
exports.waterQualityUploadOptions = {
    storage: (0, multer_1.diskStorage)({
        destination(_req, _file, cb) {
            ensureUploadDirectory();
            cb(null, exports.SAMPLE_UPLOAD_DIR);
        },
        filename(_req, file, cb) {
            const timestamp = Date.now();
            const random = Math.round(Math.random() * 1e9);
            const ext = (0, path_1.extname)(file.originalname) || '';
            cb(null, `sample-${timestamp}-${random}${ext}`);
        },
    }),
    fileFilter(_req, file, cb) {
        if (!water_quality_constants_1.ALLOWED_UPLOAD_TYPES.has(file.mimetype)) {
            cb(new Error('Unsupported attachment type.'), false);
            return;
        }
        cb(null, true);
    },
    limits: {
        fileSize: water_quality_constants_1.MAX_UPLOAD_BYTES,
        files: water_quality_constants_1.MAX_UPLOAD_FILES,
    },
};
function storedNameForFile(filename) {
    return path_1.posix.join('water-quality', filename);
}
function cleanupFiles(files) {
    if (!Array.isArray(files)) {
        return;
    }
    files.forEach((file) => {
        if (file?.path) {
            (0, fs_1.unlink)(file.path, () => undefined);
        }
    });
}
exports.WATER_QUALITY_FILES_INTERCEPTOR = {
    fieldName: 'attachments',
    maxCount: water_quality_constants_1.MAX_UPLOAD_FILES,
};
//# sourceMappingURL=water-quality-upload.js.map