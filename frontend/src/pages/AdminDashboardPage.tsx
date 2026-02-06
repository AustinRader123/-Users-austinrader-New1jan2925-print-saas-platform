import React from 'react';
import AdminLayout from '../components/layouts/AdminLayout';
import { Link } from 'react-router-dom';

export default function AdminDashboardPage() {
  return (
    <AdminLayout title="Dashboard">
      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Orders Today', value: '24' },
          { label: 'In Production', value: '68' },
          { label: 'Awaiting Artwork', value: '12' },
          { label: 'Vendors Connected', value: '7' },
          { label: 'Revenue MTD', value: '$42,310' },
        ].map((m) => (
          <div key={m.label} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="text-xs text-slate-500 mb-1">{m.label}</div>
            <div className="text-xl font-semibold">{m.value}</div>
          </div>
        ))}
      </div>

      {/* Sections */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kanban Preview */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Production Overview</h2>
            <Link to="/admin/production" className="text-sm text-blue-600 hover:underline">Open Board</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { status: 'Pending', count: 18 },
              { status: 'In Production', count: 42 },
              { status: 'Ready to Ship', count: 8 },
            ].map((c) => (
              <div key={c.status} className="rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-3">
                <div className="text-xs text-slate-500">{c.status}</div>
                <div className="text-2xl font-semibold">{c.count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-2">
            <Link to="/admin/vendors/import" className="px-3 py-2 rounded border hover:bg-slate-50 dark:hover:bg-slate-800">
              Import Vendor CSV
            </Link>
            <Link to="/admin/pricing-rules" className="px-3 py-2 rounded border hover:bg-slate-50 dark:hover:bg-slate-800">
              Configure Pricing Rules
            </Link>
            <Link to="/admin/pricing-simulator" className="px-3 py-2 rounded border hover:bg-slate-50 dark:hover:bg-slate-800">
              Run Pricing Simulator
            </Link>
            <Link to="/orders" className="px-3 py-2 rounded border hover:bg-slate-50 dark:hover:bg-slate-800">
              View Orders
            </Link>
          </div>
        </div>

        {/* Vendor Summary */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Vendor Summary</h2>
            <Link to="/admin/vendors" className="text-sm text-blue-600 hover:underline">Manage Vendors</Link>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Supplier Integrations</span><span className="font-medium">7</span></div>
            <div className="flex justify-between"><span>Catalog Items</span><span className="font-medium">12,430</span></div>
            <div className="flex justify-between"><span>Price Syncs (24h)</span><span className="font-medium">1,124</span></div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
