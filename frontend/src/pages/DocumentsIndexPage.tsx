import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Breadcrumbs from '../components/Breadcrumbs';
import { apiClient } from '../lib/api';

type DocType = 'QUOTE' | 'INVOICE' | 'PROOF' | 'WORK_ORDER';

export default function DocumentsIndexPage({
  type,
  title,
  ctaHref,
  ctaLabel,
}: {
  type: DocType;
  title: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  const [storeId, setStoreId] = useState('default');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiClient.listGeneratedDocuments(type, storeId);
      setRows(Array.isArray(data) ? data : []);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to load documents');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [type, storeId]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
      <div>
        <Breadcrumbs items={[{ to: '/app', label: 'Dashboard' }, { label: 'Documents' }, { label: title }]} />
        <h1 className="text-2xl font-semibold">{title}</h1>
      </div>

      <div className="rounded border bg-white p-3">
        <label className="text-xs text-slate-600 block mb-1">Store ID</label>
        <input className="input-base max-w-sm" value={storeId} onChange={(e) => setStoreId(e.target.value)} />
      </div>

      {loading && (
        <div className="rounded border bg-white p-4 space-y-2" aria-label="documents-loading">
          <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
          <div className="h-10 w-full animate-pulse rounded bg-slate-100" />
          <div className="h-10 w-full animate-pulse rounded bg-slate-100" />
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className="rounded border bg-white p-6 text-center">
          <p className="text-sm text-slate-600 mb-3">No {title.toLowerCase()} generated yet.</p>
          <Link className="btn btn-primary" to={ctaHref}>{ctaLabel}</Link>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="rounded border bg-white divide-y">
          {rows.map((row) => (
            <div key={row.id} className="p-3 text-sm flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div>
                <div className="font-medium">{row.refType} · {row.refId}</div>
                <div className="text-xs text-slate-600">{new Date(row.createdAt).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <a className="btn btn-secondary" href={row.file?.url} target="_blank" rel="noreferrer">Download</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
