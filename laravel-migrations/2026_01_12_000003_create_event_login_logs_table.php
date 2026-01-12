<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Creates table to log all login/logout attempts for security auditing
     */
    public function up(): void
    {
        Schema::create('event_login_logs', function (Blueprint $table) {
            $table->id();
            $table->string('event_id');
            $table->string('identifier'); // username or event_id used for login
            $table->string('device_id')->nullable();
            $table->string('gate_name')->nullable();
            $table->enum('action', ['login', 'logout', 'session_check', 'session_expired'])->default('login');
            $table->boolean('success')->default(false);
            $table->string('message')->nullable();
            $table->string('ip_address')->nullable();
            $table->text('user_agent')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            
            // Indexes
            $table->index(['event_id', 'device_id']);
            $table->index('success');
            $table->index('action');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('event_login_logs');
    }
};
