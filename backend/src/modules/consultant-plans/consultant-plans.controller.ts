import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { unlink } from 'fs/promises';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtPayload } from '../../common/security/jwt.strategy';
import { MAX_UPLOAD_FILES, READ_ROLES, WRITE_ROLES } from './consultant-plans.constants';
import { consultantPlansUploadOptions } from './consultant-plans-upload.config';
import { ConsultantPlansService } from './consultant-plans.service';

@Controller('consultant-plans')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConsultantPlansController {
  constructor(private readonly service: ConsultantPlansService) {}

  @Get('definitions')
  @Roles(...READ_ROLES)
  getDefinitions(@CurrentUser() user: JwtPayload) {
    this.service.assertCanRead(user.role);
    return this.service.getDefinitions();
  }

  @Post('upload')
  @HttpCode(201)
  @Roles(...WRITE_ROLES)
  @UseInterceptors(FilesInterceptor('attachments', MAX_UPLOAD_FILES, consultantPlansUploadOptions))
  async uploadAttachments(
    @CurrentUser() user: JwtPayload,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    this.service.assertCanWrite(user.role);
    try {
      const payload = this.service.processUpload(files || []);
      return payload;
    } catch (err) {
      await this.cleanupUploadedFiles(files);
      throw err;
    }
  }

  @Get('layers')
  @Roles(...READ_ROLES)
  getLayers(
    @CurrentUser() user: JwtPayload,
    @Query('tehsil') tehsil?: string,
    @Query('district') district?: string,
    @Query('category') category?: string,
    @Query('assetType') assetType?: string,
    @Query('requisitionId') requisitionId?: string,
    @Query('search') search?: string,
    @Query('format') format?: string,
  ) {
    this.service.assertCanRead(user.role);
    return this.service.getLayers(user, {
      tehsil,
      district,
      category,
      assetType,
      requisitionId,
      search,
      format,
    });
  }

  @Get()
  @Roles(...READ_ROLES)
  listPlans(
    @CurrentUser() user: JwtPayload,
    @Query('tehsil') tehsil?: string,
    @Query('district') district?: string,
    @Query('category') category?: string,
    @Query('assetType') assetType?: string,
    @Query('requisitionId') requisitionId?: string,
    @Query('search') search?: string,
  ) {
    this.service.assertCanRead(user.role);
    return this.service.listPlans(user, {
      tehsil,
      district,
      category,
      assetType,
      requisitionId,
      search,
    });
  }

  @Get(':id')
  @Roles(...READ_ROLES)
  getPlan(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    this.service.assertCanRead(user.role);
    return this.service.getPlanById(user, id);
  }

  @Post()
  @HttpCode(201)
  @Roles(...WRITE_ROLES)
  createPlan(@CurrentUser() user: JwtPayload, @Body() body: Record<string, unknown>) {
    this.service.assertCanWrite(user.role);
    return this.service.createPlan(user, body);
  }

  @Patch(':id')
  @Roles(...READ_ROLES)
  updatePlan(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.updatePlan(user, id, body);
  }

  @Delete(':id')
  @Roles(...READ_ROLES)
  deletePlan(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.deletePlan(user, id);
  }

  private async cleanupUploadedFiles(files?: Express.Multer.File[]) {
    if (!Array.isArray(files)) {
      return;
    }
    await Promise.all(
      files.map(async (file) => {
        if (file?.path) {
          try {
            await unlink(file.path);
          } catch {
            // ignore cleanup errors
          }
        }
      }),
    );
  }
}
