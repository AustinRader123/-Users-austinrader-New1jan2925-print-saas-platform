import { Type } from 'class-transformer';
import { IsArray, IsEmail, IsInt, IsOptional, IsString, Min, MinLength, ValidateNested } from 'class-validator';

export class CreateOrderItemDto {
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

export class CreateOrderDto {
  @IsEmail()
  customerEmail!: string;

  @IsString()
  @MinLength(1)
  customerFirstName!: string;

  @IsString()
  @MinLength(1)
  customerLastName!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}
