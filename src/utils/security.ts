/**
 * Security utilities for protecting the application
 * Prevents tampering, debugging, and unauthorized access
 */

// Check if running in production
const isProduction = import.meta.env.PROD;

/**
 * Disable developer tools in production
 */
export const disableDevTools = (): void => {
  if (!isProduction) return;

  // Disable right-click context menu
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });

  // Disable keyboard shortcuts for dev tools
  document.addEventListener('keydown', (e) => {
    // F12
    if (e.key === 'F12') {
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+I (Dev Tools)
    if (e.ctrlKey && e.shiftKey && e.key === 'I') {
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+J (Console)
    if (e.ctrlKey && e.shiftKey && e.key === 'J') {
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+C (Element picker)
    if (e.ctrlKey && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      return false;
    }
    // Ctrl+U (View Source)
    if (e.ctrlKey && e.key === 'u') {
      e.preventDefault();
      return false;
    }
  });

  // Detect dev tools opening via window size change
  let devToolsOpen = false;
  const threshold = 160;

  const detectDevTools = () => {
    const widthThreshold = window.outerWidth - window.innerWidth > threshold;
    const heightThreshold = window.outerHeight - window.innerHeight > threshold;

    if (widthThreshold || heightThreshold) {
      if (!devToolsOpen) {
        devToolsOpen = true;
        handleDevToolsOpen();
      }
    } else {
      devToolsOpen = false;
    }
  };

  // Check periodically
  setInterval(detectDevTools, 1000);

  // Override console methods in production
  const noop = () => {};
  if (isProduction) {
    console.log = noop;
    console.debug = noop;
    console.info = noop;
    console.warn = noop;
    // Keep console.error for critical issues
  }
};

/**
 * Handle when dev tools are detected open
 */
const handleDevToolsOpen = (): void => {
  // Clear sensitive data from memory
  try {
    localStorage.removeItem('session_token');
    sessionStorage.clear();
  } catch {
    // Ignore errors
  }
  
  // Redirect to login
  window.location.href = '/login?error=security';
};

/**
 * Encrypt data using AES-GCM (Web Crypto API)
 */
export const encryptData = async (data: string, key: CryptoKey): Promise<string> => {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(data)
  );
  
  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encryptedData.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encryptedData), iv.length);
  
  return btoa(String.fromCharCode(...combined));
};

/**
 * Decrypt data using AES-GCM
 */
export const decryptData = async (encryptedString: string, key: CryptoKey): Promise<string> => {
  const combined = Uint8Array.from(atob(encryptedString), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  
  const decryptedData = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  
  return new TextDecoder().decode(decryptedData);
};

/**
 * Generate an encryption key from device fingerprint
 */
export const generateEncryptionKey = async (): Promise<CryptoKey> => {
  const fingerprint = await getDeviceFingerprint();
  const encoder = new TextEncoder();
  
  // Derive key from fingerprint
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(fingerprint),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('263tickets-salt-v1'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

/**
 * Get device fingerprint for binding sessions to device
 */
export const getDeviceFingerprint = async (): Promise<string> => {
  const components: string[] = [];
  
  // Screen info
  components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);
  
  // Timezone
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
  
  // Language
  components.push(navigator.language);
  
  // Platform
  components.push(navigator.platform);
  
  // User agent hash
  components.push(navigator.userAgent.slice(0, 50));
  
  // Hardware concurrency
  components.push(String(navigator.hardwareConcurrency || 4));
  
  // Device memory (if available)
  components.push(String((navigator as any).deviceMemory || 8));
  
  // Create hash of components
  const data = components.join('|');
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Sanitize user input to prevent XSS
 */
export const sanitizeInput = (input: string): string => {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
  };
  
  return input.replace(/[&<>"'`=/]/g, (char) => map[char]);
};

/**
 * Validate QR code format (prevent injection)
 */
export const validateQRCode = (qrCode: string): boolean => {
  // Only allow alphanumeric, hyphens, and underscores
  const validPattern = /^[a-zA-Z0-9\-_]{8,128}$/;
  return validPattern.test(qrCode);
};

/**
 * Validate UUID format
 */
export const validateUUID = (uuid: string): boolean => {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidPattern.test(uuid);
};

/**
 * Rate limiter to prevent abuse
 */
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  private maxAttempts: number;
  private windowMs: number;

  constructor(maxAttempts: number = 10, windowMs: number = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Remove old attempts outside the window
    const recentAttempts = attempts.filter(time => now - time < this.windowMs);
    
    if (recentAttempts.length >= this.maxAttempts) {
      return false;
    }
    
    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);
    return true;
  }

  getRemainingAttempts(key: string): number {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    const recentAttempts = attempts.filter(time => now - time < this.windowMs);
    return Math.max(0, this.maxAttempts - recentAttempts.length);
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }
}

/**
 * Create rate limiters for different operations
 */
export const loginRateLimiter = new RateLimiter(5, 300000); // 5 attempts per 5 minutes
export const scanRateLimiter = new RateLimiter(100, 60000); // 100 scans per minute
export const apiRateLimiter = new RateLimiter(60, 60000); // 60 API calls per minute

/**
 * Secure session token handling
 */
export const secureStorage = {
  setToken: async (token: string): Promise<void> => {
    try {
      const key = await generateEncryptionKey();
      const encrypted = await encryptData(token, key);
      sessionStorage.setItem('_st', encrypted);
      // Also set in localStorage for persistence (encrypted)
      localStorage.setItem('session_token', encrypted);
    } catch {
      // Fallback to plain storage if encryption fails
      sessionStorage.setItem('_st', token);
      localStorage.setItem('session_token', token);
    }
  },

  getToken: async (): Promise<string | null> => {
    try {
      const encrypted = sessionStorage.getItem('_st') || localStorage.getItem('session_token');
      if (!encrypted) return null;
      
      const key = await generateEncryptionKey();
      return await decryptData(encrypted, key);
    } catch {
      // Return raw value if decryption fails (legacy data)
      return sessionStorage.getItem('_st') || localStorage.getItem('session_token');
    }
  },

  removeToken: (): void => {
    sessionStorage.removeItem('_st');
    localStorage.removeItem('session_token');
  },
};

/**
 * Content Security Policy violation handler
 */
export const setupCSPHandler = (): void => {
  document.addEventListener('securitypolicyviolation', (e) => {
    // Log CSP violations (in production, send to monitoring service)
    if (!isProduction) {
      console.error('CSP Violation:', {
        blockedURI: e.blockedURI,
        violatedDirective: e.violatedDirective,
        originalPolicy: e.originalPolicy,
      });
    }
  });
};

/**
 * Integrity check - verify app hasn't been tampered with
 */
export const verifyAppIntegrity = async (): Promise<boolean> => {
  // In production, you would check against known hashes
  // This is a basic implementation
  try {
    // Check if critical functions exist and haven't been modified
    if (typeof crypto.subtle.encrypt !== 'function') return false;
    if (typeof crypto.subtle.decrypt !== 'function') return false;
    if (typeof fetch !== 'function') return false;
    
    return true;
  } catch {
    return false;
  }
};

/**
 * Initialize all security measures
 */
export const initializeSecurity = (): void => {
  // Setup CSP handler
  setupCSPHandler();
  
  // Disable dev tools in production
  disableDevTools();
  
  // Verify app integrity
  verifyAppIntegrity().then(isValid => {
    if (!isValid && isProduction) {
      // App may be tampered with
      window.location.href = '/login?error=integrity';
    }
  });
  
  // Clear sensitive data on page unload
  window.addEventListener('beforeunload', () => {
    // Keep session if remember me is enabled
    const rememberMe = localStorage.getItem('auth-storage');
    if (rememberMe) {
      try {
        const parsed = JSON.parse(rememberMe);
        if (!parsed.state?.rememberMe) {
          secureStorage.removeToken();
        }
      } catch {
        // Ignore parse errors
      }
    }
  });
  
  // Detect if page is being framed (clickjacking protection)
  if (window.self !== window.top) {
    // Page is in an iframe - potential clickjacking
    document.body.innerHTML = '';
    window.top?.location.replace(window.location.href);
  }
};
