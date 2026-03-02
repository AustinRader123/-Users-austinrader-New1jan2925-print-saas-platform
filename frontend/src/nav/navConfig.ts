import { Boxes, ClipboardList, DollarSign, Factory, Package, ShoppingCart, Truck, Warehouse } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type AppNavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  badgeCount?: number;
};

export const appNavItems: AppNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Boxes, path: '/app' },
  { id: 'orders', label: 'Orders', icon: ClipboardList, path: '/app/orders', badgeCount: 8 },
  { id: 'products', label: 'Products', icon: Package, path: '/app/products' },
  { id: 'production', label: 'Production', icon: Factory, path: '/app/production', badgeCount: 6 },
  { id: 'inventory', label: 'Inventory', icon: Warehouse, path: '/app/inventory', badgeCount: 3 },
  { id: 'purchasing', label: 'Purchasing', icon: ShoppingCart, path: '/app/purchasing' },
  { id: 'billing', label: 'Billing', icon: DollarSign, path: '/app/billing' },
  { id: 'shipping', label: 'Shipping', icon: Truck, path: '/app/shipping' },
];
