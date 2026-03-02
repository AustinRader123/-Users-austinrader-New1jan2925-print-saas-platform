export default function DashboardPage() {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Operations Dashboard</h2>
      <div className="grid grid-cols-4 gap-4">
        {['Revenue', 'Open Quotes', 'Production Jobs', 'Low Stock'].map((kpi) => (
          <div key={kpi} className="rounded border bg-white p-4">
            <div className="text-xs text-slate-500">{kpi}</div>
            <div className="mt-1 text-lg font-semibold">--</div>
          </div>
        ))}
      </div>
    </section>
  );
}
