import { Boxes, ClipboardList, DollarSign, Factory, Package, ShoppingCart, Truck, Warehouse } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type AppNavItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  path: string;
  rolesAllowed: string[];
  featureGateKey?: string;
  badgeCount?: number;
};

export const appNavItems: AppNavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: Boxes, path: '/app', rolesAllowed: ['CUSTOMER', 'ADMIN', 'STORE_OWNER', 'PRODUCTION_MANAGER', 'ACCOUNTING'] },
  { key: 'orders', label: 'Orders', icon: ClipboardList, path: '/app/orders', rolesAllowed: ['CUSTOMER', 'ADMIN', 'STORE_OWNER', 'PRODUCTION_MANAGER'], badgeCount: 8 },
  { key: 'products', label: 'Products', icon: Package, path: '/app/products', rolesAllowed: ['CUSTOMER', 'ADMIN', 'STORE_OWNER', 'PRODUCTION_MANAGER'] },
  { key: 'production', label: 'Production', icon: Factory, path: '/app/production', rolesAllowed: ['ADMIN', 'STORE_OWNER', 'PRODUCTION_MANAGER'], badgeCount: 6 },
  { key: 'inventory', label: 'Inventory', icon: Warehouse, path: '/app/inventory', rolesAllowed: ['ADMIN', 'STORE_OWNER', 'PRODUCTION_MANAGER'], badgeCount: 3 },
  { key: 'purchasing', label: 'Purchasing', icon: ShoppingCart, path: '/app/purchasing', rolesAllowed: ['ADMIN', 'STORE_OWNER', 'PRODUCTION_MANAGER'] },
  { key: 'billing', label: 'Billing', icon: DollarSign, path: '/app/billing', rolesAllowed: ['ADMIN', 'STORE_OWNER', 'ACCOUNTING'] },
  { key: 'shipping', label: 'Shipping', icon: Truck, path: '/app/shipping', rolesAllowed: ['ADMIN', 'STORE_OWNER', 'PRODUCTION_MANAGER'] },
  { key: 'reports', label: 'Reports', icon: Boxes, path: '/app/reports', rolesAllowed: ['ADMIN', 'STORE_OWNER', 'PRODUCTION_MANAGER', 'ACCOUNTING'], featureGateKey: 'reports.enabled' },
  { key: 'admin', label: 'Admin', icon: Boxes, path: '/app/admin', rolesAllowed: ['ADMIN'], featureGateKey: 'admin.enabled' },
  { key: 'settings', label: 'Settings', icon: Boxes, path: '/app/settings', rolesAllowed: ['ADMIN', 'STORE_OWNER'] },
];

function readFeatureGates(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem('featureGates');
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function getVisibleNavItems(role?: string | null): AppNavItem[] {
  const normalizedRole = String(role || 'CUSTOMER').toUpperCase();
  const gates = readFeatureGates();
  return appNavItems.filter((item) => {
    if (!item.rolesAllowed.includes(normalizedRole)) return false;
    if (!item.featureGateKey) return true;
    return gates[item.featureGateKey] !== false;
  });
}
