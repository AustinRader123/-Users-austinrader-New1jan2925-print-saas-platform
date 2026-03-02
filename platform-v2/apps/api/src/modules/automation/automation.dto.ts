import { Type } from 'class-transformer';
import { IsBoolean, IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAutomationRuleDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  storeId?: string;

  @IsString()
  @MinLength(2)
  triggerType!: string;

  @IsOptional()
  @IsObject()
  conditions?: Record<string, unknown>;

  @IsObject()
  actions!: Record<string, unknown>;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateAutomationRuleDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsObject()
  conditions?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  actions?: Record<string, unknown>;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

export class RunAutomationDto {
  @IsOptional()
  @IsString()
  storeId?: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}
