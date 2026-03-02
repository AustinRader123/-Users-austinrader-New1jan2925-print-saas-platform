import { Controller, Get } from '@nestjs/common';

@Controller('api/crm')
export class CrmController {
  @Get('pipeline')
  pipeline() {
    return {
      stages: ['Lead', 'Quoted', 'Approved', 'In Production', 'Shipped'],
      cards: [],
    };
  }
}
