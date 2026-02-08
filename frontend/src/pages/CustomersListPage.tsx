import React, { useEffect, useState } from 'react';
import DataTable, { Column } from '../components/DataTable';
import { listCustomers } from '../services/customers.service';
import { useNavigate } from 'react-router-dom';

type CustomerRow = { id: string; name: string; email?: string; phone?: string; orders?: number };

export default function CustomersListPage() {
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const navigate = useNavigate();

  const columns: Column<CustomerRow>[] = [
    { key: 'name', header: 'Customer', sortable: true, render: (r) => (
      <button className="text-blue-600 hover:underline" onClick={() => navigate(`/app/customers/${r.id}`)}>{r.name}</button>
    ) },
    { key: 'email', header: 'Email', sortable: true },
    { key: 'phone', header: 'Phone', sortable: true },
    { key: 'orders', header: 'Orders', sortable: true },
  ];

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await listCustomers({ take: 50 });
        const normalized = (data || []).map((c: any) => ({
          id: String(c.id || c.customerId || Math.random()),
          name: c.name || c.email || 'Customer',
          email: c.email || '—',
          phone: c.phone || '—',
          orders: c.ordersCount || (Array.isArray(c.orders) ? c.orders.length : 0),
        }));
        setRows(normalized);
      } catch (e: any) {
        setError(e?.response?.data?.error || 'Failed to load customers');
      } finally {
        setLoading(false);
      }
    })();
  }, [page, sort]);

  return (
    <div className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold">Customers</div>
        <button className="rounded-sm border px-2 py-1 text-xs">Add Customer</button>
      </div>
      <DataTable<CustomerRow>
        columns={columns}
        rows={rows}
        page={page}
        pageSize={20}
        total={rows.length}
        onPageChange={setPage}
        onSortChange={(key, dir) => setSort({ key, dir })}
        sort={sort}
        getRowId={(r) => r.id}
      />
    </div>
  );
}
