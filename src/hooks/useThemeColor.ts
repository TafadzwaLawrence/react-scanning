import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Theme colors to match page headers
const routeThemeColors: Record<string, string> = {
  '/login': '#6366F1', // Indigo - matches login gradient
};

// White for all authenticated pages with white headers
const DEFAULT_THEME_COLOR = '#FFFFFF';

// Determine if a color is "light" (needs dark status bar text)
function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Using relative luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

export function useThemeColor() {
  const location = useLocation();

  useEffect(() => {
    const themeColor = routeThemeColors[location.pathname] || DEFAULT_THEME_COLOR;
    
    // Update theme-color meta tag (affects Android status bar)
    const metaThemeColor = document.getElementById('theme-color-meta');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', themeColor);
    }

    // Update Apple status bar style (affects iOS when added to home screen)
    const appleStatusBar = document.getElementById('apple-status-bar-style');
    if (appleStatusBar) {
      // Use 'default' for light backgrounds (dark text), 'black-translucent' for dark backgrounds (light text)
      const statusBarStyle = isLightColor(themeColor) ? 'default' : 'black-translucent';
      appleStatusBar.setAttribute('content', statusBarStyle);
    }
  }, [location.pathname]);
}
