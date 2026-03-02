import React from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from './ui';

export default function AppDashboardPage() {
  const quickActions = [
    { label: 'New Order', to: '/app/orders/new' },
    { label: 'Import Products', to: '/app/products/import' },
    { label: 'Production Board', to: '/app/production/board' },
    { label: 'Reports', to: '/app/reports' },
  ];

  return (
    <div className="deco-page">
      <PageHeader title="Dashboard" subtitle="Operational summary across orders, production, inventory, and fulfillment." />

      <div className="deco-panel">
        <div className="deco-panel-head">Quick Actions</div>
        <div className="deco-panel-body grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((action) => (
            <Link key={action.label} to={action.to} className="deco-btn">
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
        <div className="deco-panel">
          <div className="deco-panel-head">Recent Orders Snapshot</div>
          <div className="deco-table-wrap">
            <table className="deco-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['SO-10602', 'Pioneer Spirit Store', 'Pending', '$1,120.44', '4m ago'],
                  ['SO-10601', 'Atlas Youth League', 'In Production', '$640.10', '11m ago'],
                  ['SO-10600', 'North Ridge Booster Club', 'Shipped', '$2,304.02', '22m ago'],
                  ['SO-10599', 'Metro Soccer Club', 'Proof Needed', '$551.43', '38m ago'],
                ].map((row) => (
                  <tr key={row[0]}>
                    <td className="font-semibold">{row[0]}</td>
                    <td>{row[1]}</td>
                    <td><span className="deco-badge">{row[2]}</span></td>
                    <td>{row[3]}</td>
                    <td>{row[4]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="deco-panel">
          <div className="deco-panel-head">Alerts</div>
          <div className="deco-panel-body space-y-2">
            {['Low inventory (3)', 'Pending approvals (6)', 'Webhook failures (1)'].map((item) => (
              <div key={item} className="rounded border border-slate-200 bg-slate-50 px-2 py-2 text-xs text-slate-700">{item}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
