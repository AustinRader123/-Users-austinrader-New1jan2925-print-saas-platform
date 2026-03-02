import { Injectable } from '@nestjs/common';
import { calculatePricing } from '../../../../../packages/pricing-engine/src';
import { PriceQuoteDto } from './pricing.dto';

@Injectable()
export class PricingService {
  quote(input: PriceQuoteDto) {
    return calculatePricing({
      ...input,
      minimumOrderQty: 6,
    });
  }
}
