import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import ProductPage from './pages/ProductPage';
import DesignPage from './pages/DesignPage';
import DesignEditorPage from './pages/DesignEditorPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrdersPage from './pages/OrdersPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProductionDashboard from './pages/ProductionDashboard';
import AdminVendorImportPage from './pages/AdminVendorImportPage';
import AdminPricingRulesPage from './pages/AdminPricingRulesPage';
import AdminVendorsPage from './pages/AdminVendorsPage';
import AdminVendorDetailPage from './pages/AdminVendorDetailPage';
import AdminPricingSimulatorPage from './pages/AdminPricingSimulatorPage';
import SolutionsPage from './pages/SolutionsPage';
import FeaturesPage from './pages/FeaturesPage';
import CatalogsPage from './pages/CatalogsPage';
import ResourcesPage from './pages/ResourcesPage';
import ContactPage from './pages/ContactPage';
import PricingPage from './pages/PricingPage';
import AdminDemoPage from './pages/AdminDemoPage';
import DashboardPage from './pages/DashboardPage';
import DecoShell from './layouts/DecoShell';
import OrdersListPage from './pages/OrdersListPage';
import OrderDetailPage from './pages/OrderDetailPage';
import ProductionQueuePage from './pages/ProductionQueuePage';
import ArtworkApprovalsPage from './pages/ArtworkApprovalsPage';
import ReportsPage from './pages/ReportsPage';
import DashboardProductsPage from './pages/DashboardProductsPage';
import DashboardProductDetailPage from './pages/DashboardProductDetailPage';
import DashboardPricingPage from './pages/DashboardPricingPage';
import DashboardQuotesPage from './pages/DashboardQuotesPage';
import ProofApprovalPage from './pages/ProofApprovalPage';
import StoreHomePage from './pages/StoreHomePage';
import StoreProductsPage from './pages/StoreProductsPage';
import StoreProductDetailPage from './pages/StoreProductDetailPage';
import StoreProductCustomizerPage from './pages/StoreProductCustomizerPage';
import StoreCartPage from './pages/StoreCartPage';
import StoreCheckoutPage from './pages/StoreCheckoutPage';
import StoreOrderStatusPage from './pages/StoreOrderStatusPage';
import TeamStorePage from './pages/TeamStorePage';
import TeamStoreProductPage from './pages/TeamStoreProductPage';
import TeamStoreCartPage from './pages/TeamStoreCartPage';
import TeamStoreCheckoutPage from './pages/TeamStoreCheckoutPage';
import AdminTeamStoresPage from './pages/AdminTeamStoresPage';
import AdminInventoryPage from './pages/AdminInventoryPage';
import AdminPurchaseOrdersPage from './pages/AdminPurchaseOrdersPage';
import AdminWebhooksPage from './pages/AdminWebhooksPage';
import AdminSupplierSyncPage from './pages/AdminSupplierSyncPage';
import AdminSupplierRunDetailPage from './pages/AdminSupplierRunDetailPage';
import SettingsBillingPage from './pages/SettingsBillingPage';
import SettingsDomainsPage from './pages/SettingsDomainsPage';
import SettingsUsersRolesPage from './pages/SettingsUsersRolesPage';
import OnboardingPage from './pages/OnboardingPage';
import StorefrontThemePage from './pages/StorefrontThemePage';
import CommunicationsPage from './pages/CommunicationsPage';
import PublicQuotePage from './pages/PublicQuotePage';
import PublicInvoicePage from './pages/PublicInvoicePage';
import PublicPortalPage from './pages/PublicPortalPage';
import DocumentsQuotesPage from './pages/DocumentsQuotesPage';
import DocumentsInvoicesPage from './pages/DocumentsInvoicesPage';
import DocumentsProofsPage from './pages/DocumentsProofsPage';
import DashboardProductBuilderPage from './pages/DashboardProductBuilderPage';
import NetworkAdminPage from './pages/NetworkAdminPage';
import NetworkRoutingPage from './pages/NetworkRoutingPage';
import NetworkReportsPage from './pages/NetworkReportsPage';
import FundraisingCampaignsPage from './pages/FundraisingCampaignsPage';
import ProductionV2BoardPage from './pages/ProductionV2BoardPage';
import DashboardInventoryPage from './pages/DashboardInventoryPage';
import DashboardPurchasingPage from './pages/DashboardPurchasingPage';
import DashboardBillingPage from './pages/DashboardBillingPage';
import DashboardShippingPage from './pages/DashboardShippingPage';
import DashboardNotificationsPage from './pages/DashboardNotificationsPage';
import DashboardWebhooksPage from './pages/DashboardWebhooksPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AppRouteErrorBoundary from './components/AppRouteErrorBoundary';
import AppDashboardPage from './pages/app/DashboardPage';
import AppOrdersPage from './pages/app/OrdersPage';
import AppOrderDetailPage from './pages/app/OrderDetailPage';
import AppOrderCreatePage from './pages/app/OrderCreatePage';
import AppProductsPage from './pages/app/ProductsPage';
import AppQuotesPage from './pages/app/QuotesPage';
import AppQuoteCreatePage from './pages/app/QuoteCreatePage';
import AppQuoteDetailPage from './pages/app/QuoteDetailPage';
import AppProductDetailPage from './pages/app/ProductDetailPage';
import AppProductImportPage from './pages/app/ProductImportPage';
import AppProductionPage from './pages/app/ProductionPage';
import AppProductionBoardPage from './pages/app/ProductionBoardPage';
import AppProductionJobsPage from './pages/app/ProductionJobsPage';
import AppInventoryPage from './pages/app/InventoryPage';
import AppInventoryReceivePage from './pages/app/InventoryReceivePage';
import AppPurchasingPage from './pages/app/PurchasingPage';
import AppPurchasingDetailPage from './pages/app/PurchasingDetailPage';
import AppBillingPage from './pages/app/BillingPage';
import AppShippingPage from './pages/app/ShippingPage';
import AppReportsPage from './pages/app/ReportsPage';
import AppNotFoundPage from './pages/app/AppNotFoundPage';
import AppCustomersPage from './pages/app/CustomersPage';
import AppStoresPage from './pages/app/StoresPage';
import AppUsersRolesPage from './pages/app/UsersRolesPage';
import AppIntegrationsPage from './pages/app/IntegrationsPage';
import AppWebhooksPage from './pages/app/WebhooksPage';
import AppPaymentsPage from './pages/app/PaymentsPage';
import AppTaxesPage from './pages/app/TaxesPage';
import BuildBanner from './components/BuildBanner';
import AppAdminPage from './pages/app/AdminPage';
import AppSettingsPage from './pages/app/SettingsPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  requiredRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole, requiredRoles }) => {
  const { user } = useAuthStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const allowedRoles = requiredRoles || (requiredRole ? [requiredRole] : []);
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function AppRoutes() {
  const location = useLocation();
  const isAppRoute = location.pathname.startsWith('/app');

  return (
    <div className={isAppRoute ? 'deco-root min-h-screen' : 'min-h-screen bg-white dark:bg-slate-950'}>
      {!isAppRoute ? <Navbar /> : null}
      <main className={isAppRoute ? '' : 'pt-16'}>
        <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Navigate to="/app" replace />} />
            <Route path="/solutions" element={<SolutionsPage />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/catalogs" element={<CatalogsPage />} />
            <Route path="/resources" element={<ResourcesPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/proof/:token" element={<ProofApprovalPage />} />
            <Route path="/quote/:token" element={<PublicQuotePage />} />
            <Route path="/invoice/:token" element={<PublicInvoicePage />} />
            <Route path="/portal/:token" element={<PublicPortalPage />} />
            <Route path="/products/:productId" element={<ProductPage />} />
            <Route path="/store" element={<StoreHomePage />} />
            <Route path="/store/products" element={<StoreProductsPage />} />
            <Route path="/store/products/:id" element={<StoreProductDetailPage />} />
            <Route path="/store/products/:slugOrId/customize" element={<StoreProductCustomizerPage />} />
            <Route path="/store/cart" element={<StoreCartPage />} />
            <Route path="/store/checkout" element={<StoreCheckoutPage />} />
            <Route path="/store/order/:token" element={<StoreOrderStatusPage />} />
            <Route path="/team/:slug" element={<TeamStorePage />} />
            <Route path="/team/:slug/products/:id" element={<TeamStoreProductPage />} />
            <Route path="/team/:slug/cart" element={<TeamStoreCartPage />} />
            <Route path="/team/:slug/checkout" element={<TeamStoreCheckoutPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected App namespace */}
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <AppRouteErrorBoundary>
                    <DecoShell />
                  </AppRouteErrorBoundary>
                </ProtectedRoute>
              }
            >
              <Route index element={<AppDashboardPage />} />
              <Route path="orders" element={<AppOrdersPage />} />
              <Route path="orders/new" element={<AppOrderCreatePage />} />
              <Route path="orders/:id" element={<AppOrderDetailPage />} />

              <Route path="products" element={<AppProductsPage />} />
              <Route path="products/import" element={<AppProductImportPage />} />
              <Route path="catalogs" element={<AppProductsPage />} />
              <Route path="products/:id" element={<AppProductDetailPage />} />

              <Route path="quotes" element={<AppQuotesPage />} />
              <Route path="quotes/new" element={<AppQuoteCreatePage />} />
              <Route path="quotes/:id" element={<AppQuoteDetailPage />} />

              <Route path="production" element={<AppProductionPage />}>
                <Route index element={<Navigate to="/app/production/board" replace />} />
                <Route path="board" element={<AppProductionBoardPage />} />
                <Route path="jobs" element={<AppProductionJobsPage />} />
              </Route>

              <Route path="inventory" element={<AppInventoryPage />} />
              <Route path="inventory/receive" element={<AppInventoryReceivePage />} />

              <Route path="purchasing" element={<AppPurchasingPage />} />
              <Route path="purchasing/:id" element={<AppPurchasingDetailPage />} />

              <Route path="billing" element={<AppBillingPage />} />
              <Route path="payments" element={<AppPaymentsPage />} />
              <Route path="taxes" element={<AppTaxesPage />} />
              <Route path="shipping" element={<AppShippingPage />} />
              <Route path="shipments" element={<AppShippingPage />} />
              <Route path="webhooks" element={<AppWebhooksPage />} />
              <Route path="customers" element={<AppCustomersPage />} />
              <Route path="stores" element={<AppStoresPage />} />
              <Route path="users-roles" element={<AppUsersRolesPage />} />
              <Route path="integrations" element={<AppIntegrationsPage />} />
              <Route path="reports" element={<AppReportsPage />} />
              <Route path="admin" element={<AppAdminPage />} />
              <Route
                path="admin/suppliers"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <AdminSupplierSyncPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/suppliers/runs/:runId"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <AdminSupplierRunDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route path="settings" element={<AppSettingsPage />} />

              <Route path="*" element={<AppNotFoundPage />} />
            </Route>

            {/* Protected Routes - Customer */}
            <Route
              path="/designs"
              element={
                <ProtectedRoute>
                  <DesignPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/designs/:designId/edit"
              element={
                <ProtectedRoute>
                  <DesignEditorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cart"
              element={
                <ProtectedRoute>
                  <CartPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/checkout"
              element={
                <ProtectedRoute>
                  <CheckoutPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <OrdersPage />
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin/production"
              element={
                <ProtectedRoute requiredRole="ADMIN">
                  <ProductionDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/demo"
              element={
                <ProtectedRoute requiredRole="ADMIN">
                  <AdminDemoPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/vendors/import"
              element={
                <ProtectedRoute requiredRole="ADMIN">
                  <AdminVendorImportPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/vendors"
              element={
                <ProtectedRoute requiredRole="ADMIN">
                  <AdminVendorsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/vendors/:vendorId"
              element={
                <ProtectedRoute requiredRole="ADMIN">
                  <AdminVendorDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/pricing"
              element={
                <ProtectedRoute requiredRole="ADMIN">
                  <AdminPricingRulesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/pricing-rules"
              element={
                <ProtectedRoute requiredRole="ADMIN">
                  <AdminPricingRulesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/pricing-simulator"
              element={
                <ProtectedRoute requiredRole="ADMIN">
                  <AdminPricingSimulatorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/team-stores"
              element={
                <ProtectedRoute requiredRole="ADMIN">
                  <AdminTeamStoresPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/inventory"
              element={
                <ProtectedRoute requiredRole="ADMIN">
                  <AdminInventoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/purchase-orders"
              element={
                <ProtectedRoute requiredRole="ADMIN">
                  <AdminPurchaseOrdersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/webhooks"
              element={
                <ProtectedRoute requiredRole="ADMIN">
                  <AdminWebhooksPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/suppliers"
              element={
                <ProtectedRoute requiredRole="ADMIN">
                  <AdminSupplierSyncPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/suppliers/runs/:runId"
              element={
                <ProtectedRoute requiredRole="ADMIN">
                  <AdminSupplierRunDetailPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/products"
              element={
                <ProtectedRoute>
                  <DashboardProductsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/products/:id"
              element={
                <ProtectedRoute>
                  <DashboardProductDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/catalog/product-builder/:productId"
              element={
                <ProtectedRoute>
                  <DashboardProductBuilderPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/pricing"
              element={
                <ProtectedRoute>
                  <DashboardPricingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/quotes"
              element={
                <ProtectedRoute>
                  <DashboardQuotesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/onboarding"
              element={
                <ProtectedRoute>
                  <OnboardingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/storefront/theme"
              element={
                <ProtectedRoute>
                  <StorefrontThemePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/communications"
              element={
                <ProtectedRoute>
                  <CommunicationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/settings/email"
              element={
                <ProtectedRoute>
                  <CommunicationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/settings/domains"
              element={
                <ProtectedRoute>
                  <SettingsDomainsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/documents/quotes"
              element={
                <ProtectedRoute>
                  <DocumentsQuotesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/documents/invoices"
              element={
                <ProtectedRoute>
                  <DocumentsInvoicesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/documents/proofs"
              element={
                <ProtectedRoute>
                  <DocumentsProofsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/designs"
              element={
                <ProtectedRoute>
                  <DesignPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/designs/:designId"
              element={
                <ProtectedRoute>
                  <DesignEditorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/production-v2"
              element={
                <ProtectedRoute requiredRoles={["ADMIN", "STORE_OWNER", "PRODUCTION_MANAGER"]}>
                  <ProductionV2BoardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/inventory"
              element={
                <ProtectedRoute requiredRoles={["ADMIN", "STORE_OWNER", "PRODUCTION_MANAGER"]}>
                  <DashboardInventoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/purchasing"
              element={
                <ProtectedRoute requiredRoles={["ADMIN", "STORE_OWNER", "PRODUCTION_MANAGER"]}>
                  <DashboardPurchasingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/billing"
              element={
                <ProtectedRoute requiredRoles={["ADMIN", "STORE_OWNER"]}>
                  <DashboardBillingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/shipping"
              element={
                <ProtectedRoute requiredRoles={["ADMIN", "STORE_OWNER", "PRODUCTION_MANAGER"]}>
                  <DashboardShippingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="dashboard/notifications"
              element={
                <ProtectedRoute requiredRoles={["ADMIN", "STORE_OWNER"]}>
                  <DashboardNotificationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="dashboard/webhooks"
              element={
                <ProtectedRoute requiredRoles={["ADMIN", "STORE_OWNER"]}>
                  <DashboardWebhooksPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="dashboard/analytics"
              element={
                <ProtectedRoute requiredRoles={["ADMIN", "STORE_OWNER", "PRODUCTION_MANAGER"]}>
                  <AnalyticsPage />
                </ProtectedRoute>
              }
            />
        </Routes>
      </main>
      <BuildBanner />
    </div>
  );
}

function App() {
  const { checkAuth, loading } = useAuthStore();

  React.useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;
