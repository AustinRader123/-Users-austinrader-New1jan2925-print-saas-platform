import {
  BarChart3,
  Boxes,
  Building2,
  ClipboardList,
  CreditCard,
  DollarSign,
  Factory,
  FileText,
  Package,
  Puzzle,
  Receipt,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  Warehouse,
  Webhook,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type AppNavSection = 'Core' | 'Workflow' | 'Money' | 'Shipping' | 'Admin';

export type AppNavItem = {
  key: string;
  section: AppNavSection;
  label: string;
  icon: LucideIcon;
  path: string;
  rolesAllowed: string[];
  featureGateKey?: string;
  badgeCount?: number;
  children?: AppNavItem[];
};

export const appNavItems: AppNavItem[] = [
  { key: 'dashboard', section: 'Core', label: 'Home', icon: Boxes, path: '/app', rolesAllowed: ['CUSTOMER', 'ADMIN', 'STORE_OWNER', 'PRODUCTION_MANAGER', 'ACCOUNTING'] },
  { key: 'forecasting', section: 'Core', label: 'Forecasting', icon: BarChart3, path: '/app/reports', rolesAllowed: ['CUSTOMER', 'ADMIN', 'STORE_OWNER', 'PRODUCTION_MANAGER', 'ACCOUNTING'] },
  { key: 'inventory', section: 'Core', label: 'Inventory', icon: Warehouse, path: '/app/inventory', rolesAllowed: ['ADMIN', 'STORE_OWNER', 'PRODUCTION_MANAGER'], badgeCount: 3 },
  { key: 'replenishment', section: 'Core', label: 'Replenishment', icon: ShoppingCart, path: '/app/purchasing', rolesAllowed: ['ADMIN', 'STORE_OWNER', 'PRODUCTION_MANAGER'] },
  { key: 'alerts', section: 'Core', label: 'Alerts / Action Center', icon: ClipboardList, path: '/app/orders', rolesAllowed: ['CUSTOMER', 'ADMIN', 'STORE_OWNER', 'PRODUCTION_MANAGER'], badgeCount: 8 },
  { key: 'analytics', section: 'Core', label: 'Analytics', icon: BarChart3, path: '/app/reports', rolesAllowed: ['ADMIN', 'STORE_OWNER', 'PRODUCTION_MANAGER', 'ACCOUNTING'] },
  { key: 'products', section: 'Core', label: 'Products / SKUs', icon: Package, path: '/app/products', rolesAllowed: ['CUSTOMER', 'ADMIN', 'STORE_OWNER', 'PRODUCTION_MANAGER'] },
  { key: 'locations', section: 'Core', label: 'Locations / Warehouses', icon: Building2, path: '/app/stores', rolesAllowed: ['ADMIN', 'STORE_OWNER'] },
  { key: 'suppliers', section: 'Core', label: 'Suppliers / POs', icon: Truck, path: '/app/purchasing', rolesAllowed: ['ADMIN', 'STORE_OWNER', 'PRODUCTION_MANAGER'] },

  {
    key: 'production',
    section: 'Workflow',
    label: 'Production',
    icon: Factory,
    path: '/app/production/board',
    rolesAllowed: ['ADMIN', 'STORE_OWNER', 'PRODUCTION_MANAGER'],
    badgeCount: 6,
    children: [
      {
        key: 'production-board',
        section: 'Workflow',
        label: 'Board',
        icon: Factory,
        path: '/app/production/board',
        rolesAllowed: ['ADMIN', 'STORE_OWNER', 'PRODUCTION_MANAGER'],
      },
      {
        key: 'production-jobs',
        section: 'Workflow',
        label: 'Jobs',
        icon: Factory,
        path: '/app/production/jobs',
        rolesAllowed: ['ADMIN', 'STORE_OWNER', 'PRODUCTION_MANAGER'],
      },
    ],
  },
  { key: 'purchasing', section: 'Workflow', label: 'Purchasing', icon: ShoppingCart, path: '/app/purchasing', rolesAllowed: ['ADMIN', 'STORE_OWNER', 'PRODUCTION_MANAGER'] },
  { key: 'inventory-workflow', section: 'Workflow', label: 'Inventory Operations', icon: Warehouse, path: '/app/inventory', rolesAllowed: ['ADMIN', 'STORE_OWNER', 'PRODUCTION_MANAGER'] },

  { key: 'billing', section: 'Money', label: 'Billing / Plan', icon: Receipt, path: '/app/billing', rolesAllowed: ['ADMIN', 'STORE_OWNER', 'ACCOUNTING'] },
  { key: 'payments', section: 'Money', label: 'Payments', icon: CreditCard, path: '/app/payments', rolesAllowed: ['ADMIN', 'STORE_OWNER', 'ACCOUNTING'] },
  { key: 'taxes', section: 'Money', label: 'Taxes', icon: DollarSign, path: '/app/taxes', rolesAllowed: ['ADMIN', 'STORE_OWNER', 'ACCOUNTING'] },

  { key: 'shipments', section: 'Shipping', label: 'Shipments', icon: Truck, path: '/app/shipments', rolesAllowed: ['ADMIN', 'STORE_OWNER', 'PRODUCTION_MANAGER'] },
  { key: 'webhooks', section: 'Shipping', label: 'Webhooks / Tracking', icon: Webhook, path: '/app/webhooks', rolesAllowed: ['ADMIN', 'STORE_OWNER'] },

  { key: 'customers', section: 'Admin', label: 'Customers', icon: Users, path: '/app/customers', rolesAllowed: ['ADMIN', 'STORE_OWNER'] },
  { key: 'stores', section: 'Admin', label: 'Stores', icon: Building2, path: '/app/stores', rolesAllowed: ['ADMIN', 'STORE_OWNER'] },
  { key: 'users-roles', section: 'Admin', label: 'Users / Roles', icon: Users, path: '/app/users-roles', rolesAllowed: ['ADMIN', 'STORE_OWNER'] },
  { key: 'settings', section: 'Admin', label: 'Settings', icon: Settings, path: '/app/settings', rolesAllowed: ['ADMIN', 'STORE_OWNER'] },
  { key: 'integrations', section: 'Admin', label: 'Integrations', icon: Puzzle, path: '/app/integrations', rolesAllowed: ['ADMIN', 'STORE_OWNER'] },
  { key: 'reports', section: 'Admin', label: 'Reports', icon: BarChart3, path: '/app/reports', rolesAllowed: ['ADMIN', 'STORE_OWNER', 'PRODUCTION_MANAGER', 'ACCOUNTING'], featureGateKey: 'reports.enabled' },
  { key: 'quotes', section: 'Admin', label: 'Quotes', icon: FileText, path: '/app/quotes', rolesAllowed: ['CUSTOMER', 'ADMIN', 'STORE_OWNER', 'PRODUCTION_MANAGER'] },
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

  const canSee = (item: AppNavItem) => {
    if (!item.rolesAllowed.includes(normalizedRole)) return false;
    if (!item.featureGateKey) return true;
    return gates[item.featureGateKey] !== false;
  };

  return appNavItems
    .filter(canSee)
    .map((item) => ({
      ...item,
      children: item.children?.filter(canSee),
    }));
}
