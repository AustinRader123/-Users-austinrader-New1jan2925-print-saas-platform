import React from 'react';
import { apiClient } from '../../lib/api';
import { withFallback } from '../../lib/apiClient';
import { useAsync } from '../../lib/query';
import { EmptyState, ErrorState, LoadingState, PageHeader } from './ui';
import Table from '../../ui/Table';
import Modal from '../../ui/Modal';
import FormField from '../../ui/FormField';

export default function AppWebhooksPage() {
  const storeId = localStorage.getItem('storeId') || 'default';
  const [url, setUrl] = React.useState('https://example.org/webhooks/skuflow');
  const [message, setMessage] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

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
    setFormError(null);
    if (!url.trim() || !/^https?:\/\//.test(url.trim())) {
      setFormError('Enter a valid endpoint URL starting with http:// or https://');
      return;
    }
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
      setCreateOpen(false);
      await state.refetch();
    } catch (error: any) {
      setMessage(error?.message || 'Create endpoint failed.');
    }
  };

  return (
    <div className="ops-page-grid">
      <PageHeader
        title="Webhooks / Tracking"
        subtitle="Deterministic webhook endpoint and delivery operations."
        actions={
          <div className="flex gap-2">
            <button className="ops-btn ops-btn-secondary" onClick={() => setCreateOpen(true)}>New Endpoint</button>
            <button
              className="ops-btn ops-btn-secondary"
              onClick={async () => {
                try {
                  await apiClient.processWebhookDeliveries(50);
                  setMessage('Webhook processing triggered.');
                  await state.refetch();
                } catch (error: any) {
                  setMessage(error?.message || 'Process failed.');
                }
              }}
            >
              Process queue
            </button>
          </div>
        }
      />

      {message ? <div className="text-xs text-slate-600">{message}</div> : null}

      {state.loading ? <LoadingState title="Loading webhooks" /> : null}
      {!state.loading && state.error ? <ErrorState message={state.error} onRetry={state.refetch} /> : null}

      {!state.loading && !state.error && state.data && state.data.endpoints.length === 0 ? <EmptyState title="No webhook endpoints" description="Create endpoint(s) to receive event deliveries." /> : null}

      {!state.loading && !state.error && state.data ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <Table
            title="Endpoints"
            rows={state.data.endpoints}
            getRowId={(row: any) => String(row.id)}
            searchPlaceholder="Search endpoint"
            searchBy={(row: any, q) => String(row.name || row.id).toLowerCase().includes(q) || String(row.url || '').toLowerCase().includes(q)}
            columns={[
              { key: 'name', label: 'Name', sortable: true, sortValue: (row: any) => String(row.name || row.id), render: (row: any) => row.name || row.id },
              { key: 'url', label: 'URL', sortable: true, sortValue: (row: any) => String(row.url || ''), render: (row: any) => <span className="text-xs">{row.url}</span> },
            ]}
            rowActions={[
              {
                label: 'Test',
                onClick: async (row: any) => {
                  try {
                    await apiClient.testWebhookEndpoint(row.id, storeId);
                    setMessage('Webhook test delivery sent.');
                    await state.refetch();
                  } catch (error: any) {
                    setMessage(error?.message || 'Webhook test failed.');
                  }
                },
              },
            ]}
          />

          <Table
            title="Deliveries"
            rows={state.data.deliveries.slice(0, 50)}
            getRowId={(row: any) => String(row.id)}
            searchPlaceholder="Search event or status"
            searchBy={(row: any, q) => String(row.eventType || row.event || '').toLowerCase().includes(q) || String(row.status || row.deliveryStatus || '').toLowerCase().includes(q)}
            columns={[
              { key: 'event', label: 'Event', sortable: true, sortValue: (row: any) => String(row.eventType || row.event || ''), render: (row: any) => row.eventType || row.event || 'event' },
              { key: 'status', label: 'Status', sortable: true, sortValue: (row: any) => String(row.status || row.deliveryStatus || ''), render: (row: any) => <span className="ops-badge">{row.status || row.deliveryStatus || 'PENDING'}</span> },
              { key: 'created', label: 'Created', sortable: true, sortValue: (row: any) => String(row.createdAt || ''), render: (row: any) => row.createdAt || '—' },
            ]}
          />
        </div>
      ) : null}

      <Modal open={createOpen} title="Create Webhook Endpoint" onClose={() => setCreateOpen(false)}>
        <div className="space-y-3">
          <FormField
            label="Endpoint URL"
            description="Destination for outbound webhook events."
            error={formError}
          >
            <input className="ops-input w-full" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com/webhooks/skuflow" />
          </FormField>
          <div className="flex justify-end gap-2">
            <button className="ops-btn ops-btn-secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button className="ops-btn ops-btn-primary" onClick={() => void createEndpoint()}>Create endpoint</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
