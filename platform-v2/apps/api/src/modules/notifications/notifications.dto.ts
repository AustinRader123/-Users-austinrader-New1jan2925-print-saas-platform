import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateNotificationDto {
  @IsOptional()
  @IsString()
  storeId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsString()
  @MinLength(2)
  channel!: string;

  @IsString()
  @MinLength(2)
  subject!: string;

  @IsString()
  @MinLength(1)
  body!: string;
}

export class UpdateNotificationStatusDto {
  @IsString()
  status!: 'QUEUED' | 'PROCESSING' | 'SENT' | 'FAILED';

  @IsOptional()
  @IsString()
  reason?: string;
}
