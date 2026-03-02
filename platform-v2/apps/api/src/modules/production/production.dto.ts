import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateProductionJobDto {
  @IsString()
  orderId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  priority?: number;

  @IsOptional()
  @IsDateString()
  dueAt?: string;
}

export class UpdateProductionStatusDto {
  @IsString()
  status!: 'NEEDS_PROOF' | 'READY' | 'PRINTING' | 'PACKING' | 'SHIPPED';
}
