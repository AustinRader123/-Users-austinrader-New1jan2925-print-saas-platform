import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateQuoteItemDto {
  @IsString()
  @MinLength(1)
  productId!: string;

  @IsString()
  @MinLength(1)
  variantId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @Type(() => Number)
  @Min(0)
  unitPrice!: number;

  @IsOptional()
  @IsString()
  designId?: string;

  @IsOptional()
  pricingSnapshot?: Record<string, unknown>;
}

export class CreateQuoteDto {
  @IsString()
  @MinLength(1)
  storeId!: string;

  @IsEmail()
  customerEmail!: string;

  @IsString()
  @MinLength(1)
  customerFirstName!: string;

  @IsString()
  @MinLength(1)
  customerLastName!: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuoteItemDto)
  items!: CreateQuoteItemDto[];
}

export class ConvertQuoteDto {
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  taxTotal?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  shippingTotal?: number;
}
