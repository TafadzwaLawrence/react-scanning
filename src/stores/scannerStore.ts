import { create } from 'zustand';
import type { ScanResult, ScanResultType } from '@/types';

interface ScannerState {
  // State
  isScanning: boolean;
  isFocusMode: boolean;
  lastScanResult: ScanResult | null;
  scanHistory: ScanResult[];
  scanCooldown: boolean;
  cooldownMs: number;
  stats: {
    valid: number;
    used: number;
    invalid: number;
    total: number;
  };

  // Actions
  startScanning: () => void;
  stopScanning: () => void;
  toggleFocusMode: () => void;
  addScanResult: (result: ScanResult) => void;
  clearLastResult: () => void;
  clearHistory: () => void;
  resetStats: () => void;
  setCooldown: (ms: number) => void;
  incrementStat: (type: ScanResultType) => void;
}

export const useScannerStore = create<ScannerState>((set, get) => ({
  // Initial state
  isScanning: false,
  isFocusMode: false,
  lastScanResult: null,
  scanHistory: [],
  scanCooldown: false,
  cooldownMs: 3000,
  stats: { valid: 0, used: 0, invalid: 0, total: 0 },

  // Actions
  startScanning: () => set({ isScanning: true }),

  stopScanning: () => set({ isScanning: false }),

  toggleFocusMode: () =>
    set((state) => ({
      isFocusMode: !state.isFocusMode,
    })),

  addScanResult: (result) => {
    set((state) => {
      const newStats = { ...state.stats, total: state.stats.total + 1 };

      if (result.type === 'valid') newStats.valid++;
      else if (result.type === 'used') newStats.used++;
      else newStats.invalid++;

      return {
        lastScanResult: result,
        scanHistory: [result, ...state.scanHistory.slice(0, 99)],
        stats: newStats,
        scanCooldown: true,
      };
    });

    // Reset cooldown
    setTimeout(() => {
      set({ scanCooldown: false });
    }, get().cooldownMs);
  },

  clearLastResult: () => set({ lastScanResult: null }),

  clearHistory: () => set({ scanHistory: [] }),

  resetStats: () =>
    set({
      stats: { valid: 0, used: 0, invalid: 0, total: 0 },
    }),

  setCooldown: (ms) => set({ cooldownMs: ms }),

  incrementStat: (type) =>
    set((state) => {
      const newStats = { ...state.stats, total: state.stats.total + 1 };
      if (type === 'valid') newStats.valid++;
      else if (type === 'used') newStats.used++;
      else newStats.invalid++;
      return { stats: newStats };
    }),
}));
