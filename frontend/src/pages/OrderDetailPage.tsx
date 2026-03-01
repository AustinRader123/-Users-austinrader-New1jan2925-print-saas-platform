import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs';
import StatusChip from '../components/StatusChip';
import Tabs from '../components/Tabs';
import Drawer from '../components/Drawer';
import Skeleton from '../components/Skeleton';
import ErrorState from '../components/ErrorState';
import { getOrder } from '../services/orders.service';
import { DropdownMenu } from '../ui/DropdownMenu';
import { apiClient } from '../lib/api';

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState('overview');
  const [notesOpen, setNotesOpen] = useState(false);

  const repriceOrder = async () => {
    if (!order?.id || !order?.storeId) return;
    const data = await apiClient.repriceOrder(order.id, order.storeId);
    setOrder(data);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await getOrder(orderId as string);
        setOrder(data);
      } catch (e: any) {
        setError(e?.response?.data?.error || 'Failed to load order');
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId]);

  if (loading) return <div className="p-4"><Skeleton rows={10} /></div>;
  if (error) return <div className="p-4"><ErrorState message={error} /></div>;
  if (!order) return <div className="p-4">Order not found</div>;

  const timeline = (order.timeline || [
    { label: 'Draft', at: order.createdAt },
    { label: 'Paid', at: order.paidAt },
    { label: 'In Production', at: order.productionStartedAt },
    { label: 'Ready', at: order.readyAt },
    { label: 'Shipped', at: order.shippedAt },
    { label: 'Completed', at: order.completedAt },
  ]).filter(Boolean);

  return (
    <div className="p-4">
      <Breadcrumbs items={[{ to: '/app/orders', label: 'Orders' }, { label: `Order ${order.orderNumber || order.id}` }]} />
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Order {order.orderNumber || order.id}</div>
          <div className="text-xs text-slate-600">Customer: {order.customer?.name || order.customerEmail || '—'}</div>
        </div>
        <div className="flex items-center gap-2">
          <StatusChip value={order.status || 'DRAFT'} />
          <DropdownMenu
            trigger={<span>Actions</span>}
            items={[
              { label: 'Production Notes', onSelect: () => setNotesOpen(true) },
              { label: 'Reprice Order', onSelect: repriceOrder },
              { label: 'Export', onSelect: () => {} },
              { label: 'Packing Slip', onSelect: () => {} },
            ]}
          />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 space-y-3">
          <div className="rounded border border-slate-200 bg-white p-3">
            <div className="text-xs font-medium mb-2">Status Timeline</div>
            <div className="flex items-center gap-3 text-xs">
              {timeline.map((t: any, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="rounded-sm border px-2 py-0.5">{t.label}</div>
                  {i < timeline.length - 1 && <span className="text-slate-400">→</span>}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded border border-slate-200 bg-white p-3">
            <div className="text-xs font-medium mb-2">Line Items</div>
            <div className="space-y-2">
              {(order.items || []).map((it: any) => (
                <div key={it.id} className="flex items-center gap-3 border-b pb-2">
                  {it.mockupUrl && <img src={it.mockupUrl} className="w-12 h-12 object-cover" />}
                  <div className="text-sm">
                    <div>{it.product?.name || it.productId}</div>
                    <div className="text-xs text-slate-600">Qty {it.quantity} • {it.variantId || '—'}</div>
                    {it.pricingSnapshot && (
                      <div className="text-xs text-slate-700">
                        Cost ${Number(it.pricingSnapshot?.total || it.totalPrice || 0).toFixed(2)} • Margin {Number(it.pricingSnapshot?.effectiveMarginPct || 0).toFixed(2)}% • Profit ${Number(it.pricingSnapshot?.projectedProfit || 0).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded border border-slate-200 bg-white p-3">
            <Tabs
              tabs={[
                { value: 'overview', label: 'Overview' },
                { value: 'artwork', label: 'Artwork' },
                { value: 'activity', label: 'Activity' },
              ]}
              value={tab}
              onChange={setTab}
            />
            <div className="mt-2 text-sm">
              {tab === 'overview' && (
                <div>
                  <div className="text-xs font-medium mb-2">Shipping</div>
                  <div className="text-xs text-slate-700">{order.shippingAddress || '—'}</div>
                </div>
              )}
              {tab === 'artwork' && (
                <div>
                  <div className="text-xs font-medium mb-2">Artwork Files & Approvals</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {(order.artwork || order.items || []).map((it: any, idx: number) => (
                      <div key={idx} className="rounded border p-2">
                        {it.mockupUrl ? (
                          <img src={it.mockupUrl} className="w-full h-24 object-cover" />
                        ) : (
                          <div className="text-xs text-slate-500">No artwork</div>
                        )}
                        <div className="mt-1 flex items-center gap-1">
                          <button className="rounded-sm border px-2 py-1 text-xs">Approve</button>
                          <button className="rounded-sm border px-2 py-1 text-xs">Reject</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {tab === 'activity' && (
                <div className="space-y-1 text-xs">
                  {(order.activity || []).map((a: any, i: number) => (
                    <div key={i} className="border-b py-1">{a.message}</div>
                  ))}
                  {(!order.activity || order.activity.length === 0) && <div className="text-slate-500">No activity yet.</div>}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded border border-slate-200 bg-white p-3">
            <div className="text-xs font-medium mb-2">Customer</div>
            <div className="text-sm">{order.customer?.name || order.customerEmail || '—'}</div>
            <div className="text-xs text-slate-600">{order.customer?.phone || '—'}</div>
          </div>
          <div className="rounded border border-slate-200 bg-white p-3">
            <div className="text-xs font-medium mb-2">Production Notes</div>
            <div className="text-xs text-slate-700">{order.productionNotes || '—'}</div>
          </div>
        </div>
      </div>

      <Drawer open={notesOpen} onClose={() => setNotesOpen(false)} title="Production Notes">
        <textarea className="w-full h-48 rounded-sm border border-slate-300 p-2 text-sm" placeholder="Add notes..." />
        <div className="mt-2 flex items-center gap-2">
          <button className="rounded-sm border px-2 py-1 text-xs">Save</button>
          <button className="rounded-sm border px-2 py-1 text-xs" onClick={() => setNotesOpen(false)}>Cancel</button>
        </div>
      </Drawer>
    </div>
  );
}
