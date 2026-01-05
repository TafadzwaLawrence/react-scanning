# 📊 Data Models & Schemas

## TypeScript Interfaces

### Authentication

```typescript
// Login request payload
interface LoginPayload {
  event_identifier: string;
  password: string;
  device_id: string;
  remember_me: boolean;
}

// Login response
interface LoginResponse {
  status: 'success' | 'error';
  session_token?: string;
  event_details?: EventDetails;
  message?: string;
}

// Event details from auth
interface EventDetails {
  event_id: string;
  event_name: string;
}

// Stored session
interface EventSession {
  session_token: string;
  event_details: EventDetails;
  created_at: number;
  expires_at?: number;
}
```

---

### Events

```typescript
// Single event
interface Event {
  id: string;
  name: string;
  year: string;
  month: string;
}

// Events grouped by year/month
interface EventsByYear {
  year: string;
  month: string;
  event_count: number;
  events: Event[];
}

// Events API response
interface EventsResponse {
  events_by_year: EventsByYear[];
}
```

---

### Ticket Groups

```typescript
// Ticket group (type)
interface TicketGroup {
  type: string;           // event_ticket_type
  total: number;          // count of tickets
  isSelected: boolean;    // UI state
}

// Ticket groups API response
interface TicketGroupsResponse {
  status: number;
  ticket_type_counts: Array<{
    event_ticket_type: string;
    total: number;
  }>;
}

// Download request
interface DownloadTicketsPayload {
  ticket_types: string[];
}

// Download response
interface DownloadTicketsResponse {
  status: number;
  tickets: {
    [ticketType: string]: TicketData[];
  };
}
```

---

### Tickets (Local Database)

```typescript
// Ticket data from API
interface TicketData {
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

// Ticket stored in IndexedDB
interface Ticket {
  id?: number;                    // Auto-increment PK
  ticket_id: string;
  event_id: string;
  organisation_id: string;
  event_name: string;
  event_date: string;
  ticket_type: string;
  ticket_admittence: string;
  event_venue: string;
  event_city: string;
  qrcode: string;                 // Indexed, unique
  ticket_number: string;
  serial: string;
  log_count: number;              // 0 = not scanned
  sync_status: SyncStatus;
  scanned_at: number | null;      // Unix timestamp (ms)
  scanned_device_id: string | null;
}

enum SyncStatus {
  UNSYNCED = 0,
  SYNCED = 1,
}
```

---

### Ticket Verification

```typescript
// Verify request
interface VerifyTicketPayload {
  event_ticket_names: string[];
}

// Verify response (success)
interface VerifySuccessResponse {
  status: 200;
  type: string;
  admittence: string;
  number: string;
}

// Verify response (already used)
interface VerifyUsedResponse {
  status: 403;
  type: string;
  admittence: string;
  number: string;
  scanned_at: string;
}

// Verify response (invalid type)
interface VerifyInvalidTypeResponse {
  status: 403;
  message: 'Ticket not valid for this entry point';
  ticket_name: string;
  required_names: string[];
}

// Verify response (not found)
interface VerifyNotFoundResponse {
  status: 404;
  message: string;
}

// Union type for all responses
type VerifyResponse = 
  | VerifySuccessResponse 
  | VerifyUsedResponse 
  | VerifyInvalidTypeResponse 
  | VerifyNotFoundResponse;
```

---

### Scan Result (UI)

```typescript
type ScanResultType = 'valid' | 'used' | 'invalid' | 'error';

interface ScanResult {
  type: ScanResultType;
  message: string;
  ticket?: {
    type: string;
    admittence: string;
    number: string;
  };
  scannedAt?: string;
  requiredTypes?: string[];
}
```

---

### Sync

```typescript
// Single scan for batch sync
interface ScanForSync {
  qrcode: string;
  device_id: string;
  scanned_at: number;  // Unix timestamp (seconds)
}

// Batch sync request
interface BatchSyncPayload {
  scans: ScanForSync[];
}

// Batch sync response
interface BatchSyncResponse {
  status: number;
  synced_count?: number;
  message?: string;
}
```

---

### Configuration

```typescript
// Device configuration
interface DeviceConfig {
  device_id: string;      // 5-digit random ID
  scans: number;          // Total scan count
  ip_address?: string;    // Optional
}

// App settings
interface AppSettings {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  autoSync: boolean;
  syncInterval: number;   // milliseconds
  theme: 'light' | 'dark' | 'system';
}
```

---

### Reports

```typescript
// Reconciliation report
interface ReconciliationReport {
  event_id: string;
  report_generated_at: string;
  timezone: string;
  summary: ReportSummary;
  ticket_type_analysis: TicketTypeAnalysis;
  device_analysis: DeviceAnalysis;
}

interface ReportSummary {
  total_tickets: number;
  scanned_tickets: number;
  scan_rate: number;        // percentage
  total_revenue: number;
  scanned_revenue: number;
}

interface TicketTypeAnalysis {
  [ticketType: string]: {
    total_count: number;
    scanned_count: number;
    scan_rate: number;
    total_revenue: number;
    scanned_revenue: number;
    average_price: number;
  };
}

interface DeviceAnalysis {
  [device_id: string]: number;  // scan count
}
```

---

### Statistics

```typescript
// Hourly scan data for charts
interface HourlyScanData {
  hour: string;    // "00" - "23"
  count: number;
}

// Dashboard statistics
interface DashboardStats {
  totalTickets: number;
  totalScanned: number;
  syncedScans: number;
  unsyncedScans: number;
  syncPercentage: number;
}

// Ticket type stats
interface TicketTypeStats {
  type: string;
  scannedCount: number;
}
```

---

### UI State Types

```typescript
// Loading states
type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// Connection status
type ConnectionStatus = 'online' | 'offline' | 'checking';

// Dialog types
type DialogType = 
  | 'valid' 
  | 'used' 
  | 'invalid' 
  | 'error' 
  | 'confirm' 
  | 'password'
  | null;

// Toast notification
interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}
```

---

## Database Operations Interface

```typescript
interface TicketDB {
  // CRUD
  insert(ticket: Omit<Ticket, 'id'>): Promise<number>;
  insertBulk(tickets: Omit<Ticket, 'id'>[]): Promise<void>;
  getByQRCode(qrcode: string): Promise<Ticket | undefined>;
  getAll(): Promise<Ticket[]>;
  update(id: number, data: Partial<Ticket>): Promise<void>;
  deleteAll(): Promise<void>;
  
  // Queries
  isTableEmpty(): Promise<boolean>;
  countAll(): Promise<number>;
  getUnsynced(): Promise<Ticket[]>;
  getUnsyncedCount(): Promise<number>;
  
  // Scan operations
  markAsScanned(qrcode: string, deviceId: string): Promise<void>;
  markAsSynced(qrcodes: string[]): Promise<void>;
  isScanned(qrcode: string): Promise<boolean>;
  
  // Stats
  getHourlyScanData(): Promise<HourlyScanData[]>;
  getStatsByTicketType(): Promise<TicketTypeStats[]>;
}
```

---

## API Service Interface

```typescript
interface AuthAPI {
  login(payload: LoginPayload): Promise<LoginResponse>;
  logout(token: string): Promise<void>;
  checkSession(token: string): Promise<boolean>;
}

interface EventsAPI {
  getAllEvents(): Promise<EventsResponse>;
  getTicketGroups(eventId: string): Promise<TicketGroupsResponse>;
  downloadTickets(eventId: string, types: string[]): Promise<DownloadTicketsResponse>;
}

interface TicketsAPI {
  verify(eventId: string, qrcode: string, deviceId: string, types: string[]): Promise<VerifyResponse>;
  batchSync(scans: ScanForSync[]): Promise<BatchSyncResponse>;
}

interface ReportsAPI {
  getReconciliation(eventId: string): Promise<ReconciliationReport>;
}
```
