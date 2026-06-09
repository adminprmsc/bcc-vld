import { Module } from '@nestjs/common';
import { CounterService } from '../../common/counter/counter.service';
import { SecurityModule } from '../../common/security/security.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { MobileController } from './mobile.controller';
import { MobileService } from './mobile.service';

@Module({
  imports: [PrismaModule, SecurityModule],
  controllers: [MobileController],
  providers: [MobileService, CounterService],
})
export class MobileModule {}
