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
exports.MobileController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const bigint_serializer_interceptor_1 = require("../../common/interceptors/bigint-serializer.interceptor");
const complete_task_dto_1 = require("./dto/complete-task.dto");
const create_requisition_dto_1 = require("./dto/create-requisition.dto");
const land_utilization_progress_dto_1 = require("./dto/land-utilization-progress.dto");
const maintenance_form_dto_1 = require("./dto/maintenance-form.dto");
const redbook_operational_dto_1 = require("./dto/redbook-operational.dto");
const register_push_token_dto_1 = require("./dto/register-push-token.dto");
const water_sample_collection_dto_1 = require("./dto/water-sample-collection.dto");
const mobile_upload_filter_1 = require("./mobile-upload.filter");
const mobile_upload_config_1 = require("./mobile-upload.config");
const mobile_service_1 = require("./mobile.service");
let MobileController = class MobileController {
    constructor(mobileService) {
        this.mobileService = mobileService;
    }
    getDashboard(user) {
        return this.mobileService.getDashboard(user);
    }
    getTasks(user) {
        return this.mobileService.getTasks(user);
    }
    completeTask(id, dto, user) {
        return this.mobileService.completeTask(id, dto, user);
    }
    getSyncStatus() {
        return this.mobileService.getSyncStatus();
    }
    retrySync() {
        return this.mobileService.retrySync();
    }
    getMapOverlays() {
        return this.mobileService.getMapOverlays();
    }
    createRequisition(dto, user) {
        return this.mobileService.createRequisition(dto, user);
    }
    uploadRequisitionAttachments(id, files) {
        return this.mobileService.uploadRequisitionAttachments(id, files || []);
    }
    createMaintenanceRecord(dto, user) {
        return this.mobileService.createMaintenanceRecord(dto, user);
    }
    submitWaterSampleCollection(dto, user) {
        return this.mobileService.submitWaterSampleCollection(dto, user);
    }
    uploadWaterSampleAttachments(id, files, user) {
        return this.mobileService.uploadWaterSampleAttachments(id, files || [], user);
    }
    submitLandUtilizationProgress(dto, user) {
        return this.mobileService.submitLandUtilizationProgress(dto, user);
    }
    submitRedbookOperational(dto, user) {
        return this.mobileService.submitRedbookOperational(dto, user);
    }
    getNotifications(user) {
        return this.mobileService.getNotifications(user);
    }
    registerPushToken(dto, user) {
        return this.mobileService.registerPushToken(dto, user);
    }
    markNotificationRead() {
        return this.mobileService.markNotificationRead();
    }
};
exports.MobileController = MobileController;
__decorate([
    (0, common_1.Get)('dashboard'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MobileController.prototype, "getDashboard", null);
__decorate([
    (0, common_1.Get)('tasks'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MobileController.prototype, "getTasks", null);
__decorate([
    (0, common_1.Post)('tasks/:id/complete'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, complete_task_dto_1.CompleteTaskDto, Object]),
    __metadata("design:returntype", void 0)
], MobileController.prototype, "completeTask", null);
__decorate([
    (0, common_1.Get)('sync'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MobileController.prototype, "getSyncStatus", null);
__decorate([
    (0, common_1.Post)('sync/:channel/retry'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MobileController.prototype, "retrySync", null);
__decorate([
    (0, common_1.Get)('map-overlays'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MobileController.prototype, "getMapOverlays", null);
__decorate([
    (0, common_1.Post)('forms/requisition'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_requisition_dto_1.CreateRequisitionDto, Object]),
    __metadata("design:returntype", void 0)
], MobileController.prototype, "createRequisition", null);
__decorate([
    (0, common_1.Post)('forms/requisition/:id/attachments'),
    (0, common_1.UseFilters)(mobile_upload_filter_1.MobileUploadExceptionFilter),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('attachments', 10, mobile_upload_config_1.mobileMulterOptions)),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array]),
    __metadata("design:returntype", void 0)
], MobileController.prototype, "uploadRequisitionAttachments", null);
__decorate([
    (0, common_1.Post)('forms/maintenance'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [maintenance_form_dto_1.MaintenanceFormDto, Object]),
    __metadata("design:returntype", void 0)
], MobileController.prototype, "createMaintenanceRecord", null);
__decorate([
    (0, common_1.Post)('forms/water-sample-collection'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [water_sample_collection_dto_1.WaterSampleCollectionDto, Object]),
    __metadata("design:returntype", void 0)
], MobileController.prototype, "submitWaterSampleCollection", null);
__decorate([
    (0, common_1.Post)('forms/water-sample-collection/:id/attachments'),
    (0, common_1.UseFilters)(mobile_upload_filter_1.MobileUploadExceptionFilter),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('attachments', 10, mobile_upload_config_1.mobileMulterOptions)),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.UploadedFiles)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array, Object]),
    __metadata("design:returntype", void 0)
], MobileController.prototype, "uploadWaterSampleAttachments", null);
__decorate([
    (0, common_1.Post)('forms/land-utilization-progress'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [land_utilization_progress_dto_1.LandUtilizationProgressDto, Object]),
    __metadata("design:returntype", void 0)
], MobileController.prototype, "submitLandUtilizationProgress", null);
__decorate([
    (0, common_1.Post)('forms/redbook-operational'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [redbook_operational_dto_1.RedbookOperationalDto, Object]),
    __metadata("design:returntype", void 0)
], MobileController.prototype, "submitRedbookOperational", null);
__decorate([
    (0, common_1.Get)('notifications'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MobileController.prototype, "getNotifications", null);
__decorate([
    (0, common_1.Post)('notifications/register'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_push_token_dto_1.RegisterPushTokenDto, Object]),
    __metadata("design:returntype", void 0)
], MobileController.prototype, "registerPushToken", null);
__decorate([
    (0, common_1.Post)('notifications/:id/read'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MobileController.prototype, "markNotificationRead", null);
exports.MobileController = MobileController = __decorate([
    (0, common_1.Controller)('mobile'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.UseInterceptors)(bigint_serializer_interceptor_1.BigIntSerializerInterceptor),
    __metadata("design:paramtypes", [mobile_service_1.MobileService])
], MobileController);
//# sourceMappingURL=mobile.controller.js.map