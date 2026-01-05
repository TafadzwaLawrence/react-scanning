import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import {
  LoginPage,
  DashboardPage,
  ScannerPage,
  HistoryPage,
  ReportsPage,
  SettingsPage,
} from '@/pages';
import { ProtectedRoute } from '@/components/auth';
import { BottomNav, OfflineIndicator } from '@/components/layout';
import { ToastContainer } from '@/components/ui';
import { PWAUpdatePrompt } from '@/components/pwa';
import { useSyncStore } from '@/stores';
import { useThemeColor } from '@/hooks';

// Theme color manager component
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
      <div className={`min-h-screen ${isLoginPage ? '' : 'bg-gray-900'}`}>
        <OfflineIndicator />
        <ToastContainer />
        <PWAUpdatePrompt />

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

        {!isLoginPage && <BottomNav />}
      </div>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
