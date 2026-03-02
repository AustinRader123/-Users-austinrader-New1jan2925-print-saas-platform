import React from 'react';
import { Bell, ChevronDown, Command, Menu, Moon, Plus, Search, Sun } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { AppNavItem } from '../nav/navConfig';
import Button from './Button';
import Input from './Input';
import { useAuthStore } from '../stores/authStore';

function useCommandPalette(onOpen: () => void) {
  React.useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      const isCmdK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      if (!isCmdK) return;
      event.preventDefault();
      onOpen();
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [onOpen]);
}

export function AppHeader({
  navItems,
  onMenu,
  dense,
  onToggleDense,
}: {
  navItems: AppNavItem[];
  onMenu: () => void;
  dense: boolean;
  onToggleDense: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [openPalette, setOpenPalette] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [storeId, setStoreId] = React.useState(() => localStorage.getItem('storeId') || 'default');
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);

  const crumbs = React.useMemo(() => {
    const segments = location.pathname.split('/').filter(Boolean);
    const appIdx = segments.indexOf('app');
    const appSegments = appIdx >= 0 ? segments.slice(appIdx + 1) : [];
    if (appSegments.length === 0) return [{ label: 'Dashboard', to: '/app' }];

    return appSegments.map((seg, index) => {
      const label = seg
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
      const to = `/app/${appSegments.slice(0, index + 1).join('/')}`;
      return { label, to };
    });
  }, [location.pathname]);

  React.useEffect(() => {
    localStorage.setItem('storeId', storeId || 'default');
  }, [storeId]);

  useCommandPalette(() => setOpenPalette(true));

  const filtered = navItems.filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <header className="ops-header">
      <div className="ops-header-left">
        <button className="ops-icon-btn ops-mobile-only" type="button" aria-label="Open navigation" onClick={onMenu}>
          <Menu className="h-4 w-4" />
        </button>
        <Link to="/app" className="ops-brand">SkuFlow Ops</Link>
      </div>

      <div className="ops-header-center">
        <div className="ops-header-breadcrumbs" aria-label="Breadcrumb">
          <Link to="/app">App</Link>
          {crumbs.map((crumb) => (
            <React.Fragment key={crumb.to}>
              <span>/</span>
              <Link to={crumb.to}>{crumb.label}</Link>
            </React.Fragment>
          ))}
        </div>
        <div className="ops-global-search">
          <Search className="h-3.5 w-3.5" />
          <input placeholder="Search orders, products, jobs..." />
        </div>
      </div>

      <div className="ops-header-right">
        <input
          className="ops-store-pill"
          value={storeId}
          onChange={(event) => setStoreId(event.target.value)}
          aria-label="Tenant/store selector"
          title="Tenant/store selector"
        />

        <Button type="button" className="ops-shortcut-btn" onClick={() => setOpenPalette(true)}>
          <Command className="h-3.5 w-3.5" />
          Command
        </Button>

        <details className="ops-create-menu">
          <summary>
            <Plus className="h-3.5 w-3.5" />
            Create
          </summary>
          <div className="ops-create-popover">
            <button type="button" onClick={() => navigate('/app/orders/new')}>New Order</button>
            <button type="button" onClick={() => navigate('/app/quotes/new')}>New Quote</button>
            <button type="button" onClick={() => navigate('/app/products/import')}>New Product</button>
            <button type="button" onClick={() => navigate('/app/purchasing')}>New PO</button>
            <button type="button" onClick={() => navigate('/app/shipping')}>New Shipment</button>
          </div>
        </details>

        <button className="ops-icon-btn" type="button" onClick={() => setNotificationsOpen((value) => !value)} aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </button>

        <button className="ops-icon-btn" type="button" onClick={onToggleDense} aria-label="Toggle density">
          {dense ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <details className="ops-profile-menu">
          <summary>
            <span className="ops-avatar">{(user?.name || user?.email || 'U').slice(0, 1).toUpperCase()}</span>
            <span className="ops-profile-name">{user?.name || user?.email || 'Account'}</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </summary>
          <div className="ops-create-popover">
            <button type="button" onClick={() => navigate('/app/settings')}>Settings</button>
            <button type="button" onClick={() => navigate('/app/users-roles')}>Users & Roles</button>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/app/login');
              }}
            >
              Sign out
            </button>
          </div>
        </details>
      </div>

      {notificationsOpen ? (
        <div className="ops-notification-panel">
          <div className="ops-notification-title">Notifications</div>
          <ul>
            <li>3 orders need approval</li>
            <li>1 webhook retry failed</li>
            <li>2 low-stock SKUs detected</li>
          </ul>
        </div>
      ) : null}

      {openPalette ? (
        <div className="ops-palette-overlay" role="dialog" aria-modal="true">
          <div className="ops-palette-card">
            <div className="ops-palette-head">
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Type a page name" autoFocus />
              <button className="ops-icon-btn" type="button" onClick={() => setOpenPalette(false)}>Close</button>
            </div>
            <div className="ops-palette-list">
              {filtered.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setOpenPalette(false);
                    navigate(item.path);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

export default AppHeader;
