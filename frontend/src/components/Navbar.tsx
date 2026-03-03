import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { LogOut, Menu, X } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  function closeMobileMenu() {
    setMobileOpen(false);
  }

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-slate-800 bg-slate-950/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <span className="font-bold text-white">S</span>
            </div>
            <span className="hidden text-lg font-bold text-slate-100 sm:inline">SkuFlow</span>
          </Link>

          <div className="hidden items-center space-x-6 lg:flex">
            <Link to="/solutions" className="text-sm font-medium text-slate-300 hover:text-white">Solutions</Link>
            <Link to="/features" className="text-sm font-medium text-slate-300 hover:text-white">Features</Link>
            <Link to="/industries" className="text-sm font-medium text-slate-300 hover:text-white">Built For</Link>
            <Link to="/pricing" className="text-sm font-medium text-slate-300 hover:text-white">Pricing</Link>
            <Link to="/resources" className="text-sm font-medium text-slate-300 hover:text-white">Resources</Link>
            <Link to="/company/about" className="text-sm font-medium text-slate-300 hover:text-white">Company</Link>
          </div>

          <div className="hidden items-center space-x-2 sm:flex">
            <Link to="/company/contact" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
              Request Demo
            </Link>
            <Link to="/app/login" className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-900">
              Sign In
            </Link>

            {user ? (
              <button
                onClick={logout}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200 hover:bg-slate-800"
                aria-label="Sign out"
              >
                <LogOut size={18} />
              </button>
            ) : null}
          </div>

          <div className="sm:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen((current) => !current)}
              className="rounded-lg border border-slate-700 p-2 text-slate-200 hover:bg-slate-900"
              aria-label="Open navigation"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <div className="border-t border-slate-800 py-3 sm:hidden">
            <div className="grid gap-2">
              <Link to="/solutions" onClick={closeMobileMenu} className="rounded-lg px-2 py-2 text-sm font-medium text-slate-200 hover:bg-slate-900">Solutions</Link>
              <Link to="/features" onClick={closeMobileMenu} className="rounded-lg px-2 py-2 text-sm font-medium text-slate-200 hover:bg-slate-900">Features</Link>
              <Link to="/industries" onClick={closeMobileMenu} className="rounded-lg px-2 py-2 text-sm font-medium text-slate-200 hover:bg-slate-900">Built For</Link>
              <Link to="/pricing" onClick={closeMobileMenu} className="rounded-lg px-2 py-2 text-sm font-medium text-slate-200 hover:bg-slate-900">Pricing</Link>
              <Link to="/resources" onClick={closeMobileMenu} className="rounded-lg px-2 py-2 text-sm font-medium text-slate-200 hover:bg-slate-900">Resources</Link>
              <Link to="/company/about" onClick={closeMobileMenu} className="rounded-lg px-2 py-2 text-sm font-medium text-slate-200 hover:bg-slate-900">Company</Link>
            </div>
            <div className="mt-3 grid gap-2">
              <Link
                to="/company/contact"
                onClick={closeMobileMenu}
                className="rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-blue-500"
              >
                Request Demo
              </Link>
              <Link
                to="/app/login"
                onClick={closeMobileMenu}
                className="rounded-lg border border-slate-700 px-4 py-2 text-center text-sm font-semibold text-slate-100 hover:bg-slate-900"
              >
                Sign In
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
