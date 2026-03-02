import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from './ui';

export default function AppOrderCreatePage() {
  const navigate = useNavigate();
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      navigate('/app/orders');
    }, 400);
  };

  return (
    <div className="deco-page">
      <PageHeader
        title="Create Order"
        subtitle="Capture a new order with customer details and notes."
        actions={<Link to="/app/orders" className="deco-btn">Back</Link>}
      />

      <form className="deco-panel" onSubmit={submit}>
        <div className="deco-panel-body grid gap-3 md:grid-cols-2">
          <label className="text-xs text-slate-600">Customer name<input className="deco-input mt-1 w-full" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required /></label>
          <label className="text-xs text-slate-600">Customer email<input className="deco-input mt-1 w-full" type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} required /></label>
          <label className="text-xs text-slate-600 md:col-span-2">Notes<textarea className="mt-1 w-full rounded border border-slate-300 p-2 text-sm" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
        </div>
        <div className="deco-panel-body border-t border-slate-200">
          <button className="deco-btn-primary" disabled={saving} type="submit">{saving ? 'Saving...' : 'Create Order'}</button>
        </div>
      </form>
    </div>
  );
}
