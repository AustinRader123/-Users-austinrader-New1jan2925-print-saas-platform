import axios from 'axios';
import { WebhookClient } from '../WebhookClient.js';

export class RealWebhookClient implements WebhookClient {
  async post(url: string, headers: Record<string, string>, payload: unknown): Promise<{ status: number }> {
    if (!url) throw new Error('Webhook URL required');
    const timeoutMs = Number(process.env.WEBHOOKS_HTTP_TIMEOUT_MS || 5000);

    const response = await axios.post(url, payload, {
      timeout: Number.isFinite(timeoutMs) ? timeoutMs : 5000,
      headers,
      validateStatus: () => true,
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Webhook delivery failed with status ${response.status}`);
    }

    return { status: response.status };
  }
}

export default RealWebhookClient;
