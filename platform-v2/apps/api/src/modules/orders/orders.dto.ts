import { IsArray, IsInt, IsString, Min } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  customerId!: string;

  @IsArray()
  items!: Array<{
    sku: string;
    quantity: number;
    baseUnitCost: number;
  }>;

  @IsString()
  method!: 'SCREENPRINT' | 'EMBROIDERY' | 'DTF';

  @IsInt()
  @Min(0)
  colorCount!: number;
}
