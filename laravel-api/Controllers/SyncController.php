<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DeviceScanLog;
use App\Models\SyncSession;
use App\Models\EventLoginLog;
use App\Models\Ticket;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

/**
 * SyncController - Handles all sync operations from the React PWA
 * 
 * This controller provides endpoints for:
 * - Syncing offline scans to the server
 * - Tracking device registrations
 * - Logging session events
 * - Providing sync status
 */
class SyncController extends Controller
{
    /**
     * Sync scans from device
     * This is an alternative to batchVerifyTickets with enhanced tracking
     * 
     * POST /api/sync/scans
     */
    public function syncScans(Request $request)
    {
        $request->validate([
            'device_id' => 'required|string',
            'event_id' => 'required|string',
            'gate_name' => 'nullable|string',
            'scans' => 'required|array',
            'scans.*.qrcode' => 'required|string',
            'scans.*.scanned_at' => 'required|integer',
        ]);

        $deviceId = $request->input('device_id');
        $eventId = $request->input('event_id');
        $gateName = $request->input('gate_name');
        $scans = $request->input('scans');
        $user = $request->user();

        // Create sync session
        $syncSession = SyncSession::create([
            'device_id' => $deviceId,
            'event_id' => $eventId,
            'user_id' => $user?->id,
            'scans_uploaded' => count($scans),
            'status' => 'processing',
            'started_at' => now(),
        ]);

        $results = [];
        $successCount = 0;
        $duplicateCount = 0;
        $notFoundCount = 0;
        $failedCount = 0;

        DB::beginTransaction();

        try {
            foreach ($scans as $scan) {
                $qrcode = $scan['qrcode'];
                $scannedAt = Carbon::createFromTimestampMs($scan['scanned_at']);

                // Find the ticket
                $ticket = Ticket::where('qrcode', $qrcode)
                    ->where('event_id', $eventId)
                    ->first();

                if (!$ticket) {
                    // Ticket not found
                    $results[] = [
                        'qrcode' => $qrcode,
                        'status' => 404,
                        'message' => 'Ticket not found',
                        'sync_status' => 'not_found',
                    ];
                    $notFoundCount++;

                    // Log the attempt
                    DeviceScanLog::create([
                        'device_id' => $deviceId,
                        'event_id' => $eventId,
                        'qrcode' => $qrcode,
                        'scan_result' => 'not_found',
                        'scanned_at' => $scannedAt,
                        'synced_at' => now(),
                        'gate_name' => $gateName,
                        'user_id' => $user?->id,
                        'sync_session_id' => $syncSession->id,
                    ]);

                    continue;
                }

                // Check if already scanned
                if ($ticket->scanned_at) {
                    // Already scanned - duplicate
                    $results[] = [
                        'qrcode' => $qrcode,
                        'status' => 403,
                        'message' => 'Already scanned',
                        'sync_status' => 'duplicate',
                        'type' => $ticket->type,
                        'number' => $ticket->number,
                        'admittence' => $ticket->admittence,
                        'scanned_at' => $ticket->scanned_at->toIso8601String(),
                        'scanned_by' => $ticket->scanned_by,
                    ];
                    $duplicateCount++;

                    // Log the duplicate attempt
                    DeviceScanLog::create([
                        'device_id' => $deviceId,
                        'event_id' => $eventId,
                        'qrcode' => $qrcode,
                        'ticket_id' => $ticket->id,
                        'scan_result' => 'duplicate',
                        'scanned_at' => $scannedAt,
                        'synced_at' => now(),
                        'gate_name' => $gateName,
                        'user_id' => $user?->id,
                        'sync_session_id' => $syncSession->id,
                    ]);

                    continue;
                }

                // Mark ticket as scanned
                $ticket->update([
                    'scanned_at' => $scannedAt,
                    'scanned_by' => $user?->name ?? "Device: {$deviceId}",
                    'gate_name' => $gateName,
                ]);

                // Decrement admittence if applicable
                if ($ticket->admittence > 0) {
                    $ticket->decrement('admittence');
                }

                // Success
                $results[] = [
                    'qrcode' => $qrcode,
                    'status' => 200,
                    'message' => 'Successfully scanned',
                    'sync_status' => 'synced',
                    'type' => $ticket->type,
                    'number' => $ticket->number,
                    'admittence' => $ticket->admittence,
                ];
                $successCount++;

                // Log successful scan
                DeviceScanLog::create([
                    'device_id' => $deviceId,
                    'event_id' => $eventId,
                    'qrcode' => $qrcode,
                    'ticket_id' => $ticket->id,
                    'scan_result' => 'success',
                    'scanned_at' => $scannedAt,
                    'synced_at' => now(),
                    'gate_name' => $gateName,
                    'user_id' => $user?->id,
                    'sync_session_id' => $syncSession->id,
                ]);
            }

            DB::commit();

            // Update sync session
            $syncSession->update([
                'scans_successful' => $successCount,
                'scans_duplicate' => $duplicateCount,
                'scans_not_found' => $notFoundCount,
                'scans_failed' => $failedCount,
                'status' => 'completed',
                'completed_at' => now(),
            ]);

            return response()->json([
                'status' => 200,
                'message' => 'Sync completed',
                'success_count' => $successCount,
                'summary' => [
                    'total_uploaded' => count($scans),
                    'successful' => $successCount,
                    'duplicates' => $duplicateCount,
                    'not_found' => $notFoundCount,
                    'failed' => $failedCount,
                ],
                'results' => $results,
                'sync_session_id' => $syncSession->id,
                'synced_at' => now()->toIso8601String(),
            ]);

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Sync failed', [
                'device_id' => $deviceId,
                'event_id' => $eventId,
                'error' => $e->getMessage(),
            ]);

            // Update sync session with failure
            $syncSession->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
                'completed_at' => now(),
            ]);

            return response()->json([
                'status' => 500,
                'message' => 'Sync failed: ' . $e->getMessage(),
                'success_count' => 0,
                'results' => [],
            ], 500);
        }
    }

    /**
     * Sync session logs (login/logout events)
     * 
     * POST /api/sync/session-logs
     */
    public function syncSessionLogs(Request $request)
    {
        $request->validate([
            'device_id' => 'required|string',
            'logs' => 'required|array',
            'logs.*.event_id' => 'required|string',
            'logs.*.action' => 'required|in:login,logout,session_start,session_end',
            'logs.*.timestamp' => 'required|integer',
        ]);

        $deviceId = $request->input('device_id');
        $logs = $request->input('logs');
        $synced = 0;

        foreach ($logs as $log) {
            EventLoginLog::create([
                'device_id' => $deviceId,
                'event_id' => $log['event_id'],
                'user_id' => $log['user_id'] ?? null,
                'user_name' => $log['user_name'] ?? null,
                'action' => $log['action'],
                'logged_at' => Carbon::createFromTimestampMs($log['timestamp']),
                'gate_name' => $log['gate_name'] ?? null,
                'metadata' => $log['metadata'] ?? null,
                'synced_at' => now(),
            ]);
            $synced++;
        }

        return response()->json([
            'status' => 200,
            'message' => 'Session logs synced',
            'synced_count' => $synced,
        ]);
    }

    /**
     * Register a device for an event
     * 
     * POST /api/sync/device/register
     */
    public function registerDevice(Request $request)
    {
        $request->validate([
            'device_id' => 'required|string',
            'event_id' => 'required|string',
            'device_name' => 'nullable|string',
            'device_type' => 'nullable|string',
            'os' => 'nullable|string',
            'os_version' => 'nullable|string',
            'browser' => 'nullable|string',
            'browser_version' => 'nullable|string',
            'app_version' => 'nullable|string',
            'gate_name' => 'nullable|string',
        ]);

        // Store device info (you might want a devices table for this)
        // For now, we'll just log it
        Log::info('Device registered', [
            'device_id' => $request->input('device_id'),
            'event_id' => $request->input('event_id'),
            'device_info' => $request->only([
                'device_name', 'device_type', 'os', 'os_version',
                'browser', 'browser_version', 'app_version', 'gate_name'
            ]),
        ]);

        return response()->json([
            'status' => 200,
            'registered' => true,
            'device_id' => $request->input('device_id'),
            'message' => 'Device registered successfully',
        ]);
    }

    /**
     * Get sync status for a device
     * 
     * GET /api/sync/status/{eventId}/{deviceId}
     */
    public function getSyncStatus(string $eventId, string $deviceId)
    {
        // Get total scans from this device
        $totalScans = DeviceScanLog::where('device_id', $deviceId)
            ->where('event_id', $eventId)
            ->count();

        // Get last sync session
        $lastSync = SyncSession::where('device_id', $deviceId)
            ->where('event_id', $eventId)
            ->latest('completed_at')
            ->first();

        return response()->json([
            'status' => 200,
            'event_id' => $eventId,
            'device_id' => $deviceId,
            'total_scans' => $totalScans,
            'last_sync' => $lastSync ? [
                'session_id' => $lastSync->id,
                'scans_uploaded' => $lastSync->scans_uploaded,
                'scans_successful' => $lastSync->scans_successful,
                'scans_failed' => $lastSync->scans_failed + $lastSync->scans_not_found,
                'completed_at' => $lastSync->completed_at?->toIso8601String(),
                'status' => $lastSync->status,
            ] : null,
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    /**
     * Health check / ping endpoint
     * 
     * GET /api/ping
     */
    public function ping()
    {
        return response()->json([
            'status' => 'ok',
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    /**
     * Get device scan history
     * 
     * GET /api/sync/device/{deviceId}/scans
     */
    public function getDeviceScans(Request $request, string $deviceId)
    {
        $eventId = $request->query('event_id');
        $limit = $request->query('limit', 100);

        $query = DeviceScanLog::where('device_id', $deviceId)
            ->orderBy('scanned_at', 'desc')
            ->limit($limit);

        if ($eventId) {
            $query->where('event_id', $eventId);
        }

        $scans = $query->get();

        return response()->json([
            'status' => 200,
            'device_id' => $deviceId,
            'count' => $scans->count(),
            'scans' => $scans->map(fn($scan) => [
                'qrcode' => $scan->qrcode,
                'result' => $scan->scan_result,
                'scanned_at' => $scan->scanned_at->toIso8601String(),
                'synced_at' => $scan->synced_at->toIso8601String(),
                'gate_name' => $scan->gate_name,
            ]),
        ]);
    }
}
