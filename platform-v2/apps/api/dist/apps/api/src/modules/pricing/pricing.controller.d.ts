import { PricingService } from './pricing.service';
import { PriceQuoteDto } from './pricing.dto';
export declare class PricingController {
    private readonly pricingService;
    constructor(pricingService: PricingService);
    quote(body: PriceQuoteDto): import("@pricing/index").PricingOutput;
}
