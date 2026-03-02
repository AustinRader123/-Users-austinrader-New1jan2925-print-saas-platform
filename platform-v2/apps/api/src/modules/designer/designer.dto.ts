import { IsArray, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class SaveDesignDto {
  @IsString()
  name!: string;

  @IsInt()
  @Min(1)
  canvasWidth!: number;

  @IsInt()
  @Min(1)
  canvasHeight!: number;

  @IsArray()
  layers!: Array<{
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
    content: Record<string, unknown>;
  }>;

  @IsOptional()
  @IsString()
  previewUrl?: string;
}
