<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * SyncSession - Records each sync operation from a device
 * 
 * Tracks:
 * - When sync started/completed
 * - How many scans were uploaded
 * - Success/failure counts
 * - Any errors that occurred
 */
class SyncSession extends Model
{
    protected $fillable = [
        'device_id',
        'event_id',
        'user_id',
        'scans_uploaded',
        'scans_successful',
        'scans_duplicate',
        'scans_not_found',
        'scans_failed',
        'status',           // 'processing', 'completed', 'failed'
        'error_message',
        'started_at',
        'completed_at',
        'metadata',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'metadata' => 'array',
    ];

    /**
     * Get the user who performed the sync
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get all scan logs from this session
     */
    public function scanLogs(): HasMany
    {
        return $this->hasMany(DeviceScanLog::class);
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
     * Scope: Completed sessions
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    /**
     * Scope: Failed sessions
     */
    public function scopeFailed($query)
    {
        return $query->where('status', 'failed');
    }

    /**
     * Calculate success rate
     */
    public function getSuccessRateAttribute(): float
    {
        if ($this->scans_uploaded === 0) {
            return 0;
        }
        return round(($this->scans_successful / $this->scans_uploaded) * 100, 2);
    }

    /**
     * Get duration in seconds
     */
    public function getDurationAttribute(): ?int
    {
        if (!$this->started_at || !$this->completed_at) {
            return null;
        }
        return $this->completed_at->diffInSeconds($this->started_at);
    }
}
