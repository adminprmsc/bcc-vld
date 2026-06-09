import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class WaterSampleCollectionDto {
  @IsNotEmpty()
  sampleId!: string | number;

  @IsNotEmpty()
  collectedAt!: string;

  @IsOptional()
  @IsString()
  fieldNotes?: string;

  @IsOptional()
  @IsObject()
  location?: { lat?: number | null; lng?: number | null };

  @IsOptional()
  offlineId?: string | number;
}
