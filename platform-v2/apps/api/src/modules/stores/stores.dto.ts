import { IsBoolean, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateStoreDto {
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  slug!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  domain?: string;
}

export class UpdateStoreDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
