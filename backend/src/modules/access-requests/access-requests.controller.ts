import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtPayload } from '../../common/security/jwt.strategy';
import { AccessRequestsService } from './access-requests.service';

@Controller('access-requests')
export class AccessRequestsController {
  constructor(private readonly service: AccessRequestsService) {}

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.service.create(body as never);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Super Admin', 'Admin')
  list() {
    return this.service.listAll();
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Super Admin', 'Admin')
  approve(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: { notes?: string; role?: string },
  ) {
    return this.service.approve(id, user, body);
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Super Admin', 'Admin')
  reject(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: { notes?: string },
  ) {
    return this.service.reject(id, user, body);
  }
}
