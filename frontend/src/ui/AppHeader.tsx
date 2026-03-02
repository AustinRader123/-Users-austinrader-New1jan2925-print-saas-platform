import React from 'react';
import { Command, Menu, Moon, Plus, Search, Sun } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import type { AppNavItem } from '../nav/navConfig';
import Button from './Button';
import Input from './Input';

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
  const navigate = useNavigate();
  const [openPalette, setOpenPalette] = React.useState(false);
  const [query, setQuery] = React.useState('');

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
        <div className="ops-global-search">
          <Search className="h-3.5 w-3.5" />
          <input placeholder="Search orders, products, jobs..." />
        </div>
      </div>

      <div className="ops-header-right">
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
            <button type="button" onClick={() => navigate('/app/products/import')}>New Product</button>
            <button type="button" onClick={() => navigate('/app/purchasing')}>New PO</button>
            <button type="button" onClick={() => navigate('/app/shipping')}>New Shipment</button>
          </div>
        </details>

        <button className="ops-icon-btn" type="button" onClick={onToggleDense} aria-label="Toggle density">
          {dense ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

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
