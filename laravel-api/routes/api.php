<?php

/**
 * API Routes for Sync
 * 
 * Add these routes to your routes/api.php file
 */

use App\Http\Controllers\Api\SyncController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Sync API Routes
|--------------------------------------------------------------------------
|
| These routes handle data synchronization from the React PWA.
| All routes require authentication except for ping.
|
*/

// Health check (no auth required)
Route::get('/ping', [SyncController::class, 'ping']);

// Sync routes (require authentication)
Route::middleware('auth:sanctum')->group(function () {
    
    // Sync scans from device
    Route::post('/sync/scans', [SyncController::class, 'syncScans']);
    
    // Sync session logs (login/logout events)
    Route::post('/sync/session-logs', [SyncController::class, 'syncSessionLogs']);
    
    // Register device for an event
    Route::post('/sync/device/register', [SyncController::class, 'registerDevice']);
    
    // Get sync status for a device
    Route::get('/sync/status/{eventId}/{deviceId}', [SyncController::class, 'getSyncStatus']);
    
    // Get device scan history
    Route::get('/sync/device/{deviceId}/scans', [SyncController::class, 'getDeviceScans']);
    
});

/*
|--------------------------------------------------------------------------
| Alternative: Use Existing Endpoint
|--------------------------------------------------------------------------
|
| If you prefer to use the existing batchVerifyTickets endpoint,
| the React app is already configured to use:
|
| POST /event/batch_verify
|
| Request body:
| {
|   "scans": [
|     { "qrcode": "ABC123", "device_id": "uuid", "scanned_at": 1736668800000 }
|   ]
| }
|
| This works out of the box - no additional Laravel changes needed!
|
*/
