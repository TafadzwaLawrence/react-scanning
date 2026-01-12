<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * DeviceScanLog - Records every scan attempt from a device
 * 
 * This tracks all scans synced from the PWA, including:
 * - Successful scans
 * - Duplicate attempts  
 * - Not found errors
 * 
 * Useful for:
 * - Auditing scan activity
 * - Debugging sync issues
 * - Analytics on device usage
 */
class DeviceScanLog extends Model
{
    protected $fillable = [
        'device_id',
        'event_id',
        'qrcode',
        'ticket_id',
        'scan_result',    // 'success', 'duplicate', 'not_found', 'failed'
        'scanned_at',     // When the scan happened on device
        'synced_at',      // When it was synced to server
        'gate_name',
        'user_id',
        'sync_session_id',
        'metadata',
    ];

    protected $casts = [
        'scanned_at' => 'datetime',
        'synced_at' => 'datetime',
        'metadata' => 'array',
    ];

    /**
     * Get the ticket that was scanned
     */
    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }

    /**
     * Get the user who performed the scan
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the sync session this scan belongs to
     */
    public function syncSession(): BelongsTo
    {
        return $this->belongsTo(SyncSession::class);
    }

    /**
     * Scope: Filter by device
     */
    public function scopeForDevice($query, string $deviceId)
    {
        return $query->where('device_id', $deviceId);
    }

    /**
     * Scope: Filter by event
     */
    public function scopeForEvent($query, string $eventId)
    {
        return $query->where('event_id', $eventId);
    }

    /**
     * Scope: Only successful scans
     */
    public function scopeSuccessful($query)
    {
        return $query->where('scan_result', 'success');
    }

    /**
     * Scope: Only duplicates
     */
    public function scopeDuplicates($query)
    {
        return $query->where('scan_result', 'duplicate');
    }

    /**
     * Scope: Scans from today
     */
    public function scopeToday($query)
    {
        return $query->whereDate('scanned_at', today());
    }
}
