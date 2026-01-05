import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { TicketGroup } from '@/types';

interface EventState {
  // State
  selectedEventId: string | null;
  selectedEventName: string | null;
  selectedTicketTypes: string[];
  ticketGroups: TicketGroup[];
  downloadedTicketCount: number;

  // Actions
  selectEvent: (eventId: string, eventName: string) => void;
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
      selectedEventName: null,
      selectedTicketTypes: [],
      ticketGroups: [],
      downloadedTicketCount: 0,

      // Actions
      selectEvent: (eventId, eventName) =>
        set({
          selectedEventId: eventId,
          selectedEventName: eventName,
          selectedTicketTypes: [],
          ticketGroups: [],
        }),

      clearEvent: () =>
        set({
          selectedEventId: null,
          selectedEventName: null,
          selectedTicketTypes: [],
          ticketGroups: [],
          downloadedTicketCount: 0,
        }),

      setTicketTypes: (types) => set({ selectedTicketTypes: types }),

      toggleTicketType: (type) => {
        const { selectedTicketTypes } = get();
        const types = selectedTicketTypes.includes(type)
          ? selectedTicketTypes.filter((t) => t !== type)
          : [...selectedTicketTypes, type];
        set({ selectedTicketTypes: types });
      },

      setTicketGroups: (groups) => set({ ticketGroups: groups }),

      setDownloadedCount: (count) => set({ downloadedTicketCount: count }),
    }),
    {
      name: 'event-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedEventId: state.selectedEventId,
        selectedEventName: state.selectedEventName,
        selectedTicketTypes: state.selectedTicketTypes,
        downloadedTicketCount: state.downloadedTicketCount,
      }),
    }
  )
);
