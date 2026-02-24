import React from 'react';
import { motion } from 'framer-motion';

function Card({ children, className = '' }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={`rounded-2xl border border-black/10 bg-white shadow-sm ${className}`}>{children}</div>;
}
function CardHeader({ children }: React.PropsWithChildren) {
  return <div className="px-4 py-3 border-b border-black/10">{children}</div>;
}
function CardContent({ children }: React.PropsWithChildren) {
  return <div className="px-4 py-3">{children}</div>;
}

function Page({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="p-5">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="text-sm text-black/60 mt-1">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const cards = [
    { label: "Today's Revenue", value: '$2,140' },
    { label: 'Orders in Production', value: '18' },
    { label: 'Pending Approvals', value: '6' },
    { label: 'Low Inventory Alerts', value: '3' },
  ];

  return (
    <Page title="Dashboard" subtitle="Overview of your stores and production flow">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <div className="text-sm text-black/60">{c.label}</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{c.value}</div>
              </CardContent>
            </Card>
          </motion.div>
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
    </Page>
  );
}
