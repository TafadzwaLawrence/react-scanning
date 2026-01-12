/**
 * Sync Types - Data structures for syncing between React app and Laravel API
 */

// ============================================================================
// DEVICE TYPES
// ============================================================================

export interface DeviceInfo {
  device_id: string;
  device_name: string;
  device_type: 'mobile' | 'tablet' | 'desktop';
  os: string;
  os_version: string;
  browser: string;
  browser_version: string;
  screen_width: number;
  screen_height: number;
  user_agent: string;
  app_version: string;
}

export interface DeviceRegistration {
  device_id: string;
  event_id: string;
  gate_name?: string;
  registered_at: number;
}

// ============================================================================
// SCAN TYPES
// ============================================================================

export interface PendingScan {
  id: string;
  qrcode: string;
  device_id: string;
  event_id: string;
  scanned_at: number;
  ticket_types?: string[];
  gate_name?: string;
  offline: boolean;
  synced: boolean;
  sync_attempts: number;
  last_sync_attempt?: number;
  sync_error?: string;
}

export interface ScanPayload {
  qrcode: string;
  device_id: string;
  scanned_at: number;
  gate_name?: string;
  ticket_types?: string[];
}

export interface ScanSyncResult {
  qrcode: string;
  status: 200 | 403 | 404 | 500;
  message: string;
  sync_status: 'synced' | 'duplicate' | 'not_found' | 'failed';
  type?: string;
  number?: string;
  admittence?: number;
  scanned_at?: string;
  scanned_by?: string;
}

// ============================================================================
// SESSION TYPES
// ============================================================================

export interface SessionLog {
  id: string;
  device_id: string;
  event_id: string;
  user_id?: number;
  user_name?: string;
  action: 'login' | 'logout' | 'session_start' | 'session_end';
  timestamp: number;
  gate_name?: string;
  metadata?: Record<string, unknown>;
  synced: boolean;
}

// ============================================================================
// SYNC REQUEST/RESPONSE TYPES
// ============================================================================

export interface SyncRequest {
  device: DeviceInfo;
  event_id: string;
  gate_name?: string;
  scans: ScanPayload[];
  session_logs?: SessionLog[];
  sync_token?: string;
  timestamp: number;
}

export interface SyncResponse {
  status: number;
  message: string;
  summary: {
    total_scans: number;
    synced: number;
    duplicates: number;
    not_found: number;
    failed: number;
  };
  results: ScanSyncResult[];
  sync_token?: string;
  server_time: number;
}

// ============================================================================
// SYNC STATUS TYPES
// ============================================================================

export interface SyncStatus {
  is_syncing: boolean;
  last_sync_at?: number;
  last_sync_success: boolean;
  pending_count: number;
  synced_count: number;
  failed_count: number;
  error?: string;
}

export interface SyncProgress {
  total: number;
  current: number;
  percentage: number;
  phase: 'preparing' | 'uploading' | 'processing' | 'complete' | 'error';
  message: string;
}

// ============================================================================
// BATCH SYNC TYPES
// ============================================================================

export interface BatchConfig {
  batch_size: number;
  retry_attempts: number;
  retry_delay: number; // ms
  timeout: number; // ms
}

export interface BatchResult {
  batch_index: number;
  success: boolean;
  synced_count: number;
  failed_count: number;
  results: ScanSyncResult[];
  error?: string;
}

// ============================================================================
// FULL DATA EXPORT TYPES
// ============================================================================

export interface FullDataExport {
  version: string;
  exported_at: number;
  device: DeviceInfo;
  event_id: string;
  scans: PendingScan[];
  session_logs: SessionLog[];
  settings: Record<string, unknown>;
  stats: {
    total_scans: number;
    pending_scans: number;
    synced_scans: number;
    sessions: number;
  };
}
