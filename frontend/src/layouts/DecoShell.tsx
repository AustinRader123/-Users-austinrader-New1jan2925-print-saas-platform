import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Toasts } from '../ui/Toasts';
import LayoutShell from '../ui/LayoutShell';
import { getVisibleNavItems } from '../nav/navConfig';

export default function DecoShell() {
  const { user } = useAuthStore();
  const navItems = getVisibleNavItems(user?.role);

  return (
    <LayoutShell navItems={navItems} roleLabel={user?.role || 'CUSTOMER'}>
      <section className="deco-content">
        <Outlet />
      </section>
      <Toasts />
    </LayoutShell>
  );
}
