import React from 'react';
import { apiClient } from '../lib/api';

export default function SettingsDomainsPage() {
  const [domains, setDomains] = React.useState<any[]>([]);
  const [hostname, setHostname] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const rows = await apiClient.listStoreDomains();
      setDomains(Array.isArray(rows) ? rows : []);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const createDomain = async () => {
    if (!hostname.trim()) return;
    await apiClient.createStoreDomain({ hostname: hostname.trim().toLowerCase() });
    setHostname('');
    await load();
  };

  const verifyDomain = async (id: string, token?: string) => {
    await apiClient.verifyStoreDomain(id, token, true);
    await load();
  };

  const disableDomain = async (id: string) => {
    await apiClient.disableStoreDomain(id);
    await load();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Stores & Branding</h1>

      <div className="rounded border bg-white p-4">
        <div className="text-sm font-medium mb-2">Add custom domain</div>
        <div className="flex gap-2">
          <input
            className="input-base"
            placeholder="shop.example.com"
            value={hostname}
            onChange={(e) => setHostname(e.target.value)}
          />
          <button className="btn btn-primary" onClick={createDomain} disabled={loading || !hostname.trim()}>
            Add Domain
          </button>
        </div>
      </div>

      <div className="rounded border bg-white divide-y">
        {domains.length === 0 && <div className="p-3 text-sm text-slate-500">No domains configured.</div>}
        {domains.map((domain) => (
          <div key={domain.id} className="p-3 text-sm flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <div className="font-medium">{domain.hostname}</div>
              <div className="text-slate-500">Status: {domain.status}</div>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-secondary" onClick={() => verifyDomain(domain.id, domain.verificationToken)}>
                Verify
              </button>
              <button className="btn" onClick={() => disableDomain(domain.id)}>
                Disable
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
