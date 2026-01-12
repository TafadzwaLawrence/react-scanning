import { useEffect } from 'react';

/**
 * Hook to dynamically set the device status bar color (theme-color meta tag)
 * This affects the browser toolbar/status bar on mobile devices
 * 
 * @param color - The hex color code for the status bar
 */
export const useStatusBarColor = (color: string) => {
  useEffect(() => {
    // Update the theme-color meta tag
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', color);
    }

    // Also update msapplication colors for Windows
    const msNavButton = document.querySelector('meta[name="msapplication-navbutton-color"]');
    if (msNavButton) {
      msNavButton.setAttribute('content', color);
    }

    // Cleanup: reset to default when component unmounts (optional)
    return () => {
      // We don't reset here - the next page will set its own color
    };
  }, [color]);
};

// Common color constants for the app
export const STATUS_BAR_COLORS = {
  // Navy/Secondary - for dashboard hero header
  SECONDARY: '#00007c',
  // White/Surface - for pages with white headers  
  SURFACE: '#ffffff',
  // Background/Muted - for pages with muted background headers
  MUTED: '#f3f4f6',
} as const;
