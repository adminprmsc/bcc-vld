"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaterQualityController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const bigint_serializer_interceptor_1 = require("../../common/interceptors/bigint-serializer.interceptor");
const water_quality_upload_1 = require("./water-quality-upload");
const water_quality_service_1 = require("./water-quality.service");
let WaterQualityController = class WaterQualityController {
    constructor(service) {
        this.service = service;
    }
    list(user, planId, status, tehsil, limit) {
        return this.service.list(user, { planId, status, tehsil, limit });
    }
    listByPlan(user, planId, tehsil, limit) {
        return this.service.listByPlan(user, planId, { tehsil, limit });
    }
    getById(user, id) {
        return this.service.getById(id, user);
    }
    create(user, body) {
        return this.service.create(user, body);
    }
    assign(user, id, body) {
        return this.service.assign(id, user, body);
    }
    updateCollection(user, id, body) {
        return this.service.updateCollection(id, user, body);
    }
    async completeCollection(user, id, body, files) {
        try {
            return await this.service.completeCollection(id, user, body, files || []);
        }
        catch (err) {
            (0, water_quality_upload_1.cleanupFiles)(files);
            throw err;
        }
    }
    async submitLabResults(user, id, body, files) {
        try {
            return await this.service.submitLabResults(id, user, body, files || []);
        }
        catch (err) {
            (0, water_quality_upload_1.cleanupFiles)(files);
            throw err;
        }
    }
    close(user, id, body) {
        return this.service.closeSample(id, user, body);
    }
    cancel(user, id, body) {
        return this.service.cancelSample(id, user, body);
    }
    uploadAttachments(user, files) {
        try {
            return this.service.uploadAttachments(user, files || []);
        }
        catch (err) {
            (0, water_quality_upload_1.cleanupFiles)(files);
            if (err instanceof common_1.BadRequestException) {
                throw err;
            }
            throw err;
        }
    }
};
exports.WaterQualityController = WaterQualityController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('planId')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('tehsil')),
    __param(4, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", void 0)
], WaterQualityController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('plans/:planId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('planId')),
    __param(2, (0, common_1.Query)('tehsil')),
    __param(3, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], WaterQualityController.prototype, "listByPlan", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], WaterQualityController.prototype, "getById", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(201),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], WaterQualityController.prototype, "create", null);
__decorate([
    (0, common_1.Post)(':id/assign'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], WaterQualityController.prototype, "assign", null);
__decorate([
    (0, common_1.Post)(':id/collection'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], WaterQualityController.prototype, "updateCollection", null);
__decorate([
    (0, common_1.Post)(':id/collection/complete'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)(water_quality_upload_1.WATER_QUALITY_FILES_INTERCEPTOR.fieldName, water_quality_upload_1.WATER_QUALITY_FILES_INTERCEPTOR.maxCount, water_quality_upload_1.waterQualityUploadOptions)),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, Array]),
    __metadata("design:returntype", Promise)
], WaterQualityController.prototype, "completeCollection", null);
__decorate([
    (0, common_1.Post)(':id/lab'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)(water_quality_upload_1.WATER_QUALITY_FILES_INTERCEPTOR.fieldName, water_quality_upload_1.WATER_QUALITY_FILES_INTERCEPTOR.maxCount, water_quality_upload_1.waterQualityUploadOptions)),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, Array]),
    __metadata("design:returntype", Promise)
], WaterQualityController.prototype, "submitLabResults", null);
__decorate([
    (0, common_1.Post)(':id/close'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], WaterQualityController.prototype, "close", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], WaterQualityController.prototype, "cancel", null);
__decorate([
    (0, common_1.Post)(':id/attachments'),
    (0, common_1.HttpCode)(201),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)(water_quality_upload_1.WATER_QUALITY_FILES_INTERCEPTOR.fieldName, water_quality_upload_1.WATER_QUALITY_FILES_INTERCEPTOR.maxCount, water_quality_upload_1.waterQualityUploadOptions)),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Array]),
    __metadata("design:returntype", void 0)
], WaterQualityController.prototype, "uploadAttachments", null);
exports.WaterQualityController = WaterQualityController = __decorate([
    (0, common_1.Controller)('water-quality-samples'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.UseInterceptors)(bigint_serializer_interceptor_1.BigIntSerializerInterceptor),
    __metadata("design:paramtypes", [water_quality_service_1.WaterQualityService])
], WaterQualityController);
//# sourceMappingURL=water-quality.controller.js.map