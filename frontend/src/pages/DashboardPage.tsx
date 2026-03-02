import React from 'react';

type OrderStatus = 'Pending' | 'In Production' | 'Shipped' | 'Proof Needed';

function statusClass(status: OrderStatus) {
  if (status === 'Pending') return 'pending';
  if (status === 'In Production') return 'production';
  if (status === 'Shipped') return 'shipped';
  return 'proof';
}

export default function DashboardPage() {
  const quickActions = [
    'New Order',
    'Import Products',
    'Production Board',
    'Reports',
  ];

  const recentOrders = [
    { orderNo: 'SO-10531', customer: 'Atlas Youth League', status: 'In Production' as OrderStatus, total: '$1,284.00', updated: '5m ago' },
    { orderNo: 'SO-10530', customer: 'North Ridge Booster Club', status: 'Pending' as OrderStatus, total: '$842.60', updated: '12m ago' },
    { orderNo: 'SO-10529', customer: 'City Print Collective', status: 'Shipped' as OrderStatus, total: '$2,091.33', updated: '18m ago' },
    { orderNo: 'SO-10528', customer: 'Evergreen Athletics', status: 'Proof Needed' as OrderStatus, total: '$667.00', updated: '24m ago' },
    { orderNo: 'SO-10527', customer: 'Pioneer Spirit Store', status: 'In Production' as OrderStatus, total: '$3,412.10', updated: '31m ago' },
    { orderNo: 'SO-10526', customer: 'Grandview Lions', status: 'Pending' as OrderStatus, total: '$1,106.42', updated: '43m ago' },
    { orderNo: 'SO-10525', customer: 'Metro Soccer Club', status: 'Proof Needed' as OrderStatus, total: '$558.24', updated: '58m ago' },
    { orderNo: 'SO-10524', customer: 'Summit PTA Store', status: 'Shipped' as OrderStatus, total: '$2,330.91', updated: '1h ago' },
  ];

  const queueCounts = [
    { label: 'WIP', value: 14 },
    { label: 'Needs Proof', value: 6 },
    { label: 'Ready to Print', value: 11 },
    { label: 'Shipped Today', value: 9 },
  ];

  const queueJobs = [
    { jobNo: 'JOB-8801', dueDate: 'Mar 03', status: 'In Production' as OrderStatus },
    { jobNo: 'JOB-8800', dueDate: 'Mar 03', status: 'Pending' as OrderStatus },
    { jobNo: 'JOB-8799', dueDate: 'Mar 04', status: 'Proof Needed' as OrderStatus },
    { jobNo: 'JOB-8798', dueDate: 'Mar 04', status: 'In Production' as OrderStatus },
    { jobNo: 'JOB-8797', dueDate: 'Mar 05', status: 'Shipped' as OrderStatus },
    { jobNo: 'JOB-8796', dueDate: 'Mar 05', status: 'In Production' as OrderStatus },
  ];

  const alerts = [
    { title: 'Low Inventory', count: 3, detail: 'Black Tee (S, M) and Navy Hoodie (L)' },
    { title: 'Pending Approvals', count: 6, detail: 'Proofs awaiting customer sign-off' },
    { title: 'Webhook Failures', count: 1, detail: 'Order sync failure for TeamStore checkout' },
  ];

  const activity = [
    '10:41 AM • SO-10531 moved to In Production',
    '10:33 AM • Proof approved by North Ridge Booster Club',
    '10:21 AM • Inventory adjustment posted for SKU-BLK-TS-M',
    '10:11 AM • New order SO-10530 imported from storefront',
    '10:05 AM • Shipping label generated for SO-10524',
    '9:54 AM • Payment captured for SO-10529',
    '9:40 AM • Webhook retry succeeded for order.created',
    '9:28 AM • Purchase order PO-221 opened for blanks',
    '9:12 AM • Production batch JOB-8799 created',
    '8:58 AM • User Austin updated pricing rule set',
  ];

  return (
    <div className="deco-page">
      <div className="deco-panel">
        <div className="deco-panel-body">
          <h1 className="text-lg font-semibold">Admin Portal</h1>
          <p className="mt-1 text-xs text-slate-500">Dense operations workspace for orders, production, and fulfillment</p>
        </div>
      </div>

      <div className="deco-panel">
        <div className="deco-panel-head">Quick Actions</div>
        <div className="deco-panel-body">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((action) => (
              <button key={action} type="button" className="deco-btn">
                {action}
              </button>
          ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
        <div className="deco-panel">
          <div className="deco-panel-head">Recent Orders</div>
          <div className="deco-table-wrap">
            <table className="deco-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Updated</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.orderNo}>
                    <td className="font-semibold">{order.orderNo}</td>
                    <td>{order.customer}</td>
                    <td>
                      <span className={`deco-badge ${statusClass(order.status)}`}>{order.status}</span>
                    </td>
                    <td>{order.total}</td>
                    <td className="text-slate-500">{order.updated}</td>
                    <td>
                      <button type="button" className="deco-btn">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="deco-panel">
          <div className="deco-panel-head">Production Queue</div>
          <div className="deco-panel-body">
            <div className="grid grid-cols-2 gap-2">
            {queueCounts.map((count) => (
                <div key={count.label} className="deco-kpi">
                  <div className="deco-kpi-label">{count.label}</div>
                  <div className="deco-kpi-value">{count.value}</div>
                </div>
              ))}
            </div>

            <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
              {queueJobs.map((job) => (
                <div key={job.jobNo} className="deco-panel-body rounded border border-slate-200 bg-slate-50">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-slate-800">{job.jobNo}</div>
                    <span className={`deco-badge ${statusClass(job.status)}`}>{job.status}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">Due: {job.dueDate}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="deco-panel">
          <div className="deco-panel-head">Alerts</div>
          <div className="deco-panel-body space-y-2">
            {alerts.map((alert) => (
              <div key={alert.title} className="rounded border border-amber-200 bg-amber-50 p-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-amber-900">{alert.title}</div>
                  <span className="deco-badge pending">{alert.count}</span>
                </div>
                <div className="mt-1 text-xs text-amber-800">{alert.detail}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="deco-panel">
          <div className="deco-panel-head">Activity Log</div>
          <div className="deco-panel-body space-y-1.5">
            {activity.map((entry) => (
              <div key={entry} className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700">
                {entry}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
