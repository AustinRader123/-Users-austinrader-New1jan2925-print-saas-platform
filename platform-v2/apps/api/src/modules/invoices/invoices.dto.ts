import { Type } from 'class-transformer';
import { IsDateString, IsOptional, IsString, Min } from 'class-validator';

export class CreateInvoiceDto {
  @IsString()
  orderId!: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class RecordPaymentDto {
  @IsOptional()
  @IsString()
  provider?: 'MOCK' | 'STRIPE' | 'SHIPPO' | 'AVALARA' | 'CUSTOM';

  @IsOptional()
  @IsString()
  providerRef?: string;

  @Type(() => Number)
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}
