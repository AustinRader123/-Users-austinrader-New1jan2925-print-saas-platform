import React from 'react';
import { apiClient } from '../lib/api';

const PLAN_CODES: Array<'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE'> = ['FREE', 'STARTER', 'PRO', 'ENTERPRISE'];

export default function SettingsBillingPage() {
  const [snapshot, setSnapshot] = React.useState<any>(null);
  const [events, setEvents] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [busyPlan, setBusyPlan] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [snap, ev] = await Promise.all([
        apiClient.getBillingSnapshot(),
        apiClient.listBillingEvents(),
      ]);
      setSnapshot(snap || null);
      setEvents(Array.isArray(ev) ? ev : []);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const changePlan = async (planCode: 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE') => {
    setBusyPlan(planCode);
    try {
      await apiClient.createBillingCheckout(planCode);
      await load();
    } finally {
      setBusyPlan(null);
    }
  };

  const cancel = async () => {
    setBusyPlan('CANCEL');
    try {
      await apiClient.cancelBillingSubscription();
      await load();
    } finally {
      setBusyPlan(null);
    }
  };

  const currentPlan = snapshot?.subscription?.planCode || 'UNKNOWN';
  const usage = snapshot?.gate?.usage || {};
  const limits = snapshot?.gate?.limits || {};

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Billing</h1>

      <div className="rounded border bg-white p-4 text-sm">
        <div className="font-medium">Current plan: {currentPlan}</div>
        <div className="mt-2 text-slate-600">Status: {snapshot?.subscription?.status || 'UNKNOWN'}</div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
          <div className="rounded border p-2">Stores: {usage.stores ?? 0} / {limits.maxStores ?? '-'}</div>
          <div className="rounded border p-2">Users: {usage.users ?? 0} / {limits.maxUsers ?? '-'}</div>
          <div className="rounded border p-2">Monthly orders: {usage.monthlyOrders ?? 0} / {limits.maxMonthlyOrders ?? '-'}</div>
        </div>
      </div>

      <div className="rounded border bg-white p-4">
        <div className="text-sm font-medium mb-3">Plans</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {PLAN_CODES.map((planCode) => (
            <button
              key={planCode}
              className="btn btn-primary"
              disabled={loading || busyPlan !== null}
              onClick={() => changePlan(planCode)}
            >
              {busyPlan === planCode ? 'Applying…' : `Switch to ${planCode}`}
            </button>
          ))}
        </div>
        <button className="btn mt-3" disabled={busyPlan !== null} onClick={cancel}>
          {busyPlan === 'CANCEL' ? 'Cancelling…' : 'Cancel Subscription'}
        </button>
      </div>

      <div className="rounded border bg-white p-4">
        <div className="text-sm font-medium mb-2">Recent billing events</div>
        <div className="divide-y">
          {events.length === 0 && <div className="py-2 text-sm text-slate-500">No billing events yet.</div>}
          {events.slice(0, 15).map((event) => (
            <div key={event.id} className="py-2 text-sm flex justify-between gap-2">
              <span>{event.type}</span>
              <span className="text-slate-500">{new Date(event.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
