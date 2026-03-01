export interface WebhookClient {
  post(url: string, headers: Record<string, string>, payload: unknown): Promise<{ status: number }>;
}
