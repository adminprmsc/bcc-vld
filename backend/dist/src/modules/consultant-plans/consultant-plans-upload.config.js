"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.consultantPlansUploadOptions = void 0;
exports.getConsultantPlansUploadDir = getConsultantPlansUploadDir;
const common_1 = require("@nestjs/common");
const fs_1 = require("fs");
const multer_1 = require("multer");
const path_1 = require("path");
const consultant_plans_constants_1 = require("./consultant-plans.constants");
function getConsultantPlansUploadDir() {
    const dir = (0, path_1.join)(process.cwd(), 'uploads', consultant_plans_constants_1.UPLOAD_SUBDIR);
    if (!(0, fs_1.existsSync)(dir)) {
        (0, fs_1.mkdirSync)(dir, { recursive: true });
    }
    return dir;
}
exports.consultantPlansUploadOptions = {
    storage: (0, multer_1.diskStorage)({
        destination(_req, _file, cb) {
            cb(null, getConsultantPlansUploadDir());
        },
        filename(_req, file, cb) {
            const timestamp = Date.now();
            const random = Math.round(Math.random() * 1e9);
            const ext = (0, path_1.extname)(file.originalname) || '';
            cb(null, `plan-${timestamp}-${random}${ext}`);
        },
    }),
    limits: {
        fileSize: consultant_plans_constants_1.MAX_UPLOAD_FILE_SIZE,
        files: consultant_plans_constants_1.MAX_UPLOAD_FILES,
    },
    fileFilter(_req, file, cb) {
        if (consultant_plans_constants_1.PLAN_ALLOWED_MIME_TYPES.has(file.mimetype)) {
            cb(null, true);
            return;
        }
        cb(new common_1.BadRequestException({ msg: 'Unsupported attachment type.' }), false);
    },
};
//# sourceMappingURL=consultant-plans-upload.config.js.map