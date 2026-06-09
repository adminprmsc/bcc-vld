import { Global, Module } from '@nestjs/common';
import { TehsilScopeService } from './tehsil-scope.service';

@Global()
@Module({
  providers: [TehsilScopeService],
  exports: [TehsilScopeService],
})
export class TehsilScopeModule {}
