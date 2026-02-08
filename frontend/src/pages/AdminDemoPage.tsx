import React from 'react';
import clsx from 'clsx';

function cn(...args: any[]) {
  return clsx(args);
}

function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' }) {
  const variants: Record<string, string> = {
    default: 'bg-black/5 text-black border-black/10',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
  };
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', variants[variant])}>
      {children}
    </span>
  );
}

function Card({ children, className }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={cn('rounded-2xl border border-black/10 bg-white shadow-sm', className)}>{children}</div>;
}
function CardHeader({ children }: React.PropsWithChildren) {
  return <div className="px-4 py-3 border-b border-black/10">{children}</div>;
}
function CardContent({ children }: React.PropsWithChildren) {
  return <div className="px-4 py-3">{children}</div>;
}

function Page({ title, subtitle, right, children }: { title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle ? <p className="text-sm text-black/60 mt-1">{subtitle}</p> : null}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function Table({ columns, rows }: { columns: { key: string; header: string; render?: (row: any) => React.ReactNode }[]; rows: any[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-black/[0.03] text-left">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="px-4 py-3 font-medium text-black/70">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id ?? i} className="border-t border-black/10">
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-3">
                  {c.render ? c.render(r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const NAV = [
  { to: '/admin/demo', label: 'Dashboard' },
  { to: '/admin/demo/orders', label: 'Orders' },
  { to: '/admin/demo/products', label: 'Products (stub)' },
  { to: '/admin/demo/customers', label: 'Customers (stub)' },
  { to: '/admin/demo/settings', label: 'Settings (stub)' },
];

export default function AdminDemoPage() {
  const [collapsed, setCollapsed] = React.useState(false);

  const cards = [
    { label: "Today's Revenue", value: '$2,140' },
    { label: 'Orders in Production', value: '18' },
    { label: 'Pending Approvals', value: '6' },
    { label: 'Low Inventory Alerts', value: '3' },
  ];

  const rows = [
    { id: '1001', customer: 'Acme Co', total: '$145.00', status: 'Paid' },
    { id: '1002', customer: 'Sunset Gym', total: '$540.00', status: 'In Production' },
    { id: '1003', customer: 'North HS', total: '$1,240.00', status: 'Pending Approval' },
  ];

  const statusBadge = (status: string) => {
    if (status === 'Paid') return <Badge variant="success">Paid</Badge>;
    if (status === 'In Production') return <Badge variant="info">In Production</Badge>;
    if (status === 'Pending Approval') return <Badge variant="warning">Pending Approval</Badge>;
    return <Badge>{status}</Badge>;
  };

  return (
    <div className="h-full bg-black/[0.02] min-h-[calc(100vh-4rem)]">
      <div className="flex h-full">
        <aside className={cn('h-full border-r border-black/10 bg-white', collapsed ? 'w-[72px]' : 'w-[260px]')}>
          <div className="p-4">
            <div className="rounded-2xl bg-black text-white px-3 py-2 font-semibold">{collapsed ? 'SF' : 'SkuFlow'}</div>
          </div>

          <nav className="px-2">
            {NAV.map((item) => (
              <div key={item.to} className={cn('flex items-center justify-between rounded-xl px-3 py-2 text-sm', 'text-black/70 hover:bg-black/5')}>
                <span className={cn(collapsed ? 'hidden' : 'block')}>{item.label}</span>
                {collapsed ? <span className="text-xs font-semibold">{item.label[0]}</span> : null}
              </div>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-black/10 bg-white/80 backdrop-blur">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-2">
                <button onClick={() => setCollapsed((v) => !v)} className="rounded-xl border border-black/10 px-3 py-2 text-sm hover:bg-black/5">
                  Toggle
                </button>
                <div className="hidden md:block">
                  <input
                    placeholder="Search orders, customers, products..."
                    className="w-[420px] rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="rounded-xl border border-black/10 px-3 py-2 text-sm hover:bg-black/5">New Order</button>
                <a href="/logout" className="rounded-xl bg-black px-3 py-2 text-sm text-white hover:opacity-90">
                  Logout
                </a>
              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1">
            <Page title="Dashboard" subtitle="Overview of your stores and production flow">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {cards.map((c) => (
                  <div key={c.label}>
                    <Card>
                      <CardHeader>
                        <div className="text-sm text-black/60">{c.label}</div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-semibold">{c.value}</div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-3">
                <Card className="xl:col-span-2">
                  <CardHeader>
                    <div className="font-medium">Revenue Trend</div>
                    <div className="text-sm text-black/60">Placeholder chart block</div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[240px] rounded-xl bg-black/[0.03]" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="font-medium">Production Breakdown</div>
                    <div className="text-sm text-black/60">Placeholder chart block</div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[240px] rounded-xl bg-black/[0.03]" />
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6">
                <Table
                  columns={[
                    { key: 'id', header: 'Order #' },
                    { key: 'customer', header: 'Customer' },
                    { key: 'total', header: 'Total' },
                    { key: 'status', header: 'Status', render: (r) => statusBadge(r.status) },
                  ]}
                  rows={rows}
                />
              </div>
            </Page>
          </main>
        </div>
      </div>
    </div>
  );
}
