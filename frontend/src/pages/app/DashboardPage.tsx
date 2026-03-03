import React from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from './ui';
import Card, { CardBody, CardHeader } from '../../ui/Card';

export default function AppDashboardPage() {
  const quickActions = [
    { label: 'Create reorder', to: '/app/purchasing' },
    { label: 'Upload data', to: '/app/products/import' },
    { label: 'Connect integration', to: '/app/integrations' },
    { label: 'Invite user', to: '/app/users-roles' },
    { label: 'View billing', to: '/app/billing' },
  ];

  const kpis = [
    { label: 'Forecast Accuracy', value: '92.1%', delta: '+1.4 pts vs last week' },
    { label: 'Stockout Risk', value: '47 SKUs', delta: '-8 high-risk today' },
    { label: 'Overstock Value', value: '$184k', delta: '-6.2% vs last month' },
    { label: 'Cash Tied Up', value: '$1.42M', delta: '-4.1% vs last month' },
    { label: 'On-Time Supplier Rate', value: '96.4%', delta: '+1.1% vs last week' },
  ];

  const trend = [24, 26, 21, 29, 34, 38, 36, 42, 39, 45, 47, 44];
  const maxTrend = Math.max(...trend);

  return (
    <div className="ops-page-grid">
      <PageHeader title="Home Dashboard" subtitle="Forecasting, inventory, replenishment, and execution performance in one operational overview." />

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
        <CardBody className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {quickActions.map((action) => (
            <Link key={action.label} to={action.to} className="ops-btn ops-btn-secondary justify-center">
              {action.label}
            </Link>
          ))}
        </CardBody>
      </Card>

      <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>Demand Trend (12 periods)</CardHeader>
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
          <CardHeader>Action Center</CardHeader>
          <CardBody className="space-y-2">
            {[
              'High stockout risk on 12 SKUs in West region',
              'Recommended reorder awaiting approval (3)',
              'Supplier ETA variance detected on PO-4431',
              'Forecast anomaly flagged for seasonal category',
            ].map((item) => (
              <div key={item} className="ops-activity-item">{item}</div>
            ))}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>Inventory Health Distribution</CardHeader>
          <CardBody className="space-y-2 text-sm text-slate-300">
            <p>Healthy: 68%</p>
            <p>At Risk: 21%</p>
            <p>Critical: 11%</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>Top Moving SKUs</CardHeader>
          <CardBody className="space-y-2 text-sm text-slate-300">
            <p>SKU-1002 • Velocity +18%</p>
            <p>SKU-3381 • Velocity +14%</p>
            <p>SKU-5520 • Velocity +12%</p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>Recent Activity</CardHeader>
        <CardBody className="p-0">
          <div className="deco-table-wrap">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Actor</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Import completed', 'Inventory CSV', 'Success', 'planner@skuflow.ai', '4m ago'],
                  ['Integration sync', 'Shopify', 'Success', 'System', '11m ago'],
                  ['Reorder approved', 'Purchasing', 'Completed', 'ops@skuflow.ai', '22m ago'],
                  ['Alert acknowledged', 'Action Center', 'Handled', 'analyst@skuflow.ai', '38m ago'],
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
