import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api';
import { PageHeader } from './ui';

export default function AppQuoteCreatePage() {
  const navigate = useNavigate();
  const storeId = localStorage.getItem('storeId') || 'default';

  const [customerName, setCustomerName] = React.useState('');
  const [customerEmail, setCustomerEmail] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const quote = await apiClient.createQuote({ storeId, customerName, customerEmail, notes });
      navigate(`/app/quotes/${quote.id || quote.quoteId || ''}`);
    } catch (submitError: any) {
      setError(submitError?.message || 'Could not create quote');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="deco-page">
      <PageHeader
        title="Create Quote"
        subtitle="Capture customer details and draft a quote."
        actions={<Link to="/app/quotes" className="deco-btn">Back to Quotes</Link>}
      />

      <form className="deco-panel" onSubmit={submit}>
        <div className="deco-panel-body grid gap-3 md:grid-cols-2">
          <label className="text-xs text-slate-600">Customer name<input className="deco-input mt-1 w-full" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required /></label>
          <label className="text-xs text-slate-600">Customer email<input className="deco-input mt-1 w-full" type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} required /></label>
          <label className="text-xs text-slate-600 md:col-span-2">Notes<textarea className="mt-1 w-full rounded border border-slate-300 p-2 text-sm" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
        </div>
        <div className="deco-panel-body border-t border-slate-200">
          <button className="deco-btn-primary" disabled={saving} type="submit">{saving ? 'Saving...' : 'Create Quote'}</button>
          {error ? <div className="mt-2 text-xs text-red-600">{error}</div> : null}
        </div>
      </form>
    </div>
  );
}
