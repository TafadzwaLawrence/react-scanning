<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Creates table to track sync sessions between devices and server
     */
    public function up(): void
    {
        Schema::create('sync_sessions', function (Blueprint $table) {
            $table->id();
            $table->string('event_id');
            $table->string('device_id');
            $table->string('session_token')->nullable();
            $table->string('gate_name')->nullable();
            $table->integer('scans_uploaded')->default(0);
            $table->integer('scans_successful')->default(0);
            $table->integer('scans_failed')->default(0);
            $table->integer('scans_duplicate')->default(0);
            $table->integer('scans_conflict')->default(0);
            $table->timestamp('started_at');
            $table->timestamp('completed_at')->nullable();
            $table->enum('status', ['in_progress', 'completed', 'failed', 'partial'])->default('in_progress');
            $table->text('error_message')->nullable();
            $table->string('ip_address')->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamps();
            
            // Indexes
            $table->index(['event_id', 'device_id']);
            $table->index('session_token');
            $table->index('status');
            $table->index('completed_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sync_sessions');
    }
};
