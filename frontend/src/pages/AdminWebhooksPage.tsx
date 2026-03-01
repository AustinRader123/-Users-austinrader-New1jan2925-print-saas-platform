import React from 'react';
import { apiClient } from '../lib/api';

export default function AdminWebhooksPage() {
  const storeId = 'default';
  const [endpoints, setEndpoints] = React.useState<any[]>([]);
  const [deliveries, setDeliveries] = React.useState<any[]>([]);
  const [url, setUrl] = React.useState('');
  const [secret, setSecret] = React.useState('');

  const load = React.useCallback(async () => {
    const [ep, del] = await Promise.all([
      apiClient.listWebhookEndpoints(storeId),
      apiClient.listWebhookDeliveries(storeId),
    ]);
    setEndpoints(ep || []);
    setDeliveries(del || []);
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!url || !secret) return;
    await apiClient.createWebhookEndpoint({ storeId, url, secret, enabled: true });
    setUrl('');
    setSecret('');
    await load();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Webhooks</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <input className="input-base" placeholder="Endpoint URL" value={url} onChange={(e) => setUrl(e.target.value)} />
        <input className="input-base" placeholder="Secret" value={secret} onChange={(e) => setSecret(e.target.value)} />
        <button className="btn btn-primary" onClick={create}>Create Endpoint</button>
      </div>

      <div className="rounded border bg-white divide-y">
        {endpoints.map((endpoint) => (
          <div key={endpoint.id} className="p-3 text-sm flex items-center justify-between">
            <span>{endpoint.url}</span>
            <button className="btn btn-secondary" onClick={() => apiClient.testWebhookEndpoint(endpoint.id, storeId)}>Send Test</button>
          </div>
        ))}
      </div>

      <div className="rounded border bg-white divide-y">
        {deliveries.map((delivery) => (
          <div key={delivery.id} className="p-3 text-xs flex justify-between">
            <span>{delivery.eventType}</span>
            <span>{delivery.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
