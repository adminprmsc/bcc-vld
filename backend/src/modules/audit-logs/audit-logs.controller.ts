import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuditLogsService } from './audit-logs.service';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Super Admin', 'Admin')
export class AuditLogsController {
  constructor(private readonly service: AuditLogsService) {}

  @Get('stats')
  stats(@Query() query: Record<string, string>) {
    return this.service.stats(query);
  }

  @Get('meta/actions')
  metaActions() {
    return this.service.listActions();
  }

  @Get('meta/entities')
  metaEntities() {
    return this.service.listEntityTypes();
  }

  @Get('entity/:entityType/:entityId')
  entityTrail(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.entityTrail(entityType, entityId, limit ? parseInt(limit, 10) : 100);
  }

  @Get('user/:userId')
  userLogs(
    @Param('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.userLogs(
      userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.service.getOne(id);
  }

  @Get()
  list(@Query() query: Record<string, string>) {
    return this.service.list(query);
  }
}
