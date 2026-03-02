import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateVariantDto {
  @IsString()
  @MinLength(1)
  sku!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  size?: string;

  @Type(() => Number)
  @Min(0)
  baseCost!: number;

  @Type(() => Number)
  @Min(0)
  basePrice!: number;
}

export class CreateProductDto {
  @IsString()
  @MinLength(1)
  storeId!: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  slug!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants?: CreateVariantDto[];
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
