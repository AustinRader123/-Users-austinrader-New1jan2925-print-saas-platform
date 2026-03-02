import React from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from './ui';
import Card, { CardBody, CardHeader } from '../../ui/Card';

export default function AppDashboardPage() {
  const quickActions = [
    { label: 'New Order', to: '/app/orders/new' },
    { label: 'Import Products', to: '/app/products/import' },
    { label: 'Production Board', to: '/app/production/board' },
    { label: 'Reports', to: '/app/reports' },
  ];

  const kpis = [
    { label: 'Open Orders', value: '184', delta: '+12 today' },
    { label: 'Quotes Pending', value: '37', delta: '+4 today' },
    { label: 'Jobs in Production', value: '52', delta: '8 blocked' },
    { label: 'On-time Shipments', value: '96.4%', delta: '+1.1% vs last week' },
  ];

  const trend = [24, 26, 21, 29, 34, 38, 36, 42, 39, 45, 47, 44];
  const maxTrend = Math.max(...trend);

  return (
    <div className="ops-page-grid">
      <PageHeader title="Dashboard" subtitle="Operational summary across orders, production, inventory, and fulfillment." />

      <section className="ops-kpi-grid">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardBody className="ops-kpi-card">
              <span className="ops-kpi-label">{kpi.label}</span>
              <strong className="ops-kpi-value">{kpi.value}</strong>
              <span className="ops-kpi-delta">{kpi.delta}</span>
            </CardBody>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>Quick Actions</CardHeader>
        <CardBody className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((action) => (
            <Link key={action.label} to={action.to} className="ops-btn ops-btn-secondary justify-center">
              {action.label}
            </Link>
          ))}
        </CardBody>
      </Card>

      <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>Order Throughput (12h)</CardHeader>
          <CardBody>
            <div className="ops-mini-chart" aria-label="Order throughput chart">
              {trend.map((point, index) => (
                <div key={index} className="ops-mini-chart-col">
                  <div style={{ height: `${Math.max(12, (point / maxTrend) * 100)}%` }} className="ops-mini-chart-bar" />
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>Activity Feed</CardHeader>
          <CardBody className="space-y-2">
            {[
              'SO-10602 moved to Production',
              'Quote Q-101 approved',
              'Webhook retry requeued (2)',
              'Inventory batch rec-884 consumed',
            ].map((item) => (
              <div key={item} className="ops-activity-item">{item}</div>
            ))}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>Recent Orders Snapshot</CardHeader>
        <CardBody className="p-0">
          <div className="deco-table-wrap">
            <table className="ops-table">
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
                    <td><span className="ops-badge">{row[2]}</span></td>
                    <td>{row[3]}</td>
                    <td>{row[4]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
