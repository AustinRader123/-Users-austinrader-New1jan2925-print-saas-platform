import React from 'react';
import { Menu, X } from 'lucide-react';
import type { User } from '../../stores/authStore';
import Sidebar from './Sidebar';

export default function MobileNavDrawer({ user }: { user: User | null }) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button className="deco-mobile-nav-toggle" type="button" onClick={() => setOpen(true)} aria-label="Open navigation">
        <Menu className="h-4 w-4" />
      </button>

      {open ? (
        <div className="deco-mobile-nav-overlay" role="dialog" aria-modal="true">
          <div className="deco-mobile-nav-panel">
            <div className="deco-mobile-nav-head">
              <div className="deco-sidebar-title">Navigation</div>
              <button className="deco-mobile-nav-close" type="button" onClick={() => setOpen(false)} aria-label="Close navigation">
                <X className="h-4 w-4" />
              </button>
            </div>
            <Sidebar user={user} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
