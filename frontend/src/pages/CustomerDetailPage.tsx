import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs';
import { getCustomer } from '../services/customers.service';
import Skeleton from '../components/Skeleton';
import ErrorState from '../components/ErrorState';

export default function CustomerDetailPage() {
  const { customerId } = useParams();
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await getCustomer(customerId as string);
        setCustomer(data);
      } catch (e: any) {
        setError(e?.response?.data?.error || 'Failed to load customer');
      } finally {
        setLoading(false);
      }
    })();
  }, [customerId]);

  if (loading) return <div className="p-4"><Skeleton rows={10} /></div>;
  if (error) return <div className="p-4"><ErrorState message={error} /></div>;

  return (
    <div className="p-4">
      <Breadcrumbs items={[{ to: '/app/customers', label: 'Customers' }, { label: customer?.name || customer?.email || 'Customer' }]} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 space-y-3">
          <div className="rounded border border-slate-200 bg-white p-3">
            <div className="text-xs font-medium mb-2">Profile</div>
            <div className="text-sm">{customer?.name || '—'}</div>
            <div className="text-xs text-slate-600">{customer?.email || '—'}</div>
            <div className="text-xs text-slate-600">{customer?.phone || '—'}</div>
          </div>
          <div className="rounded border border-slate-200 bg-white p-3">
            <div className="text-xs font-medium mb-2">Orders</div>
            <div className="space-y-1 text-xs">
              {(customer?.orders || []).map((o: any) => (
                <div key={o.id} className="flex items-center justify-between border-b py-1">
                  <div>Order {o.orderNumber || o.id}</div>
                  <div>${(o.totalAmount || 0).toFixed(2)}</div>
                </div>
              ))}
              {(!customer?.orders || customer.orders.length === 0) && <div className="text-slate-500">No orders.</div>}
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <div className="rounded border border-slate-200 bg-white p-3">
            <div className="text-xs font-medium mb-2">Notes</div>
            <textarea className="w-full h-32 rounded-sm border px-2 py-1 text-sm" placeholder="Add notes..." />
            <div className="mt-2"><button className="rounded-sm border px-2 py-1 text-xs">Save</button></div>
          </div>
        </div>
      </div>
    </div>
  );
}
