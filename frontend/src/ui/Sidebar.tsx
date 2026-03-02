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
  return (
    <aside className={`ops-sidebar ${collapsed ? 'is-collapsed' : ''} ${className}`.trim()}>
      <div className="ops-sidebar-head">
        {!collapsed ? <div className="ops-sidebar-title">Operations</div> : null}
        {!collapsed ? <div className="ops-sidebar-subtitle">Role: {roleLabel || 'CUSTOMER'}</div> : null}
      </div>
      <nav className="ops-sidebar-nav" aria-label="Primary">
        {navItems.map((item) => (
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
      </nav>
    </aside>
  );
}

export default Sidebar;
