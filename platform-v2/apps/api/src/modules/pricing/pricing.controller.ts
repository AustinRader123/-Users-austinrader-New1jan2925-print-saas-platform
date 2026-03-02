import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { PriceQuoteDto } from './pricing.dto';
import { TenantGuard } from '../../common/tenant.guard';

@Controller('api/pricing')
@UseGuards(TenantGuard)
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Post('quote')
  quote(@Body() body: PriceQuoteDto) {
    return this.pricingService.quote(body);
  }
}
