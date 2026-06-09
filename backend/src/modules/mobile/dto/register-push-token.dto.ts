import { IsOptional, IsString } from 'class-validator';

export class RegisterPushTokenDto {
  @IsOptional()
  @IsString()
  token?: string;

  @IsOptional()
  @IsString()
  platform?: string;

  @IsOptional()
  @IsString()
  deviceName?: string;
}
