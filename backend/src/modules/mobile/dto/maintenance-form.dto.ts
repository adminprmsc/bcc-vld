import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class MaintenanceFormDto {
  @IsNotEmpty()
  planId!: string | number;

  @IsIn(['preventive', 'corrective', 'emergency', 'inspection'])
  type!: 'preventive' | 'corrective' | 'emergency' | 'inspection';

  @IsNotEmpty()
  @IsString()
  description!: string;

  @IsOptional()
  @IsNumber()
  cost?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  performedAt?: string;

  @IsOptional()
  offlineId?: string | number;
}
