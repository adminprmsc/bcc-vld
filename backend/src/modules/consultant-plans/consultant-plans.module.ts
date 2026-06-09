import { Module } from '@nestjs/common';
import { TehsilScopeModule } from '../../domain/tehsil-scope/tehsil-scope.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { SecurityModule } from '../../common/security/security.module';
import { ConsultantPlansController } from './consultant-plans.controller';
import { ConsultantPlansService } from './consultant-plans.service';

@Module({
  imports: [PrismaModule, TehsilScopeModule, SecurityModule],
  controllers: [ConsultantPlansController],
  providers: [ConsultantPlansService],
})
export class ConsultantPlansModule {}
