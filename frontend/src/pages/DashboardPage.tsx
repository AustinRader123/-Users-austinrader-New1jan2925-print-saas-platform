import React from 'react';

export default function DashboardPage() {
  const quickActions = [
    'New Order',
    'Import Products',
    'View Production Board',
    'Reports',
  ];

  const recentOrders = [
    { orderNo: 'SO-10492', customer: 'Atlas Youth League', status: 'In Production', total: '$1,284.00', updated: '5 min ago' },
    { orderNo: 'SO-10491', customer: 'North Ridge Booster Club', status: 'Pending Approval', total: '$842.60', updated: '18 min ago' },
    { orderNo: 'SO-10490', customer: 'City Print Collective', status: 'Ready to Ship', total: '$2,091.33', updated: '42 min ago' },
    { orderNo: 'SO-10489', customer: 'Evergreen Athletics', status: 'Awaiting Artwork', total: '$667.00', updated: '1 hr ago' },
    { orderNo: 'SO-10488', customer: 'Pioneer Spirit Store', status: 'Completed', total: '$3,412.10', updated: '2 hr ago' },
  ];

  const queueCounts = [
    { label: 'Queued', value: 12 },
    { label: 'Printing', value: 9 },
    { label: 'Finishing', value: 4 },
    { label: 'Ready to Ship', value: 7 },
  ];

  const queueList = [
    { run: 'Batch PB-2214', detail: '48 tees • North Ridge Booster Club' },
    { run: 'Batch PB-2215', detail: '22 hoodies • Atlas Youth League' },
    { run: 'Batch PB-2216', detail: '35 jerseys • Pioneer Spirit Store' },
  ];

  const alerts = [
    { title: 'Low inventory', detail: 'Black Tee (S, M) below reorder threshold.' },
    { title: 'Pending approvals', detail: '6 artwork proofs waiting on customer approval.' },
    { title: 'Webhook failures', detail: '2 webhook deliveries failed in the last 24h.' },
  ];

  return (
    <div className="space-y-3 p-3">
      <div className="deco-panel px-4 py-3">
        <h1 className="text-xl font-semibold tracking-tight">Admin Dashboard</h1>
        <p className="mt-1 text-xs text-slate-500">Operations overview for orders, production, and fulfillment</p>
      </div>

      <div className="deco-panel px-4 py-3">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Quick Actions</div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((action) => (
            <button
              key={action}
              type="button"
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              {action}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="deco-panel overflow-hidden lg:col-span-2">
          <div className="border-b border-slate-200 px-4 py-3">
            <div className="text-sm font-semibold">Recent Orders</div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-semibold">Order #</th>
                  <th className="px-4 py-2 font-semibold">Customer</th>
                  <th className="px-4 py-2 font-semibold">Status</th>
                  <th className="px-4 py-2 font-semibold">Total</th>
                  <th className="px-4 py-2 font-semibold">Updated</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.orderNo} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-medium text-slate-800">{order.orderNo}</td>
                    <td className="px-4 py-2 text-slate-700">{order.customer}</td>
                    <td className="px-4 py-2 text-slate-700">{order.status}</td>
                    <td className="px-4 py-2 text-slate-700">{order.total}</td>
                    <td className="px-4 py-2 text-slate-500">{order.updated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="deco-panel px-4 py-3">
          <div className="mb-3 text-sm font-semibold">Production Queue</div>
          <div className="mb-3 grid grid-cols-2 gap-2">
            {queueCounts.map((count) => (
              <div key={count.label} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="text-[11px] uppercase tracking-wide text-slate-500">{count.label}</div>
                <div className="text-lg font-semibold text-slate-800">{count.value}</div>
              </div>
            ))}
          </div>

          <div className="space-y-2 border-t border-slate-200 pt-3">
            {queueList.map((item) => (
              <div key={item.run} className="rounded-md border border-slate-200 bg-white px-3 py-2">
                <div className="text-sm font-medium text-slate-800">{item.run}</div>
                <div className="text-xs text-slate-500">{item.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="deco-panel px-4 py-3">
        <div className="mb-2 text-sm font-semibold">Alerts</div>
        <div className="grid gap-2 md:grid-cols-3">
          {alerts.map((alert) => (
            <div key={alert.title} className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
              <div className="text-sm font-semibold text-amber-900">{alert.title}</div>
              <div className="mt-1 text-xs text-amber-800">{alert.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
