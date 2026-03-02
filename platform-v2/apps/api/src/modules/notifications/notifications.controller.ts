import { Controller, Get } from '@nestjs/common';

@Controller('api/notifications')
export class NotificationsController {
  @Get()
  list() {
    return [];
  }
}
