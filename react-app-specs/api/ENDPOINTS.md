# 🔌 API Endpoints Documentation

## Base Configuration

```typescript
const API_BASE_URL = 'https://api.263tickets.com/api/v1';
```

---

## Authentication

### Login

```http
POST /events/auth/login
Content-Type: application/json
```

**Request:**
```json
{
  "event_identifier": "EVENT123",
  "password": "secret123",
  "device_id": "12345",
  "remember_me": true
}
```

**Response (Success):**
```json
{
  "status": "success",
  "session_token": "eyJhbGciOiJIUzI1NiIs...",
  "event_details": {
    "event_id": "evt_abc123",
    "event_name": "Summer Music Festival 2026"
  }
}
```

**Response (Error):**
```json
{
  "status": "error",
  "message": "Invalid credentials"
}
```

---

### Logout

```http
POST /events/auth/logout
Content-Type: application/json
```

**Request:**
```json
{
  "session_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Logged out successfully"
}
```

---

### Check Session

```http
POST /events/auth/check-session
Content-Type: application/json
```

**Request:**
```json
{
  "session_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:**
```json
{
  "status": "success",
  "valid": true,
  "event_details": {
    "event_id": "evt_abc123",
    "event_name": "Summer Music Festival 2026"
  }
}
```

---

## Events

### Get All Events

```http
GET /events/all/ids
Accept: application/json
```

**Response:**
```json
{
  "events_by_year": [
    {
      "year": "2026",
      "month": "01",
      "event_count": 5,
      "events": [
        {
          "id": "evt_abc123",
          "name": "New Year Gala"
        },
        {
          "id": "evt_def456",
          "name": "Winter Concert"
        }
      ]
    },
    {
      "year": "2025",
      "month": "12",
      "event_count": 3,
      "events": [
        {
          "id": "evt_ghi789",
          "name": "Christmas Party"
        }
      ]
    }
  ]
}
```

---

### Get Ticket Groups

```http
GET /event/{event_id}/ticketgroups
Accept: application/json
```

**Example:** `GET /event/evt_abc123/ticketgroups`

**Response:**
```json
{
  "status": 200,
  "ticket_type_counts": [
    {
      "event_ticket_type": "VIP",
      "total": 150
    },
    {
      "event_ticket_type": "General Admission",
      "total": 500
    },
    {
      "event_ticket_type": "Early Bird",
      "total": 200
    }
  ]
}
```

---

## Tickets

### Download Tickets

```http
POST /event/{event_id}/ticketgroups/download
Content-Type: application/json
```

**Example:** `POST /event/evt_abc123/ticketgroups/download`

**Request:**
```json
{
  "ticket_types": ["VIP", "General Admission"]
}
```

**Response:**
```json
{
  "status": 200,
  "tickets": {
    "VIP": [
      {
        "ticket_id": "tkt_001",
        "event_id": "evt_abc123",
        "organisation_id": "org_xyz",
        "event_ticket_name": "Summer Music Festival 2026",
        "event_date": "2026-06-15",
        "event_ticket_type": "VIP",
        "event_ticket_admittence": "1",
        "event_venue": "Central Park",
        "event_city_state": "New York, NY",
        "qrcode": "QR123ABC456DEF",
        "ticket_number": "VIP-001",
        "serial": "SER001",
        "log_count": 0
      }
    ],
    "General Admission": [
      {
        "ticket_id": "tkt_002",
        "event_id": "evt_abc123",
        "organisation_id": "org_xyz",
        "event_ticket_name": "Summer Music Festival 2026",
        "event_date": "2026-06-15",
        "event_ticket_type": "General Admission",
        "event_ticket_admittence": "1",
        "event_venue": "Central Park",
        "event_city_state": "New York, NY",
        "qrcode": "QR789GHI012JKL",
        "ticket_number": "GA-001",
        "serial": "SER002",
        "log_count": 0
      }
    ]
  }
}
```

---

### Verify Ticket

```http
POST /event/{event_id}/verify/{qrcode}/{device_id}
Content-Type: application/json
```

**Example:** `POST /event/evt_abc123/verify/QR123ABC456DEF/12345`

**Request:**
```json
{
  "event_ticket_names": ["VIP", "General Admission"]
}
```

**Response (Valid - 200):**
```json
{
  "status": 200,
  "type": "VIP",
  "admittence": "1",
  "number": "VIP-001"
}
```

**Response (Already Used - 403):**
```json
{
  "status": 403,
  "type": "VIP",
  "admittence": "1",
  "number": "VIP-001",
  "scanned_at": "2026-01-05 14:30:00"
}
```

**Response (Wrong Ticket Type - 403):**
```json
{
  "status": 403,
  "message": "Ticket not valid for this entry point",
  "ticket_name": "Early Bird",
  "required_names": ["VIP", "General Admission"]
}
```

**Response (Not Found - 404):**
```json
{
  "status": 404,
  "message": "Ticket not found"
}
```

---

### Batch Sync

```http
POST /event/batch_verify
Content-Type: application/json
```

**Request:**
```json
{
  "scans": [
    {
      "qrcode": "QR123ABC456DEF",
      "device_id": "12345",
      "scanned_at": 1704462600
    },
    {
      "qrcode": "QR789GHI012JKL",
      "device_id": "12345",
      "scanned_at": 1704462650
    }
  ]
}
```

**Response:**
```json
{
  "status": 200,
  "synced_count": 2
}
```

---

## Reports

### Get Reconciliation Report

```http
GET /event/{event_id}/report
Accept: application/json
```

**Example:** `GET /event/evt_abc123/report`

**Response:**
```json
{
  "status": "success",
  "data": {
    "event_id": "evt_abc123",
    "report_generated_at": "2026-01-05 15:00:00",
    "timezone": "UTC",
    "summary": {
      "total_tickets": 850,
      "scanned_tickets": 423,
      "scan_rate": 49.76,
      "total_revenue": 42500.00,
      "scanned_revenue": 21150.00
    },
    "ticket_type_analysis": {
      "VIP": {
        "total_count": 150,
        "scanned_count": 89,
        "scan_rate": 59.33,
        "total_revenue": 15000.00,
        "scanned_revenue": 8900.00,
        "average_price": 100.00
      },
      "General Admission": {
        "total_count": 500,
        "scanned_count": 280,
        "scan_rate": 56.00,
        "total_revenue": 25000.00,
        "scanned_revenue": 14000.00,
        "average_price": 50.00
      },
      "Early Bird": {
        "total_count": 200,
        "scanned_count": 54,
        "scan_rate": 27.00,
        "total_revenue": 2500.00,
        "scanned_revenue": 675.00,
        "average_price": 12.50
      }
    },
    "device_analysis": {
      "12345": 215,
      "67890": 208
    }
  }
}
```

---

## Error Responses

### Standard Error Format

```json
{
  "status": "error",
  "message": "Description of the error",
  "code": "ERROR_CODE"
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_INVALID` | 401 | Invalid credentials |
| `AUTH_EXPIRED` | 401 | Session expired |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `RATE_LIMITED` | 429 | Too many requests |
| `SERVER_ERROR` | 500 | Internal server error |

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| `/events/auth/login` | 10 requests/minute |
| `/events/auth/logout` | 10 requests/minute |
| `/events/all/ids` | 30 requests/minute |
| `/event/{id}/ticketgroups` | 30 requests/minute |
| `/event/{id}/ticketgroups/download` | 5 requests/minute |
| `/event/{id}/verify/{qr}/{device}` | 100 requests/minute |
| `/event/batch_verify` | 10 requests/minute |
| `/event/{id}/report` | 10 requests/minute |

---

## Headers

### Request Headers

```http
Accept: application/json
Content-Type: application/json
```

### Optional Auth Header (if implementing bearer token)

```http
Authorization: Bearer {session_token}
```

---

## API Client Example

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.263tickets.com/api/v1',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Auth API
export const authAPI = {
  login: (payload: LoginPayload) => 
    api.post('/events/auth/login', payload),
  
  logout: (token: string) => 
    api.post('/events/auth/logout', { session_token: token }),
  
  checkSession: (token: string) => 
    api.post('/events/auth/check-session', { session_token: token }),
};

// Events API
export const eventsAPI = {
  getAll: () => 
    api.get('/events/all/ids'),
  
  getTicketGroups: (eventId: string) => 
    api.get(`/event/${eventId}/ticketgroups`),
  
  downloadTickets: (eventId: string, types: string[]) => 
    api.post(`/event/${eventId}/ticketgroups/download`, { ticket_types: types }),
};

// Tickets API
export const ticketsAPI = {
  verify: (eventId: string, qrcode: string, deviceId: string, types: string[]) => 
    api.post(`/event/${eventId}/verify/${qrcode}/${deviceId}`, { event_ticket_names: types }),
  
  batchSync: (scans: ScanForSync[]) => 
    api.post('/event/batch_verify', { scans }),
};

// Reports API
export const reportsAPI = {
  getReconciliation: (eventId: string) => 
    api.get(`/event/${eventId}/report`),
};
```
