"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MobileUploadExceptionFilter = void 0;
exports.assertMulterFileFilterError = assertMulterFileFilterError;
const common_1 = require("@nestjs/common");
const multer_1 = require("multer");
let MobileUploadExceptionFilter = class MobileUploadExceptionFilter {
    catch(exception, host) {
        const response = host.switchToHttp().getResponse();
        response.status(400).json({ msg: exception.message });
    }
};
exports.MobileUploadExceptionFilter = MobileUploadExceptionFilter;
exports.MobileUploadExceptionFilter = MobileUploadExceptionFilter = __decorate([
    (0, common_1.Catch)(multer_1.MulterError)
], MobileUploadExceptionFilter);
function assertMulterFileFilterError(err) {
    if (err instanceof Error && err.message === 'Unsupported file type') {
        throw new common_1.BadRequestException({ msg: err.message });
    }
}
//# sourceMappingURL=mobile-upload.filter.js.map