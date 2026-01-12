import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { EventDetails } from '@/types';

// Generate a 5-digit device ID
const generateDeviceId = (): string => {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
};

interface AuthState {
  // State
  session: string | null;
  deviceId: string;
  gateName: string;
  isAuthenticated: boolean;
  eventDetails: EventDetails | null;
  rememberMe: boolean;

  // Actions
  login: (session: string, event: EventDetails) => void;
  logout: () => void;
  setDeviceId: (id: string) => void;
  setGateName: (name: string) => void;
  setRememberMe: (value: boolean) => void;
  setSession: (session: string | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Initial state
      session: null,
      deviceId: generateDeviceId(),
      gateName: '',
      isAuthenticated: false,
      eventDetails: null,
      rememberMe: true,

      // Actions
      login: (session, eventDetails) =>
        set({
          session,
          eventDetails,
          isAuthenticated: true,
        }),

      logout: () =>
        set({
          session: null,
          eventDetails: null,
          isAuthenticated: false,
        }),

      setDeviceId: (deviceId) => set({ deviceId }),

      setGateName: (gateName) => set({ gateName }),

      setRememberMe: (rememberMe) => set({ rememberMe }),

      setSession: (session) =>
        set({
          session,
          isAuthenticated: !!session,
        }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        session: state.rememberMe ? state.session : null,
        deviceId: state.deviceId,
        gateName: state.gateName,
        rememberMe: state.rememberMe,
        eventDetails: state.rememberMe ? state.eventDetails : null,
        isAuthenticated: state.rememberMe ? state.isAuthenticated : false,
      }),
    }
  )
);
