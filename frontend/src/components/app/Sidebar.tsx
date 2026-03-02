import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import type { User } from '../../stores/authStore';
import { getVisibleNavItems } from '../../nav/navConfig';

export default function Sidebar({ user, onNavigate }: { user: User | null; onNavigate?: () => void }) {
  const location = useLocation();
  const visibleItems = getVisibleNavItems(user?.role);

  if (visibleItems.length === 0) {
    return <div className="deco-nav-empty">No navigation items available for this role.</div>;
  }

  return (
    <nav className="deco-nav-list" aria-label="Application navigation">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.path === '/app'
          ? location.pathname === '/app'
          : location.pathname.startsWith(item.path);

        return (
          <NavLink
            key={item.key}
            to={item.path}
            className={`deco-nav-item ${isActive ? 'is-active' : ''}`}
            end={item.path === '/app'}
            onClick={onNavigate}
          >
            <Icon className="deco-nav-icon" />
            <span>{item.label}</span>
            {typeof item.badgeCount === 'number' ? <em className="deco-nav-badge">{item.badgeCount}</em> : null}
          </NavLink>
        );
      })}
    </nav>
  );
}
