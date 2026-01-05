// Authentication Types
export interface LoginPayload {
  event_identifier: string;
  password: string;
  device_id: string;
  remember_me: boolean;
}

export interface LoginResponse {
  status: 'success' | 'error';
  session_token?: string;
  event_details?: EventDetails;
  message?: string;
}

export interface EventDetails {
  event_id: string;
  event_name: string;
}

export interface EventSession {
  session_token: string;
  event_details: EventDetails;
  created_at: number;
  expires_at?: number;
}

// Events Types
export interface Event {
  id: string;
  name: string;
  year: string;
  month: string;
}

export interface EventsByYear {
  year: string;
  month: string;
  event_count: number;
  events: Event[];
}

export interface EventsResponse {
  events_by_year: EventsByYear[];
}

// Ticket Groups Types
export interface TicketGroup {
  type: string;
  total: number;
  isSelected: boolean;
}

export interface TicketGroupsResponse {
  status: number;
  ticket_type_counts: Array<{
    event_ticket_type: string;
    total: number;
  }>;
}

export interface DownloadTicketsPayload {
  ticket_types: string[];
}

export interface DownloadTicketsResponse {
  status: number;
  tickets: {
    [ticketType: string]: TicketData[];
  };
}

// Ticket Types
export interface TicketData {
  ticket_id: string;
  event_id: string;
  organisation_id: string;
  event_ticket_name: string;
  event_date: string;
  event_ticket_type: string;
  event_ticket_admittence: string;
  event_venue: string;
  event_city_state: string;
  qrcode: string;
  ticket_number: string;
  serial: string;
  log_count: number;
}

export interface Ticket {
  id?: number;
  ticket_id: string;
  event_id: string;
  organisation_id: string;
  event_name: string;
  event_date: string;
  ticket_type: string;
  ticket_admittence: string;
  event_venue: string;
  event_city: string;
  qrcode: string;
  ticket_number: string;
  serial: string;
  log_count: number;
  sync_status: SyncStatus;
  scanned_at: number | null;
  scanned_device_id: string | null;
}

export enum SyncStatus {
  UNSYNCED = 0,
  SYNCED = 1,
}

// Verification Types
export interface VerifyTicketPayload {
  event_ticket_names: string[];
}

export interface VerifySuccessResponse {
  status: 200;
  type: string;
  admittence: string;
  number: string;
}

export interface VerifyUsedResponse {
  status: 403;
  type: string;
  admittence: string;
  number: string;
  scanned_at: string;
}

export interface VerifyInvalidTypeResponse {
  status: 403;
  message: 'Ticket not valid for this entry point';
  ticket_name: string;
  required_names: string[];
}

export interface VerifyNotFoundResponse {
  status: 404;
  message: string;
}

export type VerifyResponse =
  | VerifySuccessResponse
  | VerifyUsedResponse
  | VerifyInvalidTypeResponse
  | VerifyNotFoundResponse;

// Scan Result Types
export type ScanResultType = 'valid' | 'used' | 'invalid' | 'wrong-type' | 'offline' | 'error';

export interface ScanResult {
  id: string;
  type: ScanResultType;
  message: string;
  qrCode: string;
  ticket?: {
    type: string;
    admittence: string;
    number: string;
  };
  scannedAt: Date;
  requiredTypes?: string[];
}

// Sync Types
export interface ScanForSync {
  qrcode: string;
  device_id: string;
  scanned_at: number;
}

export interface BatchSyncPayload {
  scans: ScanForSync[];
}

export interface BatchSyncResponse {
  status: number;
  synced_count?: number;
  message?: string;
}

// Configuration Types
export interface DeviceConfig {
  device_id: string;
  scans: number;
  ip_address?: string;
}

export interface AppSettings {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  autoSync: boolean;
  syncInterval: number;
  theme: 'light' | 'dark' | 'system';
}

// Reports Types
export interface ReconciliationReport {
  event_id: string;
  report_generated_at: string;
  timezone: string;
  summary: ReportSummary;
  ticket_type_analysis: TicketTypeAnalysis;
  device_analysis: DeviceAnalysis;
  hourly_scan_analysis?: HourlyScanAnalysis;
}

export interface ReportSummary {
  total_tickets: number;
  scanned_tickets: number;
  unscanned_tickets?: number;
  scan_rate: number;
  total_revenue: number;
  scanned_revenue: number;
  potential_revenue?: number;
  first_scan_at?: string;
  last_scan_at?: string;
}

export interface TicketTypeAnalysis {
  [ticketType: string]: {
    total_count: number;
    scanned_count: number;
    scan_rate: number;
    total_revenue: number;
    scanned_revenue: number;
    average_price: number;
  };
}

export interface DeviceAnalysis {
  [device_id: string]: number;
}

export interface HourlyScanAnalysis {
  all_tickets: { [hour: string]: number };
  by_ticket_type: { [ticketType: string]: { [hour: string]: number } };
}

// Statistics Types
export interface HourlyScanData {
  hour: string;
  count: number;
}

export interface DashboardStats {
  totalTickets: number;
  totalScanned: number;
  syncedScans: number;
  unsyncedScans: number;
  syncPercentage: number;
}

export interface TicketTypeStats {
  type: string;
  scannedCount: number;
}

// UI State Types
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export type ConnectionStatus = 'online' | 'offline' | 'checking';

export type DialogType =
  | 'valid'
  | 'used'
  | 'invalid'
  | 'error'
  | 'confirm'
  | 'password'
  | null;

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}
