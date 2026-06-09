"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const throttler_1 = require("@nestjs/throttler");
const app_config_1 = __importDefault(require("./config/app.config"));
const bigint_serializer_interceptor_1 = require("./common/interceptors/bigint-serializer.interceptor");
const security_module_1 = require("./common/security/security.module");
const tehsil_scope_module_1 = require("./domain/tehsil-scope/tehsil-scope.module");
const access_requests_module_1 = require("./modules/access-requests/access-requests.module");
const audit_logs_module_1 = require("./modules/audit-logs/audit-logs.module");
const consultant_plans_module_1 = require("./modules/consultant-plans/consultant-plans.module");
const health_module_1 = require("./modules/health/health.module");
const mobile_module_1 = require("./modules/mobile/mobile.module");
const requisition_module_1 = require("./modules/requisition/requisition.module");
const support_module_1 = require("./modules/support/support.module");
const users_module_1 = require("./modules/users/users.module");
const water_quality_module_1 = require("./modules/water-quality/water-quality.module");
const prisma_module_1 = require("./prisma/prisma.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [app_config_1.default],
            }),
            throttler_1.ThrottlerModule.forRoot([{ name: 'default', ttl: 15 * 60 * 1000, limit: 500 }]),
            prisma_module_1.PrismaModule,
            tehsil_scope_module_1.TehsilScopeModule,
            security_module_1.SecurityModule,
            health_module_1.HealthModule,
            users_module_1.UsersModule,
            access_requests_module_1.AccessRequestsModule,
            audit_logs_module_1.AuditLogsModule,
            support_module_1.SupportModule,
            requisition_module_1.RequisitionModule,
            consultant_plans_module_1.ConsultantPlansModule,
            water_quality_module_1.WaterQualityModule,
            mobile_module_1.MobileModule,
        ],
        providers: [
            { provide: core_1.APP_GUARD, useClass: throttler_1.ThrottlerGuard },
            { provide: core_1.APP_INTERCEPTOR, useClass: bigint_serializer_interceptor_1.BigIntSerializerInterceptor },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map