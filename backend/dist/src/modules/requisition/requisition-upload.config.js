"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requisitionDiskStorage = void 0;
exports.getRequisitionUploadPath = getRequisitionUploadPath;
const fs_1 = require("fs");
const multer_1 = require("multer");
const path_1 = require("path");
const requisition_constants_1 = require("./requisition.constants");
const uploadDir = (0, path_1.join)(process.cwd(), requisition_constants_1.REQUISITION_UPLOAD_DIR);
if (!(0, fs_1.existsSync)(uploadDir)) {
    (0, fs_1.mkdirSync)(uploadDir, { recursive: true });
}
exports.requisitionDiskStorage = (0, multer_1.diskStorage)({
    destination: (_req, _file, cb) => {
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});
function getRequisitionUploadPath(fileName) {
    return (0, path_1.join)(uploadDir, fileName);
}
//# sourceMappingURL=requisition-upload.config.js.map