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
exports.ConsultantPlansController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const promises_1 = require("fs/promises");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const consultant_plans_constants_1 = require("./consultant-plans.constants");
const consultant_plans_upload_config_1 = require("./consultant-plans-upload.config");
const consultant_plans_service_1 = require("./consultant-plans.service");
let ConsultantPlansController = class ConsultantPlansController {
    constructor(service) {
        this.service = service;
    }
    getDefinitions(user) {
        this.service.assertCanRead(user.role);
        return this.service.getDefinitions();
    }
    async uploadAttachments(user, files) {
        this.service.assertCanWrite(user.role);
        try {
            const payload = this.service.processUpload(files || []);
            return payload;
        }
        catch (err) {
            await this.cleanupUploadedFiles(files);
            throw err;
        }
    }
    getLayers(user, tehsil, district, category, assetType, requisitionId, search, format) {
        this.service.assertCanRead(user.role);
        return this.service.getLayers(user, {
            tehsil,
            district,
            category,
            assetType,
            requisitionId,
            search,
            format,
        });
    }
    listPlans(user, tehsil, district, category, assetType, requisitionId, search) {
        this.service.assertCanRead(user.role);
        return this.service.listPlans(user, {
            tehsil,
            district,
            category,
            assetType,
            requisitionId,
            search,
        });
    }
    getPlan(user, id) {
        this.service.assertCanRead(user.role);
        return this.service.getPlanById(user, id);
    }
    createPlan(user, body) {
        this.service.assertCanWrite(user.role);
        return this.service.createPlan(user, body);
    }
    updatePlan(user, id, body) {
        return this.service.updatePlan(user, id, body);
    }
    deletePlan(user, id) {
        return this.service.deletePlan(user, id);
    }
    async cleanupUploadedFiles(files) {
        if (!Array.isArray(files)) {
            return;
        }
        await Promise.all(files.map(async (file) => {
            if (file?.path) {
                try {
                    await (0, promises_1.unlink)(file.path);
                }
                catch {
                }
            }
        }));
    }
};
exports.ConsultantPlansController = ConsultantPlansController;
__decorate([
    (0, common_1.Get)('definitions'),
    (0, roles_decorator_1.Roles)(...consultant_plans_constants_1.READ_ROLES),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ConsultantPlansController.prototype, "getDefinitions", null);
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.HttpCode)(201),
    (0, roles_decorator_1.Roles)(...consultant_plans_constants_1.WRITE_ROLES),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('attachments', consultant_plans_constants_1.MAX_UPLOAD_FILES, consultant_plans_upload_config_1.consultantPlansUploadOptions)),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Array]),
    __metadata("design:returntype", Promise)
], ConsultantPlansController.prototype, "uploadAttachments", null);
__decorate([
    (0, common_1.Get)('layers'),
    (0, roles_decorator_1.Roles)(...consultant_plans_constants_1.READ_ROLES),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('tehsil')),
    __param(2, (0, common_1.Query)('district')),
    __param(3, (0, common_1.Query)('category')),
    __param(4, (0, common_1.Query)('assetType')),
    __param(5, (0, common_1.Query)('requisitionId')),
    __param(6, (0, common_1.Query)('search')),
    __param(7, (0, common_1.Query)('format')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], ConsultantPlansController.prototype, "getLayers", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(...consultant_plans_constants_1.READ_ROLES),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('tehsil')),
    __param(2, (0, common_1.Query)('district')),
    __param(3, (0, common_1.Query)('category')),
    __param(4, (0, common_1.Query)('assetType')),
    __param(5, (0, common_1.Query)('requisitionId')),
    __param(6, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], ConsultantPlansController.prototype, "listPlans", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(...consultant_plans_constants_1.READ_ROLES),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ConsultantPlansController.prototype, "getPlan", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(201),
    (0, roles_decorator_1.Roles)(...consultant_plans_constants_1.WRITE_ROLES),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ConsultantPlansController.prototype, "createPlan", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(...consultant_plans_constants_1.READ_ROLES),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ConsultantPlansController.prototype, "updatePlan", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(...consultant_plans_constants_1.READ_ROLES),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ConsultantPlansController.prototype, "deletePlan", null);
exports.ConsultantPlansController = ConsultantPlansController = __decorate([
    (0, common_1.Controller)('consultant-plans'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [consultant_plans_service_1.ConsultantPlansService])
], ConsultantPlansController);
//# sourceMappingURL=consultant-plans.controller.js.map