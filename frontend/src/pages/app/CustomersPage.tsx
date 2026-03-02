import React from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/api';
import { withFallback } from '../../lib/apiClient';
import { useAsync } from '../../lib/query';
import { EmptyState, ErrorState, LoadingState, PageHeader } from './ui';

type Row = {
  key: string;
  customerName: string;
  customerEmail: string;
  orders: number;
  total: number;
  latestOrderId?: string;
};

export default function AppCustomersPage() {
  const state = useAsync(async () => {
    return withFallback(
      async () => {
        const rows = await apiClient.listOrders();
        const list = Array.isArray(rows) ? rows : (rows?.orders || []);
        const byCustomer = new Map<string, Row>();
        for (const order of list as any[]) {
          const email = String(order.customerEmail || 'unknown@example.local').toLowerCase();
          const row = byCustomer.get(email) || {
            key: email,
            customerName: String(order.customerName || email),
            customerEmail: email,
            orders: 0,
            total: 0,
            latestOrderId: undefined,
          };
          row.orders += 1;
          row.total += Number(order.totalAmount || order.total || 0);
          row.latestOrderId = row.latestOrderId || String(order.id || '');
          byCustomer.set(email, row);
        }
        return [...byCustomer.values()].sort((a, b) => {
          if (b.total !== a.total) return b.total - a.total;
          return a.customerEmail.localeCompare(b.customerEmail);
        });
      },
      () => [],
      'customers.derived'
    );
  }, []);

  return (
    <div className="deco-page">
      <PageHeader title="Customers" subtitle="Customer CRM view with order history and value." />
      {state.loading ? <LoadingState title="Loading customers" /> : null}
      {!state.loading && state.error ? <ErrorState message={state.error} onRetry={state.refetch} /> : null}
      {!state.loading && !state.error && state.data && state.data.length === 0 ? (
        <EmptyState title="No customers yet" description="Customers appear as orders are created." />
      ) : null}
      {!state.loading && !state.error && state.data && state.data.length > 0 ? (
        <div className="deco-panel">
          <div className="deco-table-wrap">
            <table className="deco-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Email</th>
                  <th>Orders</th>
                  <th>Lifetime Value</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {state.data.map((row) => (
                  <tr key={row.key}>
                    <td className="font-semibold">{row.customerName}</td>
                    <td>{row.customerEmail}</td>
                    <td>{row.orders}</td>
                    <td>${row.total.toFixed(2)}</td>
                    <td>{row.latestOrderId ? <Link className="deco-btn" to={`/app/orders/${row.latestOrderId}`}>View latest order</Link> : '—'}</td>
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
