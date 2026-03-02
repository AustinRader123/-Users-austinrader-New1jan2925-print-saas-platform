import { IsEnum, IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export enum DecorationMethodDto {
  SCREENPRINT = 'SCREENPRINT',
  EMBROIDERY = 'EMBROIDERY',
  DTF = 'DTF',
}

export class PriceQuoteDto {
  @IsNumber()
  baseUnitCost!: number;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsEnum(DecorationMethodDto)
  method!: DecorationMethodDto;

  @IsOptional()
  @IsInt()
  colorCount?: number;

  @IsOptional()
  @IsInt()
  stitchCount?: number;

  @IsOptional()
  @IsNumber()
  dtfAreaSqIn?: number;

  @IsOptional()
  @IsInt()
  locationCount?: number;

  @IsOptional()
  @IsNumber()
  setupFee?: number;

  @IsOptional()
  @IsNumber()
  shippingFlat?: number;

  @IsOptional()
  @IsNumber()
  markupPercent?: number;

  @IsOptional()
  @IsNumber()
  taxPercent?: number;

  @IsOptional()
  @IsNumber()
  rushPercent?: number;
}
