import { Module } from '@nestjs/common';
import { SecurityModule } from '../../common/security/security.module';
import { CounterService } from '../../common/counter/counter.service';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  imports: [SecurityModule],
  controllers: [UsersController],
  providers: [UsersRepository, UsersService, CounterService],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
