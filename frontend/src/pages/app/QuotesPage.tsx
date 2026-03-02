import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api';
import { withFallback } from '../../lib/apiClient';
import { useAsync } from '../../lib/query';
import { EmptyState, ErrorState, LoadingState, PageHeader } from './ui';
import Table from '../../ui/Table';

type QuoteRow = {
  id: string;
  quoteNumber: string;
  customerName: string;
  status: string;
  total: number;
  createdAt: string;
};

const mockRows: QuoteRow[] = [
  { id: 'q-101', quoteNumber: 'Q-101', customerName: 'Atlas Youth League', status: 'DRAFT', total: 502.3, createdAt: '2026-03-01T10:01:00Z' },
  { id: 'q-100', quoteNumber: 'Q-100', customerName: 'Metro Soccer Club', status: 'APPROVED', total: 1920.0, createdAt: '2026-03-01T09:40:00Z' },
];

export default function AppQuotesPage() {
  const storeId = localStorage.getItem('storeId') || 'default';
  const navigate = useNavigate();
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);

  const state = useAsync(async () => {
    return withFallback(
      async () => {
        const rows = await apiClient.listQuotes(storeId);
        const list = Array.isArray(rows) ? rows : (rows?.items || []);
        return list.map((row: any) => ({
          id: String(row.id || row.quoteId || row.quoteNumber),
          quoteNumber: String(row.quoteNumber || row.id || 'Q-NA'),
          customerName: String(row.customerName || row.customer?.name || 'Unknown customer'),
          status: String(row.status || 'DRAFT'),
          total: Number(row.total || row.totalAmount || row.totalCents / 100 || 0),
          createdAt: String(row.createdAt || row.updatedAt || new Date().toISOString()),
        })) as QuoteRow[];
      },
      () => mockRows,
      'quotes.list'
    );
  }, [storeId]);

  const rows = React.useMemo(() => {
    return [...(state.data || [])].sort((a, b) => {
      const byCreated = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (byCreated !== 0) return byCreated;
      return String(a.id).localeCompare(String(b.id));
    });
  }, [state.data]);

  const convert = async (quoteId: string) => {
    setActionMessage(null);
    try {
      const order = await apiClient.convertQuoteToOrder(quoteId, storeId);
      setActionMessage(`Converted quote to order ${order.orderNumber || order.id}`);
      await state.refetch();
      if (order?.id) navigate(`/app/orders/${order.id}`);
    } catch (error: any) {
      setActionMessage(error?.message || 'Convert failed');
    }
  };

  return (
    <div className="deco-page">
      <PageHeader
        title="Quotes"
        subtitle="Draft, approve, and convert quotes into orders."
        actions={<Link className="deco-btn-primary" to="/app/quotes/new">New Quote</Link>}
      />

      {actionMessage ? <div className="text-xs text-slate-600">{actionMessage}</div> : null}
      {state.loading ? <LoadingState title="Loading quotes" /> : null}
      {!state.loading && state.error ? <ErrorState message={state.error} onRetry={state.refetch} /> : null}
      {!state.loading && !state.error && rows.length === 0 ? <EmptyState title="No quotes yet" description="Create your first quote to start the sales flow." /> : null}

      {!state.loading && !state.error && rows.length > 0 ? (
        <Table
          title="Quotes"
          rows={rows}
          getRowId={(row) => row.id}
          searchPlaceholder="Search quote # or customer"
          searchBy={(row, q) => row.quoteNumber.toLowerCase().includes(q) || row.customerName.toLowerCase().includes(q)}
          filters={[
            {
              key: 'status',
              label: 'Status',
              getValue: (row) => row.status,
              options: Array.from(new Set(rows.map((row) => row.status))).map((value) => ({ label: value, value })),
            },
          ]}
          columns={[
            { key: 'quoteNumber', label: 'Quote #', sortable: true, sortValue: (row) => row.quoteNumber, render: (row) => <span className="font-semibold">{row.quoteNumber}</span> },
            { key: 'customer', label: 'Customer', sortable: true, sortValue: (row) => row.customerName, render: (row) => row.customerName },
            { key: 'status', label: 'Status', sortable: true, sortValue: (row) => row.status, render: (row) => <span className="ops-badge">{row.status}</span> },
            { key: 'total', label: 'Total', sortable: true, sortValue: (row) => row.total, render: (row) => `$${row.total.toFixed(2)}` },
            {
              key: 'created',
              label: 'Created',
              sortable: true,
              sortValue: (row) => new Date(row.createdAt).getTime(),
              render: (row) => new Date(row.createdAt).toLocaleString(),
            },
          ]}
          rowActions={[
            { label: 'View', onClick: (row) => navigate(`/app/quotes/${row.id}`) },
            { label: 'Convert', onClick: (row) => void convert(row.id) },
          ]}
          onBulkAction={(selected) => console.info('Selected quotes', selected.map((row) => row.id))}
          bulkActionLabel="Select"
        />
      ) : null}
    </div>
  );
}
