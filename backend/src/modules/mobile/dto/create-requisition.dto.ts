import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

class LocationDto {
  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  lat?: number | null;

  @IsOptional()
  lng?: number | null;
}

export class CreateRequisitionDto {
  @IsNotEmpty()
  @IsString()
  title!: string;

  @IsNotEmpty()
  @IsString()
  purpose!: string;

  @IsNotEmpty()
  @IsString()
  tehsil!: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  landArea?: string;

  @IsOptional()
  @IsString()
  landType?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsObject()
  location?: LocationDto;

  @IsOptional()
  @IsObject()
  mapMarker?: { lat?: number | null; lng?: number | null };

  @IsOptional()
  offlineId?: string | number;
}
