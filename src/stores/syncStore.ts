import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { generateUUID } from '@/utils';
import { ticketsAPI } from '@/services/api';

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
    total: number;
    successful: number;
    alreadyScanned: number;
    notFound: number;
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
  syncToServer: () => Promise<SyncResult>;
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

      // Sync pending scans to server using existing batchVerifyTickets endpoint
      syncToServer: async (): Promise<SyncResult> => {
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
          // Format scans for the existing batchVerifyTickets endpoint
          const payload = {
            scans: state.pendingScans.map(scan => ({
              qrcode: scan.qrCode,
              device_id: scan.deviceId,
              scanned_at: Math.floor(scan.scannedAt / 1000), // Convert to seconds if in ms
            })),
          };

          const response = await ticketsAPI.batchSync(payload);

          // Process results from the API
          // status 200 = synced, status 403 = already scanned, status 404 = not found
          const results = (response as any).results || [];
          
          let successful = 0;
          let alreadyScanned = 0;
          let notFound = 0;
          const syncedQRCodes: string[] = [];

          for (const result of results) {
            if (result.status === 200) {
              successful++;
              syncedQRCodes.push(result.qrcode);
            } else if (result.status === 403) {
              alreadyScanned++;
              // Still remove from pending - it's already scanned on server
              syncedQRCodes.push(result.qrcode);
            } else if (result.status === 404) {
              notFound++;
              // Remove from pending - ticket doesn't exist
              syncedQRCodes.push(result.qrcode);
            }
          }

          // Remove synced/processed scans from pending
          const remainingScans = state.pendingScans.filter(
            scan => !syncedQRCodes.includes(scan.qrCode)
          );

          set({
            pendingScans: remainingScans,
            lastSyncTime: Date.now(),
            syncedScans: state.syncedScans + successful,
            status: 'success',
            isSyncing: false,
            syncProgress: 100,
            errorMessage: null,
          });

          return {
            success: true,
            summary: {
              total: state.pendingScans.length,
              successful,
              alreadyScanned,
              notFound,
            },
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
