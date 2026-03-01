import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiClient } from '../lib/api';
import Breadcrumbs from '../components/Breadcrumbs';

export default function CommunicationsPage() {
  const [storeId, setStoreId] = useState('default');
  const [provider, setProvider] = useState<'MOCK' | 'SMTP' | 'SENDGRID'>('MOCK');
  const [fromName, setFromName] = useState('SkuFlow');
  const [fromEmail, setFromEmail] = useState('noreply@skuflow.local');
  const [replyTo, setReplyTo] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [config, messageLogs] = await Promise.all([
        apiClient.getEmailConfig(),
        apiClient.getCommunicationLogs(storeId),
      ]);
      if (config) {
        setProvider(config.provider || 'MOCK');
        setFromName(config.fromName || 'SkuFlow');
        setFromEmail(config.fromEmail || 'noreply@skuflow.local');
        setReplyTo(config.replyTo || '');
        setEnabled(Boolean(config.enabled));
      }
      setLogs(messageLogs || []);
    } catch (error) {
      toast.error((error as Error).message || 'Failed to load communications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [storeId]);

  const save = async () => {
    try {
      await apiClient.updateEmailConfig({ provider, fromName, fromEmail, replyTo: replyTo || null, enabled, config: {} });
      toast.success('Email settings saved');
      await load();
    } catch (error) {
      toast.error((error as Error).message || 'Failed to save email settings');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      <Breadcrumbs items={[{ to: '/app', label: 'Dashboard' }, { label: 'Communications' }]} />
      <h1 className="text-2xl font-semibold mb-4">Communications</h1>

      {loading && (
        <div className="rounded border bg-white p-4 space-y-2" aria-label="communications-loading">
          <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
          <div className="h-10 w-full animate-pulse rounded bg-slate-100" />
          <div className="h-10 w-full animate-pulse rounded bg-slate-100" />
        </div>
      )}

      {!loading && !enabled && (
        <div className="rounded border bg-white p-4">
          <p className="text-sm text-slate-600 mb-2">Email provider is disabled. Enable it to send proofs, quotes, and invoices.</p>
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={save}>Enable email provider</button>
            <button className="btn btn-secondary" onClick={load}>View logs</button>
          </div>
        </div>
      )}

      <div className="border rounded p-4 bg-white mb-4">
        <h2 className="font-medium mb-3">Email Provider Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input className="input-base" value={storeId} onChange={(e) => setStoreId(e.target.value)} placeholder="Store ID" />
          <select className="input-base" value={provider} onChange={(e) => setProvider(e.target.value as any)}>
            <option value="MOCK">MOCK</option>
            <option value="SMTP">SMTP</option>
            <option value="SENDGRID">SENDGRID</option>
          </select>
          <label className="text-sm flex items-center gap-2 border rounded px-3 py-2 bg-white">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Enabled
          </label>
          <input className="input-base" value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="From Name" />
          <input className="input-base" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="From Email" />
          <input className="input-base" value={replyTo} onChange={(e) => setReplyTo(e.target.value)} placeholder="Reply-To" />
        </div>
        <button className="btn btn-primary mt-3" onClick={save}>Save Email Config</button>
      </div>

      <div className="border rounded p-4 bg-white">
        <h2 className="font-medium mb-3">Recent Communication Log</h2>
        <div className="space-y-2 text-sm">
          {logs.map((log) => (
            <div key={log.id} className="border rounded p-2">
              <div className="font-medium">{log.type} • {log.status}</div>
              <div>{log.toEmail} • {log.subject}</div>
              <div className="text-xs text-slate-600">{new Date(log.createdAt).toLocaleString()}</div>
            </div>
          ))}
          {logs.length === 0 && <div className="text-sm text-slate-600">No logs yet.</div>}
        </div>
      </div>
    </div>
  );
}
