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

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user } = useAuthStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
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
            <Route path="/products/:productId" element={<ProductPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected App namespace */}
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <Outlet />
                </ProtectedRoute>
              }
            >
              {/* Default to Orders/Dashboard */}
              <Route index element={<OrdersPage />} />
              <Route path="orders" element={<OrdersPage />} />
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
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
