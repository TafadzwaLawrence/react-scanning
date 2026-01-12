import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { generateUUID } from '@/utils';
import { syncAPI } from '@/services/api';

type SyncStatusType = 'idle' | 'syncing' | 'success' | 'error';

interface PendingScan {
  id: string;
  qrCode: string;
  deviceId: string;
  scannedAt: number;
  ticketTypes?: string[];
  attempts: number;
}

interface SyncResult {
  success: boolean;
  message?: string;
  summary?: {
    total_uploaded: number;
    successful: number;
    duplicates: number;
    failed: number;
  };
}

interface SyncState {
  // State
  status: SyncStatusType;
  pendingScans: PendingScan[];
  lastSyncTime: number | null;
  isOnline: boolean;
  syncProgress: number;
  errorMessage: string | null;
  totalScans: number;
  syncedScans: number;
  isSyncing: boolean;

  // Actions
  addPendingScan: (scan: Omit<PendingScan, 'id' | 'attempts'>) => void;
  removePendingScan: (id: string) => void;
  clearPendingScans: () => void;
  startSync: () => void;
  completeSync: () => void;
  failSync: (message: string) => void;
  setOnline: (online: boolean) => void;
  setProgress: (progress: number) => void;
  updateSyncStats: (total: number, synced: number) => void;
  syncToServer: (eventId: string, deviceId: string, sessionToken: string, gateName?: string) => Promise<SyncResult>;
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
      // Initial state
      status: 'idle',
      pendingScans: [],
      lastSyncTime: null,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      syncProgress: 0,
      errorMessage: null,
      totalScans: 0,
      syncedScans: 0,
      isSyncing: false,

      // Actions
      addPendingScan: (scan) =>
        set((state) => ({
          pendingScans: [
            ...state.pendingScans,
            { ...scan, id: generateUUID(), attempts: 0 },
          ],
        })),

      removePendingScan: (id) =>
        set((state) => ({
          pendingScans: state.pendingScans.filter((s) => s.id !== id),
        })),

      clearPendingScans: () => set({ pendingScans: [] }),

      startSync: () =>
        set({
          status: 'syncing',
          syncProgress: 0,
          errorMessage: null,
          isSyncing: true,
        }),

      completeSync: () =>
        set({
          status: 'success',
          lastSyncTime: Date.now(),
          syncProgress: 100,
          isSyncing: false,
        }),

      failSync: (message) =>
        set({
          status: 'error',
          errorMessage: message,
          isSyncing: false,
        }),

      setOnline: (online) => set({ isOnline: online }),

      setProgress: (progress) => set({ syncProgress: progress }),

      updateSyncStats: (total, synced) =>
        set({ totalScans: total, syncedScans: synced }),

      // Sync pending scans to server
      syncToServer: async (eventId: string, deviceId: string, sessionToken: string, gateName?: string): Promise<SyncResult> => {
        const state = get();
        
        if (!state.isOnline) {
          return { success: false, message: 'Device is offline' };
        }
        
        if (state.pendingScans.length === 0) {
          return { success: true, message: 'No scans to sync' };
        }

        if (state.isSyncing) {
          return { success: false, message: 'Sync already in progress' };
        }

        set({ 
          status: 'syncing', 
          isSyncing: true, 
          syncProgress: 0, 
          errorMessage: null 
        });

        try {
          const response = await syncAPI.syncScans(
            eventId,
            deviceId,
            sessionToken,
            state.pendingScans.map(scan => ({
              qrCode: scan.qrCode,
              scannedAt: scan.scannedAt,
              ticketTypes: scan.ticketTypes,
            })),
            gateName
          );

          // Remove successfully synced scans (synced or duplicate)
          const syncedQRCodes = response.results
            .filter(r => r.sync_status === 'synced' || r.sync_status === 'duplicate')
            .map(r => r.qrcode);

          const remainingScans = state.pendingScans.filter(
            scan => !syncedQRCodes.includes(scan.qrCode)
          );

          set({
            pendingScans: remainingScans,
            lastSyncTime: Date.now(),
            syncedScans: state.syncedScans + response.summary.successful,
            status: remainingScans.length > 0 ? 'error' : 'success',
            isSyncing: false,
            syncProgress: 100,
            errorMessage: remainingScans.length > 0 
              ? `${response.summary.failed} scans failed to sync` 
              : null,
          });

          return {
            success: true,
            summary: response.summary,
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Sync failed';
          
          set({ 
            status: 'error', 
            isSyncing: false,
            errorMessage,
          });
          
          return { success: false, message: errorMessage };
        }
      },
    }),
    {
      name: 'sync-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        pendingScans: state.pendingScans,
        lastSyncTime: state.lastSyncTime,
        totalScans: state.totalScans,
        syncedScans: state.syncedScans,
      }),
    }
  )
);
