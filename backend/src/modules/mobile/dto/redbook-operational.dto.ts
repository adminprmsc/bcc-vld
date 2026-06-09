import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RedbookOperationalDto {
  @IsNotEmpty()
  @IsString()
  assetId!: string;

  @IsNotEmpty()
  @IsString()
  assetType!: string;

  @IsNotEmpty()
  @IsString()
  operationalStatus!: string;

  @IsNotEmpty()
  @IsString()
  condition!: string;

  @IsOptional()
  capacityUtilization?: number | null;

  @IsOptional()
  lastMaintenanceDate?: string;

  @IsOptional()
  nextMaintenanceDue?: string;

  @IsOptional()
  operator?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  issues?: unknown[];

  @IsOptional()
  location?: Record<string, unknown> | null;

  @IsOptional()
  capturedAt?: string;

  @IsOptional()
  offlineId?: string | number;
}
