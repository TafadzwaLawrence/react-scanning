# Sync Implementation Guide

## Overview

This guide covers the bidirectional sync between the React PWA scanner app and the Laravel API.

---

## 1. Laravel Migrations (New Tables Only - Production Safe)

### Migration: Device Scan Logs

```php
<?php
// database/migrations/2026_01_12_000001_create_device_scan_logs_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('device_scan_logs', function (Blueprint $table) {
            $table->id();
            $table->string('event_id');
            $table->string('device_id');
            $table->string('qrcode');
            $table->timestamp('scanned_at_device')->nullable(); // When scanned on device
            $table->timestamp('synced_at')->nullable(); // When synced to server
            $table->enum('sync_status', ['pending', 'synced', 'failed', 'conflict'])->default('pending');
            $table->string('sync_error')->nullable();
            $table->json('metadata')->nullable(); // Additional device info
            $table->timestamps();
            
            $table->index(['event_id', 'device_id']);
            $table->index(['qrcode', 'event_id']);
            $table->index('sync_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('device_scan_logs');
    }
};
```

### Migration: Sync Sessions

```php
<?php
// database/migrations/2026_01_12_000002_create_sync_sessions_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sync_sessions', function (Blueprint $table) {
            $table->id();
            $table->string('event_id');
            $table->string('device_id');
            $table->string('session_token')->unique();
            $table->integer('scans_uploaded')->default(0);
            $table->integer('scans_successful')->default(0);
            $table->integer('scans_failed')->default(0);
            $table->integer('scans_duplicate')->default(0);
            $table->timestamp('started_at');
            $table->timestamp('completed_at')->nullable();
            $table->enum('status', ['in_progress', 'completed', 'failed'])->default('in_progress');
            $table->text('error_message')->nullable();
            $table->timestamps();
            
            $table->index(['event_id', 'device_id']);
            $table->index('session_token');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sync_sessions');
    }
};
```

### Migration: Event Login Logs

```php
<?php
// database/migrations/2026_01_12_000003_create_event_login_logs_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_login_logs', function (Blueprint $table) {
            $table->id();
            $table->string('event_id');
            $table->string('identifier'); // username or event_id used for login
            $table->string('device_id')->nullable();
            $table->boolean('success')->default(false);
            $table->string('message')->nullable();
            $table->string('ip_address')->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamps();
            
            $table->index(['event_id', 'device_id']);
            $table->index('success');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_login_logs');
    }
};
```

---

## 2. Laravel API Endpoints

### Add to OfflineTicketsController.php

```php
/**
 * Sync offline scans from device to server
 * This is the main endpoint the PWA calls to upload pending scans
 */
public function syncOfflineScans(Request $request)
{
    try {
        $validated = $request->validate([
            'event_id'              => 'required|string',
            'device_id'             => 'required|string',
            'session_token'         => 'required|string',
            'scans'                 => 'required|array',
            'scans.*.qrcode'        => 'required|string',
            'scans.*.scanned_at'    => 'required|numeric', // Unix timestamp
            'scans.*.ticket_types'  => 'sometimes|array',
        ]);

        $eventId = $validated['event_id'];
        $deviceId = $validated['device_id'];
        $scans = $validated['scans'];

        // Create sync session record
        $syncSession = DB::table('sync_sessions')->insertGetId([
            'event_id'          => $eventId,
            'device_id'         => $deviceId,
            'session_token'     => $validated['session_token'],
            'scans_uploaded'    => count($scans),
            'started_at'        => now(),
            'status'            => 'in_progress',
            'created_at'        => now(),
            'updated_at'        => now(),
        ]);

        $results = [];
        $successCount = 0;
        $failedCount = 0;
        $duplicateCount = 0;

        foreach ($scans as $scan) {
            $qrcode = $scan['qrcode'];
            $scannedAt = Carbon::createFromTimestamp($scan['scanned_at'] / 1000); // JS timestamp is in ms

            // Find the ticket
            $ticket = OfflineTickets::where('qrcode', $qrcode)
                ->where('event_id', $eventId)
                ->select(['id', 'log_count', 'event_ticket_type', 'event_ticket_admittence', 'ticket_number', 'scanned_at', 'device_id'])
                ->first();

            if (!$ticket) {
                // Ticket not found
                $results[] = [
                    'qrcode'    => $qrcode,
                    'status'    => 404,
                    'message'   => 'Ticket not found',
                    'sync_status' => 'failed'
                ];
                $failedCount++;
                
                // Log the failed scan
                $this->logDeviceScan($eventId, $deviceId, $qrcode, $scannedAt, 'failed', 'Ticket not found');
                continue;
            }

            // Check if already scanned
            if ($ticket->log_count > 0) {
                // Already scanned - check if by same device
                if ($ticket->device_id === $deviceId) {
                    // Same device, likely a duplicate sync
                    $results[] = [
                        'qrcode'        => $qrcode,
                        'status'        => 200,
                        'message'       => 'Already synced by this device',
                        'sync_status'   => 'duplicate',
                        'type'          => $ticket->event_ticket_type,
                        'number'        => $ticket->ticket_number,
                    ];
                    $duplicateCount++;
                } else {
                    // Different device - conflict
                    $results[] = [
                        'qrcode'        => $qrcode,
                        'status'        => 409,
                        'message'       => 'Already scanned by another device',
                        'sync_status'   => 'conflict',
                        'scanned_at'    => $ticket->scanned_at,
                        'scanned_by'    => $ticket->device_id,
                        'type'          => $ticket->event_ticket_type,
                        'number'        => $ticket->ticket_number,
                    ];
                    $failedCount++;
                    
                    $this->logDeviceScan($eventId, $deviceId, $qrcode, $scannedAt, 'conflict', 'Already scanned by ' . $ticket->device_id);
                }
                continue;
            }

            // First scan - update the ticket
            OfflineTickets::where('id', $ticket->id)->update([
                'log_count'     => 1,
                'sync'          => 1,
                'scanned_at'    => $scannedAt,
                'device_id'     => $deviceId
            ]);

            $results[] = [
                'qrcode'        => $qrcode,
                'status'        => 200,
                'message'       => 'Synced successfully',
                'sync_status'   => 'synced',
                'type'          => $ticket->event_ticket_type,
                'admittence'    => $ticket->event_ticket_admittence,
                'number'        => $ticket->ticket_number,
            ];
            $successCount++;
            
            $this->logDeviceScan($eventId, $deviceId, $qrcode, $scannedAt, 'synced');
        }

        // Update sync session
        DB::table('sync_sessions')->where('id', $syncSession)->update([
            'scans_successful'  => $successCount,
            'scans_failed'      => $failedCount,
            'scans_duplicate'   => $duplicateCount,
            'completed_at'      => now(),
            'status'            => 'completed',
            'updated_at'        => now(),
        ]);

        return response()->json([
            'status'    => 200,
            'message'   => 'Sync completed',
            'summary'   => [
                'total_uploaded'    => count($scans),
                'successful'        => $successCount,
                'duplicates'        => $duplicateCount,
                'failed'            => $failedCount,
            ],
            'results'   => $results,
            'sync_session_id' => $syncSession,
            'synced_at' => now()->toDateTimeString(),
        ], 200);

    } catch (\Exception $e) {
        return Handler::handle($e);
    }
}

/**
 * Log device scan to database
 */
private function logDeviceScan($eventId, $deviceId, $qrcode, $scannedAt, $status, $error = null)
{
    try {
        DB::table('device_scan_logs')->insert([
            'event_id'          => $eventId,
            'device_id'         => $deviceId,
            'qrcode'            => $qrcode,
            'scanned_at_device' => $scannedAt,
            'synced_at'         => now(),
            'sync_status'       => $status,
            'sync_error'        => $error,
            'created_at'        => now(),
            'updated_at'        => now(),
        ]);
    } catch (\Exception $e) {
        \Log::error('Failed to log device scan', ['error' => $e->getMessage()]);
    }
}

/**
 * Get sync status for a device
 */
public function getDeviceSyncStatus(Request $request, $eventId, $deviceId)
{
    try {
        // Get last sync session
        $lastSync = DB::table('sync_sessions')
            ->where('event_id', $eventId)
            ->where('device_id', $deviceId)
            ->orderBy('completed_at', 'desc')
            ->first();

        // Get total scans by this device
        $totalScans = OfflineTickets::where('event_id', $eventId)
            ->where('device_id', $deviceId)
            ->count();

        // Get pending scans in logs (if any failed)
        $pendingScans = DB::table('device_scan_logs')
            ->where('event_id', $eventId)
            ->where('device_id', $deviceId)
            ->where('sync_status', 'failed')
            ->count();

        return response()->json([
            'status'        => 200,
            'event_id'      => $eventId,
            'device_id'     => $deviceId,
            'total_scans'   => $totalScans,
            'pending_scans' => $pendingScans,
            'last_sync'     => $lastSync ? [
                'session_id'        => $lastSync->id,
                'scans_uploaded'    => $lastSync->scans_uploaded,
                'scans_successful'  => $lastSync->scans_successful,
                'scans_failed'      => $lastSync->scans_failed,
                'completed_at'      => $lastSync->completed_at,
                'status'            => $lastSync->status,
            ] : null,
            'timestamp' => now()->toDateTimeString(),
        ], 200);

    } catch (\Exception $e) {
        return Handler::handle($e);
    }
}
```

### Add Routes (routes/api.php)

```php
// Sync endpoints
Route::prefix('offline')->group(function () {
    // Existing routes...
    
    // New sync routes
    Route::post('/sync', [OfflineTicketsController::class, 'syncOfflineScans']);
    Route::get('/sync/status/{eventId}/{deviceId}', [OfflineTicketsController::class, 'getDeviceSyncStatus']);
});
```

---

## 3. React App API Service Updates

Update the `api.ts` file to include the sync endpoint:

```typescript
// In src/services/api.ts

export const syncAPI = {
  /**
   * Sync pending offline scans to the server
   */
  syncScans: async (
    eventId: string,
    deviceId: string,
    sessionToken: string,
    scans: Array<{ qrCode: string; scannedAt: number; ticketTypes?: string[] }>
  ): Promise<SyncResponse> => {
    const response = await api.post('/offline/sync', {
      event_id: eventId,
      device_id: deviceId,
      session_token: sessionToken,
      scans: scans.map(scan => ({
        qrcode: scan.qrCode,
        scanned_at: scan.scannedAt,
        ticket_types: scan.ticketTypes,
      })),
    });
    return response.data;
  },

  /**
   * Get sync status for this device
   */
  getSyncStatus: async (eventId: string, deviceId: string): Promise<SyncStatusResponse> => {
    const response = await api.get(`/offline/sync/status/${eventId}/${deviceId}`);
    return response.data;
  },
};

// Types
interface SyncResponse {
  status: number;
  message: string;
  summary: {
    total_uploaded: number;
    successful: number;
    duplicates: number;
    failed: number;
  };
  results: Array<{
    qrcode: string;
    status: number;
    message: string;
    sync_status: 'synced' | 'duplicate' | 'conflict' | 'failed';
    type?: string;
    number?: string;
  }>;
  sync_session_id: number;
  synced_at: string;
}

interface SyncStatusResponse {
  status: number;
  event_id: string;
  device_id: string;
  total_scans: number;
  pending_scans: number;
  last_sync: {
    session_id: number;
    scans_uploaded: number;
    scans_successful: number;
    scans_failed: number;
    completed_at: string;
    status: string;
  } | null;
}
```

---

## 4. Sync Store Updates

Update `syncStore.ts` to use the new API:

```typescript
// In src/stores/syncStore.ts - add these methods

syncToServer: async () => {
  const state = get();
  if (!state.isOnline || state.pendingScans.length === 0) {
    return { success: false, message: 'Nothing to sync or offline' };
  }

  const authStore = useAuthStore.getState();
  const { eventDetails, deviceId, session } = authStore;
  
  if (!eventDetails?.event_id || !deviceId || !session) {
    return { success: false, message: 'Not authenticated' };
  }

  set({ isSyncing: true });

  try {
    const response = await syncAPI.syncScans(
      eventDetails.event_id,
      deviceId,
      session,
      state.pendingScans.map(scan => ({
        qrCode: scan.qrCode,
        scannedAt: scan.scannedAt,
        ticketTypes: scan.ticketTypes,
      }))
    );

    // Remove successfully synced scans
    const syncedQRCodes = response.results
      .filter(r => r.sync_status === 'synced' || r.sync_status === 'duplicate')
      .map(r => r.qrcode);

    set(state => ({
      pendingScans: state.pendingScans.filter(
        scan => !syncedQRCodes.includes(scan.qrCode)
      ),
      lastSyncTime: Date.now(),
      syncedScans: state.syncedScans + response.summary.successful,
      isSyncing: false,
    }));

    return {
      success: true,
      summary: response.summary,
    };
  } catch (error) {
    set({ isSyncing: false });
    return { success: false, message: 'Sync failed' };
  }
},
```

---

## 5. Auto-Sync Implementation

Add automatic background sync when online:

```typescript
// In App.tsx or a dedicated SyncManager component

useEffect(() => {
  const syncStore = useSyncStore.getState();
  
  // Sync when coming back online
  const handleOnline = () => {
    if (syncStore.pendingScans.length > 0) {
      syncStore.syncToServer();
    }
  };

  window.addEventListener('online', handleOnline);
  
  // Periodic sync every 5 minutes if online and has pending
  const syncInterval = setInterval(() => {
    const { isOnline, pendingScans, isSyncing } = useSyncStore.getState();
    if (isOnline && pendingScans.length > 0 && !isSyncing) {
      useSyncStore.getState().syncToServer();
    }
  }, 5 * 60 * 1000);

  return () => {
    window.removeEventListener('online', handleOnline);
    clearInterval(syncInterval);
  };
}, []);
```

---

## 6. Data Flow Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                        SCAN FLOW                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User scans ticket                                           │
│     ↓                                                           │
│  2. Check: Online?                                              │
│     ├── YES → Call verifyTicket API                             │
│     │         ↓                                                 │
│     │         API validates & marks as scanned                  │
│     │         ↓                                                 │
│     │         Return result to user                             │
│     │                                                           │
│     └── NO → Check local IndexedDB                              │
│              ↓                                                  │
│              Validate locally                                   │
│              ↓                                                  │
│              Mark in local DB + add to pendingScans             │
│              ↓                                                  │
│              Return result to user                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        SYNC FLOW                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Triggers:                                                      │
│  - Coming back online                                           │
│  - Manual "Sync Now" button                                     │
│  - Periodic sync (every 5 min)                                  │
│  - App resume/visibility change                                 │
│     ↓                                                           │
│  1. Collect all pendingScans from store                         │
│     ↓                                                           │
│  2. Call syncOfflineScans API with batch                        │
│     ↓                                                           │
│  3. API processes each scan:                                    │
│     ├── Not found → Mark failed                                 │
│     ├── Already scanned by same device → Mark duplicate         │
│     ├── Already scanned by other device → Mark conflict         │
│     └── Valid → Update ticket, mark synced                      │
│     ↓                                                           │
│  4. Return results to app                                       │
│     ↓                                                           │
│  5. App removes synced items from pendingScans                  │
│     ↓                                                           │
│  6. Update UI with sync summary                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Conflict Resolution Strategy

| Scenario | Resolution |
|----------|------------|
| Same device, same ticket | Allow (idempotent) |
| Different device, same ticket | Reject with conflict info |
| Ticket not in database | Reject as invalid |
| Scan time mismatch | Use device's scan time (trust the device) |

---

## 8. Running Migrations

```bash
# Run migrations in production (safe - only creates new tables)
php artisan migrate

# If you need to rollback
php artisan migrate:rollback --step=3
```

The migrations only create NEW tables and don't modify any existing production tables, so they're safe to run.
