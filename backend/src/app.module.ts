import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import appConfig from './config/app.config';
import { BigIntSerializerInterceptor } from './common/interceptors/bigint-serializer.interceptor';
import { SecurityModule } from './common/security/security.module';
import { TehsilScopeModule } from './domain/tehsil-scope/tehsil-scope.module';
import { AccessRequestsModule } from './modules/access-requests/access-requests.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { ConsultantPlansModule } from './modules/consultant-plans/consultant-plans.module';
import { HealthModule } from './modules/health/health.module';
import { MobileModule } from './modules/mobile/mobile.module';
import { RequisitionModule } from './modules/requisition/requisition.module';
import { SupportModule } from './modules/support/support.module';
import { UsersModule } from './modules/users/users.module';
import { WaterQualityModule } from './modules/water-quality/water-quality.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),
    // Single global limit — use @Throttle({ default: { limit: 10 } }) on login/register only
    ThrottlerModule.forRoot([{ name: 'default', ttl: 15 * 60 * 1000, limit: 500 }]),
    PrismaModule,
    TehsilScopeModule,
    SecurityModule,
    HealthModule,
    UsersModule,
    AccessRequestsModule,
    AuditLogsModule,
    SupportModule,
    RequisitionModule,
    ConsultantPlansModule,
    WaterQualityModule,
    MobileModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: BigIntSerializerInterceptor },
  ],
})
export class AppModule {}
