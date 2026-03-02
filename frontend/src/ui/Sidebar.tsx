import React from 'react';
import type { AppNavItem } from '../nav/navConfig';
import SidebarItem from './SidebarItem';

export function Sidebar({
  navItems,
  roleLabel,
  collapsed,
  onToggleCollapse,
  className = '',
  onNavigate,
}: {
  navItems: AppNavItem[];
  roleLabel?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
  onNavigate?: () => void;
}) {
  const [storeId, setStoreId] = React.useState<string>(() => localStorage.getItem('storeId') || 'default');
  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>({});
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    localStorage.setItem('storeId', storeId || 'default');
  }, [storeId]);

  const grouped = navItems.reduce<Record<string, AppNavItem[]>>((acc, item) => {
    const key = item.section || 'Core';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  React.useEffect(() => {
    const sections: Record<string, boolean> = {};
    const groups: Record<string, boolean> = {};
    Object.entries(grouped).forEach(([section, items]) => {
      sections[section] = true;
      items.forEach((item) => {
        if (item.children?.length) groups[item.key] = true;
      });
    });
    setOpenSections((prev) => ({ ...sections, ...prev }));
    setOpenGroups((prev) => ({ ...groups, ...prev }));
  }, [navItems]);

  return (
    <aside className={`ops-sidebar ${collapsed ? 'is-collapsed' : ''} ${className}`.trim()}>
      <div className="ops-sidebar-head">
        <div className="ops-sidebar-head-top">
          {!collapsed ? <div className="ops-sidebar-title">Operations</div> : null}
          {onToggleCollapse ? (
            <button type="button" className="ops-sidebar-collapse-btn" onClick={onToggleCollapse}>
              {collapsed ? '→' : '←'}
            </button>
          ) : null}
        </div>
        {!collapsed ? (
          <div className="ops-store-row">
            <span className="ops-store-label">Store</span>
            <input
              className="ops-store-select"
              value={storeId}
              onChange={(event) => setStoreId(event.target.value)}
              placeholder="store id"
            />
          </div>
        ) : null}
        <div className="ops-role-badge" title={`Role: ${roleLabel || 'CUSTOMER'}`}>{roleLabel || 'CUSTOMER'}</div>
      </div>
      <nav className="ops-sidebar-nav" aria-label="Primary">
        {Object.entries(grouped).map(([section, items]) => (
          <div key={section} className="ops-sidebar-section">
            {!collapsed ? (
              <button
                type="button"
                className="ops-sidebar-section-toggle"
                onClick={() => setOpenSections((value) => ({ ...value, [section]: !value[section] }))}
              >
                <span className="ops-sidebar-section-label">{section}</span>
                <span>{openSections[section] ? '−' : '+'}</span>
              </button>
            ) : null}

            {(collapsed || openSections[section]) &&
              items.map((item) => {
                const hasChildren = !!item.children?.length;
                return (
                  <div key={item.key}>
                    <div className="ops-sidebar-item-row">
                      <SidebarItem
                        to={item.path}
                        label={item.label}
                        icon={item.icon}
                        badgeCount={item.badgeCount}
                        collapsed={collapsed}
                        onNavigate={onNavigate}
                      />
                      {!collapsed && hasChildren ? (
                        <button
                          type="button"
                          className="ops-sidebar-subtoggle"
                          aria-label={`Toggle ${item.label} sub menu`}
                          onClick={() => setOpenGroups((value) => ({ ...value, [item.key]: !value[item.key] }))}
                        >
                          {openGroups[item.key] ? '▾' : '▸'}
                        </button>
                      ) : null}
                    </div>

                    {!collapsed && hasChildren && openGroups[item.key] ? (
                      <div className="ops-sidebar-children">
                        {item.children!.map((child) => (
                          <SidebarItem
                            key={child.key}
                            to={child.path}
                            label={child.label}
                            icon={child.icon}
                            badgeCount={child.badgeCount}
                            onNavigate={onNavigate}
                            compact
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
          </div>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
