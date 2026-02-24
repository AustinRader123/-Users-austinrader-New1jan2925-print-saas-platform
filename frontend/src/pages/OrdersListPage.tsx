import React, { useEffect, useState } from 'react';
import DataTable, { Column } from '../components/DataTable';
import StatusChip from '../components/StatusChip';
import ErrorState from '../components/ErrorState';
import Skeleton from '../components/Skeleton';
import { listOrders } from '../services/orders.service';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { DropdownMenu } from '../ui/DropdownMenu';

type OrderRow = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus?: string;
  customerName?: string;
  storeId?: string;
  totalAmount?: number;
  createdAt: string;
};

export default function OrdersListPage() {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [selection, setSelection] = useState<string[]>([]);
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const navigate = useNavigate();

  const columns: Column<OrderRow>[] = [
    { key: 'orderNumber', header: 'Order #', sortable: true, render: (r) => (
      <Link to={`/app/orders/${r.id}`} className="text-blue-600 hover:underline">{r.orderNumber}</Link>
    ) },
    { key: 'status', header: 'Status', sortable: true, render: (r) => <StatusChip value={r.status} /> },
    { key: 'paymentStatus', header: 'Payment', sortable: true },
    { key: 'customerName', header: 'Customer', sortable: true },
    { key: 'storeId', header: 'Store', sortable: true },
    { key: 'totalAmount', header: 'Total', sortable: true, render: (r) => `$${(r.totalAmount || 0).toFixed(2)}` },
    { key: 'createdAt', header: 'Created', sortable: true, render: (r) => new Date(r.createdAt).toLocaleString() },
  ];

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await listOrders();
        const normalized = (data || []).map((o: any) => ({
          id: String(o.id),
          orderNumber: o.orderNumber || o.id,
          status: o.status || 'DRAFT',
          paymentStatus: o.paymentStatus || 'PENDING',
          customerName: o.customer?.name || o.customerEmail || '—',
          storeId: o.storeId || 'default',
          totalAmount: o.totalAmount || 0,
          createdAt: o.createdAt || new Date().toISOString(),
        }));
        setRows(normalized);
      } catch (e: any) {
        setError(e?.response?.data?.error || 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    })();
  }, [page, sort]);

  const Filters = (
    <div className="flex items-center gap-2">
      <Select className="w-[140px]">
        <option>All Statuses</option>
        <option>Draft</option>
        <option>Paid</option>
        <option>In Production</option>
        <option>Ready</option>
        <option>Shipped</option>
      </Select>
      <Input type="date" />
      <Input type="date" />
      <Select className="w-[140px]">
        <option>All Stores</option>
      </Select>
      <Input placeholder="Customer" />
      <Select className="w-[140px]">
        <option>All Payments</option>
        <option>Paid</option>
        <option>Pending</option>
        <option>Failed</option>
      </Select>
      <button className="btn btn-secondary">Apply</button>
    </div>
  );

  const BulkToolbar = (
    <div className="flex items-center gap-2">
      <span>{selection.length} selected</span>
      <button className="rounded-sm border px-2 py-1">Change Status</button>
      <button className="rounded-sm border px-2 py-1">Export</button>
      <button className="rounded-sm border px-2 py-1">Print Packing Slip</button>
    </div>
  );

  return (
    <div className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold">Orders</div>
        <button className="rounded-sm border px-2 py-1 text-xs" onClick={() => navigate('/app/orders/new')}>Create Order</button>
      </div>
      {error && <ErrorState message={error} />}
      {loading ? (
        <Skeleton rows={8} />
      ) : (
        <DataTable<OrderRow>
          columns={columns}
          rows={rows}
          page={page}
          pageSize={20}
          total={rows.length}
          filters={Filters}
          bulkToolbar={selection.length > 0 ? BulkToolbar : undefined}
          onPageChange={setPage}
          onSortChange={(key, dir) => setSort({ key, dir })}
          sort={sort}
          onSelectionChange={setSelection}
          getRowId={(r) => r.id}
          stickyHeader
          rowActions={(r) => (
            <DropdownMenu
              trigger={<span>⋮</span>}
              items={[
                { label: 'View', onSelect: () => navigate(`/app/orders/${r.id}`) },
                { label: 'Edit', onSelect: () => navigate(`/app/orders/${r.id}?tab=summary`) },
                { label: 'Print', onSelect: () => {} },
                { label: 'Cancel', onSelect: () => {} },
              ]}
            />
          )}
        />
      )}
    </div>
  );
}
