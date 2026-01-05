import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Theme colors for different routes
const routeThemeColors: Record<string, string> = {
  '/login': '#6366F1', // Indigo for login page gradient
  '/scanner': '#111827', // Dark gray for scanner
  '/dashboard': '#111827', // Dark gray
  '/history': '#111827', // Dark gray
  '/reports': '#111827', // Dark gray
  '/settings': '#111827', // Dark gray
};

const DEFAULT_THEME_COLOR = '#111827';

export function useThemeColor() {
  const location = useLocation();

  useEffect(() => {
    const themeColor = routeThemeColors[location.pathname] || DEFAULT_THEME_COLOR;
    
    // Update theme-color meta tag
    const metaThemeColor = document.getElementById('theme-color-meta');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', themeColor);
    }

    // Also update/create a secondary meta tag for better browser support
    let secondaryMeta = document.querySelector('meta[name="theme-color"]:not(#theme-color-meta)');
    if (!secondaryMeta) {
      secondaryMeta = document.createElement('meta');
      secondaryMeta.setAttribute('name', 'theme-color');
      document.head.appendChild(secondaryMeta);
    }
    secondaryMeta.setAttribute('content', themeColor);

  }, [location.pathname]);
}
