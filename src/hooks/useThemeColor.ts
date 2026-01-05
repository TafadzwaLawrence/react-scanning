import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Theme colors to match page headers
const routeThemeColors: Record<string, string> = {
  '/login': '#6366F1', // Indigo - matches login gradient
};

// Gray-800 for all authenticated pages with dark headers
const DEFAULT_THEME_COLOR = '#1F2937';

export function useThemeColor() {
  const location = useLocation();

  useEffect(() => {
    const themeColor = routeThemeColors[location.pathname] || DEFAULT_THEME_COLOR;
    
    // Update theme-color meta tag
    const metaThemeColor = document.getElementById('theme-color-meta');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', themeColor);
    }
  }, [location.pathname]);
}
