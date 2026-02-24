import React from 'react';
import { NavLink } from 'react-router-dom';
import { useUIStore } from '../stores/uiStore';

type Group = {
  label: string;
  items: { to: string; label: string }[];
};

const GROUPS: Group[] = [
  {
    label: 'Dashboard',
    items: [
      { to: '/app', label: 'Overview' },
    ],
  },
  {
    label: 'Orders',
    items: [
      { to: '/app/orders', label: 'Orders' },
      { to: '/app/artwork', label: 'Artwork Approvals' },
      { to: '/app/production', label: 'Production Queue' },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { to: '/app/products', label: 'Products' },
      { to: '/app/customers', label: 'Customers' },
    ],
  },
  {
    label: 'Reports',
    items: [
      { to: '/app/reports', label: 'Sales' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { to: '/app/settings/stores', label: 'Stores & Branding' },
      { to: '/app/settings/users', label: 'Users & Roles' },
      { to: '/app/settings/integrations', label: 'Integrations' },
      { to: '/app/settings/billing', label: 'Billing' },
      { to: '/app/settings/api', label: 'API Keys' },
    ],
  },
];

export default function SideNav() {
  const { sidebarCollapsed, setSidebarCollapsed } = useUIStore();
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    GROUPS.forEach((g) => (init[g.label] = true));
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
        {GROUPS.map((group) => (
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
