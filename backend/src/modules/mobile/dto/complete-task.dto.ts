import { IsOptional, IsString } from 'class-validator';

export class CompleteTaskDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
