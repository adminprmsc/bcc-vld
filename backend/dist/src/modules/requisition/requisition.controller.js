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
exports.RequisitionController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const bigint_serializer_interceptor_1 = require("../../common/interceptors/bigint-serializer.interceptor");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const requisition_upload_config_1 = require("./requisition-upload.config");
const requisition_service_1 = require("./requisition.service");
let RequisitionController = class RequisitionController {
    constructor(service) {
        this.service = service;
    }
    getDashboardStats(user, tehsil, district, startDate, endDate) {
        return this.service.getDashboardStats(user, { tehsil, district, startDate, endDate });
    }
    findAll(user) {
        return this.service.findAll(user);
    }
    async dueDiligencePdf(id, res) {
        await this.service.streamDueDiligencePdf(id, res);
    }
    async workflowPdf(id, res) {
        await this.service.streamWorkflowPdf(id, res);
    }
    findOne(id, user) {
        return this.service.findOne(id, user);
    }
    create(user, body, files) {
        return this.service.create(user, body, files);
    }
    updateMap(id, user, body) {
        return this.service.updateMap(id, user, body);
    }
    updateDonor(id, user, body) {
        return this.service.updateDonor(id, user, body);
    }
    updateDocs(id, user, body) {
        return this.service.updateDocs(id, user, body);
    }
    updateLandAcquisition(id, user, body, files) {
        return this.service.updateLandAcquisition(id, user, body, files);
    }
    updateLandUtilizationOverview(id, user, body) {
        return this.service.updateLandUtilizationOverview(id, user, body);
    }
    addLandUtilizationCivilStructure(id, user, body, files) {
        return this.service.addCivilStructure(id, user, body, files);
    }
    addLandUtilizationMachinery(id, user, body, files) {
        return this.service.addMachinery(id, user, body, files);
    }
    addLandUtilizationProgress(id, user, body, files) {
        return this.service.addProgressUpdate(id, user, body, files);
    }
    updateUtilizationOverview(id, user, body) {
        return this.service.updateUtilizationOverview(id, user, body);
    }
    addUtilizationStructure(id, user, body, files) {
        return this.service.addCivilStructure(id, user, body, files);
    }
    updateUtilizationStructure(id, structureId, user, body, files) {
        return this.service.updateCivilStructure(id, structureId, user, body, files);
    }
    addUtilizationMachinery(id, user, body, files) {
        return this.service.addMachinery(id, user, body, files);
    }
    updateUtilizationMachinery(id, machineryId, user, body, files) {
        return this.service.updateMachinery(id, machineryId, user, body, files);
    }
    addUtilizationProgress(id, user, body, files) {
        return this.service.addUtilizationProgress(id, user, body, files);
    }
    dmForwardBcc(id, user, body) {
        return this.service.dmForwardBcc(id, user, body);
    }
    bccForwardTm(id, user, body) {
        return this.service.bccForwardTm(id, user, body);
    }
    tmForwardChief(id, user, body) {
        return this.service.tmForwardChief(id, user, body);
    }
    chiefForwardBcc(id, user, body) {
        return this.service.chiefForwardBcc(id, user, body);
    }
    bccForwardWb(id, user, body) {
        return this.service.bccForwardWb(id, user, body);
    }
    wbApprove(id, user, body) {
        return this.service.wbApprove(id, user, body);
    }
    chiefMarkTm(id, user, body) {
        return this.service.chiefMarkTm(id, user, body);
    }
    tmForwardBcc(id, user, body) {
        return this.service.tmForwardBccClosure(id, user, body);
    }
    bccClose(id, user, body) {
        return this.service.bccClose(id, user, body);
    }
    revert(id, user, body) {
        return this.service.revert(id, user, body);
    }
};
exports.RequisitionController = RequisitionController;
__decorate([
    (0, common_1.Get)('dashboard/stats'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('tehsil')),
    __param(2, (0, common_1.Query)('district')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", void 0)
], RequisitionController.prototype, "getDashboardStats", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RequisitionController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id/due-diligence-pdf'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RequisitionController.prototype, "dueDiligencePdf", null);
__decorate([
    (0, common_1.Get)(':id/pdf'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RequisitionController.prototype, "workflowPdf", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RequisitionController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('attachments', 10, { storage: requisition_upload_config_1.requisitionDiskStorage })),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Array]),
    __metadata("design:returntype", void 0)
], RequisitionController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id/map'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('DM Tehsil', 'Tehsil DM', 'Infra Engineer', 'Infra Head', 'CID', 'CID Officer', 'BCC Specialist', 'BCC Officer Tehsil', 'BCC Officer', 'Super Admin'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RequisitionController.prototype, "updateMap", null);
__decorate([
    (0, common_1.Patch)(':id/donor'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RequisitionController.prototype, "updateDonor", null);
__decorate([
    (0, common_1.Patch)(':id/docs'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RequisitionController.prototype, "updateDocs", null);
__decorate([
    (0, common_1.Patch)(':id/land-acquisition'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('BCC Officer Tehsil', 'BCC Officer', 'BCC Specialist', 'Super Admin'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileFieldsInterceptor)([
        { name: 'ownershipProof', maxCount: 1 },
        { name: 'attachedDocuments', maxCount: 10 },
    ], { storage: requisition_upload_config_1.requisitionDiskStorage })),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object]),
    __metadata("design:returntype", void 0)
], RequisitionController.prototype, "updateLandAcquisition", null);
__decorate([
    (0, common_1.Patch)(':id/land-utilization/overview'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('DM Tehsil', 'Tehsil DM', 'Super Admin'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RequisitionController.prototype, "updateLandUtilizationOverview", null);
__decorate([
    (0, common_1.Post)(':id/land-utilization/civil-structures'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('DM Tehsil', 'Tehsil DM', 'Super Admin'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('photos', 10, { storage: requisition_upload_config_1.requisitionDiskStorage })),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Array]),
    __metadata("design:returntype", void 0)
], RequisitionController.prototype, "addLandUtilizationCivilStructure", null);
__decorate([
    (0, common_1.Post)(':id/land-utilization/machinery'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('DM Tehsil', 'Tehsil DM', 'Super Admin'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('photos', 10, { storage: requisition_upload_config_1.requisitionDiskStorage })),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Array]),
    __metadata("design:returntype", void 0)
], RequisitionController.prototype, "addLandUtilizationMachinery", null);
__decorate([
    (0, common_1.Post)(':id/land-utilization/progress'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('DM Tehsil', 'Tehsil DM', 'Super Admin'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('photos', 10, { storage: requisition_upload_config_1.requisitionDiskStorage })),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Array]),
    __metadata("design:returntype", void 0)
], RequisitionController.prototype, "addLandUtilizationProgress", null);
__decorate([
    (0, common_1.Patch)(':id/utilization/overview'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('DM Tehsil', 'Super Admin'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RequisitionController.prototype, "updateUtilizationOverview", null);
__decorate([
    (0, common_1.Post)(':id/utilization/structures'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('DM Tehsil', 'Super Admin'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('photos', 10, { storage: requisition_upload_config_1.requisitionDiskStorage })),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Array]),
    __metadata("design:returntype", void 0)
], RequisitionController.prototype, "addUtilizationStructure", null);
__decorate([
    (0, common_1.Patch)(':id/utilization/structures/:structureId'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('DM Tehsil', 'Super Admin'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('photos', 10, { storage: requisition_upload_config_1.requisitionDiskStorage })),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('structureId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Body)()),
    __param(4, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object, Array]),
    __metadata("design:returntype", void 0)
], RequisitionController.prototype, "updateUtilizationStructure", null);
__decorate([
    (0, common_1.Post)(':id/utilization/machinery'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('DM Tehsil', 'Super Admin'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('photos', 10, { storage: requisition_upload_config_1.requisitionDiskStorage })),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Array]),
    __metadata("design:returntype", void 0)
], RequisitionController.prototype, "addUtilizationMachinery", null);
__decorate([
    (0, common_1.Patch)(':id/utilization/machinery/:machineryId'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('DM Tehsil', 'Super Admin'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('photos', 10, { storage: requisition_upload_config_1.requisitionDiskStorage })),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('machineryId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Body)()),
    __param(4, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object, Array]),
    __metadata("design:returntype", void 0)
], RequisitionController.prototype, "updateUtilizationMachinery", null);
__decorate([
    (0, common_1.Post)(':id/utilization/progress'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('DM Tehsil', 'Super Admin'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('photos', 10, { storage: requisition_upload_config_1.requisitionDiskStorage })),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Array]),
    __metadata("design:returntype", void 0)
], RequisitionController.prototype, "addUtilizationProgress", null);
__decorate([
    (0, common_1.Patch)(':id/dm-forward-bcc'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('DM Tehsil', 'Tehsil DM', 'Super Admin'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RequisitionController.prototype, "dmForwardBcc", null);
__decorate([
    (0, common_1.Patch)(':id/bcc-forward-tm'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('BCC Officer Tehsil', 'BCC Officer', 'Super Admin'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RequisitionController.prototype, "bccForwardTm", null);
__decorate([
    (0, common_1.Patch)(':id/tm-forward-chief'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('Tehsil Manager', 'Super Admin'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RequisitionController.prototype, "tmForwardChief", null);
__decorate([
    (0, common_1.Patch)(':id/chief-forward-bcc'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('BCC Specialist', 'Super Admin'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RequisitionController.prototype, "chiefForwardBcc", null);
__decorate([
    (0, common_1.Patch)(':id/bcc-forward-wb'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('BCC Officer Tehsil', 'BCC Officer', 'Super Admin'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RequisitionController.prototype, "bccForwardWb", null);
__decorate([
    (0, common_1.Patch)(':id/wb-approve'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('WB User', 'Super Admin'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RequisitionController.prototype, "wbApprove", null);
__decorate([
    (0, common_1.Patch)(':id/chief-mark-tm'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('BCC Specialist', 'Super Admin'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RequisitionController.prototype, "chiefMarkTm", null);
__decorate([
    (0, common_1.Patch)(':id/tm-forward-bcc'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('Tehsil Manager', 'Super Admin'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RequisitionController.prototype, "tmForwardBcc", null);
__decorate([
    (0, common_1.Patch)(':id/bcc-close'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('BCC Officer Tehsil', 'BCC Officer', 'Super Admin'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RequisitionController.prototype, "bccClose", null);
__decorate([
    (0, common_1.Patch)(':id/revert'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('DM Tehsil', 'Tehsil DM', 'BCC Officer Tehsil', 'BCC Officer', 'BCC Specialist', 'Tehsil Manager', 'WB User', 'Super Admin'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RequisitionController.prototype, "revert", null);
exports.RequisitionController = RequisitionController = __decorate([
    (0, common_1.Controller)('requisition'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.UseInterceptors)(bigint_serializer_interceptor_1.BigIntSerializerInterceptor),
    __metadata("design:paramtypes", [requisition_service_1.RequisitionService])
], RequisitionController);
//# sourceMappingURL=requisition.controller.js.map