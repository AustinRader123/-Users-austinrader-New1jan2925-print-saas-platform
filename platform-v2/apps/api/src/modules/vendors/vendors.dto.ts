import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, Matches, Min, MinLength, ValidateNested } from 'class-validator';

class ReceiveLineDto {
  @IsString()
  @MinLength(1)
  variantId!: string;

  @Type(() => Number)
  @Min(1)
  quantity!: number;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  cost?: number;
}

export class CreateVendorDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  provider?: 'MOCK' | 'STRIPE' | 'SHIPPO' | 'AVALARA' | 'CUSTOM';

  @IsOptional()
  @IsString()
  storeId?: string;

  @IsOptional()
  @IsString()
  externalId?: string;
}

export class ReceiveInventoryDto {
  @IsString()
  @MinLength(1)
  storeId!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9._-]+$/)
  location?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiveLineDto)
  lines!: ReceiveLineDto[];
}
