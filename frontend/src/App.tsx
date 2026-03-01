import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
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
import AppShell from './components/AppShell';
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
import DocumentsQuotesPage from './pages/DocumentsQuotesPage';
import DocumentsInvoicesPage from './pages/DocumentsInvoicesPage';
import DocumentsProofsPage from './pages/DocumentsProofsPage';
import DashboardProductBuilderPage from './pages/DashboardProductBuilderPage';
import NetworkAdminPage from './pages/NetworkAdminPage';
import NetworkRoutingPage from './pages/NetworkRoutingPage';
import NetworkReportsPage from './pages/NetworkReportsPage';
import FundraisingCampaignsPage from './pages/FundraisingCampaignsPage';
import ProductionV2BoardPage from './pages/ProductionV2BoardPage';

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
      <div className="min-h-screen bg-white dark:bg-slate-950">
        {/* Debug overlay to verify routing and auth state */}
        <div className="fixed bottom-2 right-2 z-50 text-xs bg-slate-800 text-slate-100 px-2 py-1 rounded opacity-70">
          <span>path: {typeof window !== 'undefined' ? window.location.pathname : 'n/a'}</span>
        </div>
        <Navbar />
        <main className="pt-16">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/solutions" element={<SolutionsPage />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/catalogs" element={<CatalogsPage />} />
            <Route path="/resources" element={<ResourcesPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/proof/:token" element={<ProofApprovalPage />} />
            <Route path="/quote/:token" element={<PublicQuotePage />} />
            <Route path="/invoice/:token" element={<PublicInvoicePage />} />
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
                  <AppShell />
                </ProtectedRoute>
              }
            >
              {/* Default to Dashboard */}
              <Route index element={<DashboardPage />} />
              <Route path="orders" element={<OrdersListPage />} />
              <Route path="orders/:orderId" element={<OrderDetailPage />} />
              <Route path="production" element={<ProductionQueuePage />} />
              <Route path="artwork" element={<ArtworkApprovalsPage />} />
              <Route path="designs" element={<DesignPage />} />
              <Route path="designs/:designId/edit" element={<DesignEditorPage />} />
              <Route path="cart" element={<CartPage />} />
              <Route path="checkout" element={<CheckoutPage />} />

              {/* Admin within /app */}
              <Route
                path="admin/production"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <ProductionDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/vendors/import"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <AdminVendorImportPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/vendors"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <AdminVendorsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/vendors/:vendorId"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <AdminVendorDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/pricing"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <AdminPricingRulesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/pricing-rules"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <AdminPricingRulesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/pricing-simulator"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <AdminPricingSimulatorPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/team-stores"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <AdminTeamStoresPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/inventory"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <AdminInventoryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/purchase-orders"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <AdminPurchaseOrdersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/webhooks"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <AdminWebhooksPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/suppliers"
                element={
                  <ProtectedRoute requiredRoles={["ADMIN", "STORE_OWNER"]}>
                    <AdminSupplierSyncPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/suppliers/runs/:runId"
                element={
                  <ProtectedRoute requiredRoles={["ADMIN", "STORE_OWNER"]}>
                    <AdminSupplierRunDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="settings/billing"
                element={
                  <ProtectedRoute requiredRoles={["ADMIN", "STORE_OWNER"]}>
                    <SettingsBillingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="settings/stores"
                element={
                  <ProtectedRoute requiredRoles={["ADMIN", "STORE_OWNER"]}>
                    <SettingsDomainsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="settings/users"
                element={
                  <ProtectedRoute requiredRoles={["ADMIN", "STORE_OWNER"]}>
                    <SettingsUsersRolesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="dashboard/onboarding"
                element={
                  <ProtectedRoute requiredRoles={["ADMIN", "STORE_OWNER"]}>
                    <OnboardingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="dashboard/storefront/theme"
                element={
                  <ProtectedRoute requiredRoles={["ADMIN", "STORE_OWNER"]}>
                    <StorefrontThemePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="dashboard/communications"
                element={
                  <ProtectedRoute requiredRoles={["ADMIN", "STORE_OWNER"]}>
                    <CommunicationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="dashboard/settings/email"
                element={
                  <ProtectedRoute requiredRoles={["ADMIN", "STORE_OWNER"]}>
                    <CommunicationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="dashboard/settings/domains"
                element={
                  <ProtectedRoute requiredRoles={["ADMIN", "STORE_OWNER"]}>
                    <SettingsDomainsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="dashboard/documents/quotes"
                element={
                  <ProtectedRoute requiredRoles={["ADMIN", "STORE_OWNER"]}>
                    <DocumentsQuotesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="dashboard/documents/invoices"
                element={
                  <ProtectedRoute requiredRoles={["ADMIN", "STORE_OWNER"]}>
                    <DocumentsInvoicesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="dashboard/documents/proofs"
                element={
                  <ProtectedRoute requiredRoles={["ADMIN", "STORE_OWNER"]}>
                    <DocumentsProofsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="network"
                element={
                  <ProtectedRoute requiredRoles={["ADMIN", "STORE_OWNER"]}>
                    <NetworkAdminPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="network/routing"
                element={
                  <ProtectedRoute requiredRoles={["ADMIN", "STORE_OWNER", "PRODUCTION_MANAGER"]}>
                    <NetworkRoutingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="network/reports"
                element={
                  <ProtectedRoute requiredRoles={["ADMIN", "STORE_OWNER"]}>
                    <NetworkReportsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="fundraising"
                element={
                  <ProtectedRoute requiredRoles={["ADMIN", "STORE_OWNER"]}>
                    <FundraisingCampaignsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="dashboard/production-v2"
                element={
                  <ProtectedRoute requiredRoles={["ADMIN", "STORE_OWNER", "PRODUCTION_MANAGER"]}>
                    <ProductionV2BoardPage />
                  </ProtectedRoute>
                }
              />
                <Route
                  path="admin/reports"
                  element={
                    <ProtectedRoute requiredRole="ADMIN">
                      <ReportsPage />
                    </ProtectedRoute>
                  }
                />
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
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
