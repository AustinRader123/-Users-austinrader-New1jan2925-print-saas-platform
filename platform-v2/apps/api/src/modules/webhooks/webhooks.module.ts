import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksInboundController } from './webhooks.inbound.controller';
import { WebhooksService } from './webhooks.service';

@Module({
  controllers: [WebhooksController, WebhooksInboundController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
