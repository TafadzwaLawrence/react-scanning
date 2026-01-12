<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Creates the device_scan_logs table
 * 
 * This table records every scan attempt from mobile devices,
 * enabling audit trails and sync debugging.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('device_scan_logs', function (Blueprint $table) {
            $table->id();
            
            // Device identification
            $table->string('device_id', 36)->index();
            
            // Event context
            $table->unsignedBigInteger('event_id')->index();
            
            // Scan data
            $table->string('qrcode', 100)->index();
            $table->unsignedBigInteger('ticket_id')->nullable()->index();
            
            // Result: 'success', 'duplicate', 'not_found', 'failed'
            $table->string('scan_result', 20)->index();
            
            // Timestamps
            $table->timestamp('scanned_at')->index();  // When scanned on device
            $table->timestamp('synced_at');             // When synced to server
            
            // Additional context
            $table->string('gate_name', 50)->nullable()->index();
            $table->unsignedBigInteger('user_id')->nullable()->index();
            $table->unsignedBigInteger('sync_session_id')->nullable()->index();
            
            // Extra data
            $table->json('metadata')->nullable();
            
            $table->timestamps();

            // Composite indexes for common queries
            $table->index(['event_id', 'scanned_at']);
            $table->index(['device_id', 'event_id']);
            $table->index(['device_id', 'scanned_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('device_scan_logs');
    }
};
