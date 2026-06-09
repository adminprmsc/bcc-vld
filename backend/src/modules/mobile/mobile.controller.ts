import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFiles,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BigIntSerializerInterceptor } from '../../common/interceptors/bigint-serializer.interceptor';
import { JwtPayload } from '../../common/security/jwt.strategy';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { CreateRequisitionDto } from './dto/create-requisition.dto';
import { LandUtilizationProgressDto } from './dto/land-utilization-progress.dto';
import { MaintenanceFormDto } from './dto/maintenance-form.dto';
import { RedbookOperationalDto } from './dto/redbook-operational.dto';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { WaterSampleCollectionDto } from './dto/water-sample-collection.dto';
import { MobileUploadExceptionFilter } from './mobile-upload.filter';
import { mobileMulterOptions } from './mobile-upload.config';
import { MobileService } from './mobile.service';

@Controller('mobile')
@UseGuards(JwtAuthGuard)
@UseInterceptors(BigIntSerializerInterceptor)
export class MobileController {
  constructor(private readonly mobileService: MobileService) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() user: JwtPayload) {
    return this.mobileService.getDashboard(user);
  }

  @Get('tasks')
  getTasks(@CurrentUser() user: JwtPayload) {
    return this.mobileService.getTasks(user);
  }

  @Post('tasks/:id/complete')
  completeTask(
    @Param('id') id: string,
    @Body() dto: CompleteTaskDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.mobileService.completeTask(id, dto, user);
  }

  @Get('sync')
  getSyncStatus() {
    return this.mobileService.getSyncStatus();
  }

  @Post('sync/:channel/retry')
  retrySync() {
    return this.mobileService.retrySync();
  }

  @Get('map-overlays')
  getMapOverlays() {
    return this.mobileService.getMapOverlays();
  }

  @Post('forms/requisition')
  @HttpCode(HttpStatus.CREATED)
  createRequisition(@Body() dto: CreateRequisitionDto, @CurrentUser() user: JwtPayload) {
    return this.mobileService.createRequisition(dto, user);
  }

  @Post('forms/requisition/:id/attachments')
  @UseFilters(MobileUploadExceptionFilter)
  @UseInterceptors(FilesInterceptor('attachments', 10, mobileMulterOptions))
  uploadRequisitionAttachments(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.mobileService.uploadRequisitionAttachments(id, files || []);
  }

  @Post('forms/maintenance')
  @HttpCode(HttpStatus.CREATED)
  createMaintenanceRecord(@Body() dto: MaintenanceFormDto, @CurrentUser() user: JwtPayload) {
    return this.mobileService.createMaintenanceRecord(dto, user);
  }

  @Post('forms/water-sample-collection')
  submitWaterSampleCollection(
    @Body() dto: WaterSampleCollectionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.mobileService.submitWaterSampleCollection(dto, user);
  }

  @Post('forms/water-sample-collection/:id/attachments')
  @UseFilters(MobileUploadExceptionFilter)
  @UseInterceptors(FilesInterceptor('attachments', 10, mobileMulterOptions))
  uploadWaterSampleAttachments(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: JwtPayload,
  ) {
    return this.mobileService.uploadWaterSampleAttachments(id, files || [], user);
  }

  @Post('forms/land-utilization-progress')
  @HttpCode(HttpStatus.CREATED)
  submitLandUtilizationProgress(
    @Body() dto: LandUtilizationProgressDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.mobileService.submitLandUtilizationProgress(dto, user);
  }

  @Post('forms/redbook-operational')
  @HttpCode(HttpStatus.CREATED)
  submitRedbookOperational(@Body() dto: RedbookOperationalDto, @CurrentUser() user: JwtPayload) {
    return this.mobileService.submitRedbookOperational(dto, user);
  }

  @Get('notifications')
  getNotifications(@CurrentUser() user: JwtPayload) {
    return this.mobileService.getNotifications(user);
  }

  @Post('notifications/register')
  registerPushToken(@Body() dto: RegisterPushTokenDto, @CurrentUser() user: JwtPayload) {
    return this.mobileService.registerPushToken(dto, user);
  }

  @Post('notifications/:id/read')
  markNotificationRead() {
    return this.mobileService.markNotificationRead();
  }
}
