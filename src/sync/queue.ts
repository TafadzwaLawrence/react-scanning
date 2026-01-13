/**
 * Sync Queue - Manages the queue of pending items to sync
 * Uses IndexedDB via Dexie for persistence
 */

import Dexie, { type Table } from 'dexie';
import type { PendingScan, SessionLog } from './types';
import { generateUUID } from '../utils/uuid';
import { getDeviceId } from './device';

// ============================================================================
// DATABASE SCHEMA
// ============================================================================

class SyncDatabase extends Dexie {
  pendingScans!: Table<PendingScan, string>;
  sessionLogs!: Table<SessionLog, string>;

  constructor() {
    super('SyncQueue');

    this.version(1).stores({
      pendingScans: 'id, qrcode, event_id, scanned_at, synced, sync_attempts',
      sessionLogs: 'id, event_id, timestamp, synced',
    });
  }
}

const db = new SyncDatabase();

// ============================================================================
// SCAN QUEUE OPERATIONS
// ============================================================================

/**
 * Add a scan to the pending queue
 */
export async function addPendingScan(params: {
  qrcode: string;
  eventId: string;
  ticketTypes?: string[];
  gateName?: string;
}): Promise<PendingScan> {
  console.log('[SyncQueue] addPendingScan called:', params);
  
  const scan: PendingScan = {
    id: generateUUID(),
    qrcode: params.qrcode,
    device_id: getDeviceId(),
    event_id: params.eventId,
    scanned_at: Date.now(),
    ticket_types: params.ticketTypes,
    gate_name: params.gateName,
    offline: !navigator.onLine,
    synced: false,
    sync_attempts: 0,
  };

  await db.pendingScans.add(scan);
  console.log('[SyncQueue] Scan added to queue:', scan);
  return scan;
}

/**
 * Get all pending (unsynced) scans
 */
export async function getPendingScans(eventId?: string): Promise<PendingScan[]> {
  // Get all scans and filter by synced status
  const allScans = await db.pendingScans.toArray();
  const pendingScans = allScans.filter(s => !s.synced);
  
  console.log('[SyncQueue] getPendingScans:', { total: allScans.length, pending: pendingScans.length, eventId });
  
  if (eventId) {
    return pendingScans.filter(s => s.event_id === eventId);
  }
  return pendingScans;
}

/**
 * Get pending scans count
 */
export async function getPendingScansCount(eventId?: string): Promise<number> {
  const scans = await getPendingScans(eventId);
  return scans.length;
}

/**
 * Mark scans as synced
 */
export async function markScansAsSynced(scanIds: string[]): Promise<void> {
  await db.pendingScans
    .where('id')
    .anyOf(scanIds)
    .modify({ synced: true });
}

/**
 * Update scan sync attempt
 */
export async function updateScanSyncAttempt(
  scanId: string,
  error?: string
): Promise<void> {
  await db.pendingScans.update(scanId, {
    sync_attempts: (await db.pendingScans.get(scanId))!.sync_attempts + 1,
    last_sync_attempt: Date.now(),
    sync_error: error,
  });
}

/**
 * Get failed scans (exceeded retry attempts)
 */
export async function getFailedScans(maxAttempts: number = 3): Promise<PendingScan[]> {
  return db.pendingScans
    .where('sync_attempts')
    .aboveOrEqual(maxAttempts)
    .filter(s => !s.synced)
    .toArray();
}

/**
 * Delete synced scans older than specified days
 */
export async function cleanupSyncedScans(daysOld: number = 7): Promise<number> {
  const cutoff = Date.now() - daysOld * 24 * 60 * 60 * 1000;
  
  const toDelete = await db.pendingScans
    .filter(s => s.synced && s.scanned_at < cutoff)
    .toArray();

  await db.pendingScans.bulkDelete(toDelete.map(s => s.id));
  return toDelete.length;
}

/**
 * Get all scans (for export)
 */
export async function getAllScans(): Promise<PendingScan[]> {
  return db.pendingScans.toArray();
}

/**
 * Clear all scans
 */
export async function clearAllScans(): Promise<void> {
  await db.pendingScans.clear();
}

// ============================================================================
// SESSION LOG OPERATIONS
// ============================================================================

/**
 * Add a session log entry
 */
export async function addSessionLog(params: {
  eventId: string;
  action: SessionLog['action'];
  userId?: number;
  userName?: string;
  gateName?: string;
  metadata?: Record<string, unknown>;
}): Promise<SessionLog> {
  const log: SessionLog = {
    id: generateUUID(),
    device_id: getDeviceId(),
    event_id: params.eventId,
    user_id: params.userId,
    user_name: params.userName,
    action: params.action,
    timestamp: Date.now(),
    gate_name: params.gateName,
    metadata: params.metadata,
    synced: false,
  };

  await db.sessionLogs.add(log);
  return log;
}

/**
 * Get pending session logs
 */
export async function getPendingSessionLogs(eventId?: string): Promise<SessionLog[]> {
  const logs = await db.sessionLogs.filter(l => !l.synced).toArray();
  
  if (eventId) {
    return logs.filter(l => l.event_id === eventId);
  }
  return logs;
}

/**
 * Mark session logs as synced
 */
export async function markSessionLogsSynced(logIds: string[]): Promise<void> {
  await db.sessionLogs
    .where('id')
    .anyOf(logIds)
    .modify({ synced: true });
}

/**
 * Get all session logs (for export)
 */
export async function getAllSessionLogs(): Promise<SessionLog[]> {
  return db.sessionLogs.toArray();
}

/**
 * Clear all session logs
 */
export async function clearAllSessionLogs(): Promise<void> {
  await db.sessionLogs.clear();
}

// ============================================================================
// STATISTICS
// ============================================================================

export interface QueueStats {
  total_scans: number;
  pending_scans: number;
  synced_scans: number;
  failed_scans: number;
  total_session_logs: number;
  pending_session_logs: number;
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<QueueStats> {
  const allScans = await db.pendingScans.toArray();
  const allLogs = await db.sessionLogs.toArray();

  return {
    total_scans: allScans.length,
    pending_scans: allScans.filter(s => !s.synced).length,
    synced_scans: allScans.filter(s => s.synced).length,
    failed_scans: allScans.filter(s => !s.synced && s.sync_attempts >= 3).length,
    total_session_logs: allLogs.length,
    pending_session_logs: allLogs.filter(l => !l.synced).length,
  };
}

// Export database for advanced operations
export { db as syncDb };
