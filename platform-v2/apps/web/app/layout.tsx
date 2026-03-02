import './globals.css';
import type { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen grid grid-cols-[240px_1fr]">
          <aside className="border-r bg-white p-4">
            <h1 className="text-sm font-semibold tracking-wide">SkuFlow OS</h1>
            <nav className="mt-4 space-y-2 text-sm">
              <a className="block rounded border px-2 py-1" href="/app/dashboard">Dashboard</a>
              <a className="block rounded border px-2 py-1" href="/app/orders">Orders</a>
              <a className="block rounded border px-2 py-1" href="/app/pricing">Pricing</a>
              <a className="block rounded border px-2 py-1" href="/app/designer">Designer</a>
              <a className="block rounded border px-2 py-1" href="/store/default">Store</a>
              <a className="block rounded border px-2 py-1" href="/portal">Portal</a>
            </nav>
          </aside>
          <main className="p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
