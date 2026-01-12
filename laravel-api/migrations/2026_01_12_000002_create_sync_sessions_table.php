<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Creates the sync_sessions table
 * 
 * Tracks each sync operation from a device, including
 * success/failure counts and timing information.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sync_sessions', function (Blueprint $table) {
            $table->id();
            
            // Device identification
            $table->string('device_id', 36)->index();
            
            // Event context
            $table->unsignedBigInteger('event_id')->index();
            $table->unsignedBigInteger('user_id')->nullable()->index();
            
            // Scan counts
            $table->unsignedInteger('scans_uploaded')->default(0);
            $table->unsignedInteger('scans_successful')->default(0);
            $table->unsignedInteger('scans_duplicate')->default(0);
            $table->unsignedInteger('scans_not_found')->default(0);
            $table->unsignedInteger('scans_failed')->default(0);
            
            // Status: 'processing', 'completed', 'failed'
            $table->string('status', 20)->default('processing')->index();
            $table->text('error_message')->nullable();
            
            // Timing
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable()->index();
            
            // Extra data
            $table->json('metadata')->nullable();
            
            $table->timestamps();

            // Composite indexes
            $table->index(['device_id', 'event_id']);
            $table->index(['event_id', 'completed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sync_sessions');
    }
};
