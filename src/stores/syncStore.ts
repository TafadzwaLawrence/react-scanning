import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { generateUUID } from '@/utils';

type SyncStatusType = 'idle' | 'syncing' | 'success' | 'error';

interface PendingScan {
  id: string;
  qrCode: string;
  deviceId: string;
  scannedAt: number;
  attempts: number;
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
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      // Initial state
      status: 'idle',
      pendingScans: [],
      lastSyncTime: null,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      syncProgress: 0,
      errorMessage: null,
      totalScans: 0,
      syncedScans: 0,

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
        }),

      completeSync: () =>
        set({
          status: 'success',
          lastSyncTime: Date.now(),
          syncProgress: 100,
        }),

      failSync: (message) =>
        set({
          status: 'error',
          errorMessage: message,
        }),

      setOnline: (online) => set({ isOnline: online }),

      setProgress: (progress) => set({ syncProgress: progress }),

      updateSyncStats: (total, synced) =>
        set({ totalScans: total, syncedScans: synced }),
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
