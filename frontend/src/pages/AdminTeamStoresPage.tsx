import React from 'react';
import { apiClient } from '../lib/api';

export default function AdminTeamStoresPage() {
  const storeId = 'default';
  const [rows, setRows] = React.useState<any[]>([]);
  const [name, setName] = React.useState('');
  const [slug, setSlug] = React.useState('');

  const load = React.useCallback(async () => {
    const data = await apiClient.listTeamStores(storeId);
    setRows(data || []);
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!name || !slug) return;
    await apiClient.createTeamStore({ storeId, name, slug });
    setName('');
    setSlug('');
    await load();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Team Stores</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <input className="input-base" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input-base" placeholder="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
        <button className="btn btn-primary" onClick={create}>Create Team Store</button>
      </div>
      <div className="rounded border bg-white divide-y">
        {rows.map((row) => (
          <div key={row.id} className="p-3 text-sm flex justify-between">
            <span>{row.name} ({row.slug})</span>
            <span className="text-slate-500">{row.status || 'ACTIVE'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
