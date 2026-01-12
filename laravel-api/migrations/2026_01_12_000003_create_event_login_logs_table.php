<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Creates the event_login_logs table
 * 
 * Records login/logout events from scanning devices,
 * useful for tracking who was scanning at what time.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_login_logs', function (Blueprint $table) {
            $table->id();
            
            // Device identification
            $table->string('device_id', 36)->index();
            
            // Event context
            $table->unsignedBigInteger('event_id')->index();
            
            // User info
            $table->unsignedBigInteger('user_id')->nullable()->index();
            $table->string('user_name', 100)->nullable();
            
            // Action: 'login', 'logout', 'session_start', 'session_end'
            $table->string('action', 20)->index();
            
            // Timestamps
            $table->timestamp('logged_at')->index();  // When action occurred on device
            $table->timestamp('synced_at');            // When synced to server
            
            // Additional context
            $table->string('gate_name', 50)->nullable()->index();
            
            // Extra data
            $table->json('metadata')->nullable();
            
            $table->timestamps();

            // Composite indexes
            $table->index(['event_id', 'logged_at']);
            $table->index(['device_id', 'event_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_login_logs');
    }
};
