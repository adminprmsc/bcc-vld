import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BigIntSerializerInterceptor } from '../../common/interceptors/bigint-serializer.interceptor';
import { JwtPayload } from '../../common/security/jwt.strategy';
import {
  cleanupFiles,
  WATER_QUALITY_FILES_INTERCEPTOR,
  waterQualityUploadOptions,
} from './water-quality-upload';
import { WaterQualityService } from './water-quality.service';

@Controller('water-quality-samples')
@UseGuards(JwtAuthGuard)
@UseInterceptors(BigIntSerializerInterceptor)
export class WaterQualityController {
  constructor(private readonly service: WaterQualityService) {}

  @Get()
  list(
    @CurrentUser() user: JwtPayload,
    @Query('planId') planId?: string,
    @Query('status') status?: string,
    @Query('tehsil') tehsil?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list(user, { planId, status, tehsil, limit });
  }

  @Get('plans/:planId')
  listByPlan(
    @CurrentUser() user: JwtPayload,
    @Param('planId') planId: string,
    @Query('tehsil') tehsil?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listByPlan(user, planId, { tehsil, limit });
  }

  @Get(':id')
  getById(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.getById(id, user);
  }

  @Post()
  @HttpCode(201)
  create(@CurrentUser() user: JwtPayload, @Body() body: { planId?: string | number; reason?: string }) {
    return this.service.create(user, body);
  }

  @Post(':id/assign')
  assign(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { samplerId?: string | number },
  ) {
    return this.service.assign(id, user, body);
  }

  @Post(':id/collection')
  updateCollection(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { collectedAt?: string; fieldNotes?: string; location?: unknown },
  ) {
    return this.service.updateCollection(id, user, body);
  }

  @Post(':id/collection/complete')
  @UseInterceptors(
    FilesInterceptor(
      WATER_QUALITY_FILES_INTERCEPTOR.fieldName,
      WATER_QUALITY_FILES_INTERCEPTOR.maxCount,
      waterQualityUploadOptions,
    ),
  )
  async completeCollection(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { collectedAt?: string; fieldNotes?: string; location?: unknown },
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    try {
      return await this.service.completeCollection(id, user, body, files || []);
    } catch (err) {
      cleanupFiles(files);
      throw err;
    }
  }

  @Post(':id/lab')
  @UseInterceptors(
    FilesInterceptor(
      WATER_QUALITY_FILES_INTERCEPTOR.fieldName,
      WATER_QUALITY_FILES_INTERCEPTOR.maxCount,
      waterQualityUploadOptions,
    ),
  )
  async submitLabResults(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body()
    body: {
      receivedAt?: string;
      completedAt?: string;
      metrics?: unknown;
      notes?: string;
    },
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    try {
      return await this.service.submitLabResults(id, user, body, files || []);
    } catch (err) {
      cleanupFiles(files);
      throw err;
    }
  }

  @Post(':id/close')
  close(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { note?: string },
  ) {
    return this.service.closeSample(id, user, body);
  }

  @Post(':id/cancel')
  cancel(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { note?: string },
  ) {
    return this.service.cancelSample(id, user, body);
  }

  @Post(':id/attachments')
  @HttpCode(201)
  @UseInterceptors(
    FilesInterceptor(
      WATER_QUALITY_FILES_INTERCEPTOR.fieldName,
      WATER_QUALITY_FILES_INTERCEPTOR.maxCount,
      waterQualityUploadOptions,
    ),
  )
  uploadAttachments(
    @CurrentUser() user: JwtPayload,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    try {
      return this.service.uploadAttachments(user, files || []);
    } catch (err) {
      cleanupFiles(files);
      if (err instanceof BadRequestException) {
        throw err;
      }
      throw err;
    }
  }
}
