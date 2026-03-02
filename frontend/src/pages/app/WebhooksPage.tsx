import React from 'react';
import { apiClient } from '../../lib/api';
import { withFallback } from '../../lib/apiClient';
import { useAsync } from '../../lib/query';
import { EmptyState, ErrorState, LoadingState, PageHeader } from './ui';

export default function AppWebhooksPage() {
  const storeId = localStorage.getItem('storeId') || 'default';
  const [url, setUrl] = React.useState('https://example.org/webhooks/skuflow');
  const [message, setMessage] = React.useState<string | null>(null);

  const state = useAsync(async () => {
    return withFallback(
      async () => {
        const [endpointsResp, deliveriesResp] = await Promise.all([
          apiClient.listWebhookEndpoints(storeId),
          apiClient.listWebhookDeliveries(storeId),
        ]);
        const endpoints = Array.isArray(endpointsResp) ? endpointsResp : (endpointsResp?.items || []);
        const deliveries = Array.isArray(deliveriesResp) ? deliveriesResp : (deliveriesResp?.items || []);
        return {
          endpoints: [...endpoints].sort((a: any, b: any) => String(a.url || '').localeCompare(String(b.url || ''))),
          deliveries: [...deliveries].sort((a: any, b: any) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))),
        };
      },
      () => ({ endpoints: [], deliveries: [] }),
      'webhooks.page'
    );
  }, [storeId]);

  const createEndpoint = async () => {
    setMessage(null);
    try {
      await apiClient.createWebhookEndpoint({
        storeId,
        name: 'Ops endpoint',
        url: url.trim(),
        secret: 'mock-secret',
        isActive: true,
        eventTypes: ['invoice.sent', 'shipment.created', 'order.status_changed'],
      });
      setMessage('Webhook endpoint created.');
      await state.refetch();
    } catch (error: any) {
      setMessage(error?.message || 'Create endpoint failed.');
    }
  };

  return (
    <div className="deco-page">
      <PageHeader title="Webhooks / Tracking" subtitle="Deterministic webhook endpoint and delivery operations." />

      <div className="deco-panel">
        <div className="deco-panel-head">Create endpoint</div>
        <div className="deco-panel-body flex flex-wrap items-center gap-2">
          <input className="deco-input" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." />
          <button className="deco-btn-primary" onClick={createEndpoint}>Create endpoint</button>
          <button className="deco-btn" onClick={async () => {
            try {
              await apiClient.processWebhookDeliveries(50);
              setMessage('Webhook processing triggered.');
              await state.refetch();
            } catch (error: any) {
              setMessage(error?.message || 'Process failed.');
            }
          }}>Process queue</button>
          {message ? <span className="text-xs text-slate-600">{message}</span> : null}
        </div>
      </div>

      {state.loading ? <LoadingState title="Loading webhooks" /> : null}
      {!state.loading && state.error ? <ErrorState message={state.error} onRetry={state.refetch} /> : null}

      {!state.loading && !state.error && state.data && state.data.endpoints.length === 0 ? <EmptyState title="No webhook endpoints" description="Create endpoint(s) to receive event deliveries." /> : null}

      {!state.loading && !state.error && state.data ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="deco-panel">
            <div className="deco-panel-head">Endpoints</div>
            <div className="deco-table-wrap">
              <table className="deco-table">
                <thead><tr><th>Name</th><th>URL</th><th>Actions</th></tr></thead>
                <tbody>
                  {state.data.endpoints.map((row: any) => (
                    <tr key={row.id}>
                      <td>{row.name || row.id}</td>
                      <td className="text-xs">{row.url}</td>
                      <td>
                        <button className="deco-btn" onClick={async () => {
                          try {
                            await apiClient.testWebhookEndpoint(row.id, storeId);
                            setMessage('Webhook test delivery sent.');
                            await state.refetch();
                          } catch (error: any) {
                            setMessage(error?.message || 'Webhook test failed.');
                          }
                        }}>Test</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="deco-panel">
            <div className="deco-panel-head">Deliveries</div>
            <div className="deco-table-wrap">
              <table className="deco-table">
                <thead><tr><th>Event</th><th>Status</th><th>Created</th></tr></thead>
                <tbody>
                  {state.data.deliveries.slice(0, 20).map((row: any) => (
                    <tr key={row.id}>
                      <td>{row.eventType || row.event || 'event'}</td>
                      <td>{row.status || row.deliveryStatus || 'PENDING'}</td>
                      <td>{row.createdAt || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
