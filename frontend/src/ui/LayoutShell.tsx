import React from 'react';
import type { AppNavItem } from '../nav/navConfig';
import AppHeader from './AppHeader';
import Sidebar from './Sidebar';

export function LayoutShell({
  navItems,
  roleLabel,
  children,
}: {
  navItems: AppNavItem[];
  roleLabel?: string;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = React.useState<boolean>(() => localStorage.getItem('ops.sidebarCollapsed') === 'true');
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [dense, setDense] = React.useState<boolean>(() => localStorage.getItem('ops.denseMode') === 'true');

  React.useEffect(() => {
    localStorage.setItem('ops.sidebarCollapsed', String(collapsed));
  }, [collapsed]);

  React.useEffect(() => {
    localStorage.setItem('ops.denseMode', String(dense));
    document.body.classList.toggle('ops-dense', dense);
  }, [dense]);

  return (
    <div className="ops-shell">
      <AppHeader navItems={navItems} onMenu={() => setMobileOpen(true)} dense={dense} onToggleDense={() => setDense((value) => !value)} />

      <div className="ops-shell-body">
        <Sidebar navItems={navItems} roleLabel={roleLabel} collapsed={collapsed} className="ops-desktop-sidebar" />
        <main className="ops-main">{children}</main>
      </div>

      <button className="ops-collapse-toggle" type="button" onClick={() => setCollapsed((value) => !value)}>
        {collapsed ? 'Expand Nav' : 'Collapse Nav'}
      </button>

      {mobileOpen ? (
        <div className="ops-mobile-overlay" role="dialog" aria-modal="true" onClick={() => setMobileOpen(false)}>
          <Sidebar navItems={navItems} roleLabel={roleLabel} className="ops-mobile-sidebar" onNavigate={() => setMobileOpen(false)} />
        </div>
      ) : null}
    </div>
  );
}

export default LayoutShell;
