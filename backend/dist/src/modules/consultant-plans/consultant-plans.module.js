"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsultantPlansModule = void 0;
const common_1 = require("@nestjs/common");
const tehsil_scope_module_1 = require("../../domain/tehsil-scope/tehsil-scope.module");
const prisma_module_1 = require("../../prisma/prisma.module");
const security_module_1 = require("../../common/security/security.module");
const consultant_plans_controller_1 = require("./consultant-plans.controller");
const consultant_plans_service_1 = require("./consultant-plans.service");
let ConsultantPlansModule = class ConsultantPlansModule {
};
exports.ConsultantPlansModule = ConsultantPlansModule;
exports.ConsultantPlansModule = ConsultantPlansModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, tehsil_scope_module_1.TehsilScopeModule, security_module_1.SecurityModule],
        controllers: [consultant_plans_controller_1.ConsultantPlansController],
        providers: [consultant_plans_service_1.ConsultantPlansService],
    })
], ConsultantPlansModule);
//# sourceMappingURL=consultant-plans.module.js.map