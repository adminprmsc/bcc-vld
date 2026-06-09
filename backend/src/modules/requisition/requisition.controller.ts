import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { BigIntSerializerInterceptor } from '../../common/interceptors/bigint-serializer.interceptor';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtPayload } from '../../common/security/jwt.strategy';
import { requisitionDiskStorage } from './requisition-upload.config';
import { RequisitionService } from './requisition.service';

@Controller('requisition')
@UseGuards(JwtAuthGuard)
@UseInterceptors(BigIntSerializerInterceptor)
export class RequisitionController {
  constructor(private readonly service: RequisitionService) {}

  @Get('dashboard/stats')
  getDashboardStats(
    @CurrentUser() user: JwtPayload,
    @Query('tehsil') tehsil?: string,
    @Query('district') district?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.getDashboardStats(user, { tehsil, district, startDate, endDate });
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.service.findAll(user);
  }

  @Get(':id/due-diligence-pdf')
  async dueDiligencePdf(@Param('id') id: string, @Res() res: Response) {
    await this.service.streamDueDiligencePdf(id, res);
  }

  @Get(':id/pdf')
  async workflowPdf(@Param('id') id: string, @Res() res: Response) {
    await this.service.streamWorkflowPdf(id, res);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.findOne(id, user);
  }

  @Post()
  @UseInterceptors(FilesInterceptor('attachments', 10, { storage: requisitionDiskStorage }))
  create(
    @CurrentUser() user: JwtPayload,
    @Body() body: Record<string, unknown>,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.service.create(user, body, files);
  }

  @Patch(':id/map')
  @UseGuards(RolesGuard)
  @Roles(
    'DM Tehsil',
    'Tehsil DM',
    'Infra Engineer',
    'Infra Head',
    'CID',
    'CID Officer',
    'BCC Specialist',
    'BCC Officer Tehsil',
    'BCC Officer',
    'Super Admin',
  )
  updateMap(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.updateMap(id, user, body);
  }

  @Patch(':id/donor')
  updateDonor(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: { donorData?: unknown },
  ) {
    return this.service.updateDonor(id, user, body);
  }

  @Patch(':id/docs')
  updateDocs(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: { documents?: unknown },
  ) {
    return this.service.updateDocs(id, user, body);
  }

  @Patch(':id/land-acquisition')
  @UseGuards(RolesGuard)
  @Roles('BCC Officer Tehsil', 'BCC Officer', 'BCC Specialist', 'Super Admin')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'ownershipProof', maxCount: 1 },
        { name: 'attachedDocuments', maxCount: 10 },
      ],
      { storage: requisitionDiskStorage },
    ),
  )
  updateLandAcquisition(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: Record<string, unknown>,
    @UploadedFiles()
    files?: { ownershipProof?: Express.Multer.File[]; attachedDocuments?: Express.Multer.File[] },
  ) {
    return this.service.updateLandAcquisition(id, user, body, files);
  }

  @Patch(':id/land-utilization/overview')
  @UseGuards(RolesGuard)
  @Roles('DM Tehsil', 'Tehsil DM', 'Super Admin')
  updateLandUtilizationOverview(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.updateLandUtilizationOverview(id, user, body);
  }

  @Post(':id/land-utilization/civil-structures')
  @UseGuards(RolesGuard)
  @Roles('DM Tehsil', 'Tehsil DM', 'Super Admin')
  @UseInterceptors(FilesInterceptor('photos', 10, { storage: requisitionDiskStorage }))
  addLandUtilizationCivilStructure(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: Record<string, unknown>,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.service.addCivilStructure(id, user, body, files);
  }

  @Post(':id/land-utilization/machinery')
  @UseGuards(RolesGuard)
  @Roles('DM Tehsil', 'Tehsil DM', 'Super Admin')
  @UseInterceptors(FilesInterceptor('photos', 10, { storage: requisitionDiskStorage }))
  addLandUtilizationMachinery(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: Record<string, unknown>,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.service.addMachinery(id, user, body, files);
  }

  @Post(':id/land-utilization/progress')
  @UseGuards(RolesGuard)
  @Roles('DM Tehsil', 'Tehsil DM', 'Super Admin')
  @UseInterceptors(FilesInterceptor('photos', 10, { storage: requisitionDiskStorage }))
  addLandUtilizationProgress(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: Record<string, unknown>,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.service.addProgressUpdate(id, user, body, files);
  }

  @Patch(':id/utilization/overview')
  @UseGuards(RolesGuard)
  @Roles('DM Tehsil', 'Super Admin')
  updateUtilizationOverview(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.updateUtilizationOverview(id, user, body);
  }

  @Post(':id/utilization/structures')
  @UseGuards(RolesGuard)
  @Roles('DM Tehsil', 'Super Admin')
  @UseInterceptors(FilesInterceptor('photos', 10, { storage: requisitionDiskStorage }))
  addUtilizationStructure(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: Record<string, unknown>,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.service.addCivilStructure(id, user, body, files);
  }

  @Patch(':id/utilization/structures/:structureId')
  @UseGuards(RolesGuard)
  @Roles('DM Tehsil', 'Super Admin')
  @UseInterceptors(FilesInterceptor('photos', 10, { storage: requisitionDiskStorage }))
  updateUtilizationStructure(
    @Param('id') id: string,
    @Param('structureId') structureId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: Record<string, unknown>,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.service.updateCivilStructure(id, structureId, user, body, files);
  }

  @Post(':id/utilization/machinery')
  @UseGuards(RolesGuard)
  @Roles('DM Tehsil', 'Super Admin')
  @UseInterceptors(FilesInterceptor('photos', 10, { storage: requisitionDiskStorage }))
  addUtilizationMachinery(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: Record<string, unknown>,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.service.addMachinery(id, user, body, files);
  }

  @Patch(':id/utilization/machinery/:machineryId')
  @UseGuards(RolesGuard)
  @Roles('DM Tehsil', 'Super Admin')
  @UseInterceptors(FilesInterceptor('photos', 10, { storage: requisitionDiskStorage }))
  updateUtilizationMachinery(
    @Param('id') id: string,
    @Param('machineryId') machineryId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: Record<string, unknown>,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.service.updateMachinery(id, machineryId, user, body, files);
  }

  @Post(':id/utilization/progress')
  @UseGuards(RolesGuard)
  @Roles('DM Tehsil', 'Super Admin')
  @UseInterceptors(FilesInterceptor('photos', 10, { storage: requisitionDiskStorage }))
  addUtilizationProgress(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: Record<string, unknown>,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.service.addUtilizationProgress(id, user, body, files);
  }

  @Patch(':id/dm-forward-bcc')
  @UseGuards(RolesGuard)
  @Roles('DM Tehsil', 'Tehsil DM', 'Super Admin')
  dmForwardBcc(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: { officerId?: unknown; remarks?: unknown },
  ) {
    return this.service.dmForwardBcc(id, user, body);
  }

  @Patch(':id/bcc-forward-tm')
  @UseGuards(RolesGuard)
  @Roles('BCC Officer Tehsil', 'BCC Officer', 'Super Admin')
  bccForwardTm(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: { officerId?: unknown; remarks?: unknown },
  ) {
    return this.service.bccForwardTm(id, user, body);
  }

  @Patch(':id/tm-forward-chief')
  @UseGuards(RolesGuard)
  @Roles('Tehsil Manager', 'Super Admin')
  tmForwardChief(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: { officerId?: unknown; remarks?: unknown },
  ) {
    return this.service.tmForwardChief(id, user, body);
  }

  @Patch(':id/chief-forward-bcc')
  @UseGuards(RolesGuard)
  @Roles('BCC Specialist', 'Super Admin')
  chiefForwardBcc(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: { officerId?: unknown; remarks?: unknown },
  ) {
    return this.service.chiefForwardBcc(id, user, body);
  }

  @Patch(':id/bcc-forward-wb')
  @UseGuards(RolesGuard)
  @Roles('BCC Officer Tehsil', 'BCC Officer', 'Super Admin')
  bccForwardWb(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: { officerId?: unknown; remarks?: unknown },
  ) {
    return this.service.bccForwardWb(id, user, body);
  }

  @Patch(':id/wb-approve')
  @UseGuards(RolesGuard)
  @Roles('WB User', 'Super Admin')
  wbApprove(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: { officerId?: unknown; remarks?: unknown },
  ) {
    return this.service.wbApprove(id, user, body);
  }

  @Patch(':id/chief-mark-tm')
  @UseGuards(RolesGuard)
  @Roles('BCC Specialist', 'Super Admin')
  chiefMarkTm(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: { officerId?: unknown; remarks?: unknown },
  ) {
    return this.service.chiefMarkTm(id, user, body);
  }

  @Patch(':id/tm-forward-bcc')
  @UseGuards(RolesGuard)
  @Roles('Tehsil Manager', 'Super Admin')
  tmForwardBcc(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: { officerId?: unknown; remarks?: unknown },
  ) {
    return this.service.tmForwardBccClosure(id, user, body);
  }

  @Patch(':id/bcc-close')
  @UseGuards(RolesGuard)
  @Roles('BCC Officer Tehsil', 'BCC Officer', 'Super Admin')
  bccClose(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: { remarks?: unknown },
  ) {
    return this.service.bccClose(id, user, body);
  }

  @Patch(':id/revert')
  @UseGuards(RolesGuard)
  @Roles(
    'DM Tehsil',
    'Tehsil DM',
    'BCC Officer Tehsil',
    'BCC Officer',
    'BCC Specialist',
    'Tehsil Manager',
    'WB User',
    'Super Admin',
  )
  revert(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: { remarks?: unknown; toStatus?: unknown; officerId?: unknown },
  ) {
    return this.service.revert(id, user, body);
  }
}
