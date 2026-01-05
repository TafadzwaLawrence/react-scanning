# 📐 Technical Specifications

## Platform Requirements

### Progressive Web App (PWA)
| Requirement | Specification |
|------------|---------------|
| Browser Support | Chrome 80+, Safari 14+, Firefox 75+, Edge 80+ |
| Minimum Screen | 320px width (mobile-first) |
| Camera | MediaDevices API (getUserMedia) |
| Storage | IndexedDB (5GB+), LocalStorage |
| Service Worker | Required for offline functionality |
| HTTPS | Required |

### React Native (Future)
| Requirement | Specification |
|------------|---------------|
| iOS | 13.0+ |
| Android | API 26+ (Android 8.0) |
| Camera | react-native-camera / expo-camera |
| Storage | AsyncStorage, react-native-mmkv |

---

## Performance Requirements

| Metric | Target | Critical |
|--------|--------|----------|
| First Contentful Paint | < 1.5s | < 2.5s |
| Time to Interactive | < 3s | < 5s |
| Events List Load | < 2s | < 4s |
| Ticket Download (10k) | < 30s | < 60s |
| QR Scan to Result | < 500ms | < 1s |
| Local DB Query | < 100ms | < 200ms |
| Sync Batch (1000) | < 10s | < 20s |

---

## API Integration

### Base Configuration
```typescript
const API_CONFIG = {
  baseURL: 'https://api.263tickets.com/api/v1',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};
```

### Endpoints Summary

| Endpoint | Method | Auth | Rate Limit |
|----------|--------|------|------------|
| `/events/auth/login` | POST | No | 10/min |
| `/events/auth/logout` | POST | Token | 10/min |
| `/events/auth/check-session` | POST | Token | 30/min |
| `/events/all/ids` | GET | No | 30/min |
| `/event/{id}/ticketgroups` | GET | No | 30/min |
| `/event/{id}/ticketgroups/download` | POST | No | 5/min |
| `/event/{id}/verify/{qr}/{device}` | POST | No | 100/min |
| `/event/batch_verify` | POST | No | 10/min |
| `/event/{id}/report` | GET | No | 10/min |

---

## Database Schema (IndexedDB)

### Database: `ScanDB` v2

```typescript
// Object Stores
const DB_SCHEMA = {
  tickets: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [
      { name: 'qrcode', keyPath: 'qrcode', unique: true },
      { name: 'event_id', keyPath: 'event_id' },
      { name: 'sync_status', keyPath: 'sync_status' },
      { name: 'log_count', keyPath: 'log_count' },
      { name: 'scanned_at', keyPath: 'scanned_at' },
    ],
  },
  
  config: {
    keyPath: 'device_id',
    indexes: [],
  },
  
  selectedTypes: {
    keyPath: 'ticket_type',
    indexes: [],
  },
};
```

### Ticket Record
```typescript
interface TicketRecord {
  id?: number;                    // Auto-increment
  ticket_id: string;
  event_id: string;
  organisation_id: string;
  event_name: string;
  event_date: string;
  ticket_type: string;
  ticket_admittence: string;
  event_venue: string;
  event_city: string;
  qrcode: string;                 // Indexed, Unique
  ticket_number: string;
  serial: string;
  log_count: number;              // 0 = not scanned
  sync_status: 0 | 1;             // 0 = unsynced, 1 = synced
  scanned_at: number | null;      // Unix timestamp (ms)
  scanned_device_id: string | null;
}
```

---

## State Management

### Global State (Zustand)
```typescript
interface AppState {
  // Auth
  session: EventSession | null;
  isAuthenticated: boolean;
  
  // Device
  deviceId: string;
  
  // Event
  currentEvent: Event | null;
  selectedTicketTypes: string[];
  
  // Scanning
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: number | null;
  
  // Stats
  totalScans: number;
  syncedScans: number;
  unsyncedScans: number;
}
```

### Actions
```typescript
interface AppActions {
  // Auth
  login: (credentials: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<boolean>;
  
  // Event
  setEvent: (event: Event) => void;
  setTicketTypes: (types: string[]) => void;
  
  // Scanning
  scanTicket: (qrcode: string) => Promise<ScanResult>;
  syncScans: () => Promise<void>;
  
  // Connection
  setOnlineStatus: (status: boolean) => void;
}
```

---

## QR Scanner Configuration

```typescript
const SCANNER_CONFIG = {
  // Supported formats
  formats: [
    'QR_CODE',
    'CODE_128',
    'CODE_39',
    'EAN_13',
    'EAN_8',
  ],
  
  // Camera settings
  camera: {
    facingMode: 'environment',  // Back camera
    resolution: { width: 1280, height: 720 },
    focusMode: 'continuous',
  },
  
  // Scanning behavior
  scanning: {
    continuous: true,           // Focus mode
    cooldownMs: 3000,           // Same QR cooldown
    beepOnScan: true,
    vibrateOnScan: true,
  },
};
```

---

## Audio & Haptics

### Sound Effects
```typescript
const SOUNDS = {
  success: '/assets/sounds/success.mp3',
  failure: '/assets/sounds/failure.mp3',
};

// Preload on app init
const preloadSounds = async () => {
  await Promise.all([
    new Audio(SOUNDS.success).load(),
    new Audio(SOUNDS.failure).load(),
  ]);
};
```

### Vibration Patterns
```typescript
const VIBRATION_PATTERNS = {
  success: [100],              // Short pulse
  failure: [100, 50, 100],     // Double pulse
  warning: [200],              // Medium pulse
};

const vibrate = (pattern: number[]) => {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};
```

---

## Background Services

### Connection Monitor
```typescript
const CONNECTION_CHECK_INTERVAL = 2000; // 2 seconds

const checkConnection = async (): Promise<boolean> => {
  try {
    const response = await fetch('https://www.google.com', {
      method: 'HEAD',
      mode: 'no-cors',
    });
    return true;
  } catch {
    return false;
  }
};
```

### Sync Service
```typescript
const SYNC_INTERVAL = 30000; // 30 seconds

const syncService = {
  start: () => {
    setInterval(async () => {
      if (isOnline) {
        await syncPendingScans();
      }
    }, SYNC_INTERVAL);
  },
  
  syncNow: async () => {
    const unsynced = await db.getUnsynced();
    if (unsynced.length === 0) return;
    
    await api.batchVerify(unsynced);
    await db.markSynced(unsynced.map(s => s.qrcode));
  },
};
```

---

## Security Requirements

### Authentication
- [x] Session tokens (not passwords) stored locally
- [x] HTTPS only communication
- [x] Token expiration handling
- [x] Secure storage (no plaintext credentials)

### Data Protection
- [x] IndexedDB for sensitive ticket data
- [x] Clear data on logout option
- [x] No analytics with PII

### Input Validation
- [x] Sanitize QR code input
- [x] Validate API responses
- [x] XSS prevention

---

## Error Handling

### Error Types
```typescript
enum ErrorType {
  NETWORK = 'NETWORK',
  AUTH = 'AUTH',
  VALIDATION = 'VALIDATION',
  STORAGE = 'STORAGE',
  CAMERA = 'CAMERA',
  UNKNOWN = 'UNKNOWN',
}

interface AppError {
  type: ErrorType;
  message: string;
  code?: string;
  retryable: boolean;
}
```

### Error Messages
```typescript
const ERROR_MESSAGES = {
  NETWORK: 'Network error. Please check your connection.',
  AUTH_EXPIRED: 'Session expired. Please login again.',
  AUTH_INVALID: 'Invalid credentials. Please try again.',
  CAMERA_DENIED: 'Camera permission denied. Please enable in settings.',
  STORAGE_FULL: 'Storage full. Please clear some data.',
  SYNC_FAILED: 'Sync failed. Will retry automatically.',
};
```

---

## Accessibility Requirements

- [x] WCAG 2.1 AA compliance
- [x] Screen reader support
- [x] Keyboard navigation
- [x] Color contrast ratio 4.5:1+
- [x] Touch targets 44x44px minimum
- [x] Focus indicators
- [x] Alt text for images
- [x] Error announcements

---

## Testing Requirements

### Unit Tests
- API service functions
- Database operations
- Validation logic
- State management

### Integration Tests
- Login flow
- Scan and verify flow
- Offline mode
- Sync mechanism

### E2E Tests
- Complete user journey
- Error scenarios
- Network interruption

### Coverage Targets
| Type | Target |
|------|--------|
| Unit | 80% |
| Integration | 70% |
| E2E | Critical paths |
