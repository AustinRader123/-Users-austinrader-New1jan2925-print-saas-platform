import React from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  Boxes,
  ClipboardList,
  DollarSign,
  Factory,
  HelpCircle,
  LifeBuoy,
  Package,
  Settings,
  ShoppingCart,
  Truck,
  Warehouse,
  Wrench,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { Toasts } from '../ui/Toasts';
import { BUILD_INFO } from '../buildInfo';

type NavItem = {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
};

const navItems: NavItem[] = [
  { label: 'Admin Portal', to: '/app', icon: Boxes },
  { label: 'Orders', to: '/app/orders', icon: ClipboardList },
  { label: 'Products', to: '/app/dashboard/products', icon: Package },
  { label: 'Production', to: '/app/production', icon: Factory },
  { label: 'Inventory', to: '/app/dashboard/inventory', icon: Warehouse },
  { label: 'Purchasing', to: '/app/dashboard/purchasing', icon: ShoppingCart },
  { label: 'Billing', to: '/app/dashboard/billing', icon: DollarSign },
  { label: 'Shipping', to: '/app/dashboard/shipping', icon: Truck },
  { label: 'Settings', to: '/app/settings/users', icon: Settings, roles: ['ADMIN', 'STORE_OWNER'] },
];

function DecoSidebar() {
  const { user } = useAuthStore();
  const visibleItems = navItems.filter((item) => !item.roles || (user?.role ? item.roles.includes(user.role) : false));

  return (
    <aside className="deco-sidebar">
      <div className="deco-sidebar-header">
        <div className="deco-sidebar-title">Portal Navigation</div>
        <div className="deco-sidebar-subtitle">Role: {user?.role || 'Guest'}</div>
      </div>

      <nav className="deco-nav-list">
        {visibleItems.length === 0 ? (
          <div className="deco-nav-empty">No navigation items available for this role.</div>
        ) : (
          visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) => `deco-nav-item ${isActive ? 'is-active' : ''}`}
                end={item.to === '/app'}
              >
                <Icon className="deco-nav-icon" />
                <span>{item.label}</span>
              </NavLink>
            );
          })
        )}
      </nav>
    </aside>
  );
}

function UtilityBar() {
  return (
    <div className="deco-utility-bar">
      <div className="deco-utility-inner">
        <div className="deco-utility-left">
          <a href="/contact" className="deco-utility-link">Request a Demo</a>
          <a href="/pricing" className="deco-utility-link">Pricing</a>
        </div>
        <button className="deco-icon-btn" type="button" aria-label="Support and help">
          <LifeBuoy className="h-4 w-4" />
          <HelpCircle className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function PrimaryHeader() {
  const { user, logout } = useAuthStore();

  return (
    <header className="deco-primary-header">
      <div className="deco-primary-inner">
        <div className="deco-brand-wrap">
          <Link to="/app" className="deco-brand-logo">S</Link>
          <span className="deco-brand-text">SkuFlow</span>
        </div>

        <nav className="deco-main-nav">
          <a href="/solutions" className="deco-main-link">Solutions</a>
          <a href="/features" className="deco-main-link">Features</a>
          <a href="/catalogs" className="deco-main-link">Catalogs</a>
          <a href="/resources" className="deco-main-link">Resources</a>
          <a href="/contact" className="deco-main-link">Contact Us</a>
          <a href="/pricing" className="deco-pricing-btn">Pricing</a>
        </nav>

        <div className="deco-user-wrap">
          <NavLink to="/app/cart" className="deco-cart-btn" aria-label="Cart">
            <ShoppingCart className="h-4 w-4" />
          </NavLink>

          <details className="deco-user-dropdown">
            <summary>{user?.email || 'Account'}</summary>
            <div className="deco-user-menu">
              <NavLink to="/app/settings/users" className="deco-user-menu-item">
                <Wrench className="h-4 w-4" />
                Settings
              </NavLink>
              <button type="button" className="deco-user-menu-item" onClick={logout}>
                Sign out
              </button>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

export default function DecoShell() {
  return (
    <div className="deco-shell">
      <UtilityBar />
      <PrimaryHeader />

      <div className="deco-body">
        <DecoSidebar />
        <section className="deco-content">
          <Outlet />
        </section>
      </div>

      <div className="deco-build-banner">Build: {BUILD_INFO.commit} | {BUILD_INFO.buildTime}</div>
      <Toasts />
    </div>
  );
}
