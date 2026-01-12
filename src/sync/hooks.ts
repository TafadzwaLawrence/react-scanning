/**
 * React Hook for Sync - Easy integration with React components
 */

import { useState, useEffect, useCallback } from 'react';
import {
  initSync,
  setSyncAuthToken,
  subscribeSyncState,
  getSyncStatus,
  getStats,
  syncAll,
  exportAllData,
  downloadExport,
  canSync,
  startAutoSync,
  stopAutoSync,
  getDeviceIdentifier,
} from './manager';
import type { SyncStatus, SyncProgress, FullDataExport } from './types';
import type { QueueStats } from './queue';

interface UseSyncOptions {
  apiBaseUrl: string;
  authToken?: string;
  eventId: string;
  gateName?: string;
  autoSync?: boolean;
  autoSyncInterval?: number; // ms
}

interface UseSyncReturn {
  // State
  status: SyncStatus | null;
  stats: QueueStats | null;
  progress: SyncProgress | null;
  isSyncing: boolean;
  isOnline: boolean;
  canSync: boolean;
  deviceId: string;

  // Actions
  sync: () => Promise<{ success: boolean; synced: number; failed: number }>;
  exportData: () => Promise<FullDataExport>;
  downloadData: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * React hook for managing sync state and operations
 */
export function useSync(options: UseSyncOptions): UseSyncReturn {
  const { apiBaseUrl, authToken, eventId, gateName, autoSync = false, autoSyncInterval = 60000 } = options;

  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Initialize sync on mount
  useEffect(() => {
    initSync(apiBaseUrl, authToken);
    refreshData();

    // Subscribe to sync state changes
    const unsubscribe = subscribeSyncState(state => {
      setIsSyncing(state.isSyncing);
      setProgress(state.progress);
    });

    return () => {
      unsubscribe();
    };
  }, [apiBaseUrl]);

  // Update auth token when it changes
  useEffect(() => {
    setSyncAuthToken(authToken || null);
  }, [authToken]);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-sync
  useEffect(() => {
    if (autoSync && eventId) {
      startAutoSync(eventId, gateName, autoSyncInterval);
      return () => stopAutoSync();
    }
  }, [autoSync, eventId, gateName, autoSyncInterval]);

  const refreshData = useCallback(async () => {
    const [newStatus, newStats] = await Promise.all([
      getSyncStatus(),
      getStats(),
    ]);
    setStatus(newStatus);
    setStats(newStats);
  }, []);

  const sync = useCallback(async () => {
    const result = await syncAll(eventId, gateName, setProgress);
    await refreshData();
    return result;
  }, [eventId, gateName, refreshData]);

  const exportData = useCallback(async () => {
    return exportAllData(eventId);
  }, [eventId]);

  const downloadData = useCallback(async () => {
    return downloadExport(eventId);
  }, [eventId]);

  return {
    status,
    stats,
    progress,
    isSyncing,
    isOnline,
    canSync: canSync(),
    deviceId: getDeviceIdentifier(),
    sync,
    exportData,
    downloadData,
    refresh: refreshData,
  };
}

/**
 * Simple hook just for sync status (lighter weight)
 */
export function useSyncStatus(): {
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: number | null;
} {
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeSyncState(state => {
      setIsSyncing(state.isSyncing);
      setLastSyncAt(state.lastSyncAt);
    });

    // Get initial pending count
    getStats().then(stats => setPendingCount(stats.pending_scans));

    return () => unsubscribe();
  }, []);

  return { isSyncing, pendingCount, lastSyncAt };
}
