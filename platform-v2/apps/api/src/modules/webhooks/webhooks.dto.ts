import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, IsUrl, Max, Min, MinLength } from 'class-validator';

export class CreateWebhookDto {
  @IsOptional()
  @IsString()
  storeId?: string;

  @IsOptional()
  @IsString()
  @IsIn(['MOCK', 'STRIPE', 'SHIPPO', 'AVALARA', 'CUSTOM'])
  provider?: 'MOCK' | 'STRIPE' | 'SHIPPO' | 'AVALARA' | 'CUSTOM';

  @IsString()
  @MinLength(2)
  eventType!: string;

  @IsString()
  @IsUrl({ require_tld: false })
  endpoint!: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  secret?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateWebhookDto {
  @IsOptional()
  @IsString()
  storeId?: string;

  @IsOptional()
  @IsString()
  @IsIn(['MOCK', 'STRIPE', 'SHIPPO', 'AVALARA', 'CUSTOM'])
  provider?: 'MOCK' | 'STRIPE' | 'SHIPPO' | 'AVALARA' | 'CUSTOM';

  @IsOptional()
  @IsString()
  @MinLength(2)
  eventType?: string;

  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false })
  endpoint?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  secret?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

export class RecordWebhookDeliveryDto {
  @IsString()
  @IsIn(['SUCCESS', 'FAILED', 'RETRY'])
  status!: 'SUCCESS' | 'FAILED' | 'RETRY';

  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(599)
  responseCode?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  latencyMs?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  attempt?: number;

  @IsOptional()
  @IsString()
  error?: string;

  @IsOptional()
  @IsObject()
  responseBody?: Record<string, unknown>;
}

export class QueueWebhookRetryDto {
  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  eventType?: string;

  @IsObject()
  body!: Record<string, unknown>;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  attempt?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  maxAttempts?: number;
}

export class DispatchWebhookRetriesDto {
  @IsOptional()
  @IsString()
  webhookId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
