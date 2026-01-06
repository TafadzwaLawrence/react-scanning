import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
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
import { 
  sanitizeInput, 
  validateUUID, 
  apiRateLimiter,
  getDeviceFingerprint 
} from '@/utils/security';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.263tickets.com/api/v1';
const isProduction = import.meta.env.PROD;

// Create axios instance with security defaults
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  // Security: Don't send credentials to different origins
  withCredentials: false,
});

// Generate request signature for integrity
const generateRequestSignature = async (
  method: string,
  url: string,
  timestamp: number
): Promise<string> => {
  const fingerprint = await getDeviceFingerprint();
  const data = `${method}:${url}:${timestamp}:${fingerprint}`;
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
};

// Request interceptor with security enhancements
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Rate limiting check
    const endpoint = config.url || 'unknown';
    if (!apiRateLimiter.isAllowed(endpoint)) {
      return Promise.reject(new Error('Rate limit exceeded. Please try again later.'));
    }

    // Add auth token
    const session = localStorage.getItem('session_token');
    if (session) {
      config.headers.Authorization = `Bearer ${session}`;
    }

    // Add security headers
    const timestamp = Date.now();
    config.headers['X-Request-Timestamp'] = timestamp.toString();
    
    // Add request signature for integrity
    try {
      const signature = await generateRequestSignature(
        config.method?.toUpperCase() || 'GET',
        config.url || '',
        timestamp
      );
      config.headers['X-Request-Signature'] = signature;
    } catch {
      // Continue without signature if generation fails
    }

    // Add fingerprint for device binding
    try {
      const fingerprint = await getDeviceFingerprint();
      config.headers['X-Device-Fingerprint'] = fingerprint.slice(0, 32);
    } catch {
      // Continue without fingerprint
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor with security checks
api.interceptors.response.use(
  (response) => {
    // Validate response timestamp isn't too old (replay attack prevention)
    const responseTime = response.headers['x-response-timestamp'];
    if (responseTime) {
      const timeDiff = Date.now() - parseInt(responseTime, 10);
      if (timeDiff > 30000) { // 30 seconds max
        console.warn('Response timestamp too old, possible replay attack');
      }
    }
    return response;
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear all sensitive data on auth failure
      localStorage.removeItem('session_token');
      localStorage.removeItem('auth-storage');
      sessionStorage.clear();
      window.location.href = '/login';
    }
    
    // Log errors in development only
    if (!isProduction) {
      console.error('API Error:', error.response?.status, error.message);
    }
    
    return Promise.reject(error);
  }
);

// Validate and sanitize login payload
const validateLoginPayload = (payload: LoginPayload): LoginPayload => {
  return {
    ...payload,
    event_identifier: sanitizeInput(payload.event_identifier),
    device_id: sanitizeInput(payload.device_id),
  };
};

// Auth API with security measures
export const authAPI = {
  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    const sanitizedPayload = validateLoginPayload(payload);
    
    if (!sanitizedPayload.event_identifier) {
      throw new Error('Invalid event identifier');
    }
    
    const response = await api.post<LoginResponse>('/events/auth/login', sanitizedPayload);
    return response.data;
  },

  logout: async (token: string): Promise<void> => {
    try {
      await api.post('/events/auth/logout', { session_token: token });
    } finally {
      // Always clear local data regardless of API response
      localStorage.removeItem('session_token');
      localStorage.removeItem('auth-storage');
      sessionStorage.clear();
    }
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

// Events API with input validation
export const eventsAPI = {
  getAll: async (): Promise<EventsResponse> => {
    const response = await api.get<EventsResponse>('/events/all/ids');
    return response.data;
  },

  getTicketGroups: async (eventId: string): Promise<TicketGroupsResponse> => {
    // Validate event ID
    if (!validateUUID(eventId)) {
      throw new Error('Invalid event ID format');
    }
    
    const response = await api.get<TicketGroupsResponse>(
      `/event/${encodeURIComponent(eventId)}/ticketgroups`
    );
    return response.data;
  },

  downloadTickets: async (
    eventId: string,
    types: string[]
  ): Promise<DownloadTicketsResponse> => {
    if (!validateUUID(eventId)) {
      throw new Error('Invalid event ID format');
    }
    
    // Sanitize ticket types
    const sanitizedTypes = types.map(t => sanitizeInput(t));
    
    const response = await api.post<DownloadTicketsResponse>(
      `/event/${encodeURIComponent(eventId)}/ticketgroups/download`,
      { ticket_types: sanitizedTypes }
    );
    return response.data;
  },
};

// Tickets API with validation
export const ticketsAPI = {
  verify: async (
    eventId: string,
    qrcode: string,
    deviceId: string,
    types: string[]
  ): Promise<VerifyResponse> => {
    // Validate inputs
    if (!validateUUID(eventId)) {
      throw new Error('Invalid event ID format');
    }
    
    // Sanitize QR code - encode for URL safety
    const sanitizedQR = encodeURIComponent(qrcode.trim());
    const sanitizedDeviceId = encodeURIComponent(sanitizeInput(deviceId));
    const sanitizedTypes = types.map(t => sanitizeInput(t));
    
    const response = await api.post<VerifyResponse>(
      `/event/${encodeURIComponent(eventId)}/verify/${sanitizedQR}/${sanitizedDeviceId}`,
      { event_ticket_names: sanitizedTypes }
    );
    return response.data;
  },

  batchSync: async (payload: BatchSyncPayload): Promise<BatchSyncResponse> => {
    // Validate and sanitize batch payload
    const sanitizedPayload = {
      ...payload,
      scans: payload.scans.map(scan => ({
        ...scan,
        qrcode: scan.qrcode.trim(),
        device_id: sanitizeInput(scan.device_id),
      })),
    };
    
    const response = await api.post<BatchSyncResponse>(
      '/event/batch_verify',
      sanitizedPayload
    );
    return response.data;
  },
};

// Reports API
export const reportsAPI = {
  getReconciliation: async (eventId: string): Promise<ReconciliationReport> => {
    if (!validateUUID(eventId)) {
      throw new Error('Invalid event ID format');
    }
    
    const response = await api.get<{ status: string; data: ReconciliationReport }>(
      `/event/${encodeURIComponent(eventId)}/report`
    );
    return response.data.data;
  },
};

export default api;
