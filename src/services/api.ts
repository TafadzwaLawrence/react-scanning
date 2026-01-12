import axios, { AxiosError, AxiosInstance } from 'axios';
import type {
  LoginPayload,
  LoginResponse,
  EventsResponse,
  TicketGroupsResponse,
  DownloadTicketsResponse,
  VerifyResponse,
  BatchSyncPayload,
  BatchSyncResponse,
  ReconciliationReport,
} from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.263tickets.com/api/v1';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const session = localStorage.getItem('session_token');
    if (session) {
      config.headers.Authorization = `Bearer ${session}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('session_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/events/auth/login', payload);
    return response.data;
  },

  logout: async (token: string): Promise<void> => {
    await api.post('/events/auth/logout', { session_token: token });
  },

  checkSession: async (token: string): Promise<boolean> => {
    try {
      const response = await api.post('/events/auth/check-session', {
        session_token: token,
      });
      return response.data.valid === true;
    } catch {
      return false;
    }
  },
};

// Events API
export const eventsAPI = {
  getAll: async (): Promise<EventsResponse> => {
    const response = await api.get<EventsResponse>('/events/all/ids');
    return response.data;
  },

  getTicketGroups: async (eventId: string): Promise<TicketGroupsResponse> => {
    const response = await api.get<TicketGroupsResponse>(
      `/event/${eventId}/ticketgroups`
    );
    return response.data;
  },

  downloadTickets: async (
    eventId: string,
    types: string[]
  ): Promise<DownloadTicketsResponse> => {
    const response = await api.post<DownloadTicketsResponse>(
      `/event/${eventId}/ticketgroups/download`,
      { ticket_types: types }
    );
    return response.data;
  },
};

// Tickets API
export const ticketsAPI = {
  verify: async (
    eventId: string,
    qrcode: string,
    deviceId: string,
    types: string[]
  ): Promise<VerifyResponse> => {
    const response = await api.post<VerifyResponse>(
      `/event/${eventId}/verify/${encodeURIComponent(qrcode)}/${deviceId}`,
      { event_ticket_names: types }
    );
    return response.data;
  },

  batchSync: async (payload: BatchSyncPayload): Promise<BatchSyncResponse> => {
    const response = await api.post<BatchSyncResponse>(
      '/event/batch_verify',
      payload
    );
    return response.data;
  },
};

// Sync API - for syncing offline scans to server
export const syncAPI = {
  /**
   * Sync pending offline scans to the server
   */
  syncScans: async (
    eventId: string,
    deviceId: string,
    sessionToken: string,
    scans: Array<{ qrCode: string; scannedAt: number; ticketTypes?: string[] }>,
    gateName?: string
  ): Promise<SyncResponse> => {
    const response = await api.post<SyncResponse>('/offline/sync', {
      event_id: eventId,
      device_id: deviceId,
      session_token: sessionToken,
      gate_name: gateName,
      scans: scans.map(scan => ({
        qrcode: scan.qrCode,
        scanned_at: scan.scannedAt,
        ticket_types: scan.ticketTypes,
      })),
    });
    return response.data;
  },

  /**
   * Get sync status for this device
   */
  getSyncStatus: async (eventId: string, deviceId: string): Promise<SyncStatusResponse> => {
    const response = await api.get<SyncStatusResponse>(`/offline/sync/status/${eventId}/${deviceId}`);
    return response.data;
  },
};

// Sync Response Types
export interface SyncResponse {
  status: number;
  message: string;
  summary: {
    total_uploaded: number;
    successful: number;
    duplicates: number;
    failed: number;
  };
  results: Array<{
    qrcode: string;
    status: number;
    message: string;
    sync_status: 'synced' | 'duplicate' | 'conflict' | 'failed';
    type?: string;
    number?: string;
    scanned_at?: string;
    scanned_by?: string;
  }>;
  sync_session_id: number;
  synced_at: string;
}

export interface SyncStatusResponse {
  status: number;
  event_id: string;
  device_id: string;
  total_scans: number;
  pending_scans: number;
  last_sync: {
    session_id: number;
    scans_uploaded: number;
    scans_successful: number;
    scans_failed: number;
    completed_at: string;
    status: string;
  } | null;
  timestamp: string;
}

// Reports API
export const reportsAPI = {
  getReconciliation: async (eventId: string): Promise<ReconciliationReport> => {
    const response = await api.get<{ status: string; data: ReconciliationReport }>(
      `/event/${eventId}/report`
    );
    return response.data.data;
  },
};

export default api;
