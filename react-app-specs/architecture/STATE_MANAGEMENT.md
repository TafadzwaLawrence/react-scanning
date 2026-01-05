# 🔄 State Management Architecture

## Overview

This document outlines the recommended state management strategy for the React ticket scanning application using **Zustand** for global state and **TanStack Query** for server state.

---

## Technology Stack

| Category | Technology | Purpose |
|----------|------------|---------|
| Global State | Zustand | UI state, user preferences, session |
| Server State | TanStack Query | API calls, caching, sync |
| Local Storage | IndexedDB (Dexie.js) | Offline ticket database |
| Form State | React Hook Form + Zod | Form handling & validation |

---

## State Categories

```
┌─────────────────────────────────────────────────────────────────┐
│                        APPLICATION STATE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  AUTH STATE     │  │  SERVER STATE   │  │   UI STATE      │  │
│  │  (Zustand)      │  │  (TanStack Q)   │  │   (Zustand)     │  │
│  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤  │
│  │ • session       │  │ • events        │  │ • theme         │  │
│  │ • isAuthenticated│  │ • ticketGroups  │  │ • sidebarOpen   │  │
│  │ • deviceId      │  │ • scanResults   │  │ • activeModal   │  │
│  │ • eventDetails  │  │ • reports       │  │ • toasts        │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  SCANNER STATE  │  │  OFFLINE STATE  │  │   SYNC STATE    │  │
│  │  (Zustand)      │  │  (IndexedDB)    │  │   (Zustand)     │  │
│  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤  │
│  │ • isScanning    │  │ • tickets       │  │ • pendingScans  │  │
│  │ • lastScanResult│  │ • selectedTypes │  │ • syncStatus    │  │
│  │ • scanHistory   │  │ • configurations│  │ • lastSyncTime  │  │
│  │ • focusMode     │  │ • scanQueue     │  │ • conflictCount │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Store Definitions

### 1. Auth Store

```typescript
// src/stores/authStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthState {
  // State
  session: string | null;
  deviceId: string;
  isAuthenticated: boolean;
  eventDetails: EventDetails | null;
  rememberMe: boolean;
  
  // Actions
  login: (session: string, event: EventDetails) => void;
  logout: () => void;
  setDeviceId: (id: string) => void;
  setRememberMe: (value: boolean) => void;
  checkSession: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      session: null,
      deviceId: generateDeviceId(),
      isAuthenticated: false,
      eventDetails: null,
      rememberMe: true,
      
      // Actions
      login: (session, event) => set({
        session,
        eventDetails: event,
        isAuthenticated: true,
      }),
      
      logout: () => set({
        session: null,
        eventDetails: null,
        isAuthenticated: false,
      }),
      
      setDeviceId: (id) => set({ deviceId: id }),
      
      setRememberMe: (value) => set({ rememberMe: value }),
      
      checkSession: async () => {
        const { session } = get();
        if (!session) return false;
        
        try {
          const isValid = await authAPI.checkSession(session);
          if (!isValid) {
            get().logout();
            return false;
          }
          return true;
        } catch {
          return false;
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        session: state.rememberMe ? state.session : null,
        deviceId: state.deviceId,
        rememberMe: state.rememberMe,
      }),
    }
  )
);
```

---

### 2. Scanner Store

```typescript
// src/stores/scannerStore.ts
import { create } from 'zustand';

type ScanStatus = 'valid' | 'used' | 'invalid' | 'wrong-type' | 'offline';

interface ScanResult {
  id: string;
  qrCode: string;
  status: ScanStatus;
  ticketType?: string;
  ticketNumber?: string;
  scannedAt: Date;
  message?: string;
}

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
}

export const useScannerStore = create<ScannerState>((set, get) => ({
  // Initial state
  isScanning: false,
  isFocusMode: false,
  lastScanResult: null,
  scanHistory: [],
  scanCooldown: false,
  cooldownMs: 500,
  stats: { valid: 0, used: 0, invalid: 0, total: 0 },
  
  // Actions
  startScanning: () => set({ isScanning: true }),
  
  stopScanning: () => set({ isScanning: false }),
  
  toggleFocusMode: () => set((state) => ({ 
    isFocusMode: !state.isFocusMode 
  })),
  
  addScanResult: (result) => {
    set((state) => {
      const newStats = { ...state.stats, total: state.stats.total + 1 };
      
      if (result.status === 'valid') newStats.valid++;
      else if (result.status === 'used') newStats.used++;
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
  
  resetStats: () => set({ 
    stats: { valid: 0, used: 0, invalid: 0, total: 0 } 
  }),
  
  setCooldown: (ms) => set({ cooldownMs: ms }),
}));
```

---

### 3. Sync Store

```typescript
// src/stores/syncStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

interface PendingScan {
  id: string;
  qrCode: string;
  deviceId: string;
  scannedAt: number; // Unix timestamp
  attempts: number;
}

interface SyncState {
  // State
  status: SyncStatus;
  pendingScans: PendingScan[];
  lastSyncTime: number | null;
  isOnline: boolean;
  syncProgress: number; // 0-100
  errorMessage: string | null;
  
  // Actions
  addPendingScan: (scan: Omit<PendingScan, 'id' | 'attempts'>) => void;
  removePendingScan: (id: string) => void;
  clearPendingScans: () => void;
  startSync: () => void;
  completeSync: () => void;
  failSync: (message: string) => void;
  setOnline: (online: boolean) => void;
  setProgress: (progress: number) => void;
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
      // Initial state
      status: 'idle',
      pendingScans: [],
      lastSyncTime: null,
      isOnline: navigator.onLine,
      syncProgress: 0,
      errorMessage: null,
      
      // Actions
      addPendingScan: (scan) => set((state) => ({
        pendingScans: [
          ...state.pendingScans,
          { ...scan, id: crypto.randomUUID(), attempts: 0 }
        ],
      })),
      
      removePendingScan: (id) => set((state) => ({
        pendingScans: state.pendingScans.filter((s) => s.id !== id),
      })),
      
      clearPendingScans: () => set({ pendingScans: [] }),
      
      startSync: () => set({ 
        status: 'syncing', 
        syncProgress: 0, 
        errorMessage: null 
      }),
      
      completeSync: () => set({ 
        status: 'success', 
        lastSyncTime: Date.now(), 
        syncProgress: 100 
      }),
      
      failSync: (message) => set({ 
        status: 'error', 
        errorMessage: message 
      }),
      
      setOnline: (online) => set({ isOnline: online }),
      
      setProgress: (progress) => set({ syncProgress: progress }),
    }),
    {
      name: 'sync-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        pendingScans: state.pendingScans,
        lastSyncTime: state.lastSyncTime,
      }),
    }
  )
);
```

---

### 4. UI Store

```typescript
// src/stores/uiStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface UIState {
  // State
  theme: Theme;
  sidebarOpen: boolean;
  activeModal: string | null;
  toasts: Toast[];
  isLoading: boolean;
  loadingMessage: string | null;
  
  // Actions
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  setLoading: (loading: boolean, message?: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Initial state
      theme: 'system',
      sidebarOpen: true,
      activeModal: null,
      toasts: [],
      isLoading: false,
      loadingMessage: null,
      
      // Actions
      setTheme: (theme) => set({ theme }),
      
      toggleSidebar: () => set((state) => ({ 
        sidebarOpen: !state.sidebarOpen 
      })),
      
      openModal: (modalId) => set({ activeModal: modalId }),
      
      closeModal: () => set({ activeModal: null }),
      
      addToast: (toast) => {
        const id = crypto.randomUUID();
        set((state) => ({
          toasts: [...state.toasts, { ...toast, id }],
        }));
        
        // Auto-remove after duration
        const duration = toast.duration ?? 5000;
        setTimeout(() => {
          get().removeToast(id);
        }, duration);
      },
      
      removeToast: (id) => set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      })),
      
      setLoading: (loading, message) => set({ 
        isLoading: loading, 
        loadingMessage: message ?? null 
      }),
    }),
    {
      name: 'ui-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);
```

---

### 5. Event Store

```typescript
// src/stores/eventStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface EventState {
  // State
  selectedEventId: string | null;
  selectedTicketTypes: string[];
  ticketGroups: TicketGroup[];
  downloadedTicketCount: number;
  
  // Actions
  selectEvent: (eventId: string) => void;
  clearEvent: () => void;
  setTicketTypes: (types: string[]) => void;
  toggleTicketType: (type: string) => void;
  setTicketGroups: (groups: TicketGroup[]) => void;
  setDownloadedCount: (count: number) => void;
}

export const useEventStore = create<EventState>()(
  persist(
    (set, get) => ({
      // Initial state
      selectedEventId: null,
      selectedTicketTypes: [],
      ticketGroups: [],
      downloadedTicketCount: 0,
      
      // Actions
      selectEvent: (eventId) => set({ 
        selectedEventId: eventId,
        selectedTicketTypes: [],
        ticketGroups: [],
      }),
      
      clearEvent: () => set({ 
        selectedEventId: null,
        selectedTicketTypes: [],
        ticketGroups: [],
        downloadedTicketCount: 0,
      }),
      
      setTicketTypes: (types) => set({ selectedTicketTypes: types }),
      
      toggleTicketType: (type) => set((state) => {
        const types = state.selectedTicketTypes.includes(type)
          ? state.selectedTicketTypes.filter((t) => t !== type)
          : [...state.selectedTicketTypes, type];
        return { selectedTicketTypes: types };
      }),
      
      setTicketGroups: (groups) => set({ ticketGroups: groups }),
      
      setDownloadedCount: (count) => set({ downloadedTicketCount: count }),
    }),
    {
      name: 'event-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedEventId: state.selectedEventId,
        selectedTicketTypes: state.selectedTicketTypes,
      }),
    }
  )
);
```

---

## TanStack Query Setup

### Query Client Configuration

```typescript
// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});
```

### Query Hooks

```typescript
// src/hooks/queries/useEvents.ts
import { useQuery } from '@tanstack/react-query';
import { eventsAPI } from '@/api';

export const useEvents = () => {
  return useQuery({
    queryKey: ['events'],
    queryFn: eventsAPI.getAll,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// src/hooks/queries/useTicketGroups.ts
export const useTicketGroups = (eventId: string | null) => {
  return useQuery({
    queryKey: ['ticketGroups', eventId],
    queryFn: () => eventsAPI.getTicketGroups(eventId!),
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000,
  });
};

// src/hooks/queries/useReport.ts
export const useReport = (eventId: string | null) => {
  return useQuery({
    queryKey: ['report', eventId],
    queryFn: () => reportsAPI.getReconciliation(eventId!),
    enabled: !!eventId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};
```

### Mutation Hooks

```typescript
// src/hooks/mutations/useVerifyTicket.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketsAPI } from '@/api';
import { useScannerStore } from '@/stores/scannerStore';
import { useSyncStore } from '@/stores/syncStore';

export const useVerifyTicket = () => {
  const queryClient = useQueryClient();
  const addScanResult = useScannerStore((s) => s.addScanResult);
  const { isOnline, addPendingScan } = useSyncStore();

  return useMutation({
    mutationFn: async (params: {
      eventId: string;
      qrCode: string;
      deviceId: string;
      ticketTypes: string[];
    }) => {
      if (!isOnline) {
        // Queue for later sync
        addPendingScan({
          qrCode: params.qrCode,
          deviceId: params.deviceId,
          scannedAt: Date.now(),
        });
        throw new Error('OFFLINE');
      }
      
      return ticketsAPI.verify(
        params.eventId,
        params.qrCode,
        params.deviceId,
        params.ticketTypes
      );
    },
    onSuccess: (data, variables) => {
      addScanResult({
        id: crypto.randomUUID(),
        qrCode: variables.qrCode,
        status: data.status === 200 ? 'valid' : 'used',
        ticketType: data.type,
        ticketNumber: data.number,
        scannedAt: new Date(),
      });
      
      // Invalidate report cache
      queryClient.invalidateQueries({ 
        queryKey: ['report', variables.eventId] 
      });
    },
    onError: (error, variables) => {
      if (error.message === 'OFFLINE') {
        addScanResult({
          id: crypto.randomUUID(),
          qrCode: variables.qrCode,
          status: 'offline',
          scannedAt: new Date(),
          message: 'Queued for sync',
        });
      } else {
        addScanResult({
          id: crypto.randomUUID(),
          qrCode: variables.qrCode,
          status: 'invalid',
          scannedAt: new Date(),
          message: error.message,
        });
      }
    },
  });
};
```

---

## Data Flow Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                          USER SCANS QR CODE                        │
└───────────────────────────────┬────────────────────────────────────┘
                                │
                                ▼
              ┌─────────────────────────────────┐
              │      Check Online Status        │
              │      (useSyncStore.isOnline)    │
              └───────────────┬─────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
    ┌─────────────────┐             ┌─────────────────┐
    │     ONLINE      │             │    OFFLINE      │
    └────────┬────────┘             └────────┬────────┘
             │                               │
             ▼                               ▼
    ┌─────────────────┐             ┌─────────────────┐
    │  API Validation │             │ Local DB Check  │
    │  (TanStack Q)   │             │   (IndexedDB)   │
    └────────┬────────┘             └────────┬────────┘
             │                               │
             ▼                               ▼
    ┌─────────────────┐             ┌─────────────────┐
    │  Update State   │             │ Queue for Sync  │
    │ (useScannerStore)│             │ (useSyncStore)  │
    └────────┬────────┘             └────────┬────────┘
             │                               │
             └───────────────┬───────────────┘
                             │
                             ▼
              ┌─────────────────────────────────┐
              │       Display Result UI         │
              │     (ScanResultCard component)  │
              └─────────────────────────────────┘
```

---

## Offline Database Schema (Dexie.js)

```typescript
// src/lib/db.ts
import Dexie, { Table } from 'dexie';

interface TicketRecord {
  id?: number;
  ticketId: string;
  eventId: string;
  qrCode: string;
  ticketType: string;
  ticketNumber: string;
  logCount: number;
  syncStatus: 'synced' | 'pending';
  scannedAt?: number;
  scannedDeviceId?: string;
}

interface ConfigRecord {
  id?: number;
  key: string;
  value: string;
}

class TicketDB extends Dexie {
  tickets!: Table<TicketRecord>;
  config!: Table<ConfigRecord>;
  
  constructor() {
    super('TicketScannerDB');
    
    this.version(1).stores({
      tickets: '++id, ticketId, eventId, qrCode, ticketType, syncStatus',
      config: '++id, key',
    });
  }
}

export const db = new TicketDB();
```

---

## Best Practices

### 1. Selector Optimization

```typescript
// ❌ Bad - subscribes to entire store
const store = useScannerStore();

// ✅ Good - subscribes only to needed values
const isScanning = useScannerStore((s) => s.isScanning);
const { startScanning, stopScanning } = useScannerStore();
```

### 2. Action Composition

```typescript
// Combine related actions in custom hooks
export const useScan = () => {
  const verifyMutation = useVerifyTicket();
  const { deviceId } = useAuthStore();
  const { selectedEventId, selectedTicketTypes } = useEventStore();
  
  const scan = useCallback(async (qrCode: string) => {
    if (!selectedEventId) return;
    
    await verifyMutation.mutateAsync({
      eventId: selectedEventId,
      qrCode,
      deviceId,
      ticketTypes: selectedTicketTypes,
    });
  }, [selectedEventId, deviceId, selectedTicketTypes]);
  
  return { scan, isLoading: verifyMutation.isPending };
};
```

### 3. Hydration Safety (SSR)

```typescript
// For Next.js/SSR compatibility
import { useEffect, useState } from 'react';

export const useHydratedStore = <T, R>(
  useStore: (selector: (state: T) => R) => R,
  selector: (state: T) => R
) => {
  const [hydrated, setHydrated] = useState(false);
  const value = useStore(selector);
  
  useEffect(() => {
    setHydrated(true);
  }, []);
  
  return hydrated ? value : null;
};
```
