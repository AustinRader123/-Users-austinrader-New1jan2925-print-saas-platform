import { providerMode } from '../../config/providers.js';
import { WebhookClient } from './WebhookClient.js';
import MockWebhookClient from './mock/MockWebhookClient.js';
import RealWebhookClient from './real/RealWebhookClient.js';

export function getWebhookClient(): WebhookClient {
  if (providerMode.webhooks === 'real') {
    return new RealWebhookClient();
  }
  return new MockWebhookClient();
}
