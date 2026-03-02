import { Type } from 'class-transformer';
import { IsInt, IsObject, IsOptional, IsString, Matches, Min, MinLength } from 'class-validator';

export class CreateFileAssetDto {
  @IsOptional()
  @IsString()
  storeId?: string;

  @IsString()
  @MinLength(3)
  key!: string;

  @IsString()
  @MinLength(2)
  bucket!: string;

  @IsString()
  @MinLength(3)
  mimeType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  sizeBytes!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  width?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  height?: number;

  @IsOptional()
  @IsString()
  checksum?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateFileAssetDto {
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  checksum?: string;
}

export class PresignQueryDto {
  @IsString()
  @MinLength(3)
  key!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9._-]+$/)
  bucket?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;
}
