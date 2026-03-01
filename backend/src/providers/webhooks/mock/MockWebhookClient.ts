import fs from 'node:fs/promises';
import path from 'node:path';

function logsDir() {
  return path.join(process.cwd(), 'backend', 'uploads', 'logs');
}

export class MockWebhookClient {
  async post(url: string, headers: Record<string, string>, body: unknown) {
    await fs.mkdir(logsDir(), { recursive: true });
    const filePath = path.join(logsDir(), `mock-webhook-${Date.now()}.json`);
    await fs.writeFile(
      filePath,
      JSON.stringify(
        {
          url,
          headers,
          body,
          deliveredAt: new Date().toISOString(),
        },
        null,
        2
      ),
      'utf8'
    );

    return {
      ok: true,
      status: 200,
      providerRef: `mock_wh_${Date.now()}`,
      logPath: filePath,
    };
  }
}

export default MockWebhookClient;
