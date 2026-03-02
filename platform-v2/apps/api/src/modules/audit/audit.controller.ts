import { Controller, Get } from '@nestjs/common';

@Controller('api/audit')
export class AuditController {
  @Get('entries')
  entries() {
    return [];
  }
}
