/**
 * Sync Manager - Orchestrates all sync operations
 * Central point for syncing data between React app and Laravel API
 */

import { getSyncClient, initSyncClient, isSyncClientInitialized } from './client';
import {
  getPendingScans,
  markScansAsSynced,
  updateScanSyncAttempt,
  getQueueStats,
  getAllScans,
  getAllSessionLogs,
  getPendingSessionLogs,
  markSessionLogsSynced,
  addSessionLog,
  cleanupSyncedScans,
  type QueueStats,
} from './queue';
import { collectDeviceInfo, getDeviceId } from './device';
import type {
  SyncStatus,
  SyncProgress,
  FullDataExport,
  ScanSyncResult,
} from './types';

// ============================================================================
// SYNC STATE
// ============================================================================

interface SyncState {
  isSyncing: boolean;
  lastSyncAt: number | null;
  lastSyncSuccess: boolean;
  error: string | null;
  progress: SyncProgress | null;
}

let syncState: SyncState = {
  isSyncing: false,
  lastSyncAt: null,
  lastSyncSuccess: false,
  error: null,
  progress: null,
};

type SyncListener = (state: SyncState) => void;
const listeners: Set<SyncListener> = new Set();

function notifyListeners(): void {
  listeners.forEach(listener => listener({ ...syncState }));
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Initialize the sync manager with API configuration
 */
export function initSync(apiBaseUrl: string, authToken?: string): void {
  const client = initSyncClient(apiBaseUrl, {
    batch_size: 50,
    retry_attempts: 3,
    retry_delay: 1000,
    timeout: 30000,
  });

  if (authToken) {
    client.setAuthToken(authToken);
  }

  // Load last sync state from storage
  const savedState = localStorage.getItem('sync_state');
  if (savedState) {
    try {
      const parsed = JSON.parse(savedState);
      syncState.lastSyncAt = parsed.lastSyncAt || null;
      syncState.lastSyncSuccess = parsed.lastSyncSuccess || false;
    } catch {
      // Ignore invalid state
    }
  }
}

/**
 * Set authentication token for API requests
 */
export function setSyncAuthToken(token: string | null): void {
  if (isSyncClientInitialized()) {
    getSyncClient().setAuthToken(token);
  }
}

/**
 * Subscribe to sync state changes
 */
export function subscribeSyncState(listener: SyncListener): () => void {
  listeners.add(listener);
  // Immediately call with current state
  listener({ ...syncState });
  return () => listeners.delete(listener);
}

/**
 * Get current sync status
 */
export async function getSyncStatus(): Promise<SyncStatus> {
  const stats = await getQueueStats();

  return {
    is_syncing: syncState.isSyncing,
    last_sync_at: syncState.lastSyncAt || undefined,
    last_sync_success: syncState.lastSyncSuccess,
    pending_count: stats.pending_scans,
    synced_count: stats.synced_scans,
    failed_count: stats.failed_scans,
    error: syncState.error || undefined,
  };
}

/**
 * Get queue statistics
 */
export async function getStats(): Promise<QueueStats> {
  return getQueueStats();
}

/**
 * Sync all pending data to server
 */
export async function syncAll(
  eventId: string,
  gateName?: string,
  onProgress?: (progress: SyncProgress) => void
): Promise<{
  success: boolean;
  synced: number;
  failed: number;
  results: ScanSyncResult[];
}> {
  console.log('[SyncManager] syncAll called:', { eventId, gateName, isSyncing: syncState.isSyncing });
  
  if (syncState.isSyncing) {
    console.log('[SyncManager] Already syncing, skipping');
    return { success: false, synced: 0, failed: 0, results: [] };
  }

  if (!isSyncClientInitialized()) {
    console.error('[SyncManager] Sync not initialized');
    throw new Error('Sync not initialized. Call initSync first.');
  }

  const client = getSyncClient();

  // Check connectivity
  if (!navigator.onLine) {
    console.log('[SyncManager] Offline, skipping sync');
    syncState.error = 'No internet connection';
    notifyListeners();
    return { success: false, synced: 0, failed: 0, results: [] };
  }

  syncState.isSyncing = true;
  syncState.error = null;
  syncState.progress = {
    total: 0,
    current: 0,
    percentage: 0,
    phase: 'preparing',
    message: 'Preparing sync...',
  };
  notifyListeners();

  try {
    // Get pending scans
    const pendingScans = await getPendingScans(eventId);
    console.log('[SyncManager] Pending scans:', pendingScans.length, pendingScans);

    if (pendingScans.length === 0) {
      console.log('[SyncManager] No pending scans to sync');
      syncState.progress = {
        total: 0,
        current: 0,
        percentage: 100,
        phase: 'complete',
        message: 'No pending scans to sync',
      };
      syncState.isSyncing = false;
      syncState.lastSyncAt = Date.now();
      syncState.lastSyncSuccess = true;
      saveSyncState();
      notifyListeners();
      return { success: true, synced: 0, failed: 0, results: [] };
    }

    console.log('[SyncManager] Starting sync of', pendingScans.length, 'scans');
    syncState.progress = {
      total: pendingScans.length,
      current: 0,
      percentage: 0,
      phase: 'uploading',
      message: `Syncing ${pendingScans.length} scans...`,
    };
    notifyListeners();
    onProgress?.(syncState.progress);

    // Convert to sync payload
    const scanPayloads = pendingScans.map(s => ({
      qrcode: s.qrcode,
      device_id: s.device_id,
      scanned_at: s.scanned_at,
      gate_name: s.gate_name,
      ticket_types: s.ticket_types,
    }));

    // Sync to server - uses /sync/scans endpoint which logs to device_scan_logs
    const result = await client.syncScans(scanPayloads, eventId, gateName, (current, total) => {
      syncState.progress = {
        total,
        current,
        percentage: Math.round((current / total) * 100),
        phase: 'uploading',
        message: `Synced ${current} of ${total} scans...`,
      };
      notifyListeners();
      onProgress?.(syncState.progress);
    });

    // Process results - mark successful scans
    const syncedIds: string[] = [];
    const resultMap = new Map(result.results.map(r => [r.qrcode, r]));

    for (const scan of pendingScans) {
      const scanResult = resultMap.get(scan.qrcode);
      if (scanResult) {
        if (scanResult.status === 200 || scanResult.status === 403) {
          // 200 = synced, 403 = already scanned (consider it synced)
          syncedIds.push(scan.id);
        } else {
          // Failed - update attempt count
          await updateScanSyncAttempt(scan.id, scanResult.message);
        }
      }
    }

    // Mark successful scans as synced
    if (syncedIds.length > 0) {
      await markScansAsSynced(syncedIds);
    }

    // Update state
    syncState.progress = {
      total: pendingScans.length,
      current: pendingScans.length,
      percentage: 100,
      phase: 'complete',
      message: `Sync complete: ${result.summary.synced} synced, ${result.summary.duplicates} duplicates`,
    };
    syncState.isSyncing = false;
    syncState.lastSyncAt = Date.now();
    syncState.lastSyncSuccess = result.summary.failed === 0;
    syncState.error = result.summary.failed > 0 
      ? `${result.summary.failed} scans failed to sync` 
      : null;
    saveSyncState();
    notifyListeners();
    onProgress?.(syncState.progress);

    return {
      success: result.summary.failed === 0,
      synced: result.summary.synced + result.summary.duplicates,
      failed: result.summary.failed + result.summary.notFound,
      results: result.results,
    };
  } catch (error) {
    syncState.progress = {
      total: 0,
      current: 0,
      percentage: 0,
      phase: 'error',
      message: error instanceof Error ? error.message : 'Sync failed',
    };
    syncState.isSyncing = false;
    syncState.error = error instanceof Error ? error.message : 'Sync failed';
    notifyListeners();
    onProgress?.(syncState.progress);

    return { success: false, synced: 0, failed: 0, results: [] };
  }
}

/**
 * Sync session logs (login/logout events) to server
 */
export async function syncSessionLogs(eventId: string): Promise<{
  success: boolean;
  synced: number;
}> {
  if (!isSyncClientInitialized() || !navigator.onLine) {
    return { success: false, synced: 0 };
  }

  const client = getSyncClient();
  const pendingLogs = await getPendingSessionLogs(eventId);

  if (pendingLogs.length === 0) {
    return { success: true, synced: 0 };
  }

  try {
    const response = await client.syncSessionLogs(
      getDeviceId(),
      pendingLogs.map(log => ({
        id: log.id,
        event_id: log.event_id,
        action: log.action,
        timestamp: log.timestamp,
        user_id: log.user_id,
        user_name: log.user_name,
        gate_name: log.gate_name,
        metadata: log.metadata,
      }))
    );

    if (response.success) {
      await markSessionLogsSynced(pendingLogs.map(l => l.id));
      return { success: true, synced: response.data?.synced_count || pendingLogs.length };
    }

    return { success: false, synced: 0 };
  } catch (error) {
    console.error('Failed to sync session logs:', error);
    return { success: false, synced: 0 };
  }
}

/**
 * Log a login event
 */
export async function logLogin(params: {
  eventId: string;
  userId?: number;
  userName?: string;
  gateName?: string;
}): Promise<void> {
  await addSessionLog({
    eventId: params.eventId,
    action: 'login',
    userId: params.userId,
    userName: params.userName,
    gateName: params.gateName,
    metadata: {
      device: collectDeviceInfo(),
      timestamp: new Date().toISOString(),
    },
  });

  // Try to sync immediately if online
  if (navigator.onLine && isSyncClientInitialized()) {
    syncSessionLogs(params.eventId).catch(console.error);
  }
}

/**
 * Log a logout event
 */
export async function logLogout(params: {
  eventId: string;
  userId?: number;
  userName?: string;
  gateName?: string;
}): Promise<void> {
  await addSessionLog({
    eventId: params.eventId,
    action: 'logout',
    userId: params.userId,
    userName: params.userName,
    gateName: params.gateName,
    metadata: {
      timestamp: new Date().toISOString(),
    },
  });

  // Try to sync immediately if online
  if (navigator.onLine && isSyncClientInitialized()) {
    syncSessionLogs(params.eventId).catch(console.error);
  }
}

/**
 * Export all local data (for debugging or manual transfer)
 */
export async function exportAllData(eventId: string): Promise<FullDataExport> {
  const scans = await getAllScans();
  const sessionLogs = await getAllSessionLogs();
  const stats = await getQueueStats();

  return {
    version: '1.0.0',
    exported_at: Date.now(),
    device: collectDeviceInfo(),
    event_id: eventId,
    scans: scans.filter(s => s.event_id === eventId),
    session_logs: sessionLogs.filter(l => l.event_id === eventId),
    settings: {
      // Include any relevant settings
    },
    stats: {
      total_scans: stats.total_scans,
      pending_scans: stats.pending_scans,
      synced_scans: stats.synced_scans,
      sessions: stats.total_session_logs,
    },
  };
}

/**
 * Download export as JSON file
 */
export async function downloadExport(eventId: string): Promise<void> {
  const data = await exportAllData(eventId);
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `scan-export-${eventId}-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import data from JSON export
 */
export async function importData(
  jsonData: string
): Promise<{ success: boolean; imported: number; error?: string }> {
  try {
    const data: FullDataExport = JSON.parse(jsonData);

    // Validate structure
    if (!data.version || !data.scans || !Array.isArray(data.scans)) {
      return { success: false, imported: 0, error: 'Invalid export format' };
    }

    // Import scans to queue
    const { addPendingScan } = await import('./queue');
    let imported = 0;

    for (const scan of data.scans) {
      if (!scan.synced) {
        await addPendingScan({
          qrcode: scan.qrcode,
          eventId: scan.event_id,
          deviceId: scan.device_id, // Include device_id from exported data
          ticketTypes: scan.ticket_types,
          gateName: scan.gate_name,
        });
        imported++;
      }
    }

    return { success: true, imported };
  } catch (error) {
    return {
      success: false,
      imported: 0,
      error: error instanceof Error ? error.message : 'Import failed',
    };
  }
}

/**
 * Cleanup old synced data
 */
export async function cleanup(daysOld: number = 7): Promise<number> {
  return cleanupSyncedScans(daysOld);
}

/**
 * Check if we can sync (online and initialized)
 */
export function canSync(): boolean {
  return navigator.onLine && isSyncClientInitialized() && !syncState.isSyncing;
}

/**
 * Get device ID
 */
export function getDeviceIdentifier(): string {
  return getDeviceId();
}

// ============================================================================
// INTERNAL UTILITIES
// ============================================================================

function saveSyncState(): void {
  localStorage.setItem(
    'sync_state',
    JSON.stringify({
      lastSyncAt: syncState.lastSyncAt,
      lastSyncSuccess: syncState.lastSyncSuccess,
    })
  );
}

// ============================================================================
// AUTO-SYNC (Optional)
// ============================================================================

let autoSyncInterval: ReturnType<typeof setInterval> | null = null;
let currentEventId: string | null = null;
let currentGateName: string | null = null;

/**
 * Start automatic syncing at specified interval
 */
export function startAutoSync(
  eventId: string,
  gateName?: string,
  intervalMs: number = 60000
): void {
  stopAutoSync();
  currentEventId = eventId;
  currentGateName = gateName || null;

  // Sync immediately
  syncAll(eventId, gateName);

  // Then sync at interval
  autoSyncInterval = setInterval(() => {
    if (canSync() && currentEventId) {
      syncAll(currentEventId, currentGateName || undefined);
    }
  }, intervalMs);

  // Also sync when coming back online
  window.addEventListener('online', handleOnline);
}

/**
 * Stop automatic syncing
 */
export function stopAutoSync(): void {
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
    autoSyncInterval = null;
  }
  window.removeEventListener('online', handleOnline);
  currentEventId = null;
  currentGateName = null;
}

function handleOnline(): void {
  if (canSync() && currentEventId) {
    // Small delay to ensure connection is stable
    setTimeout(() => {
      if (canSync() && currentEventId) {
        syncAll(currentEventId, currentGateName || undefined);
      }
    }, 2000);
  }
}
