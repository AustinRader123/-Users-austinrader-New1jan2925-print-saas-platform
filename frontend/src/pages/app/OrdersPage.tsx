import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/api';
import { withFallback } from '../../lib/apiClient';
import { useAsync } from '../../lib/query';
import { EmptyState, ErrorState, LoadingState, PageHeader } from './ui';

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
  const [query, setQuery] = useState('');
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
    return rows.filter((row) => {
      const q = query.trim().toLowerCase();
      const qOk = !q || row.orderNumber.toLowerCase().includes(q) || row.customerName.toLowerCase().includes(q);
      const sOk = status === 'ALL' || row.status === status;
      return qOk && sOk;
    });
  }, [state.data, query, status]);

  return (
    <div className="deco-page">
      <PageHeader
        title="Orders"
        subtitle="Track customer orders, status, and updates."
        actions={<Link to="/app/orders/new" className="deco-btn-primary">New Order</Link>}
      />

      <div className="deco-panel">
        <div className="deco-panel-body flex flex-wrap gap-2">
          <input className="deco-input" placeholder="Search order # or customer" value={query} onChange={(e) => setQuery(e.target.value)} />
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
        <div className="deco-panel">
          <div className="deco-table-wrap">
            <table className="deco-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td className="font-semibold">{row.orderNumber}</td>
                    <td>{row.customerName}</td>
                    <td><span className="deco-badge">{row.status}</span></td>
                    <td>${row.total.toFixed(2)}</td>
                    <td>{new Date(row.updatedAt).toLocaleString()}</td>
                    <td><Link to={`/app/orders/${row.id}`} className="deco-btn">View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
