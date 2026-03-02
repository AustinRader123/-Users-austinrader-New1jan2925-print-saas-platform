import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api';
import { withFallback } from '../../lib/apiClient';
import { useAsync } from '../../lib/query';
import { EmptyState, ErrorState, LoadingState, PageHeader } from './ui';
import Table from '../../ui/Table';

type OrderRow = {
  id: string;
  orderNumber: string;
  customerName: string;
  status: string;
  total: number;
  updatedAt: string;
};

const mockOrders: OrderRow[] = [
  { id: 'ord-1', orderNumber: 'SO-10601', customerName: 'Atlas Youth League', status: 'In Production', total: 640.1, updatedAt: '2026-03-01T09:00:00Z' },
  { id: 'ord-2', orderNumber: 'SO-10600', customerName: 'North Ridge Booster Club', status: 'Pending', total: 2304.02, updatedAt: '2026-03-01T08:40:00Z' },
  { id: 'ord-3', orderNumber: 'SO-10599', customerName: 'Metro Soccer Club', status: 'Shipped', total: 551.43, updatedAt: '2026-03-01T08:10:00Z' },
];

export default function AppOrdersPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('ALL');

  const state = useAsync(async () => {
    return withFallback(
      async () => {
        const result = await apiClient.listOrders();
        const rows = Array.isArray(result) ? result : (result?.orders || []);
        return rows.map((row: any) => ({
          id: String(row.id || row.orderId || row.orderNumber),
          orderNumber: String(row.orderNumber || row.number || row.id || 'SO-NA'),
          customerName: String(row.customerName || row.customer?.name || row.customerEmail || 'Unknown customer'),
          status: String(row.status || 'Pending'),
          total: Number(row.total || row.totalAmount || row.totalCents / 100 || 0),
          updatedAt: String(row.updatedAt || row.createdAt || new Date().toISOString()),
        })) as OrderRow[];
      },
      () => mockOrders,
      'orders.list'
    );
  }, []);

  const filtered = useMemo(() => {
    const rows = state.data || [];
    const filteredRows = rows.filter((row) => {
      const sOk = status === 'ALL' || row.status === status;
      return sOk;
    });
    return filteredRows.sort((a, b) => {
      const byUpdated = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      if (byUpdated !== 0) return byUpdated;
      return String(a.id).localeCompare(String(b.id));
    });
  }, [state.data, status]);

  return (
    <div className="deco-page">
      <PageHeader
        title="Orders"
        subtitle="Track customer orders, status, and updates."
        actions={<Link to="/app/orders/new" className="deco-btn-primary">New Order</Link>}
      />

      <div className="ops-card">
        <div className="ops-card-body flex flex-wrap gap-2">
          <select className="deco-input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="ALL">All statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Production">In Production</option>
            <option value="Shipped">Shipped</option>
            <option value="Proof Needed">Proof Needed</option>
          </select>
        </div>
      </div>

      {state.loading ? <LoadingState title="Loading orders" /> : null}
      {!state.loading && state.error ? <ErrorState message={state.error} onRetry={state.refetch} /> : null}

      {!state.loading && !state.error && filtered.length === 0 ? (
        <EmptyState title="No results" description="No orders matched your filters yet." />
      ) : null}

      {!state.loading && !state.error && filtered.length > 0 ? (
        <Table
          title="Orders"
          rows={filtered}
          pageSize={10}
          searchPlaceholder="Search order # or customer"
          searchBy={(row, query) => row.orderNumber.toLowerCase().includes(query) || row.customerName.toLowerCase().includes(query)}
          getRowId={(row) => row.id}
          columns={[
            {
              key: 'orderNumber',
              label: 'Order #',
              sortable: true,
              sortValue: (row) => row.orderNumber,
              render: (row) => <span className="font-semibold">{row.orderNumber}</span>,
            },
            {
              key: 'customer',
              label: 'Customer',
              sortable: true,
              sortValue: (row) => row.customerName,
              render: (row) => row.customerName,
            },
            {
              key: 'status',
              label: 'Status',
              sortable: true,
              sortValue: (row) => row.status,
              render: (row) => <span className="ops-badge">{row.status}</span>,
            },
            {
              key: 'total',
              label: 'Total',
              sortable: true,
              sortValue: (row) => row.total,
              render: (row) => `$${row.total.toFixed(2)}`,
            },
            {
              key: 'updatedAt',
              label: 'Updated',
              sortable: true,
              sortValue: (row) => new Date(row.updatedAt).getTime(),
              render: (row) => new Date(row.updatedAt).toLocaleString(),
            },
          ]}
          rowActions={[
            {
              label: 'View',
              onClick: (row) => {
                navigate(`/app/orders/${row.id}`);
              },
            },
          ]}
          onBulkAction={(rows) => {
            console.info('Selected orders', rows.map((row) => row.id));
          }}
          bulkActionLabel="Select"
        />
      ) : null}
    </div>
  );
}
