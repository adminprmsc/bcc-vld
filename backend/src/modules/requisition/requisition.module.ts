import { Module } from '@nestjs/common';
import { CounterService } from '../../common/counter/counter.service';
import { TehsilScopeModule } from '../../domain/tehsil-scope/tehsil-scope.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { RequisitionController } from './requisition.controller';
import { RequisitionPdfService } from './requisition-pdf.service';
import { RequisitionService } from './requisition.service';

@Module({
  imports: [PrismaModule, TehsilScopeModule],
  controllers: [RequisitionController],
  providers: [RequisitionService, RequisitionPdfService, CounterService],
  exports: [RequisitionService],
})
export class RequisitionModule {}
