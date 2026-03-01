import React from 'react';
import { apiClient } from '../lib/api';

export default function NetworkReportsPage() {
  const [tenantId, setTenantId] = React.useState(() => localStorage.getItem('tenantId') || '');
  const [networkId, setNetworkId] = React.useState('');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');

  const [rules, setRules] = React.useState<any[]>([]);
  const [report, setReport] = React.useState<any>(null);
  const [message, setMessage] = React.useState('');

  const [ruleName, setRuleName] = React.useState('Default royalty');
  const [basis, setBasis] = React.useState<'REVENUE' | 'PROFIT' | 'DECORATION_ONLY'>('REVENUE');
  const [ratePercent, setRatePercent] = React.useState('5');
  const [flatCents, setFlatCents] = React.useState('0');

  const load = React.useCallback(async () => {
    if (!networkId.trim()) return;
    const [ruleRows, reportData] = await Promise.all([
      apiClient.listRoyaltyRules(networkId.trim(), tenantId || undefined),
      apiClient.getRoyaltyReport(networkId.trim(), tenantId || undefined, from || undefined, to || undefined),
    ]);
    setRules(Array.isArray(ruleRows) ? ruleRows : []);
    setReport(reportData || null);
  }, [networkId, tenantId, from, to]);

  React.useEffect(() => {
    load();
  }, [load]);

  const saveRule = async () => {
    if (!networkId.trim() || !ruleName.trim()) return;
    await apiClient.upsertRoyaltyRule(networkId.trim(), {
      tenantId: tenantId || undefined,
      name: ruleName.trim(),
      basis,
      ratePercent: Number(ratePercent || 0),
      flatCents: Number(flatCents || 0),
      enabled: true,
    });
    setMessage('Royalty rule saved');
    await load();
  };

  const exportCsv = async () => {
    if (!networkId.trim()) return;
    const blob = await apiClient.downloadRoyaltyReportCsv(networkId.trim(), tenantId || undefined, from || undefined, to || undefined);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `royalties-${networkId.trim()}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const rows = Array.isArray(report?.rows) ? report.rows : [];

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Network Royalties</h1>

      <div className="rounded border bg-white p-4 space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <input className="input-base" placeholder="tenantId" value={tenantId} onChange={(e) => setTenantId(e.target.value)} />
          <input className="input-base" placeholder="networkId" value={networkId} onChange={(e) => setNetworkId(e.target.value)} />
          <input className="input-base" placeholder="from (ISO)" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input className="input-base" placeholder="to (ISO)" value={to} onChange={(e) => setTo(e.target.value)} />
          <button className="btn btn-secondary" onClick={load}>Refresh</button>
        </div>
        {message && <div className="text-xs text-emerald-700">{message}</div>}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded border bg-white p-4 space-y-2">
          <div className="text-sm font-medium">Royalty Rule</div>
          <input className="input-base" placeholder="Rule name" value={ruleName} onChange={(e) => setRuleName(e.target.value)} />
          <select className="input-base" value={basis} onChange={(e) => setBasis(e.target.value as any)}>
            <option value="REVENUE">REVENUE</option>
            <option value="PROFIT">PROFIT</option>
            <option value="DECORATION_ONLY">DECORATION_ONLY</option>
          </select>
          <input className="input-base" placeholder="Rate percent" value={ratePercent} onChange={(e) => setRatePercent(e.target.value)} />
          <input className="input-base" placeholder="Flat cents" value={flatCents} onChange={(e) => setFlatCents(e.target.value)} />
          <button className="btn btn-primary" onClick={saveRule} disabled={!networkId.trim()}>Save Rule</button>
        </div>

        <div className="rounded border bg-white p-4 space-y-2">
          <div className="text-sm font-medium">Summary</div>
          <div className="text-sm">Revenue (cents): {report?.totals?.revenueCents || 0}</div>
          <div className="text-sm">Cost (cents): {report?.totals?.costCents || 0}</div>
          <div className="text-sm">Royalty (cents): {report?.totals?.royaltyCents || 0}</div>
          <button className="btn btn-secondary" onClick={exportCsv} disabled={!networkId.trim()}>Export CSV</button>
        </div>
      </div>

      <div className="rounded border bg-white p-4 space-y-2">
        <div className="text-sm font-medium">Rules</div>
        <div className="space-y-1 text-sm">
          {rules.map((rule) => (
            <div key={rule.id} className="border rounded p-2">
              <div className="font-medium">{rule.name}</div>
              <div className="text-xs text-slate-600">{rule.basis} • {rule.ratePercent || 0}% • +{rule.flatCents || 0} cents</div>
            </div>
          ))}
          {rules.length === 0 && <div className="text-xs text-slate-500">No royalty rules.</div>}
        </div>
      </div>

      <div className="rounded border bg-white p-4 space-y-2">
        <div className="text-sm font-medium">Ledger Entries</div>
        <div className="space-y-1 max-h-[420px] overflow-auto text-sm">
          {rows.map((row: any) => (
            <div key={row.id} className="border rounded p-2">
              <div className="font-medium">{row.order?.orderNumber || row.orderId}</div>
              <div className="text-xs text-slate-600">From {row.fromStore?.name || row.fromStoreId} → {row.toStore?.name || row.toStoreId}</div>
              <div className="text-xs">Revenue: {row.revenueCents} • Cost: {row.costCents} • Royalty: {row.royaltyCents} • {row.status}</div>
            </div>
          ))}
          {rows.length === 0 && <div className="text-xs text-slate-500">No royalty ledger rows.</div>}
        </div>
      </div>
    </div>
  );
}
