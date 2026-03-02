import { Controller, Get } from '@nestjs/common';

@Controller('api/automation')
export class AutomationController {
  @Get('rules')
  rules() {
    return [];
  }
}
