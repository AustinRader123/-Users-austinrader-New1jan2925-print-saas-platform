import React from 'react';
import { Outlet } from 'react-router-dom';
import SideNav from './SideNav';
import TopBar from './TopBar';
import { Toasts } from '../ui/Toasts';

export default function AppShell() {
  return (
    <div className="h-full min-h-screen bg-slate-50">
      <div className="flex h-full">
        <SideNav />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="min-w-0 flex-1">
            <Outlet />
          </main>
          <Toasts />
        </div>
      </div>
    </div>
  );
}
