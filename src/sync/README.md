# Sync Module - Data Transfer Implementation

This folder contains a complete implementation for syncing all data from the React PWA to the Laravel API, including support for localhost development.

## Folder Structure

```
src/sync/
├── index.ts        # Main entry point - exports all public APIs
├── types.ts        # TypeScript type definitions
├── device.ts       # Device identification utilities
├── queue.ts        # IndexedDB queue for pending data
├── client.ts       # HTTP client with retry logic
├── manager.ts      # Orchestrates all sync operations
└── hooks.ts        # React hooks for easy integration
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Components                          │
│                                                             │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│   │ useSync()   │  │ SyncButton  │  │ SyncStatus  │        │
│   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
└──────────┼────────────────┼────────────────┼───────────────┘
           │                │                │
           └────────────────┼────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Sync Manager                              │
│                                                             │
│   • Orchestrates sync operations                            │
│   • Manages sync state                                      │
│   • Handles progress tracking                               │
│   • Auto-sync on reconnection                               │
└─────────────────────────────────────────────────────────────┘
           │                │                │
           ▼                ▼                ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Queue     │    │   Client    │    │   Device    │
│             │    │             │    │             │
│ • IndexedDB │    │ • HTTP/REST │    │ • Device ID │
│ • Pending   │    │ • Retries   │    │ • OS info   │
│   scans     │    │ • Batching  │    │ • Browser   │
│ • Session   │    │ • Timeout   │    │   info      │
│   logs      │    │             │    │             │
└──────┬──────┘    └──────┬──────┘    └─────────────┘
       │                  │
       │                  │
       ▼                  ▼
┌─────────────┐    ┌─────────────────────────────────────────┐
│  IndexedDB  │    │           Laravel API                   │
│             │    │                                         │
│ Offline     │    │  POST /event/batch_verify              │
│ Storage     │    │  (existing batchVerifyTickets)         │
│             │    │                                         │
└─────────────┘    └─────────────────────────────────────────┘
```

## Quick Start

### 1. Initialize on App Start

```typescript
// src/main.tsx or App.tsx
import { initSync, setSyncAuthToken } from './sync';

// Initialize with your API URL
initSync('https://api.263tickets.com');

// Set auth token when user logs in
setSyncAuthToken(authToken);
```

### 2. Use in React Components

```typescript
import { useSync } from './sync';

function SyncPanel() {
  const {
    sync,
    isSyncing,
    stats,
    progress,
    canSync,
  } = useSync({
    apiBaseUrl: 'https://api.263tickets.com',
    authToken: userToken,
    eventId: currentEvent.id,
    autoSync: true,           // Enable auto-sync
    autoSyncInterval: 60000,  // Sync every minute
  });

  return (
    <div>
      <p>{stats?.pending_scans || 0} scans pending</p>
      
      {isSyncing && progress && (
        <div>
          Syncing... {progress.current}/{progress.total}
        </div>
      )}
      
      <button onClick={sync} disabled={!canSync || isSyncing}>
        Sync Now
      </button>
    </div>
  );
}
```

### 3. Add Scans to Queue

```typescript
import { addPendingScan } from './sync';

// When scanning offline or online
await addPendingScan({
  qrcode: 'TICKET-123-ABC',
  eventId: 'event-456',
  gateName: 'Gate A',
  ticketTypes: ['VIP'],
});
```

## Key Features

### Offline-First Queue

All scans are first stored in IndexedDB, then synced when online:

```typescript
import { 
  addPendingScan, 
  getPendingScans, 
  getPendingScansCount 
} from './sync';

// Add scan (works offline)
await addPendingScan({ qrcode, eventId });

// Get pending count
const count = await getPendingScansCount();

// Get all pending
const pending = await getPendingScans(eventId);
```

### Batch Sync with Retry

Syncs in batches of 50 with automatic retry on failure:

```typescript
import { syncAll } from './sync';

const result = await syncAll(eventId, (progress) => {
  console.log(`${progress.current}/${progress.total}`);
});

console.log(`Synced: ${result.synced}, Failed: ${result.failed}`);
```

### Data Export/Import

Export all data for debugging or manual transfer:

```typescript
import { exportAllData, downloadExport, importData } from './sync';

// Get export object
const data = await exportAllData(eventId);

// Download as JSON file
await downloadExport(eventId);

// Import from JSON
const result = await importData(jsonString);
```

### Device Identification

Consistent device ID across sessions:

```typescript
import { getDeviceId, collectDeviceInfo } from './sync';

const deviceId = getDeviceId(); // Persistent UUID
const info = collectDeviceInfo(); // Full device details
```

## API Reference

### Manager Functions

| Function | Description |
|----------|-------------|
| `initSync(apiBaseUrl, authToken?)` | Initialize the sync system |
| `setSyncAuthToken(token)` | Update authentication token |
| `syncAll(eventId, onProgress?)` | Sync all pending data |
| `getSyncStatus()` | Get current sync status |
| `getStats()` | Get queue statistics |
| `canSync()` | Check if sync is possible |
| `exportAllData(eventId)` | Export all local data |
| `downloadExport(eventId)` | Download export as JSON |
| `importData(json)` | Import data from JSON |
| `cleanup(daysOld?)` | Remove old synced data |

### Queue Functions

| Function | Description |
|----------|-------------|
| `addPendingScan(params)` | Add scan to queue |
| `getPendingScans(eventId?)` | Get pending scans |
| `getPendingScansCount(eventId?)` | Get pending count |
| `markScansAsSynced(ids)` | Mark as synced |
| `getFailedScans(maxAttempts?)` | Get failed scans |
| `cleanupSyncedScans(days?)` | Clean old data |

### React Hooks

```typescript
// Full sync management
const {
  status,      // SyncStatus
  stats,       // QueueStats
  progress,    // SyncProgress
  isSyncing,   // boolean
  isOnline,    // boolean
  canSync,     // boolean
  deviceId,    // string
  sync,        // () => Promise
  exportData,  // () => Promise
  downloadData,// () => Promise
  refresh,     // () => Promise
} = useSync(options);

// Lightweight status only
const { isSyncing, pendingCount, lastSyncAt } = useSyncStatus();
```

## Laravel API Integration

This sync module uses your existing `batchVerifyTickets` endpoint:

```
POST /event/batch_verify

Request:
{
  "scans": [
    { "qrcode": "ABC123", "device_id": "uuid", "scanned_at": 1736668800000 },
    { "qrcode": "DEF456", "device_id": "uuid", "scanned_at": 1736668801000 }
  ]
}

Response:
{
  "status": 200,
  "success_count": 2,
  "results": [
    { "qrcode": "ABC123", "status": 200, "type": "VIP", "number": "001" },
    { "qrcode": "DEF456", "status": 403, "scanned_at": "...", "scanned_by": "..." }
  ]
}
```

### Status Codes

| Code | Meaning | Sync Status |
|------|---------|-------------|
| 200 | Successfully scanned | `synced` |
| 403 | Already scanned | `duplicate` |
| 404 | Ticket not found | `not_found` |
| 500 | Server error | `failed` |

## Localhost Development

The sync works seamlessly on localhost:

1. **Start Laravel API** (e.g., `php artisan serve`)
2. **Initialize with localhost URL**:
   ```typescript
   initSync('http://localhost:8000/api');
   ```
3. **CORS Configuration** - Ensure Laravel allows localhost:
   ```php
   // config/cors.php
   'allowed_origins' => ['http://localhost:5173', 'http://localhost:3000'],
   ```

## Data Types

### PendingScan
```typescript
interface PendingScan {
  id: string;
  qrcode: string;
  device_id: string;
  event_id: string;
  scanned_at: number;
  ticket_types?: string[];
  gate_name?: string;
  offline: boolean;
  synced: boolean;
  sync_attempts: number;
  last_sync_attempt?: number;
  sync_error?: string;
}
```

### SyncProgress
```typescript
interface SyncProgress {
  total: number;
  current: number;
  percentage: number;
  phase: 'preparing' | 'uploading' | 'processing' | 'complete' | 'error';
  message: string;
}
```

### FullDataExport
```typescript
interface FullDataExport {
  version: string;
  exported_at: number;
  device: DeviceInfo;
  event_id: string;
  scans: PendingScan[];
  session_logs: SessionLog[];
  settings: Record<string, unknown>;
  stats: {
    total_scans: number;
    pending_scans: number;
    synced_scans: number;
    sessions: number;
  };
}
```

## Error Handling

The sync system handles errors gracefully:

- **Network errors**: Retries up to 3 times with exponential backoff
- **Auth errors**: Returns immediately (401/403), doesn't retry
- **Timeouts**: 30 second default timeout per request
- **Offline**: Queues locally, syncs when back online

```typescript
const result = await syncAll(eventId);

if (!result.success) {
  // Check failed scans
  const failed = await getFailedScans();
  console.log('Failed scans:', failed);
}
```

## Performance Considerations

- **Batch size**: 50 scans per request (configurable)
- **IndexedDB**: Efficient storage for thousands of scans
- **Cleanup**: Call `cleanup(7)` periodically to remove old synced data
- **Auto-sync**: Uses 60-second intervals by default
