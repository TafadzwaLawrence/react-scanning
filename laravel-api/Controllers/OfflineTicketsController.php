<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

/**
 * OfflineTicketsController - Your existing controller with batch_verify
 * 
 * This shows the minimal implementation needed for the React PWA to sync.
 * If you already have batchVerifyTickets, you can keep using it as-is!
 */
class OfflineTicketsController extends Controller
{
    /**
     * Batch verify multiple tickets at once
     * Used by the React PWA for syncing offline scans
     * 
     * POST /event/batch_verify
     * 
     * Request:
     * {
     *   "scans": [
     *     { "qrcode": "ABC123", "device_id": "uuid", "scanned_at": 1736668800000 },
     *     { "qrcode": "DEF456", "device_id": "uuid", "scanned_at": 1736668801000 }
     *   ]
     * }
     * 
     * Response:
     * {
     *   "status": 200,
     *   "success_count": 2,
     *   "results": [
     *     { "qrcode": "ABC123", "status": 200, "type": "VIP", "number": "001" },
     *     { "qrcode": "DEF456", "status": 403, "scanned_at": "...", "scanned_by": "..." }
     *   ]
     * }
     */
    public function batchVerifyTickets(Request $request)
    {
        $request->validate([
            'scans' => 'required|array|max:100',
            'scans.*.qrcode' => 'required|string',
            'scans.*.device_id' => 'nullable|string',
            'scans.*.scanned_at' => 'nullable|integer',
        ]);

        $scans = $request->input('scans');
        $results = [];
        $successCount = 0;

        foreach ($scans as $scan) {
            $qrcode = $scan['qrcode'];
            $deviceId = $scan['device_id'] ?? 'unknown';
            $scannedAt = isset($scan['scanned_at']) 
                ? Carbon::createFromTimestampMs($scan['scanned_at'])
                : now();

            // Find the ticket
            $ticket = Ticket::where('qrcode', $qrcode)->first();

            if (!$ticket) {
                // Ticket not found
                $results[] = [
                    'qrcode' => $qrcode,
                    'status' => 404,
                ];
                continue;
            }

            // Check if already scanned
            if ($ticket->scanned_at) {
                // Already scanned
                $results[] = [
                    'qrcode' => $qrcode,
                    'status' => 403,
                    'type' => $ticket->type,
                    'number' => $ticket->number,
                    'admittence' => $ticket->admittence,
                    'scanned_at' => $ticket->scanned_at->toIso8601String(),
                    'scanned_by' => $ticket->scanned_by,
                ];
                continue;
            }

            // Mark as scanned
            $ticket->update([
                'scanned_at' => $scannedAt,
                'scanned_by' => "Device: {$deviceId}",
            ]);

            // Decrement admittence if applicable
            if ($ticket->admittence > 0) {
                $ticket->decrement('admittence');
            }

            // Success
            $results[] = [
                'qrcode' => $qrcode,
                'status' => 200,
                'type' => $ticket->type,
                'number' => $ticket->number,
                'admittence' => $ticket->admittence,
            ];
            $successCount++;
        }

        return response()->json([
            'status' => 200,
            'success_count' => $successCount,
            'results' => $results,
        ]);
    }

    /**
     * Verify a single ticket
     * 
     * POST /event/verify
     */
    public function verifyTicket(Request $request)
    {
        $request->validate([
            'qrcode' => 'required|string',
            'device_id' => 'nullable|string',
        ]);

        $qrcode = $request->input('qrcode');
        $deviceId = $request->input('device_id', 'unknown');

        $ticket = Ticket::where('qrcode', $qrcode)->first();

        if (!$ticket) {
            return response()->json([
                'status' => 404,
                'message' => 'Ticket not found',
            ], 404);
        }

        if ($ticket->scanned_at) {
            return response()->json([
                'status' => 403,
                'message' => 'Ticket already scanned',
                'type' => $ticket->type,
                'number' => $ticket->number,
                'scanned_at' => $ticket->scanned_at->toIso8601String(),
                'scanned_by' => $ticket->scanned_by,
            ], 403);
        }

        // Mark as scanned
        $ticket->update([
            'scanned_at' => now(),
            'scanned_by' => "Device: {$deviceId}",
        ]);

        if ($ticket->admittence > 0) {
            $ticket->decrement('admittence');
        }

        return response()->json([
            'status' => 200,
            'message' => 'Ticket verified successfully',
            'type' => $ticket->type,
            'number' => $ticket->number,
            'admittence' => $ticket->admittence,
        ]);
    }
}
