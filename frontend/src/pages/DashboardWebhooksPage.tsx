import React from 'react';
import { apiClient } from '../lib/api';

export default function DashboardWebhooksPage() {
  const [storeId, setStoreId] = React.useState(() => localStorage.getItem('storeId') || 'default');
  const [name, setName] = React.useState('Primary Webhook');
  const [url, setUrl] = React.useState('https://example.invalid/webhooks/receiver');
  const [secret, setSecret] = React.useState('change-me-webhook-secret');
  const [endpoints, setEndpoints] = React.useState<any[]>([]);
  const [deliveries, setDeliveries] = React.useState<any[]>([]);
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState('');

  const canQuery = Boolean(storeId.trim());

  const load = React.useCallback(async () => {
    if (!canQuery) return;
    const [ep, del] = await Promise.all([
      apiClient.listWebhookEndpoints(storeId.trim()),
      apiClient.listWebhookDeliveries(storeId.trim()),
    ]);
    setEndpoints(Array.isArray(ep) ? ep : []);
    setDeliveries(Array.isArray(del) ? del : []);
  }, [canQuery, storeId]);

  React.useEffect(() => {
    load().catch((err: any) => setError(err?.response?.data?.error || 'Failed to load webhooks data'));
  }, [load]);

  const create = async () => {
    if (!canQuery || !url.trim() || !secret.trim()) return;
    await apiClient.createWebhookEndpoint({
      storeId: storeId.trim(),
      name: name.trim() || undefined,
      url: url.trim(),
      secret: secret.trim(),
      isActive: true,
    });
    setMessage('Webhook endpoint created');
    await load();
  };

  const processDeliveries = async () => {
    await apiClient.processWebhookDeliveries(100);
    setMessage('Webhook queue processed');
    await load();
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Webhooks</h1>

      <div className="rounded border bg-white p-4 space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input className="input-base" placeholder="storeId" value={storeId} onChange={(e) => setStoreId(e.target.value)} />
          <input className="input-base" placeholder="name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input-base" placeholder="endpoint URL" value={url} onChange={(e) => setUrl(e.target.value)} />
          <input className="input-base" placeholder="secret" value={secret} onChange={(e) => setSecret(e.target.value)} />
        </div>
        <div className="flex gap-2 text-xs">
          <button className="btn btn-secondary" onClick={() => create().catch((err: any) => setError(err?.response?.data?.error || 'Failed to create endpoint'))}>Create Endpoint</button>
          <button className="btn btn-secondary" onClick={() => processDeliveries().catch((err: any) => setError(err?.response?.data?.error || 'Failed to process deliveries'))}>Process Deliveries</button>
          <button className="btn btn-secondary" onClick={() => load().catch((err: any) => setError(err?.response?.data?.error || 'Failed to refresh'))}>Refresh</button>
          {message && <span className="text-emerald-700">{message}</span>}
          {error && <span className="text-rose-700">{error}</span>}
        </div>
      </div>

      <div className="rounded border bg-white p-3">
        <div className="text-sm font-semibold mb-2">Endpoints</div>
        <div className="overflow-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-left border-b">
                <th className="py-1 pr-2">Name</th>
                <th className="py-1 pr-2">URL</th>
                <th className="py-1 pr-2">Active</th>
                <th className="py-1 pr-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {endpoints.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="py-1 pr-2">{row.name || '-'}</td>
                  <td className="py-1 pr-2">{row.url}</td>
                  <td className="py-1 pr-2">{row.isActive ? 'YES' : 'NO'}</td>
                  <td className="py-1 pr-2">
                    <button className="btn btn-secondary" onClick={() => apiClient.testWebhookEndpoint(row.id, storeId.trim()).then(() => setMessage('Test event sent')).catch((err: any) => setError(err?.response?.data?.error || 'Failed to send test event'))}>Test</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded border bg-white p-3">
        <div className="text-sm font-semibold mb-2">Deliveries</div>
        <div className="overflow-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-left border-b">
                <th className="py-1 pr-2">Event</th>
                <th className="py-1 pr-2">Endpoint</th>
                <th className="py-1 pr-2">Status</th>
                <th className="py-1 pr-2">Attempts</th>
                <th className="py-1 pr-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="py-1 pr-2">{row.eventType}</td>
                  <td className="py-1 pr-2">{row.webhookEndpoint?.url || row.endpointId}</td>
                  <td className="py-1 pr-2">{row.status}</td>
                  <td className="py-1 pr-2">{row.attempts}</td>
                  <td className="py-1 pr-2">
                    <button className="btn btn-secondary" onClick={() => apiClient.retryWebhookDelivery(row.id).then(load).catch((err: any) => setError(err?.response?.data?.error || 'Failed to retry delivery'))}>Retry</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
