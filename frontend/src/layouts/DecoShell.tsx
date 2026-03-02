import React from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  HelpCircle,
  LifeBuoy,
  CircleUserRound,
  ShoppingCart,
  Wrench,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { Toasts } from '../ui/Toasts';
import Sidebar from '../components/app/Sidebar';
import MobileNavDrawer from '../components/app/MobileNavDrawer';

function DecoSidebar() {
  const { user } = useAuthStore();

  return (
    <aside className="deco-sidebar">
      <div className="deco-sidebar-header">
        <div className="deco-sidebar-title">Portal Navigation</div>
        <div className="deco-sidebar-subtitle">Role: {user?.role || 'CUSTOMER'}</div>
      </div>
      <Sidebar user={user} />
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
        <div className="deco-utility-right">
          <button className="deco-icon-btn" type="button" aria-label="Support">
            <LifeBuoy className="h-3.5 w-3.5" />
          </button>
          <button className="deco-icon-btn" type="button" aria-label="Help">
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </div>
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
          <MobileNavDrawer user={user} />
          <Link to="/app" className="deco-brand-logo">S</Link>
          <span className="deco-brand-text">SkuFlow</span>
        </div>

        <nav className="deco-main-nav">
          <a href="/solutions" className="deco-main-link">Solutions</a>
          <a href="/features" className="deco-main-link">Features</a>
          <a href="/catalogs" className="deco-main-link">Catalogs</a>
          <a href="/resources" className="deco-main-link">Resources</a>
          <a href="/contact" className="deco-main-link">Contact Us</a>
        </nav>

        <div className="deco-user-wrap">
          <NavLink to="/app/cart" className="deco-cart-btn" aria-label="Cart">
            <ShoppingCart className="h-4 w-4" />
          </NavLink>

          <button className="deco-icon-btn" type="button" aria-label="User actions">
            <CircleUserRound className="h-3.5 w-3.5" />
          </button>

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
      <Toasts />
    </div>
  );
}
