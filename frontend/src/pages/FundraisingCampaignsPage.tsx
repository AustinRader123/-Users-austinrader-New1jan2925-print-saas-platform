import React from 'react';
import { apiClient } from '../lib/api';

export default function FundraisingCampaignsPage() {
  const [tenantId, setTenantId] = React.useState(() => localStorage.getItem('tenantId') || '');
  const [storeId, setStoreId] = React.useState('');
  const [campaigns, setCampaigns] = React.useState<any[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = React.useState('');
  const [campaignDetail, setCampaignDetail] = React.useState<any>(null);
  const [summary, setSummary] = React.useState<any>(null);
  const [ledger, setLedger] = React.useState<any[]>([]);
  const [runs, setRuns] = React.useState<any[]>([]);
  const [message, setMessage] = React.useState('');

  const [name, setName] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [shippingMode, setShippingMode] = React.useState<'DIRECT' | 'CONSOLIDATED'>('DIRECT');
  const [allowSplitShip, setAllowSplitShip] = React.useState(true);
  const [fundraiserPercent, setFundraiserPercent] = React.useState('10');
  const [goalCents, setGoalCents] = React.useState('100000');

  const [overrideProductId, setOverrideProductId] = React.useState('');
  const [overridePrice, setOverridePrice] = React.useState('');
  const [overridePercent, setOverridePercent] = React.useState('');

  const [teamStoreId, setTeamStoreId] = React.useState('');
  const [memberName, setMemberName] = React.useState('');
  const [memberCode, setMemberCode] = React.useState('');

  const canQuery = Boolean(tenantId.trim());

  const loadCampaigns = React.useCallback(async () => {
    if (!canQuery) return;
    const rows = await apiClient.listFundraisingCampaigns({ tenantId: tenantId.trim(), ...(storeId ? { storeId } : {}) });
    const list = Array.isArray(rows) ? rows : [];
    setCampaigns(list);
    if (!selectedCampaignId && list[0]?.id) setSelectedCampaignId(String(list[0].id));
  }, [canQuery, selectedCampaignId, storeId, tenantId]);

  const loadSelected = React.useCallback(async () => {
    if (!canQuery || !selectedCampaignId) return;
    const [detail, summaryData, ledgerRows, runRows] = await Promise.all([
      apiClient.getFundraisingCampaign(selectedCampaignId, tenantId.trim()),
      apiClient.getFundraisingSummary(selectedCampaignId, tenantId.trim()),
      apiClient.listFundraisingLedger(selectedCampaignId, tenantId.trim()),
      apiClient.listFundraisingConsolidationRuns(selectedCampaignId, tenantId.trim()),
    ]);

    setCampaignDetail(detail || null);
    setSummary(summaryData || null);
    setLedger(Array.isArray(ledgerRows) ? ledgerRows : []);
    setRuns(Array.isArray(runRows) ? runRows : []);
  }, [canQuery, selectedCampaignId, tenantId]);

  React.useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  React.useEffect(() => {
    loadSelected();
  }, [loadSelected]);

  const createCampaign = async () => {
    if (!tenantId.trim() || !storeId.trim() || !name.trim() || !slug.trim()) return;
    await apiClient.createFundraisingCampaign({
      tenantId: tenantId.trim(),
      storeId: storeId.trim(),
      name: name.trim(),
      slug: slug.trim(),
      shippingMode,
      allowSplitShip,
      defaultFundraiserPercent: Number(fundraiserPercent || 0),
      fundraisingGoalCents: Number(goalCents || 0),
      status: 'ACTIVE',
    });
    setName('');
    setSlug('');
    setMessage('Campaign created');
    await loadCampaigns();
  };

  const saveOverride = async () => {
    if (!selectedCampaignId || !tenantId.trim() || !overrideProductId.trim()) return;
    await apiClient.saveFundraisingCatalogOverride(selectedCampaignId, tenantId.trim(), {
      productId: overrideProductId.trim(),
      overridePrice: overridePrice ? Number(overridePrice) : undefined,
      overrideFundraiserPercent: overridePercent ? Number(overridePercent) : undefined,
      active: true,
    });
    setOverrideProductId('');
    setOverridePrice('');
    setOverridePercent('');
    setMessage('Catalog override saved');
    await loadSelected();
  };

  const linkTeamStore = async () => {
    if (!selectedCampaignId || !tenantId.trim() || !teamStoreId.trim()) return;
    await apiClient.linkFundraisingTeamStore(selectedCampaignId, tenantId.trim(), teamStoreId.trim());
    setTeamStoreId('');
    setMessage('Team store linked');
    await loadSelected();
  };

  const addMember = async () => {
    if (!selectedCampaignId || !tenantId.trim() || !memberName.trim()) return;
    await apiClient.saveFundraisingMember(selectedCampaignId, tenantId.trim(), {
      displayName: memberName.trim(),
      publicCode: memberCode.trim() || undefined,
      isActive: true,
    });
    setMemberName('');
    setMemberCode('');
    setMessage('Member saved');
    await loadSelected();
  };

  const runConsolidation = async () => {
    if (!selectedCampaignId || !tenantId.trim()) return;
    await apiClient.createFundraisingConsolidationRun(selectedCampaignId, tenantId.trim(), `manual-${Date.now()}`);
    setMessage('Consolidation run created');
    await loadSelected();
  };

  const exportLedger = async () => {
    if (!selectedCampaignId || !tenantId.trim()) return;
    const blob = await apiClient.downloadFundraisingLedgerCsv(selectedCampaignId, tenantId.trim());
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `fundraiser-ledger-${selectedCampaignId}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const approveEntry = async (entryId: string) => {
    if (!tenantId.trim()) return;
    await apiClient.approveFundraisingLedgerEntry(entryId, tenantId.trim());
    setMessage('Entry approved');
    await loadSelected();
  };

  const payEntry = async (entryId: string) => {
    if (!tenantId.trim()) return;
    await apiClient.payFundraisingLedgerEntry(entryId, tenantId.trim());
    setMessage('Entry marked paid');
    await loadSelected();
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Fundraising Campaigns</h1>

      <div className="rounded border bg-white p-4 space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input className="input-base" placeholder="tenantId" value={tenantId} onChange={(e) => setTenantId(e.target.value)} />
          <input className="input-base" placeholder="storeId" value={storeId} onChange={(e) => setStoreId(e.target.value)} />
          <select className="input-base" value={selectedCampaignId} onChange={(e) => setSelectedCampaignId(e.target.value)}>
            <option value="">Select campaign</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
            ))}
          </select>
          <button className="btn btn-secondary" onClick={() => { loadCampaigns(); loadSelected(); }}>Refresh</button>
        </div>
        {message && <div className="text-xs text-emerald-700">{message}</div>}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded border bg-white p-4 space-y-2">
          <div className="text-sm font-medium">Create Campaign</div>
          <input className="input-base" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input-base" placeholder="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
          <select className="input-base" value={shippingMode} onChange={(e) => setShippingMode(e.target.value as any)}>
            <option value="DIRECT">DIRECT</option>
            <option value="CONSOLIDATED">CONSOLIDATED</option>
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={allowSplitShip} onChange={(e) => setAllowSplitShip(e.target.checked)} />
            Allow split shipping
          </label>
          <input className="input-base" placeholder="Fundraiser %" value={fundraiserPercent} onChange={(e) => setFundraiserPercent(e.target.value)} />
          <input className="input-base" placeholder="Goal cents" value={goalCents} onChange={(e) => setGoalCents(e.target.value)} />
          <button className="btn btn-primary" onClick={createCampaign}>Create Campaign</button>
        </div>

        <div className="rounded border bg-white p-4 space-y-2">
          <div className="text-sm font-medium">Summary</div>
          <div className="text-sm">Campaign: {campaignDetail?.campaign?.name || '—'}</div>
          <div className="text-sm">Shipping: {campaignDetail?.campaign?.shippingMode || '—'}</div>
          <div className="text-sm">Orders: {summary?.orderCount || 0}</div>
          <div className="text-sm">Gross (cents): {summary?.grossSalesCents || 0}</div>
          <div className="text-sm">Raised (cents): {summary?.raisedCents || 0}</div>
          <div className="text-sm">Paid (cents): {summary?.paidCents || 0}</div>
          <div className="text-sm">Unpaid (cents): {summary?.unpaidCents || 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="rounded border bg-white p-4 space-y-2">
          <div className="text-sm font-medium">Catalog Override</div>
          <input className="input-base" placeholder="Product ID" value={overrideProductId} onChange={(e) => setOverrideProductId(e.target.value)} />
          <input className="input-base" placeholder="Override price" value={overridePrice} onChange={(e) => setOverridePrice(e.target.value)} />
          <input className="input-base" placeholder="Override fundraiser %" value={overridePercent} onChange={(e) => setOverridePercent(e.target.value)} />
          <button className="btn btn-secondary" onClick={saveOverride} disabled={!selectedCampaignId}>Save Override</button>
        </div>

        <div className="rounded border bg-white p-4 space-y-2">
          <div className="text-sm font-medium">Team Stores</div>
          <input className="input-base" placeholder="Team store ID" value={teamStoreId} onChange={(e) => setTeamStoreId(e.target.value)} />
          <button className="btn btn-secondary" onClick={linkTeamStore} disabled={!selectedCampaignId}>Link Team Store</button>
          <div className="space-y-1 text-xs text-slate-600">
            {(campaignDetail?.campaign?.teamStoreLinks || []).map((link: any) => (
              <div key={link.id}>{link.teamStore?.name || link.teamStoreId}</div>
            ))}
          </div>
        </div>

        <div className="rounded border bg-white p-4 space-y-2">
          <div className="text-sm font-medium">Members</div>
          <input className="input-base" placeholder="Display name" value={memberName} onChange={(e) => setMemberName(e.target.value)} />
          <input className="input-base" placeholder="Public code" value={memberCode} onChange={(e) => setMemberCode(e.target.value)} />
          <button className="btn btn-secondary" onClick={addMember} disabled={!selectedCampaignId}>Add Member</button>
          <div className="space-y-1 text-xs text-slate-600 max-h-28 overflow-auto">
            {(campaignDetail?.campaign?.members || []).map((member: any) => (
              <div key={member.id}>{member.displayName} {member.publicCode ? `(${member.publicCode})` : ''}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded border bg-white p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Consolidation Runs</div>
          <button className="btn btn-secondary" onClick={runConsolidation} disabled={!selectedCampaignId}>Create Run</button>
        </div>
        <div className="space-y-1 max-h-44 overflow-auto text-xs text-slate-700">
          {runs.map((run) => (
            <div key={run.id} className="border rounded p-2">
              <div>{run.id} • {run.status}</div>
              <div>Orders: {(run.lines || []).length}</div>
            </div>
          ))}
          {runs.length === 0 && <div className="text-slate-500">No consolidation runs.</div>}
        </div>
      </div>

      <div className="rounded border bg-white p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Payout Ledger</div>
          <button className="btn btn-secondary" onClick={exportLedger} disabled={!selectedCampaignId}>Export CSV</button>
        </div>
        <div className="space-y-1 max-h-[420px] overflow-auto text-sm">
          {ledger.map((entry: any) => (
            <div key={entry.id} className="border rounded p-2 flex items-center justify-between gap-2">
              <div>
                <div className="font-medium">{entry.member?.displayName || entry.memberId || 'Unassigned'}</div>
                <div className="text-xs text-slate-600">{entry.kind} • {entry.direction} • {entry.status} • {entry.amountCents} cents</div>
                <div className="text-xs text-slate-500">Order: {entry.order?.orderNumber || entry.orderId || 'n/a'}</div>
              </div>
              <div className="flex items-center gap-2">
                {entry.status !== 'APPROVED' && entry.status !== 'PAID' && <button className="btn btn-secondary" onClick={() => approveEntry(entry.id)}>Approve</button>}
                {entry.status !== 'PAID' && <button className="btn btn-secondary" onClick={() => payEntry(entry.id)}>Mark Paid</button>}
              </div>
            </div>
          ))}
          {ledger.length === 0 && <div className="text-xs text-slate-500">No ledger entries.</div>}
        </div>
      </div>
    </div>
  );
}
