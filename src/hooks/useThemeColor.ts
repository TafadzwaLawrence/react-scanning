import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Theme colors to match page headers
const routeThemeColors: Record<string, string> = {
  '/login': '#00007c', // Secondary brand color - navy blue
};

// White for all authenticated pages with white headers
const DEFAULT_THEME_COLOR = '#FFFFFF';

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
