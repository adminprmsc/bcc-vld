import { Module } from '@nestjs/common';
import { TehsilScopeModule } from '../../domain/tehsil-scope/tehsil-scope.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { WaterQualityController } from './water-quality.controller';
import { WaterQualityService } from './water-quality.service';

@Module({
  imports: [PrismaModule, TehsilScopeModule],
  controllers: [WaterQualityController],
  providers: [WaterQualityService],
})
export class WaterQualityModule {}
