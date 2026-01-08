import { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Loading } from '@/components/ui';
const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const ScannerPage = lazy(() => import('@/pages/ScannerPage').then((m) => ({ default: m.ScannerPage })));
const HistoryPage = lazy(() => import('@/pages/HistoryPage').then((m) => ({ default: m.HistoryPage })));
const ReportsPage = lazy(() => import('@/pages/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
import { ProtectedRoute } from '@/components/auth';
import { BottomNav, OfflineIndicator } from '@/components/layout';
import { ToastContainer } from '@/components/ui';
import { PWAUpdatePrompt } from '@/components/pwa';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useSyncStore } from '@/stores';
import { useThemeColor } from '@/hooks';

// Updates status bar color to match page headers
function ThemeColorManager() {
  useThemeColor();
  return null;
}

function AppContent() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  // Setup online/offline listeners
  useEffect(() => {
    const setOnline = useSyncStore.getState().setOnline;

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial state
    setOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <>
      <ThemeColorManager />
      <div id="main" className="min-h-screen bg-gray-100">
        <OfflineIndicator />
        <ToastContainer />
        <PWAUpdatePrompt />

        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loading size="lg" message="Loading…" /></div>}>
          <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scanner"
            element={
              <ProtectedRoute>
                <ScannerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <HistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <ReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          {/* Default Redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>

        {!isLoginPage && <BottomNav />}
      </div>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
