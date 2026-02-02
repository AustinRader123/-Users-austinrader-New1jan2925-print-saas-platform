import React, { useEffect, useState } from 'react';
import { apiClient } from '../lib/api';
import DataTable from '../components/DataTable';
import { Link } from 'react-router-dom';

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const list = await apiClient.adminListVendors();
      setVendors(list);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const createVendor = async () => {
    try {
      setLoading(true);
      setError(null);
      setInfo(null);
      // Pre-check for existing vendor by name (case-insensitive)
      const existing = vendors.find(
        (v) => String(v.name || '').trim().toLowerCase() === name.trim().toLowerCase()
      );
      if (existing) {
        setInfo('Vendor already exists, using existing');
        setShowCreate(false);
        setName('');
        setEmail('');
        // Refresh list to ensure latest
        await load();
        return;
      }
      await apiClient.adminCreateVendor({ name, email });
      setShowCreate(false);
      setName('');
      setEmail('');
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-4">Vendors</h1>
      <div className="mb-3 flex items-center justify-between">
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>Create Vendor</button>
        {loading && <span className="text-sm">Loading…</span>}
      </div>
      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
      <DataTable
        columns={[
          { key: 'name', header: 'Name', sortable: true },
          { key: 'email', header: 'Email', sortable: true },
          { key: 'createdAt', header: 'Created', sortable: true, render: (v: any) => new Date(v.createdAt).toLocaleString() },
          { key: 'id', header: 'Actions', render: (v: any) => <Link className="btn btn-secondary" to={`/admin/vendors/${v.id}`}>Open</Link> },
        ]}
        data={vendors}
        initialSortKey="createdAt"
      />
      {info && <div className="text-green-600 text-sm mt-2">{info}</div>}

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="card p-4 w-[420px]">
            <div className="font-medium mb-2">Create Vendor</div>
            <div className="space-y-2">
              <input className="input-base" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
              <input className="input-base" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="mt-3 flex items-center gap-2 justify-end">
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={createVendor}>Create</button>
            </div>
            {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
            {info && <div className="text-green-600 text-sm mt-2">{info}</div>}
          </div>
        </div>
      )}
    </div>
  );
}