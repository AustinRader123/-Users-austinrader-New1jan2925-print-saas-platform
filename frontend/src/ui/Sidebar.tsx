import React from 'react';
import type { AppNavItem } from '../nav/navConfig';
import SidebarItem from './SidebarItem';

export function Sidebar({
  navItems,
  roleLabel,
  collapsed,
  className = '',
  onNavigate,
}: {
  navItems: AppNavItem[];
  roleLabel?: string;
  collapsed?: boolean;
  className?: string;
  onNavigate?: () => void;
}) {
  const [storeId, setStoreId] = React.useState<string>(() => localStorage.getItem('storeId') || 'default');

  React.useEffect(() => {
    localStorage.setItem('storeId', storeId || 'default');
  }, [storeId]);

  const grouped = navItems.reduce<Record<string, AppNavItem[]>>((acc, item) => {
    const key = item.section || 'Core';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <aside className={`ops-sidebar ${collapsed ? 'is-collapsed' : ''} ${className}`.trim()}>
      <div className="ops-sidebar-head">
        {!collapsed ? (
          <>
            <div className="ops-sidebar-title">Operations</div>
            <div className="ops-store-row">
              <span className="ops-store-label">Store</span>
              <input
                className="ops-store-select"
                value={storeId}
                onChange={(event) => setStoreId(event.target.value)}
                placeholder="store id"
              />
            </div>
          </>
        ) : null}
        <div className="ops-role-badge" title={`Role: ${roleLabel || 'CUSTOMER'}`}>{roleLabel || 'CUSTOMER'}</div>
      </div>
      <nav className="ops-sidebar-nav" aria-label="Primary">
        {Object.entries(grouped).map(([section, items]) => (
          <div key={section} className="ops-sidebar-section">
            {!collapsed ? <div className="ops-sidebar-section-label">{section}</div> : null}
            {items.map((item) => (
              <SidebarItem
                key={item.key}
                to={item.path}
                label={item.label}
                icon={item.icon}
                badgeCount={item.badgeCount}
                collapsed={collapsed}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
