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

// Theme colors for different pages
const PAGE_THEME_COLORS: Record<string, string> = {
  '/login': '#4f46e5', // Indigo for login
  '/scanner': '#111827', // Gray-900 for scanner
  '/dashboard': '#111827', // Gray-900 for dashboard header
  '/history': '#111827', // Gray-900
  '/reports': '#111827', // Gray-900
  '/settings': '#111827', // Gray-900
};

// Component to handle theme color changes
function ThemeColorManager() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    const themeColor = PAGE_THEME_COLORS[path] || '#111827';
    
    // Update all theme-color meta tags
    const metaTags = document.querySelectorAll('meta[name="theme-color"]');
    metaTags.forEach((meta) => {
      meta.setAttribute('content', themeColor);
    });
    
    // Also update msapplication-navbutton-color for Edge
    const navButtonMeta = document.querySelector('meta[name="msapplication-navbutton-color"]');
    if (navButtonMeta) {
      navButtonMeta.setAttribute('content', themeColor);
    }
  }, [location.pathname]);

  return null;
}

function AppContent() {
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
      <div className="min-h-screen bg-gray-900">
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

        <BottomNav />
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
