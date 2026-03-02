import React from 'react';
import { NavLink } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

export function SidebarItem({
  to,
  label,
  icon: Icon,
  collapsed,
  badgeCount,
  onNavigate,
}: {
  to: string;
  label: string;
  icon: LucideIcon;
  collapsed?: boolean;
  badgeCount?: number;
  onNavigate?: () => void;
}) {
  return (
    <NavLink
      to={to}
      end={to === '/app'}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      aria-label={label}
      className={({ isActive }) => `ops-sidebar-item ${isActive ? 'is-active' : ''}`}
    >
      <Icon className="ops-sidebar-icon" />
      {!collapsed ? <span className="ops-sidebar-label">{label}</span> : null}
      {!collapsed && typeof badgeCount === 'number' ? <em className="ops-sidebar-badge">{badgeCount}</em> : null}
    </NavLink>
  );
}

export default SidebarItem;
