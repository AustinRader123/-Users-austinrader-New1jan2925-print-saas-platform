import { Controller, Get } from '@nestjs/common';

@Controller('api/vendors')
export class VendorsController {
  @Get('sync/status')
  status() {
    return {
      provider: 'MOCK',
      lastRunAt: null,
      healthy: true,
    };
  }
}
