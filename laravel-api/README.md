# Laravel API Implementation for Sync

This folder contains all the Laravel code needed to handle sync from the React PWA.

## Files to Copy

```
laravel-api/
├── Controllers/
│   └── SyncController.php      → app/Http/Controllers/Api/SyncController.php
├── Models/
│   ├── DeviceScanLog.php       → app/Models/DeviceScanLog.php
│   ├── SyncSession.php         → app/Models/SyncSession.php
│   └── EventLoginLog.php       → app/Models/EventLoginLog.php
├── migrations/
│   ├── create_device_scan_logs_table.php
│   ├── create_sync_sessions_table.php
│   └── create_event_login_logs_table.php
├── routes/
│   └── api.php                 → Add to routes/api.php
└── config/
    └── cors.php                → Update config/cors.php
```

## Quick Setup

### 1. Copy Migrations
```bash
cp laravel-api/migrations/* database/migrations/
php artisan migrate
```

### 2. Copy Models
```bash
cp laravel-api/Models/* app/Models/
```

### 3. Copy Controller
```bash
cp laravel-api/Controllers/SyncController.php app/Http/Controllers/Api/
```

### 4. Add Routes
Add the routes from `laravel-api/routes/api.php` to your `routes/api.php`

### 5. Update CORS (for localhost development)
Update `config/cors.php` with the settings from `laravel-api/config/cors.php`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sync/scans` | Sync pending scans (uses existing batch_verify logic) |
| POST | `/api/sync/session-logs` | Sync session login/logout logs |
| POST | `/api/sync/device/register` | Register a device for an event |
| GET | `/api/sync/status/{eventId}/{deviceId}` | Get sync status for device |
| GET | `/api/ping` | Health check endpoint |

## Existing Endpoint

Your existing `batchVerifyTickets` at `/event/batch_verify` already works! The React app uses it directly. The new endpoints are optional for enhanced tracking.
