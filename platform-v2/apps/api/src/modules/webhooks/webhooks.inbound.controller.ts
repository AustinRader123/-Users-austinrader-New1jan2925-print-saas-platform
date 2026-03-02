import { Body, Controller, Headers, Param, Post } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';

@Controller('api/webhooks/inbound')
export class WebhooksInboundController {
  constructor(private readonly service: WebhooksService) {}

  @Post(':id')
  receive(
    @Param('id') id: string,
    @Headers('x-webhook-secret') secret?: string,
    @Headers('x-webhook-event-id') eventId?: string,
    @Body() body: Record<string, unknown> = {}
  ) {
    return this.service.receiveInbound(id, secret, eventId, body);
  }
}
