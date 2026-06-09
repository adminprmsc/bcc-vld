"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequisitionModule = void 0;
const common_1 = require("@nestjs/common");
const counter_service_1 = require("../../common/counter/counter.service");
const tehsil_scope_module_1 = require("../../domain/tehsil-scope/tehsil-scope.module");
const prisma_module_1 = require("../../prisma/prisma.module");
const requisition_controller_1 = require("./requisition.controller");
const requisition_pdf_service_1 = require("./requisition-pdf.service");
const requisition_service_1 = require("./requisition.service");
let RequisitionModule = class RequisitionModule {
};
exports.RequisitionModule = RequisitionModule;
exports.RequisitionModule = RequisitionModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, tehsil_scope_module_1.TehsilScopeModule],
        controllers: [requisition_controller_1.RequisitionController],
        providers: [requisition_service_1.RequisitionService, requisition_pdf_service_1.RequisitionPdfService, counter_service_1.CounterService],
        exports: [requisition_service_1.RequisitionService],
    })
], RequisitionModule);
//# sourceMappingURL=requisition.module.js.map