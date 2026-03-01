import React from 'react';
import { apiClient } from '../lib/api';

export default function DashboardNotificationsPage() {
  const [storeId, setStoreId] = React.useState(() => localStorage.getItem('storeId') || 'default');
  const [templates, setTemplates] = React.useState<any[]>([]);
  const [outbox, setOutbox] = React.useState<any[]>([]);
  const [key, setKey] = React.useState('invoice.sent');
  const [channel, setChannel] = React.useState<'EMAIL' | 'SMS'>('EMAIL');
  const [subject, setSubject] = React.useState('Invoice {{invoiceId}} is ready');
  const [body, setBody] = React.useState('Hi {{customerName}}, your invoice {{invoiceId}} total is {{totalAmount}}.');
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState('');

  const canQuery = Boolean(storeId.trim());

  const load = React.useCallback(async () => {
    if (!canQuery) return;
    const [tpl, box] = await Promise.all([
      apiClient.listNotificationTemplates(storeId.trim()),
      apiClient.listNotificationOutbox(storeId.trim(), 100),
    ]);
    setTemplates(Array.isArray(tpl) ? tpl : []);
    setOutbox(Array.isArray(box) ? box : []);
  }, [canQuery, storeId]);

  React.useEffect(() => {
    load().catch((err: any) => setError(err?.response?.data?.error || 'Failed to load notifications data'));
  }, [load]);

  const saveTemplate = async () => {
    if (!canQuery || !key.trim() || !body.trim()) return;
    await apiClient.upsertNotificationTemplate(key.trim(), {
      storeId: storeId.trim(),
      channel,
      subject: subject.trim() || undefined,
      body: body.trim(),
      isActive: true,
    });
    setMessage('Template saved');
    await load();
  };

  const processOutbox = async () => {
    await apiClient.processNotificationOutbox(100);
    setMessage('Outbox processed');
    await load();
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Notifications</h1>

      <div className="rounded border bg-white p-4 space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <input className="input-base" placeholder="storeId" value={storeId} onChange={(e) => setStoreId(e.target.value)} />
          <input className="input-base" placeholder="template key" value={key} onChange={(e) => setKey(e.target.value)} />
          <select className="input-base" value={channel} onChange={(e) => setChannel(e.target.value as 'EMAIL' | 'SMS')}>
            <option value="EMAIL">EMAIL</option>
            <option value="SMS">SMS</option>
          </select>
          <input className="input-base" placeholder="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <textarea className="input-base min-h-[90px]" placeholder="body" value={body} onChange={(e) => setBody(e.target.value)} />
        <div className="flex gap-2 text-xs">
          <button className="btn btn-secondary" onClick={() => saveTemplate().catch((err: any) => setError(err?.response?.data?.error || 'Failed to save template'))}>Save Template</button>
          <button className="btn btn-secondary" onClick={() => processOutbox().catch((err: any) => setError(err?.response?.data?.error || 'Failed to process outbox'))}>Process Outbox</button>
          <button className="btn btn-secondary" onClick={() => load().catch((err: any) => setError(err?.response?.data?.error || 'Failed to refresh'))}>Refresh</button>
          {message && <span className="text-emerald-700">{message}</span>}
          {error && <span className="text-rose-700">{error}</span>}
        </div>
      </div>

      <div className="rounded border bg-white p-3">
        <div className="text-sm font-semibold mb-2">Templates</div>
        <div className="overflow-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-left border-b">
                <th className="py-1 pr-2">Key</th>
                <th className="py-1 pr-2">Channel</th>
                <th className="py-1 pr-2">Subject</th>
                <th className="py-1 pr-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="py-1 pr-2">{row.key}</td>
                  <td className="py-1 pr-2">{row.channel}</td>
                  <td className="py-1 pr-2">{row.subject || '-'}</td>
                  <td className="py-1 pr-2">{row.isActive ? 'ACTIVE' : 'INACTIVE'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded border bg-white p-3">
        <div className="text-sm font-semibold mb-2">Outbox</div>
        <div className="overflow-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-left border-b">
                <th className="py-1 pr-2">Event</th>
                <th className="py-1 pr-2">Channel</th>
                <th className="py-1 pr-2">Status</th>
                <th className="py-1 pr-2">Attempts</th>
                <th className="py-1 pr-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {outbox.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="py-1 pr-2">{row.eventType}</td>
                  <td className="py-1 pr-2">{row.channel}</td>
                  <td className="py-1 pr-2">{row.status}</td>
                  <td className="py-1 pr-2">{row.attempts}</td>
                  <td className="py-1 pr-2">
                    <button
                      className="btn btn-secondary"
                      onClick={() => apiClient.retryNotificationOutbox(row.id).then(load).catch((err: any) => setError(err?.response?.data?.error || 'Failed to retry outbox item'))}
                    >
                      Retry
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
