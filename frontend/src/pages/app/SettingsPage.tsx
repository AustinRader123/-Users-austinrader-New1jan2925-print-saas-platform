import React from 'react';
import { apiClient } from '../../lib/api';
import { withFallback } from '../../lib/apiClient';
import { useAsync } from '../../lib/query';
import { EmptyState, ErrorState, LoadingState, PageHeader } from './ui';

export default function AppSettingsPage() {
  const storeId = localStorage.getItem('storeId') || 'default';
  const [shippingProvider, setShippingProvider] = React.useState(localStorage.getItem('provider.shipping') || 'mock');
  const [billingProvider, setBillingProvider] = React.useState(localStorage.getItem('provider.billing') || 'mock');

  const updateProvider = (key: 'shipping' | 'billing', value: string) => {
    if (key === 'shipping') setShippingProvider(value);
    if (key === 'billing') setBillingProvider(value);
    localStorage.setItem(`provider.${key}`, value);
  };

  const state = useAsync(async () => {
    return withFallback(
      async () => {
        const [domains, users] = await Promise.all([
          apiClient.listStoreDomains(storeId),
          apiClient.listRbacUsers(),
        ]);
        return {
          domains: Array.isArray(domains) ? domains : (domains?.items || []),
          users: Array.isArray(users) ? users : (users?.items || []),
        };
      },
      () => ({ domains: [], users: [] }),
      'settings.page'
    );
  }, [storeId]);

  return (
    <div className="deco-page">
      <PageHeader title="Settings" subtitle="Domain, user, and organization-level settings." />

      <div className="deco-panel">
        <div className="deco-panel-body">
          <button className="deco-btn" onClick={state.refetch}>Load data</button>
        </div>
      </div>

      <div className="deco-panel">
        <div className="deco-panel-head">Provider selectors</div>
        <div className="deco-panel-body grid gap-2 md:grid-cols-2">
          <label className="text-xs text-slate-600">Shipping provider
            <select className="deco-input mt-1 w-full" value={shippingProvider} onChange={(e) => updateProvider('shipping', e.target.value)}>
              <option value="mock">mock</option>
              <option value="live">live</option>
            </select>
          </label>
          <label className="text-xs text-slate-600">Billing provider
            <select className="deco-input mt-1 w-full" value={billingProvider} onChange={(e) => updateProvider('billing', e.target.value)}>
              <option value="mock">mock</option>
              <option value="live">live</option>
            </select>
          </label>
        </div>
      </div>

      {state.loading ? <LoadingState title="Loading settings" /> : null}
      {!state.loading && state.error ? <ErrorState message={state.error} onRetry={state.refetch} /> : null}

      {!state.loading && !state.error && state.data && state.data.domains.length === 0 && state.data.users.length === 0 ? (
        <EmptyState title="No settings data" description="Domains and users will appear once configured." />
      ) : null}

      {!state.loading && !state.error && state.data && (state.data.domains.length > 0 || state.data.users.length > 0) ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="deco-panel">
            <div className="deco-panel-head">Domains</div>
            <div className="deco-panel-body text-xs text-slate-700">{state.data.domains.length} domains configured</div>
          </div>
          <div className="deco-panel">
            <div className="deco-panel-head">Users</div>
            <div className="deco-panel-body text-xs text-slate-700">{state.data.users.length} users assigned</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
