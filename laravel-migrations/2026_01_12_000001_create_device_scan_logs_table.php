<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Creates table to log all device scans for auditing and sync tracking
     */
    public function up(): void
    {
        Schema::create('device_scan_logs', function (Blueprint $table) {
            $table->id();
            $table->string('event_id');
            $table->string('device_id');
            $table->string('qrcode');
            $table->timestamp('scanned_at_device')->nullable(); // When scanned on device
            $table->timestamp('synced_at')->nullable(); // When synced to server
            $table->enum('sync_status', ['pending', 'synced', 'failed', 'conflict', 'duplicate'])->default('pending');
            $table->string('sync_error')->nullable();
            $table->string('gate_name')->nullable(); // Gate/entry point name
            $table->string('ip_address')->nullable();
            $table->json('metadata')->nullable(); // Additional device info
            $table->timestamps();
            
            // Indexes for common queries
            $table->index(['event_id', 'device_id']);
            $table->index(['qrcode', 'event_id']);
            $table->index('sync_status');
            $table->index('scanned_at_device');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('device_scan_logs');
    }
};
