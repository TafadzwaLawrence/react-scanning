/**
 * Sync Module - Main entry point
 * 
 * This module provides a complete solution for syncing data between
 * the React PWA and Laravel API, including:
 * 
 * - Offline-first scan queue with IndexedDB persistence
 * - Batch sync with retry logic
 * - Device identification and tracking
 * - Progress tracking and state management
 * - Data export/import for debugging
 * - React hooks for easy integration
 * 
 * @example
 * ```typescript
 * // Initialize in your app entry point
 * import { initSync, setSyncAuthToken } from './sync';
 * 
 * initSync('https://api.263tickets.com');
 * setSyncAuthToken(userToken);
 * 
 * // Use in React components
 * import { useSync } from './sync';
 * 
 * function SyncButton() {
 *   const { sync, isSyncing, stats } = useSync({
 *     apiBaseUrl: 'https://api.263tickets.com',
 *     authToken: token,
 *     eventId: '123',
 *   });
 * 
 *   return (
 *     <button onClick={sync} disabled={isSyncing}>
 *       Sync ({stats?.pending_scans || 0} pending)
 *     </button>
 *   );
 * }
 * ```
 */

// Types
export type {
  DeviceInfo,
  DeviceRegistration,
  PendingScan,
  ScanPayload,
  ScanSyncResult,
  SessionLog,
  SyncRequest,
  SyncResponse,
  SyncStatus,
  SyncProgress,
  BatchConfig,
  BatchResult,
  FullDataExport,
} from './types';

// Device utilities
export {
  getDeviceId,
  getDeviceType,
  getDeviceName,
  getOSInfo,
  getBrowserInfo,
  collectDeviceInfo,
} from './device';

// Queue operations
export {
  addPendingScan,
  getPendingScans,
  getPendingScansCount,
  markScansAsSynced,
  updateScanSyncAttempt,
  getFailedScans,
  cleanupSyncedScans,
  getAllScans,
  clearAllScans,
  addSessionLog,
  getPendingSessionLogs,
  markSessionLogsSynced,
  getAllSessionLogs,
  clearAllSessionLogs,
  getQueueStats,
  syncDb,
  type QueueStats,
} from './queue';

// Sync client
export {
  SyncClient,
  initSyncClient,
  getSyncClient,
  isSyncClientInitialized,
} from './client';

// Sync manager (main API)
export {
  initSync,
  setSyncAuthToken,
  subscribeSyncState,
  getSyncStatus,
  getStats,
  syncAll,
  exportAllData,
  downloadExport,
  importData,
  cleanup,
  canSync,
  getDeviceIdentifier,
  startAutoSync,
  stopAutoSync,
} from './manager';

// React hooks
export {
  useSync,
  useSyncStatus,
} from './hooks';
