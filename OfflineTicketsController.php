<?php

namespace Modules\Tickets\Http\Controllers;

use App\Exceptions\Handler;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use App\Mail\TicketScanReportMail;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Session;
use Modules\Tickets\Models\OfflineTickets;

class OfflineTicketsController extends Controller
{
    public function allEvents()
    {
        try {
            //code...
            $eventsByYearMonths = DB::table('offlineevents')
            ->select(
                DB::raw('YEAR(created_at) as year'),
                DB::raw('MONTH(created_at) as month'),
                DB::raw('count(*) as event_count'),
                DB::raw('JSON_ARRAYAGG(event_name) as event_names')
            )
            ->groupBy('year', 'month')
            ->orderBy('year', 'desc')
            ->orderBy('month', 'desc')
            ->get()
            ->map(function ($item) {
                // Decode the JSON string to PHP array
                $item->event_names = json_decode($item->event_names, true);
                return $item;
            });

        return response()->json([
            'success' => true,
            'events_by_year' => $eventsByYearMonths,
            'total_events' => DB::table('offlineevents')->count()
        ], 200);

        } catch (\Exception $e) {
            return Handler::handle($e);
        }
    }

    /**
     * Verify ticket by QR code
     */
    public function verifyTicket(Request $request, $event_id, $code, $device_id)
    {
        try {
            //code...
                    // Validate the request for ticket names
            $validated = $request->validate([
                'event_ticket_names' => 'required|array',
                'event_ticket_names.*' => 'string'
            ]);

            $requiredTicketNames = $validated['event_ticket_names'];

            // Find the ticket by QR code with only needed columns
            $ticket = OfflineTickets::where('qrcode', $code)->where('event_id', $event_id)
                ->select([
                    'id',
                    'log_count',
                    'event_ticket_type',
                    'event_ticket_admittence',
                    'event_ticket_name', // Add this column to the select
                    'ticket_number',
                    'scanned_at'
                ])
                ->first();

            // Ticket not found - same response as before
            if (!$ticket) {
                return response()->json(['status' => 404], 404);
            }

            // Check if ticket name is in the required names
            $ticketType = trim($ticket->event_ticket_type);

            if (!in_array($ticketType, $requiredTicketNames)) {
                return response()->json([
                    'status'            => 403,
                    'message'           => 'Ticket not valid for this entry point',
                    'required_names'    => $requiredTicketNames,
                    'ticket_name'       => $ticketType // Use trimmed value here too for consistency
                ], 403);
            }

            // First scan case - same response structure
            if ($ticket && $ticket->log_count < 1) {
                // Optimized update without re-fetching the model
                OfflineTickets::where('id', $ticket->id)->update([
                    'log_count'     => $ticket->log_count + 1,
                    'sync'          => $ticket->log_count + 1,
                    'scanned_at'    => Carbon::now(),
                    'device_id'     => $device_id
                ]);

                return response()->json([
                    'status'        => 200,
                    'type'          => $ticket->event_ticket_type,
                    'admittence'    => $ticket->event_ticket_admittence,
                    'name'          => $ticket->event_ticket_name, // Include name in response
                    'number'        => $ticket->ticket_number,
                    'device_id'     => $device_id
                ], 200);
            } else {
                // Already scanned case - same response structure
                return response()->json([
                    'status'        => 403,
                    'type'          => $ticket->event_ticket_type,
                    'admittence'    => $ticket->event_ticket_admittence,
                    'name'          => $ticket->event_ticket_name, // Include name in response
                    'number'        => $ticket->ticket_number,
                    'scanned_at'    => $ticket->scanned_at
                ], 403);
            }
        } catch (\Exception $e) {
            return Handler::handle($e);
        }
    }

    /**
     * Batch verify tickets
     */
    public function batchVerifyTickets(Request $request)
    {
        try {
            //code...
                    // Validate the request - REMOVED event_ticket_names validation
            $validated = $request->validate([
                'scans'                 => 'required|array',
                'scans.*.qrcode'        => 'required|string',
                'scans.*.device_id'     => 'required|string',
                'scans.*.scanned_at'    => 'required|numeric'
            ]);

            $scans = $validated['scans'];
            $results = [];
            $successCount = 0;

            foreach ($scans as $scan) {
                $ticket = OfflineTickets::where('qrcode', $scan['qrcode'])
                    ->select([
                        'id',
                        'log_count',
                        'event_ticket_type',
                        'event_ticket_admittence',
                        'ticket_number',
                        'scanned_at'
                    ])
                    ->first();

                if (!$ticket) {
                    $results[] = [
                        'qrcode' => $scan['qrcode'],
                        'status' => 404
                    ];
                    continue;
                }

                if ($ticket->log_count < 1) {
                    OfflineTickets::where('id', $ticket->id)->update([
                        'log_count'     => $ticket->log_count + 1,
                        'sync'          => 1,
                        'scanned_at'    => Carbon::createFromTimestamp($scan['scanned_at']),
                        'device_id'     => $scan['device_id']
                    ]);

                    $results[] = [
                        'qrcode'        => $scan['qrcode'],
                        'status'        => 200,
                        'type'          => $ticket->event_ticket_type,
                        'admittence'    => $ticket->event_ticket_admittence,
                        'number'        => $ticket->ticket_number
                    ];
                    $successCount++;
                } else {
                    $results[] = [
                        'qrcode'        => $scan['qrcode'],
                        'status'        => 403,
                        'type'          => $ticket->event_ticket_type,
                        'admittence'    => $ticket->event_ticket_admittence,
                        'number'        => $ticket->ticket_number,
                        'scanned_at'    => Carbon::parse($ticket->scanned_at)->timestamp
                    ];
                }
            }

            return response()->json([
                'status'            => 200,
                'success_count'     => $successCount,
                'results'           => $results
            ], 200);
        } catch (\Exception $e) {
            return Handler::handle($e);
        }

    }

    /**
     * Generate a detailed ticket scanning report for an event
     *
     * @param Request $request
     * @param int $id The event ID to generate report for
     * @return \Illuminate\Http\JsonResponse
     */
    public function generateTicketReport(Request $request, $id)
    {
        try {
            $event = DB::table('offlineevents')->where('event_id', $id)->first();
            // Get all tickets for the event
            $allTickets = OfflineTickets::where('event_id', $id)->get();

            // Get scanned tickets (assuming log_count > 0 means scanned)
            $scannedTickets = $allTickets->where('log_count', '>', 0);

            // Total ticket counts
            $totalTickets = $allTickets->count();
            $totalScanned = $scannedTickets->count();

            // Calculate total and scanned revenue
            $totalRevenue = $allTickets->sum('event_ticket_price');
            $scannedRevenue = $scannedTickets->sum('event_ticket_price');

            // Group by ticket type for detailed breakdown
            $ticketTypeStats = $allTickets->groupBy('event_ticket_type')->map(function ($tickets) {
                $scanned = $tickets->where('log_count', '>', 0);

                return [
                    'total_count'       => $tickets->count(),
                    'scanned_count'     => $scanned->count(),
                    'total_revenue'     => $tickets->sum('event_ticket_price'),
                    'scanned_revenue'   => $scanned->sum('event_ticket_price'),
                    'scan_rate'             => $tickets->count() > 0
                        ? round(($scanned->count() / $tickets->count()) * 100, 2)
                        : 0,
                    'average_price' => $tickets->avg('event_ticket_price')
                ];
            });

            // Hourly scan analysis for all tickets
            $hourlyScans = $scannedTickets->groupBy(function ($ticket) {
                return Carbon::parse($ticket->scanned_at)->format('Y-m-d H:00:00');
            })->map->count();

            // Hourly scan analysis by ticket type
            $hourlyScansByType = $scannedTickets->groupBy('event_ticket_type')->map(function ($tickets) {
                return $tickets->groupBy(function ($ticket) {
                    return Carbon::parse($ticket->scanned_at)->format('Y-m-d H:00:00');
                })->map->count();
            });

            // Device statistics
            $deviceStats = $scannedTickets->groupBy('device_id')->map->count();

            // First and last scan timestamps
            $firstScan = $scannedTickets->sortBy('scanned_at')->first();
            $lastScan = $scannedTickets->sortByDesc('scanned_at')->first();


            $reportData = [
                'event_id' => $id,
                'event_name' => $event->event_name,
                'event_venue' => $event->venue_address,
                'event_date' => $event->event_date,
                'summary' => [
                    'total_tickets'         => $totalTickets,
                    'scanned_tickets'       => $totalScanned,
                    'unscanned_tickets'     => $totalTickets - $totalScanned,
                    'scan_rate'             => $totalTickets > 0 ? round(($totalScanned / $totalTickets) * 100, 2) : 0,
                    'total_revenue'         => $totalRevenue,
                    'scanned_revenue'       => $scannedRevenue,
                    'potential_revenue'     => $totalRevenue - $scannedRevenue,
                    'first_scan_at'         => $firstScan ? $firstScan->scanned_at : null,
                    'last_scan_at'          => $lastScan ? $lastScan->scanned_at : null,
                ],
                'ticket_type_analysis' => $ticketTypeStats,
                'hourly_scan_analysis' => [
                    'all_tickets'       => $hourlyScans,
                    'by_ticket_type'    => $hourlyScansByType,
                ],
                'device_analysis'       => $deviceStats,
                'report_generated_at'   => now()->toDateTimeString(),
                'timezone'              => config('app.timezone'),
            ];

            // Send email with PDF attachment
            $recipientEmail = 'chitangalawrence03@gmail.com'; // Or get from config/request
            // Mail::to($recipientEmail)->send(new TicketScanReportMail($reportData));

            return response()->json([
                'status' => 'success',
                'data' => [
                    'event_id' => $id,
                    'summary' => [
                        'total_tickets'         => $totalTickets,
                        'scanned_tickets'       => $totalScanned,
                        'unscanned_tickets'     => $totalTickets - $totalScanned,
                        'scan_rate'             => $totalTickets > 0 ? round(($totalScanned / $totalTickets) * 100, 2) : 0,
                        'total_revenue'         => $totalRevenue,
                        'scanned_revenue'       => $scannedRevenue,
                        'potential_revenue'     => $totalRevenue - $scannedRevenue,
                        'first_scan_at'         => $firstScan ? $firstScan->scanned_at : null,
                        'last_scan_at'          => $lastScan ? $lastScan->scanned_at : null,
                    ],
                    'ticket_type_analysis' => $ticketTypeStats,
                    'hourly_scan_analysis' => [
                        'all_tickets'       => $hourlyScans,
                        'by_ticket_type'    => $hourlyScansByType,
                    ],
                    'device_analysis'       => $deviceStats,
                    'report_generated_at'   => now()->toDateTimeString(),
                    'timezone'              => config('app.timezone'),
                ]
            ], 200);

        } catch (\Exception $e) {
            return Handler::handle($e);
        }
    }

    /**
     * List offline events
     */
    public function allEventsNow()
    {
        try {
            //code...
            $eventsByYearMonths = DB::table('offlineevents')
            ->select(
                DB::raw('YEAR(created_at) as year'),
                DB::raw('MONTH(created_at) as month'),
                DB::raw('count(*) as event_count'),
                DB::raw('JSON_ARRAYAGG(JSON_OBJECT("id", event_id, "name", event_name)) as events')
            )
            ->groupBy('year', 'month')
            ->orderBy('year', 'desc')
            ->orderBy('month', 'desc')
            ->get()
            ->map(function ($item) {
                // Decode the JSON string to PHP array
                $item->events = json_decode($item->events, true);
                return $item;
            });

            return response()->json([
                'success'           => true,
                'events_by_year'    => $eventsByYearMonths,
                'total_events'      => DB::table('offlineevents')->count()
            ], 200);

        }  catch (\Exception $e) {
            return Handler::handle($e);
        }
    }

    public function countTickets(Request $request)
    {
        try {
            // Get monthly ticket creation counts and revenue
            $monthlyStats = OfflineTickets::select(
                DB::raw('YEAR(created_at) as year'),
                DB::raw('MONTH(created_at) as month'),
                DB::raw('COUNT(*) as count'),
                DB::raw('SUM(event_ticket_price) as revenue')
            )
            ->groupBy('year', 'month')
            ->orderBy('year', 'desc')
            ->orderBy('month', 'desc')
            ->get();

            // Calculate total revenue
            $totalRevenue = OfflineTickets::sum('event_ticket_price');

            // Calculate revenue by ticket type
            $revenueByType = OfflineTickets::select(
                'event_ticket_type',
                DB::raw('COUNT(*) as count'),
                DB::raw('SUM(event_ticket_price) as revenue')
            )
            ->groupBy('event_ticket_type')
            ->get();

            $counts = [
                'total_tickets' => OfflineTickets::count(),
                'total_revenue' => $totalRevenue,
                'scanned_tickets' => OfflineTickets::where('log_count', '>', 0)->count(),
                'scanned_revenue' => OfflineTickets::where('log_count', '>', 0)->sum('event_ticket_price'),
                'unscanned_tickets' => OfflineTickets::where('log_count', 0)->count(),
                'unscanned_revenue' => OfflineTickets::where('log_count', 0)->sum('event_ticket_price'),
                'by_type' => OfflineTickets::select(
                    'event_ticket_type',
                    DB::raw('COUNT(*) as count'),
                    DB::raw('SUM(event_ticket_price) as revenue')
                )
                ->groupBy('event_ticket_type')
                ->get(),
                'by_admittence' => OfflineTickets::select(
                    'event_ticket_admittence',
                    DB::raw('COUNT(*) as count'),
                    DB::raw('SUM(event_ticket_price) as revenue')
                )
                ->groupBy('event_ticket_admittence')
                ->get(),
                'recently_scanned' => [
                    'count' => OfflineTickets::where('scanned_at', '>=', Carbon::now()->subDays(7))->count(),
                    'revenue' => OfflineTickets::where('scanned_at', '>=', Carbon::now()->subDays(7))->sum('event_ticket_price')
                ],
                'monthly_stats' => $monthlyStats
            ];

            return response()->json([
                'status' => 200,
                'counts' => $counts
            ], 200);

        }  catch (\Exception $e) {
            return Handler::handle($e);
        }
    }

    public function getTicketsByEvent(Request $request, $id)
    {
        try {
            $tickets = OfflineTickets::where('event_id', $id)->where('log_count', 0)->where('sync', 0)->get();

            return response()->json([
                'status' => 200,
                'tickets' => $tickets
            ], 200);

        }  catch (\Exception $e) {
            return Handler::handle($e);
        }
    }

    /**
     * Get tickets by selected types
     */
    public function getTicketsBySelectedTypes(Request $request, $id)
    {
        try {
            // Validate the request contains ticket_types array
            $request->validate([
                'ticket_types' => 'required|array',
                'ticket_types.*' => 'string' // assuming event_ticket_type is integer
            ]);

            $selectedTypes = $request->input('ticket_types');

            // Get tickets only for selected types
            $tickets = OfflineTickets::where('event_id', $id)
                ->where('log_count', 0)
                ->where('sync', 0)
                ->whereIn('event_ticket_type', $selectedTypes)
                ->get()
                ->groupBy('event_ticket_type'); // Group by type if needed

            return response()->json([
                'status' => 200,
                'tickets' => $tickets,
                'selected_types' => $selectedTypes,
                'total_tickets' => $tickets->flatten()->count()
            ], 200);

        } catch (\Exception $e) {
            return Handler::handle($e);
        }
    }

    /**
     * Get ticket types for event
     */
    public function getTicketTypesByEvent(Request $request, $id)
    {
        try {
            // Option 1: Just get distinct ticket type IDs
            $ticketTypes = OfflineTickets::where('event_id', $id)
                ->where('log_count', 0)
                ->where('sync', 0)
                ->distinct('event_ticket_type')
                ->pluck('event_ticket_type');

            // Option 2: Get counts per type (if you need that)
            $ticketTypeCounts = OfflineTickets::where('event_id', $id)
                ->where('log_count', 0)
                ->where('sync', 0)
                ->groupBy('event_ticket_type')
                ->select('event_ticket_type', \DB::raw('count(*) as total'))
                ->get();

            return response()->json([
                'status' => 200,
                // 'ticket_types' => $ticketTypes, // Just IDs
                'ticket_type_counts' => $ticketTypeCounts, // IDs with counts
                'total_ticket_groups' => $ticketTypes->count()
            ], 200);

        } catch (\Exception $e) {
            return Handler::handle($e);
        }
    }
    /*
    | -------------------------------------------------------------------
    | Synchronization Methods
    | -------------------------------------------------------------------
    */


        /**
     * Collect new events and tickets from old system
     * This endpoint should be called against the old database
     */
    public function collectNewDataFromOldSystem(Request $request)
    {
        try {
            // Get the last sync timestamp from request or use default
            $lastSyncDate = $request->input('last_sync_date')
                ? Carbon::parse($request->input('last_sync_date'))
                : Carbon::now()->subDays(30); // Default: last 30 days

            // Collect new events created since last sync
            $newEvents = DB::connection('old_system') // Assuming you have configured 'old_system' connection
                ->table('offlineevents')
                ->where('created_at', '>=', $lastSyncDate)
                ->orWhere('updated_at', '>=', $lastSyncDate)
                ->get()
                ->map(function ($event) {
                    return [
                        'event_id'          => $event->event_id,
                        'event_name'        => $event->event_name,
                        'event_date'        => $event->event_date,
                        'event_location'    => $event->event_location,
                        'created_at'        => $event->created_at,
                        'updated_at'        => $event->updated_at,
                        // Add other relevant fields
                    ];
                });

            // Collect new tickets created since last sync
            $newTickets = DB::connection('old_system')
                ->table('offlinetickets') // Adjust table name if different
                ->where('created_at', '>=', $lastSyncDate)
                ->orWhere('updated_at', '>=', $lastSyncDate)
                ->get()
                ->map(function ($ticket) {
                    return [
                        'event_id'                      => $ticket->event_id,
                        'qrcode'                        => $ticket->qrcode,
                        'event_ticket_type'             => $ticket->event_ticket_type,
                        'event_ticket_name'             => $ticket->event_ticket_name,
                        'event_ticket_admittence'       => $ticket->event_ticket_admittence,
                        'event_ticket_price'            => $ticket->event_ticket_price,
                        'ticket_number'                 => $ticket->ticket_number,
                        'log_count'                     => $ticket->log_count,
                        'sync'                          => $ticket->sync,
                        'scanned_at'                    => $ticket->scanned_at,
                        'device_id'                     => $ticket->device_id,
                        'created_at'                    => $ticket->created_at,
                        'updated_at'                    => $ticket->updated_at,
                        // Add other relevant fields
                    ];
                });

            return response()->json([
                'status'                => 'success',
                'last_sync_date'        => $lastSyncDate->toDateTimeString(),
                'current_time'          => Carbon::now()->toDateTimeString(),
                'new_events_count'      => $newEvents->count(),
                'new_tickets_count'     => $newTickets->count(),
                'new_events'            => $newEvents,
                'new_tickets'           => $newTickets,
            ], 200);

        } catch (\Exception $e) {
            return Handler::handle($e);
        }
    }

    /**
     * Update migrated database with new data from old system
     * This endpoint should be called against your new database
     */
    public function updateMigratedDatabase(Request $request)
    {
        try {
            // Validate the incoming data
            $validated = $request->validate([
                'new_events' => 'sometimes|array',
                'new_events.*.event_id' => 'required',
                'new_events.*.event_name' => 'required|string',
                'new_tickets' => 'sometimes|array',
                'new_tickets.*.qrcode' => 'required|string',
                'new_tickets.*.event_id' => 'required',
            ]);

            $results = [
                'events_processed' => 0,
                'events_created' => 0,
                'events_updated' => 0,
                'tickets_processed' => 0,
                'tickets_created' => 0,
                'tickets_updated' => 0,
                'errors' => []
            ];

            // Process new events
            if (!empty($validated['new_events'])) {
                foreach ($validated['new_events'] as $eventData) {
                    try {
                        $event = OfflineEvents::where('event_id', $eventData['event_id'])->first();

                        if ($event) {
                            // Update existing event
                            $event->update($eventData);
                            $results['events_updated']++;
                        } else {
                            // Create new event
                            OfflineEvents::create($eventData);
                            $results['events_created']++;
                        }
                        $results['events_processed']++;
                    } catch (\Exception $e) {
                        $results['errors'][] = [
                            'type' => 'event',
                            'event_id' => $eventData['event_id'] ?? 'unknown',
                            'error' => $e->getMessage()
                        ];
                    }
                }
            }

            // Process new tickets
            if (!empty($validated['new_tickets'])) {
                foreach ($validated['new_tickets'] as $ticketData) {
                    try {
                        $ticket = OfflineTickets::where('qrcode', $ticketData['qrcode'])
                            ->where('event_id', $ticketData['event_id'])
                            ->first();

                        if ($ticket) {
                            // Update existing ticket
                            $ticket->update($ticketData);
                            $results['tickets_updated']++;
                        } else {
                            // Create new ticket
                            OfflineTickets::create($ticketData);
                            $results['tickets_created']++;
                        }
                        $results['tickets_processed']++;
                    } catch (\Exception $e) {
                        $results['errors'][] = [
                            'type' => 'ticket',
                            'qrcode' => $ticketData['qrcode'] ?? 'unknown',
                            'event_id' => $ticketData['event_id'] ?? 'unknown',
                            'error' => $e->getMessage()
                        ];
                    }
                }
            }

            return response()->json([
                'status' => 'success',
                'results' => $results,
                'summary' => [
                    'total_processed' => $results['events_processed'] + $results['tickets_processed'],
                    'total_created' => $results['events_created'] + $results['tickets_created'],
                    'total_updated' => $results['events_updated'] + $results['tickets_updated'],
                    'total_errors' => count($results['errors'])
                ],
                'timestamp' => Carbon::now()->toDateTimeString()
            ], 200);

        } catch (\Exception $e) {
            return Handler::handle($e);
        }
    }

    /**
     * Get sync status - shows last sync information
     */
    public function getSyncStatus(Request $request)
    {
        try {
            $lastEvent = OfflineEvents::orderBy('created_at', 'desc')->first();
            $lastTicket = OfflineTickets::orderBy('created_at', 'desc')->first();

            $stats = [
                'total_events' => OfflineEvents::count(),
                'total_tickets' => OfflineTickets::count(),
                'last_event' => $lastEvent ? [
                    'event_id' => $lastEvent->event_id,
                    'event_name' => $lastEvent->event_name,
                    'created_at' => $lastEvent->created_at
                ] : null,
                'last_ticket' => $lastTicket ? [
                    'qrcode' => $lastTicket->qrcode,
                    'event_id' => $lastTicket->event_id,
                    'created_at' => $lastTicket->created_at
                ] : null,
                'scanned_tickets' => OfflineTickets::where('log_count', '>', 0)->count(),
                'unscanned_tickets' => OfflineTickets::where('log_count', 0)->count(),
            ];

            return response()->json([
                'status' => 'success',
                'sync_status' => $stats,
                'current_time' => Carbon::now()->toDateTimeString()
            ], 200);

        } catch (\Exception $e) {
            return Handler::handle($e);
        }
    }

    /**
     * Generate usernames and passwords for events
     * Creates unique credentials for events that don't already have them
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function generateEventCredentials(Request $request)
    {
        try {
            // Get all events from the database
            $events = DB::table('offlineevents')
                ->select('event_id', 'event_name', 'username', 'password', 'created_at')
                ->get();

            $updated = [];
            $skipped = [];

            foreach ($events as $event) {
                // Only generate if not already set
                if (empty($event->username) || empty($event->password)) {
                    // Generate thoughtful username with 263tickets and first 4 chars of event_id
                    $username = $this->generateEventUsername($event->event_id, $event->event_name);

                    // Generate secure random password (12 characters)
                    $password = $this->generateSecurePassword();

                    // Hash the password for storage
                    $hashedPassword = bcrypt($password);

                    // Update the database
                    DB::table('offlineevents')
                        ->where('event_id', $event->event_id)
                        ->update([
                            'username' => $username,
                            'password' => $hashedPassword,
                            'updated_at' => now()
                        ]);

                    $updated[] = [
                        'event_id'      => $event->event_id,
                        'event_name'    => $event->event_name,
                        'username'      => $username,
                        'password'      => $password, // Show plain password only on generation
                        'generated_at'  => now()->toDateTimeString()
                    ];
                } else {
                    $skipped[] = [
                        'event_id'      => $event->event_id,
                        'event_name'    => $event->event_name,
                        'reason'        => 'Credentials already exist'
                    ];
                }
            }

            return response()->json([
                'status'        => 'success',
                'message'       => count($updated) > 0
                    ? 'Credentials generated for ' . count($updated) . ' event(s).'
                    : 'All events already have credentials.',
                'summary' => [
                    'total_events'      => $events->count(),
                    'credentials_generated' => count($updated),
                    'already_had_credentials' => count($skipped)
                ],
                'generated_credentials' => $updated,
                'skipped_events'    => $skipped,
                'timestamp'         => now()->toDateTimeString()
            ], 200);

        } catch (\Exception $e) {
            return Handler::handle($e);
        }
    }

    /**
     * Generate a thoughtful username for events
     * Format: {first4CharsOfEventID}_263tickets_{sanitizedEventName}
     *
     * @param string $eventId
     * @param string $eventName
     * @return string
     */
    private function generateEventUsername($eventId, $eventName = '')
    {
        // Get first 4 characters of event ID, pad if necessary
        $eventIdPrefix = substr(str_pad($eventId, 4, '0', STR_PAD_LEFT), 0, 4);

        // Sanitize event name for username
        $sanitizedName = $this->sanitizeForUsername($eventName);

        // Build the username
        $username = $eventIdPrefix . '_263tickets';

        // Add event name if available and not too long
        if (!empty($sanitizedName)) {
            $usernameWithName = $username . '_' . $sanitizedName;

            // Ensure total length doesn't exceed database column limits (usually 255)
            if (strlen($usernameWithName) <= 50) { // Conservative limit for usernames
                $username = $usernameWithName;
            }
        }

        return strtolower($username);
    }

    /**
     * Sanitize event name for use in username
     * Removes special characters, replaces spaces with underscores, etc.
     *
     * @param string $name
     * @return string
     */
    private function sanitizeForUsername($name)
    {
        if (empty($name)) {
            return '';
        }

        // Convert to lowercase
        $name = strtolower($name);

        // Replace spaces and special characters with underscores
        $name = preg_replace('/[^a-z0-9]/', '_', $name);

        // Remove multiple consecutive underscores
        $name = preg_replace('/_+/', '_', $name);

        // Trim underscores from start and end
        $name = trim($name, '_');

        // Limit length
        $name = substr($name, 0, 20);

        return $name;
    }

    /**
     * Generate a secure random password
     *
     * @return string
     */
    private function generateSecurePassword()
    {
        // Generate secure random password (12 characters)
        $length = 5;
        $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        $password = '';

        for ($i = 0; $i < $length; $i++) {
            $password .= $chars[random_int(0, strlen($chars) - 1)];
        }

        return $password;
    }
    /**
     * View all events with their usernames and passwords
     * Returns a list of all events with their authentication credentials
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function viewAllEventCredentials(Request $request)
    {
        try {
            // Get pagination parameters
            $perPage = $request->input('per_page', 15);
            $page = $request->input('page', 1);
            $search = $request->input('search', '');

            // Build the query
            $query = DB::table('offlineevents')
                ->select(
                    'event_id',
                    'event_name',
                    'event_date',
                    'venue_address',
                    'username',
                    'password',
                    'created_at',
                    'updated_at'
                );

            // Apply search filter if provided
            if (!empty($search)) {
                $query->where(function($q) use ($search) {
                    $q->where('event_name', 'LIKE', '%' . $search . '%')
                      ->orWhere('event_id', 'LIKE', '%' . $search . '%')
                      ->orWhere('username', 'LIKE', '%' . $search . '%');
                });
            }

            // Get total count for pagination
            $totalEvents = $query->count();

            // Apply pagination
            $events = $query
                ->orderBy('created_at', 'desc')
                ->offset(($page - 1) * $perPage)
                ->limit($perPage)
                ->get()
                ->map(function ($event) {
                    return [
                        'event_id'          => $event->event_id,
                        'event_name'        => $event->event_name,
                        'event_date'        => $event->event_date,
                        'venue_address'     => $event->venue_address,
                        'username'          => $event->username,
                        'has_password'      => !empty($event->password),
                        'password_hash'     => $event->password ? '***HIDDEN***' : null,
                        'credentials_status' => (!empty($event->username) && !empty($event->password))
                            ? 'Complete'
                            : 'Incomplete',
                        'created_at'        => $event->created_at,
                        'updated_at'        => $event->updated_at
                    ];
                });

            // Get summary statistics
            $stats = [
                'total_events'              => $totalEvents,
                'events_with_credentials'   => DB::table('offlineevents')
                    ->whereNotNull('username')
                    ->whereNotNull('password')
                    ->where('username', '!=', '')
                    ->where('password', '!=', '')
                    ->count(),
                'events_without_credentials' => DB::table('offlineevents')
                    ->where(function($q) {
                        $q->whereNull('username')
                          ->orWhereNull('password')
                          ->orWhere('username', '')
                          ->orWhere('password', '');
                    })
                    ->count()
            ];

            // Calculate pagination info
            $lastPage = ceil($totalEvents / $perPage);

            return response()->json([
                'status'        => 'success',
                'data'          => $events,
                'statistics'    => $stats,
                'pagination' => [
                    'current_page'  => $page,
                    'per_page'      => $perPage,
                    'total'         => $totalEvents,
                    'last_page'     => $lastPage,
                    'from'          => ($page - 1) * $perPage + 1,
                    'to'            => min($page * $perPage, $totalEvents)
                ],
                'filters' => [
                    'search'        => $search
                ],
                'timestamp'     => now()->toDateTimeString()
            ], 200);

        } catch (\Exception $e) {
            return Handler::handle($e);
        }
    }

    /**
     * Remove usernames and passwords from all events
     * Sets username and password fields to null for all events in the database
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function removeAllEventCredentials(Request $request)
    {
        try {
            // Get all events that currently have credentials
            $eventsWithCredentials = DB::table('offlineevents')
                ->select('event_id', 'event_name', 'username', 'password', 'created_at')
                ->where(function($q) {
                    $q->whereNotNull('username')
                      ->orWhereNotNull('password')
                      ->orWhere('username', '!=', '')
                      ->orWhere('password', '!=', '');
                })
                ->get();

            $totalEvents = DB::table('offlineevents')->count();
            $eventsToUpdate = $eventsWithCredentials->count();
            $removedCredentials = [];

            // Remove credentials from all events
            if ($eventsToUpdate > 0) {
                // Update all events to remove credentials
                $affectedRows = DB::table('offlineevents')
                    ->update([
                        'username' => null,
                        'password' => null,
                        'updated_at' => now()
                    ]);

                // Build response data for events that had credentials removed
                foreach ($eventsWithCredentials as $event) {
                    $removedCredentials[] = [
                        'event_id'      => $event->event_id,
                        'event_name'    => $event->event_name,
                        'had_username'  => !empty($event->username),
                        'had_password'  => !empty($event->password),
                        'removed_at'    => now()->toDateTimeString()
                    ];
                }
            }

            return response()->json([
                'status'        => 'success',
                'message'       => $eventsToUpdate > 0
                    ? 'Credentials removed from ' . $eventsToUpdate . ' event(s).'
                    : 'No events had credentials to remove.',
                'summary' => [
                    'total_events'              => $totalEvents,
                    'events_with_credentials'   => $eventsToUpdate,
                    'credentials_removed'       => $eventsToUpdate,
                    'events_without_credentials' => $totalEvents - $eventsToUpdate
                ],
                'removed_from_events'   => $removedCredentials,
                'operation_details' => [
                    'operation'         => 'remove_all_credentials',
                    'affected_rows'     => $eventsToUpdate,
                    'fields_cleared'    => ['username', 'password'],
                    'executed_at'       => now()->toDateTimeString()
                ],
                'timestamp'         => now()->toDateTimeString()
            ], 200);

        } catch (\Exception $e) {
            return Handler::handle($e);
        }
    }

    /**
     * Login to an event using event credentials
     * Authenticates using event_id/username and password
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function eventLogin(Request $request)
    {
        try {
            // Validate the request
            $validated = $request->validate([
                'event_identifier'  => 'required|string', // Can be event_id or username
                'password'          => 'required|string',
                'device_id'         => 'sometimes|string',
                'remember_me'       => 'sometimes|boolean'
            ]);

            $eventIdentifier = $validated['event_identifier'];
            $password = $validated['password'];
            $deviceId = $validated['device_id'] ?? null;
            $rememberMe = $validated['remember_me'] ?? false;

            // Find event by event_id or username
            $event = DB::table('offlineevents')
                ->select('event_id', 'event_name', 'username', 'password', 'event_date', 'venue_address')
                ->where(function($query) use ($eventIdentifier) {
                    $query->where('event_id', $eventIdentifier)
                          ->orWhere('username', $eventIdentifier);
                })
                ->whereNotNull('username')
                ->whereNotNull('password')
                ->where('username', '!=', '')
                ->where('password', '!=', '')
                ->first();

            // Event not found or no credentials
            if (!$event) {
                return response()->json([
                    'status'        => 'error',
                    'message'       => 'Event not found or credentials not set',
                    'error_code'    => 'EVENT_NOT_FOUND',
                    'timestamp'     => now()->toDateTimeString()
                ], 404);
            }

            // Verify password
            if (!Hash::check($password, $event->password)) {
                // Log failed login attempt
                $this->logLoginAttempt($event->event_id, $eventIdentifier, $deviceId, false, 'Invalid password');

                return response()->json([
                    'status'        => 'error',
                    'message'       => 'Invalid credentials',
                    'error_code'    => 'INVALID_CREDENTIALS',
                    'timestamp'     => now()->toDateTimeString()
                ], 401);
            }

            // Generate session token
            $sessionToken = $this->generateSessionToken($event->event_id, $deviceId);
            $expiresAt = $rememberMe
                ? now()->addDays(30)
                : now()->addHours(8); // 8 hours for regular session

            // Store session information
            $sessionData = [
                'event_id'      => $event->event_id,
                'event_name'    => $event->event_name,
                'username'      => $event->username,
                'device_id'     => $deviceId,
                'login_time'    => now()->toDateTimeString(),
                'expires_at'    => $expiresAt->toDateTimeString(),
                'remember_me'   => $rememberMe
            ];

            // Store in session or cache (you can modify this based on your needs)
            Session::put('event_session_' . $sessionToken, $sessionData);
            Session::put('event_session_' . $sessionToken . '_expires', $expiresAt->timestamp);

            // Log successful login
            $this->logLoginAttempt($event->event_id, $eventIdentifier, $deviceId, true, 'Login successful');

            // Update last login time in database
            DB::table('offlineevents')
                ->where('event_id', $event->event_id)
                ->update([
                    'last_login_at' => now(),
                    'last_login_device' => $deviceId,
                    'updated_at' => now()
                ]);

            return response()->json([
                'status'            => 'success',
                'message'           => 'Login successful',
                'session_token'     => $sessionToken,
                'event_details' => [
                    'event_id'      => $event->event_id,
                    'event_name'    => $event->event_name,
                    'username'      => $event->username,
                    'event_date'    => $event->event_date,
                    'venue_address' => $event->venue_address
                ],
                'session_info' => [
                    'login_time'    => $sessionData['login_time'],
                    'expires_at'    => $sessionData['expires_at'],
                    'remember_me'   => $rememberMe,
                    'device_id'     => $deviceId
                ],
                'timestamp' => now()->toDateTimeString()
            ], 200);

        } catch (\Exception $e) {
            return Handler::handle($e);
        }
    }

    /**
     * Logout from an event session
     * Invalidates the session token and clears session data
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function eventLogout(Request $request)
    {
        try {
            // Validate the request
            $validated = $request->validate([
                'session_token' => 'required|string',
                'device_id' => 'sometimes|string'
            ]);

            $sessionToken = $validated['session_token'];
            $deviceId = $validated['device_id'] ?? null;

            // Get session data before destroying it
            $sessionData = Session::get('event_session_' . $sessionToken);

            if (!$sessionData) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Invalid or expired session token',
                    'error_code' => 'INVALID_SESSION',
                    'timestamp' => now()->toDateTimeString()
                ], 401);
            }

            // Log logout attempt
            $this->logLoginAttempt(
                $sessionData['event_id'],
                $sessionData['username'],
                $deviceId,
                true,
                'Logout successful'
            );

            // Calculate session duration
            $loginTime = Carbon::parse($sessionData['login_time']);
            $sessionDuration = $loginTime->diffInMinutes(now());

            // Clear session data
            Session::forget('event_session_' . $sessionToken);
            Session::forget('event_session_' . $sessionToken . '_expires');

            // Update logout time in database
            DB::table('offlineevents')
                ->where('event_id', $sessionData['event_id'])
                ->update([
                    'last_logout_at' => now(),
                    'updated_at' => now()
                ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Logout successful',
                'session_summary' => [
                    'event_id' => $sessionData['event_id'],
                    'event_name' => $sessionData['event_name'],
                    'login_time' => $sessionData['login_time'],
                    'logout_time' => now()->toDateTimeString(),
                    'session_duration_minutes' => $sessionDuration,
                    'device_id' => $sessionData['device_id']
                ],
                'timestamp' => now()->toDateTimeString()
            ], 200);

        } catch (\Exception $e) {
            return Handler::handle($e);
        }
    }

    /**
     * Check if a session token is valid and get session information
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function checkEventSession(Request $request)
    {
        try {
            // Validate the request
            $validated = $request->validate([
                'session_token' => 'required|string'
            ]);

            $sessionToken = $validated['session_token'];

            // Get session data
            $sessionData = Session::get('event_session_' . $sessionToken);
            $expiresAt = Session::get('event_session_' . $sessionToken . '_expires');

            if (!$sessionData || !$expiresAt) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Session not found',
                    'error_code' => 'SESSION_NOT_FOUND',
                    'is_valid' => false,
                    'timestamp' => now()->toDateTimeString()
                ], 404);
            }

            // Check if session has expired
            if (now()->timestamp > $expiresAt) {
                // Clean up expired session
                Session::forget('event_session_' . $sessionToken);
                Session::forget('event_session_' . $sessionToken . '_expires');

                return response()->json([
                    'status' => 'error',
                    'message' => 'Session has expired',
                    'error_code' => 'SESSION_EXPIRED',
                    'is_valid' => false,
                    'expired_at' => Carbon::createFromTimestamp($expiresAt)->toDateTimeString(),
                    'timestamp' => now()->toDateTimeString()
                ], 401);
            }

            // Calculate remaining time
            $remainingMinutes = Carbon::createFromTimestamp($expiresAt)->diffInMinutes(now());

            return response()->json([
                'status' => 'success',
                'message' => 'Session is valid',
                'is_valid' => true,
                'session_data' => [
                    'event_id' => $sessionData['event_id'],
                    'event_name' => $sessionData['event_name'],
                    'username' => $sessionData['username'],
                    'device_id' => $sessionData['device_id'],
                    'login_time' => $sessionData['login_time'],
                    'expires_at' => Carbon::createFromTimestamp($expiresAt)->toDateTimeString(),
                    'remaining_minutes' => $remainingMinutes,
                    'remember_me' => $sessionData['remember_me'] ?? false
                ],
                'timestamp' => now()->toDateTimeString()
            ], 200);

        } catch (\Exception $e) {
            return Handler::handle($e);
        }
    }

    /**
     * Get all active sessions for monitoring purposes
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getActiveSessions(Request $request)
    {
        try {
            // Get pagination parameters
            $perPage = $request->input('per_page', 15);
            $page = $request->input('page', 1);

            // Get all session keys from Laravel session
            $allSessions = Session::all();
            $activeSessions = [];

            foreach ($allSessions as $key => $value) {
                if (strpos($key, 'event_session_') === 0 && !strpos($key, '_expires')) {
                    $sessionToken = str_replace('event_session_', '', $key);
                    $expiresKey = 'event_session_' . $sessionToken . '_expires';
                    $expiresAt = Session::get($expiresKey);

                    // Only include non-expired sessions
                    if ($expiresAt && now()->timestamp <= $expiresAt) {
                        $sessionData = $value;
                        $sessionData['session_token'] = $sessionToken;
                        $sessionData['expires_at'] = Carbon::createFromTimestamp($expiresAt)->toDateTimeString();
                        $sessionData['remaining_minutes'] = Carbon::createFromTimestamp($expiresAt)->diffInMinutes(now());
                        $activeSessions[] = $sessionData;
                    }
                }
            }

            // Sort by login time (most recent first)
            usort($activeSessions, function($a, $b) {
                return strtotime($b['login_time']) - strtotime($a['login_time']);
            });

            // Apply pagination
            $totalSessions = count($activeSessions);
            $offset = ($page - 1) * $perPage;
            $paginatedSessions = array_slice($activeSessions, $offset, $perPage);

            return response()->json([
                'status' => 'success',
                'active_sessions' => $paginatedSessions,
                'summary' => [
                    'total_active_sessions' => $totalSessions,
                    'unique_events' => count(array_unique(array_column($activeSessions, 'event_id'))),
                    'unique_devices' => count(array_unique(array_filter(array_column($activeSessions, 'device_id'))))
                ],
                'pagination' => [
                    'current_page' => $page,
                    'per_page' => $perPage,
                    'total' => $totalSessions,
                    'last_page' => ceil($totalSessions / $perPage),
                    'from' => $offset + 1,
                    'to' => min($offset + $perPage, $totalSessions)
                ],
                'timestamp' => now()->toDateTimeString()
            ], 200);

        } catch (\Exception $e) {
            return Handler::handle($e);
        }
    }

    /**
     * Generate a unique session token
     *
     * @param string $eventId
     * @param string|null $deviceId
     * @return string
     */
    private function generateSessionToken($eventId, $deviceId = null)
    {
        $timestamp = now()->timestamp;
        $randomString = bin2hex(random_bytes(16));
        $devicePart = $deviceId ? substr(md5($deviceId), 0, 8) : 'nodevice';
        $eventPart = substr(md5($eventId), 0, 8);

        return $eventPart . '_' . $devicePart . '_' . $timestamp . '_' . $randomString;
    }

    /**
     * Log login/logout attempts for auditing
     *
     * @param string $eventId
     * @param string $identifier
     * @param string|null $deviceId
     * @param bool $success
     * @param string $message
     * @return void
     */
    private function logLoginAttempt($eventId, $identifier, $deviceId, $success, $message)
    {
        try {
            // You can create a dedicated table for this or use Laravel's logging
            // For now, we'll use Laravel's log system
            $logData = [
                'event_id' => $eventId,
                'identifier' => $identifier,
                'device_id' => $deviceId,
                'success' => $success,
                'message' => $message,
                'ip_address' => request()->ip(),
                'user_agent' => request()->header('User-Agent'),
                'timestamp' => now()->toDateTimeString()
            ];

            if ($success) {
                \Log::info('Event login attempt successful', $logData);
            } else {
                \Log::warning('Event login attempt failed', $logData);
            }

            // Optionally, you can also store in database
            // DB::table('event_login_logs')->insert($logData);

        } catch (\Exception $e) {
            // Don't let logging errors break the main functionality somthing
            \Log::error('Failed to log login attempt', [
                'error' => $e->getMessage(),
                'event_id' => $eventId
            ]);
        }
    }
}
