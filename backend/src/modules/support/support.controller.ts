import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtPayload } from '../../common/security/jwt.strategy';
import { supportUploadOptions } from './support-upload.config';
import { SupportService } from './support.service';

@Controller('support')
@UseGuards(JwtAuthGuard)
export class SupportController {
  constructor(private readonly service: SupportService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('attachments', 5, supportUploadOptions))
  create(
    @CurrentUser() user: JwtPayload,
    @Body() body: Record<string, string>,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.service.create(user, body, files || []);
  }

  @Get('my')
  listMine(@CurrentUser() user: JwtPayload) {
    return this.service.listMine(user);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('Super Admin', 'Admin')
  listAdmin(@CurrentUser() user: JwtPayload, @Query() query: Record<string, string>) {
    return this.service.listAdmin(user, query);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('Super Admin', 'Admin')
  patch(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.patchAdmin(id, user, body as never);
  }

  @Post(':id/comment')
  comment(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body('note') note: string,
  ) {
    return this.service.addComment(id, user, note);
  }
}
