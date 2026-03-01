import { Router } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import { getUserPermissions, hasPermission } from '../lib/rbac.js';
import FeatureGateService from '../services/FeatureGateService.js';

const router = Router();
router.use(authMiddleware);

type NavItem = { to: string; label: string };
type NavSection = { label: string; items: NavItem[] };

router.get('/menu', async (req: AuthRequest, res) => {
  try {
    const tenantId = ((req as any).tenantId as string | undefined) || (req.headers['x-tenant-id'] as string | undefined) || null;
    const userId = req.userId;
    const userRole = req.userRole;

    if (!tenantId || !userId) {
      return res.status(400).json({ error: 'tenantId and userId required' });
    }

    const permissions = await getUserPermissions({ tenantId, userId, userRole });
    const productionV2Enabled = await FeatureGateService.can(tenantId, 'production_v2.enabled');
    const inventoryEnabled = await FeatureGateService.can(tenantId, 'inventory.enabled');
    const billingEnabled = await FeatureGateService.can(tenantId, 'billing.enabled');
    const shippingEnabled = await FeatureGateService.can(tenantId, 'shipping.enabled');

    const sections: NavSection[] = [
      {
        label: 'Dashboard',
        items: [
          { to: '/app', label: 'Overview' },
          ...(hasPermission(permissions, 'catalog.manage') ? [{ to: '/dashboard/products', label: 'Products' }] : []),
          ...(hasPermission(permissions, 'customizer.manage') ? [{ to: '/dashboard/products', label: 'Product Builder' }] : []),
        ],
      },
      {
        label: 'Orders',
        items: [
          { to: '/app/orders', label: 'Orders' },
          { to: '/app/artwork', label: 'Artwork Approvals' },
          { to: '/app/production', label: 'Production Queue' },
          ...(productionV2Enabled && hasPermission(permissions, 'production.view')
            ? [{ to: '/dashboard/production-v2', label: 'Production WIP V2' }]
            : []),
          ...(inventoryEnabled && hasPermission(permissions, 'production.view')
            ? [{ to: '/dashboard/inventory', label: 'Inventory' }]
            : []),
          ...(inventoryEnabled && hasPermission(permissions, 'production.view')
            ? [{ to: '/dashboard/purchasing', label: 'Purchasing' }]
            : []),
          ...(shippingEnabled && hasPermission(permissions, 'shipping.view')
            ? [{ to: '/dashboard/shipping', label: 'Shipping' }]
            : []),
        ],
      },
      {
        label: 'Storefront',
        items: [
          ...(hasPermission(permissions, 'onboarding.manage') ? [{ to: '/dashboard/onboarding', label: 'Onboarding' }] : []),
          ...(hasPermission(permissions, 'storefront.theme.manage') ? [{ to: '/dashboard/storefront/theme', label: 'Theme' }] : []),
          ...(hasPermission(permissions, 'domains.manage') ? [{ to: '/dashboard/settings/domains', label: 'Domains' }] : []),
        ],
      },
      {
        label: 'Communications',
        items: [
          ...(hasPermission(permissions, 'comms.manage') ? [{ to: '/dashboard/settings/email', label: 'Email settings' }] : []),
          ...(hasPermission(permissions, 'comms.manage') ? [{ to: '/dashboard/communications', label: 'Message log' }] : []),
        ],
      },
      {
        label: 'Documents',
        items: [
          ...(hasPermission(permissions, 'documents.view') ? [{ to: '/dashboard/documents/quotes', label: 'Quote PDFs' }] : []),
          ...(hasPermission(permissions, 'documents.view') ? [{ to: '/dashboard/documents/invoices', label: 'Invoice PDFs' }] : []),
          ...(hasPermission(permissions, 'documents.view') ? [{ to: '/dashboard/documents/proofs', label: 'Proof PDFs' }] : []),
        ],
      },
      {
        label: 'Network',
        items: [
          ...(hasPermission(permissions, 'network.manage') ? [{ to: '/app/network', label: 'Network Admin' }] : []),
          ...(hasPermission(permissions, 'network.route') ? [{ to: '/app/network/routing', label: 'Routing' }] : []),
          ...(hasPermission(permissions, 'network.reports.view') ? [{ to: '/app/network/reports', label: 'Royalties' }] : []),
        ],
      },
      {
        label: 'Fundraising',
        items: [
          ...(hasPermission(permissions, 'fundraising.manage') ? [{ to: '/app/fundraising', label: 'Campaigns' }] : []),
          ...(hasPermission(permissions, 'fundraising.reports.view') ? [{ to: '/app/fundraising', label: 'Payout Ledger' }] : []),
        ],
      },
      {
        label: 'Settings',
        items: [
          ...(hasPermission(permissions, 'domains.manage') ? [{ to: '/app/settings/stores', label: 'Stores & Branding' }] : []),
          { to: '/app/settings/users', label: 'Users & Roles' },
          ...(hasPermission(permissions, 'billing.manage') ? [{ to: '/app/settings/billing', label: 'Billing' }] : []),
          ...(billingEnabled && hasPermission(permissions, 'billing.view') ? [{ to: '/dashboard/billing', label: 'Order Billing' }] : []),
        ],
      },
    ].filter((section) => section.items.length > 0);

    return res.json({ sections, permissions });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message || 'Failed to build navigation menu' });
  }
});

export default router;
