<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * EventLoginLog - Records login/logout events from devices
 * 
 * Tracks:
 * - When users login/logout on scanning devices
 * - Which device and gate they used
 * - Session start/end times
 */
class EventLoginLog extends Model
{
    protected $fillable = [
        'device_id',
        'event_id',
        'user_id',
        'user_name',
        'action',           // 'login', 'logout', 'session_start', 'session_end'
        'logged_at',        // When the action occurred on device
        'synced_at',        // When it was synced to server
        'gate_name',
        'metadata',
    ];

    protected $casts = [
        'logged_at' => 'datetime',
        'synced_at' => 'datetime',
        'metadata' => 'array',
    ];

    /**
     * Get the user
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
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
     * Scope: Only logins
     */
    public function scopeLogins($query)
    {
        return $query->where('action', 'login');
    }

    /**
     * Scope: Only logouts
     */
    public function scopeLogouts($query)
    {
        return $query->where('action', 'logout');
    }

    /**
     * Scope: Today's logs
     */
    public function scopeToday($query)
    {
        return $query->whereDate('logged_at', today());
    }
}
