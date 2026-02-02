import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { ShoppingCart, LogOut, User } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuthStore();

  return (
    <nav className="fixed top-0 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">D</span>
            </div>
            <span className="font-bold text-lg hidden sm:inline">DecoNetwork</span>
          </Link>

          {/* Center Navigation */}
          <div className="hidden md:flex space-x-8">
            <Link to="/" className="text-slate-700 dark:text-slate-300 hover:text-blue-500">
              Products
            </Link>
            {user && (
              <>
                <Link to="/designs" className="text-slate-700 dark:text-slate-300 hover:text-blue-500">
                  Designs
                </Link>
                <Link to="/orders" className="text-slate-700 dark:text-slate-300 hover:text-blue-500">
                  Orders
                </Link>
                {user.role === 'ADMIN' && (
                  <>
                    <Link to="/admin/vendors" className="text-slate-700 dark:text-slate-300 hover:text-blue-500">
                      Vendors
                    </Link>
                    <Link to="/admin/vendors/import" className="text-slate-700 dark:text-slate-300 hover:text-blue-500">
                      Vendor Import
                    </Link>
                    <Link to="/admin/pricing-rules" className="text-slate-700 dark:text-slate-300 hover:text-blue-500">
                      Pricing Rules
                    </Link>
                    <Link to="/admin/pricing-simulator" className="text-slate-700 dark:text-slate-300 hover:text-blue-500">
                      Pricing Simulator
                    </Link>
                  </>
                )}
              </>
            )}
          </div>

          {/* Right Actions */}
          <div className="flex items-center space-x-4">
            <Link to="/cart" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
              <ShoppingCart size={20} />
            </Link>

            {user ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-slate-600 dark:text-slate-400 hidden sm:inline">
                  {user.email}
                </span>
                <button
                  onClick={logout}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <div className="space-x-2">
                <Link to="/login" className="btn btn-secondary">
                  Login
                </Link>
                <Link to="/register" className="btn btn-primary">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
