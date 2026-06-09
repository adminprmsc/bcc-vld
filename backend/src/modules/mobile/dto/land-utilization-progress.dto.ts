import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class LandUtilizationProgressDto {
  @IsNotEmpty()
  @IsString()
  requisitionId!: string;

  @IsNotEmpty()
  @IsString()
  progressStatus!: string;

  @Type(() => Number)
  @IsNumber()
  progressPercentage!: number;

  @IsNotEmpty()
  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  workType?: string;

  @IsOptional()
  @IsString()
  challenges?: string;

  @IsOptional()
  @IsString()
  nextSteps?: string;

  @IsOptional()
  @IsObject()
  location?: Record<string, unknown> | null;

  @IsOptional()
  capturedAt?: string;

  @IsOptional()
  offlineId?: string | number;
}
