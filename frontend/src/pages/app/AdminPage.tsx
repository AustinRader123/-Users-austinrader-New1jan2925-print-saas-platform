import React from 'react';
import { apiClient } from '../../lib/api';
import { withFallback } from '../../lib/apiClient';
import { useAsync } from '../../lib/query';
import { EmptyState, ErrorState, LoadingState, PageHeader } from './ui';

export default function AppAdminPage() {
  const [gates, setGates] = React.useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('featureGates');
      return raw ? JSON.parse(raw) : { 'reports.enabled': true, 'admin.enabled': true };
    } catch {
      return { 'reports.enabled': true, 'admin.enabled': true };
    }
  });

  const toggleGate = (key: string) => {
    const next = { ...gates, [key]: !gates[key] };
    setGates(next);
    localStorage.setItem('featureGates', JSON.stringify(next));
  };

  const state = useAsync(async () => {
    return withFallback(
      async () => {
        const [menu, roles] = await Promise.all([
          apiClient.getNavigationMenu(),
          apiClient.listRbacRoles(),
        ]);
        return {
          menuItems: Array.isArray(menu) ? menu : (menu?.items || []),
          roles: Array.isArray(roles) ? roles : (roles?.items || []),
        };
      },
      () => ({ menuItems: [], roles: [] }),
      'admin.page'
    );
  }, []);

  return (
    <div className="deco-page">
      <PageHeader title="Admin" subtitle="Feature gates, role configuration, and platform controls." />

      <div className="deco-panel">
        <div className="deco-panel-body">
          <button className="deco-btn" onClick={state.refetch}>Load data</button>
        </div>
      </div>

      <div className="deco-panel">
        <div className="deco-panel-head">Feature gates</div>
        <div className="deco-panel-body flex flex-wrap gap-2">
          <button className="deco-btn" onClick={() => toggleGate('reports.enabled')}>reports.enabled: {String(gates['reports.enabled'] !== false)}</button>
          <button className="deco-btn" onClick={() => toggleGate('admin.enabled')}>admin.enabled: {String(gates['admin.enabled'] !== false)}</button>
        </div>
      </div>

      {state.loading ? <LoadingState title="Loading admin data" /> : null}
      {!state.loading && state.error ? <ErrorState message={state.error} onRetry={state.refetch} /> : null}

      {!state.loading && !state.error && state.data && state.data.menuItems.length === 0 && state.data.roles.length === 0 ? (
        <EmptyState title="No admin data" description="Enable admin providers or seed roles to view admin controls." />
      ) : null}

      {!state.loading && !state.error && state.data && (state.data.menuItems.length > 0 || state.data.roles.length > 0) ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="deco-panel">
            <div className="deco-panel-head">Navigation menu</div>
            <div className="deco-panel-body text-xs text-slate-700">{state.data.menuItems.length} configured items</div>
          </div>
          <div className="deco-panel">
            <div className="deco-panel-head">RBAC roles</div>
            <div className="deco-panel-body text-xs text-slate-700">{state.data.roles.length} roles available</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
