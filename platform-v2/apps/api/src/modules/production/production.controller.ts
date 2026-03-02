import { Controller, Get } from '@nestjs/common';

@Controller('api/production')
export class ProductionController {
  @Get('board')
  board() {
    return {
      columns: ['NEEDS_PROOF', 'READY', 'PRINTING', 'PACKING', 'SHIPPED'],
      jobs: [],
    };
  }
}
