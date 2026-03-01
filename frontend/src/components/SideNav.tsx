import React from 'react';
import { NavLink } from 'react-router-dom';
import { useUIStore } from '../stores/uiStore';
import { apiClient } from '../lib/api';

type Group = {
  label: string;
  items: { to: string; label: string }[];
};

export default function SideNav() {
  const { sidebarCollapsed, setSidebarCollapsed } = useUIStore();
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const menu = await apiClient.getNavigationMenu();
        if (!mounted) return;
        setGroups(Array.isArray(menu?.sections) ? menu.sections : []);
      } catch {
        if (!mounted) return;
        setGroups([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    ['Dashboard', 'Orders', 'Storefront', 'Communications', 'Documents', 'Settings'].forEach((g) => (init[g] = true));
    return init;
  });

  return (
    <aside className={`sidebar h-full ${sidebarCollapsed ? 'w-[56px]' : 'w-[260px]'} transition-all`}>
      <div className="px-3 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-default)' }}>
        <div className="text-sm font-semibold">SkuFlow Admin</div>
        <button className="btn btn-ghost" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} aria-label="Toggle sidebar">
          {sidebarCollapsed ? '→' : '←'}
        </button>
      </div>
      <nav className="px-2 py-2 space-y-2">
        {loading && (
          <div className="space-y-2 px-2 py-2" aria-label="sidebar-loading">
            <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
            <div className="h-7 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-7 w-full animate-pulse rounded bg-slate-100" />
          </div>
        )}
        {!loading && groups.length === 0 && (
          <div className="px-2 py-3 text-xs text-slate-500">No navigation items available for this role.</div>
        )}
        {groups.map((group) => (
          <div key={group.label}>
            <button
              className="flex w-full items-center justify-between px-2 py-1 text-xs font-medium"
              style={{ color: 'var(--text-secondary)' }}
              onClick={() => setOpenGroups((s) => ({ ...s, [group.label]: !s[group.label] }))}
            >
              <span>{group.label}</span>
              <span className="text-slate-500">{openGroups[group.label] ? '▾' : '▸'}</span>
            </button>
            {openGroups[group.label] && (
              <div className="mt-1 space-y-1">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `block px-2 py-1 text-sm ${isActive ? 'font-medium' : ''}`
                    }
                    style={({ isActive }) => ({
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      background: isActive ? 'var(--primary-muted)' : 'transparent',
                      borderLeft: `3px solid ${isActive ? 'var(--primary)' : 'transparent'}`,
                    })}
                  >
                    {/* Simple icon placeholder */}
                    <span className="mr-1">•</span>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
