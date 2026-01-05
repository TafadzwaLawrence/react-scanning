# 🧩 UI Components Specification

## Component Architecture

This document defines all UI components for the React ticket scanning application, organized using **Atomic Design** principles.

---

## Design System Components

### Component Hierarchy

```
┌─────────────────────────────────────────────────────────────────────┐
│                           PAGES                                      │
│    LoginPage, EventsPage, TicketGroupsPage, ScannerPage, ReportPage │
├─────────────────────────────────────────────────────────────────────┤
│                         TEMPLATES                                    │
│          AuthLayout, DashboardLayout, ScannerLayout                 │
├─────────────────────────────────────────────────────────────────────┤
│                         ORGANISMS                                    │
│    LoginForm, EventList, TicketGroupList, Scanner, ScanResult       │
├─────────────────────────────────────────────────────────────────────┤
│                         MOLECULES                                    │
│    InputField, EventCard, TicketGroupCard, ScanResultCard, Stats    │
├─────────────────────────────────────────────────────────────────────┤
│                           ATOMS                                      │
│       Button, Input, Badge, Icon, Spinner, Card, Text, Checkbox     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Atoms

### Button

```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}
```

**Variants:**

| Variant | Background | Text | Border | Use Case |
|---------|------------|------|--------|----------|
| `primary` | `#6366F1` | `#FFFFFF` | none | Primary actions (Login, Download) |
| `secondary` | `#8B5CF6` | `#FFFFFF` | none | Secondary actions |
| `outline` | transparent | `#6366F1` | `#6366F1` | Tertiary actions |
| `ghost` | transparent | `#6B7280` | none | Low-emphasis actions |
| `danger` | `#EF4444` | `#FFFFFF` | none | Destructive actions |

**States:**
- Default, Hover (`+10% brightness`), Active (`-5% brightness`), Disabled (`opacity: 0.5`), Loading (show spinner)

---

### Input

```typescript
interface InputProps {
  type: 'text' | 'password' | 'email' | 'number' | 'search';
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  size: 'sm' | 'md' | 'lg';
}
```

**Styles:**
```css
/* Default */
border: 1px solid #D1D5DB;
border-radius: 8px;
padding: 12px 16px;
font-size: 16px;

/* Focus */
border-color: #6366F1;
box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);

/* Error */
border-color: #EF4444;
box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
```

---

### Badge

```typescript
interface BadgeProps {
  variant: 'default' | 'success' | 'warning' | 'error' | 'info';
  size: 'sm' | 'md';
  children: React.ReactNode;
}
```

**Color Mapping:**
| Variant | Background | Text |
|---------|------------|------|
| `default` | `#E5E7EB` | `#374151` |
| `success` | `#D1FAE5` | `#065F46` |
| `warning` | `#FEF3C7` | `#92400E` |
| `error` | `#FEE2E2` | `#991B1B` |
| `info` | `#DBEAFE` | `#1E40AF` |

---

### Spinner

```typescript
interface SpinnerProps {
  size: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
}
```

**Sizes:**
| Size | Dimensions |
|------|------------|
| `sm` | 16px |
| `md` | 24px |
| `lg` | 32px |
| `xl` | 48px |

---

### Card

```typescript
interface CardProps {
  variant: 'elevated' | 'outlined' | 'filled';
  padding: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}
```

**Styles:**
```css
/* Elevated */
background: #FFFFFF;
border-radius: 12px;
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);

/* Outlined */
background: #FFFFFF;
border: 1px solid #E5E7EB;
border-radius: 12px;

/* Filled */
background: #F3F4F6;
border-radius: 12px;
```

---

### Checkbox

```typescript
interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  size: 'sm' | 'md';
}
```

---

## Molecules

### InputField (Input + Label + Error)

```typescript
interface InputFieldProps extends InputProps {
  label: string;
  required?: boolean;
  helperText?: string;
}
```

**Layout:**
```
┌──────────────────────────────────────────┐
│ Label *                                  │
│ ┌──────────────────────────────────────┐ │
│ │ 🔒  Placeholder text...              │ │
│ └──────────────────────────────────────┘ │
│ Helper text or error message             │
└──────────────────────────────────────────┘
```

---

### EventCard

```typescript
interface EventCardProps {
  event: {
    id: string;
    name: string;
    date: string;
    venue: string;
    ticketCount?: number;
  };
  selected?: boolean;
  onClick: () => void;
}
```

**Design:**
```
┌─────────────────────────────────────────────────┐
│  🎫 Summer Music Festival 2026                  │
│                                                  │
│  📅 June 15, 2026                               │
│  📍 Central Park, New York                      │
│                                                  │
│  ┌─────────────┐                                │
│  │ 850 tickets │                                │
│  └─────────────┘                                │
└─────────────────────────────────────────────────┘
```

---

### TicketGroupCard

```typescript
interface TicketGroupCardProps {
  ticketGroup: {
    type: string;
    count: number;
  };
  selected: boolean;
  onToggle: () => void;
  disabled?: boolean;
}
```

**Design:**
```
┌─────────────────────────────────────────────────┐
│  ☑️  VIP                                        │
│                                                  │
│      150 tickets available                       │
└─────────────────────────────────────────────────┘
```

**States:**
- Unselected: Gray border, unchecked
- Selected: Primary border (`#6366F1`), checked, slight background tint
- Disabled: Reduced opacity

---

### ScanResultCard

```typescript
interface ScanResultCardProps {
  result: {
    status: 'valid' | 'used' | 'invalid' | 'wrong-type' | 'offline';
    ticketType?: string;
    ticketNumber?: string;
    scannedAt: Date;
    message?: string;
  };
  onDismiss?: () => void;
}
```

**Visual Design by Status:**

| Status | Background | Border | Icon | Message |
|--------|------------|--------|------|---------|
| `valid` | `#D1FAE5` | `#10B981` | ✅ | "Ticket Valid" |
| `used` | `#FFEDD5` | `#F97316` | ⚠️ | "Already Scanned" |
| `invalid` | `#FEE2E2` | `#EF4444` | ❌ | "Invalid Ticket" |
| `wrong-type` | `#FEF3C7` | `#F59E0B` | 🚫 | "Wrong Ticket Type" |
| `offline` | `#E0E7FF` | `#6366F1` | 📡 | "Queued for Sync" |

**Animation:**
- Slide in from bottom
- Scale up slightly
- Background pulse for 1 second
- Auto-dismiss after 3 seconds (configurable)

---

### StatsBar

```typescript
interface StatsBarProps {
  stats: {
    valid: number;
    used: number;
    invalid: number;
    total: number;
  };
}
```

**Design:**
```
┌─────────────────────────────────────────────────────────────────┐
│  ✅ 423        ⚠️ 12         ❌ 5          📊 440              │
│  Valid         Used          Invalid       Total               │
└─────────────────────────────────────────────────────────────────┘
```

---

### ConnectionStatus

```typescript
interface ConnectionStatusProps {
  isOnline: boolean;
  pendingCount: number;
  lastSyncTime?: Date;
}
```

**Design:**
```
Online:   🟢 Connected · Last sync: 2 min ago
Offline:  🔴 Offline · 5 scans pending
```

---

## Organisms

### LoginForm

```typescript
interface LoginFormProps {
  onSubmit: (data: LoginData) => void;
  isLoading: boolean;
  error?: string;
}
```

**Structure:**
```
┌──────────────────────────────────────────────────┐
│                                                   │
│              [Logo]                               │
│              Scan                                 │
│                                                   │
│  ┌────────────────────────────────────────────┐  │
│  │ Event Code                                  │  │
│  │ ┌────────────────────────────────────────┐ │  │
│  │ │ Enter event code...                    │ │  │
│  │ └────────────────────────────────────────┘ │  │
│  └────────────────────────────────────────────┘  │
│                                                   │
│  ┌────────────────────────────────────────────┐  │
│  │ Password                                    │  │
│  │ ┌────────────────────────────────────────┐ │  │
│  │ │ ••••••••••                    👁️       │ │  │
│  │ └────────────────────────────────────────┘ │  │
│  └────────────────────────────────────────────┘  │
│                                                   │
│  ☑️ Remember me                                   │
│                                                   │
│  ┌────────────────────────────────────────────┐  │
│  │            🔐 Login to Event               │  │
│  └────────────────────────────────────────────┘  │
│                                                   │
│              🟢 Connected                         │
│                                                   │
└──────────────────────────────────────────────────┘
```

---

### EventList

```typescript
interface EventListProps {
  events: EventsByYear[];
  selectedId?: string;
  onSelect: (eventId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}
```

**Structure:**
```
┌────────────────────────────────────────────────────┐
│  🔍 Search events...                               │
├────────────────────────────────────────────────────┤
│                                                     │
│  ▼ 2026                                            │
│    ├─ January (5 events)                           │
│    │   ├─ [EventCard]                              │
│    │   ├─ [EventCard]                              │
│    │   └─ [EventCard]                              │
│    └─ February (3 events)                          │
│        ├─ [EventCard]                              │
│        └─ [EventCard]                              │
│                                                     │
│  ▶ 2025                                            │
│                                                     │
└────────────────────────────────────────────────────┘
```

---

### TicketGroupSelector

```typescript
interface TicketGroupSelectorProps {
  groups: TicketGroup[];
  selected: string[];
  onSelectionChange: (types: string[]) => void;
  onDownload: () => void;
  isDownloading: boolean;
  downloadProgress?: number;
}
```

**Structure:**
```
┌────────────────────────────────────────────────────┐
│  Select Ticket Types                               │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ ☑️ Select All                                 │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  [TicketGroupCard - VIP]                           │
│  [TicketGroupCard - General Admission]             │
│  [TicketGroupCard - Early Bird]                    │
│                                                     │
│  ───────────────────────────────────────────────── │
│  Selected: 2 types (650 tickets)                   │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │           ⬇️ Download Tickets                 │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
└────────────────────────────────────────────────────┘
```

---

### Scanner

```typescript
interface ScannerProps {
  onScan: (qrCode: string) => void;
  isEnabled: boolean;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
}
```

**Camera View:**
```
┌────────────────────────────────────────────────────┐
│                                                     │
│    ┌─────────────────────────────────────────┐     │
│    │                                          │     │
│    │                                          │     │
│    │         [Camera Preview]                 │     │
│    │                                          │     │
│    │      ┌────────────────────┐             │     │
│    │      │  QR Scanner Frame  │             │     │
│    │      │                    │             │     │
│    │      └────────────────────┘             │     │
│    │                                          │     │
│    │                                          │     │
│    └─────────────────────────────────────────┘     │
│                                                     │
│    ┌──────┐                          ┌──────┐      │
│    │ 🔦   │                          │ 🎯   │      │
│    │Flash │                          │Focus │      │
│    └──────┘                          └──────┘      │
│                                                     │
└────────────────────────────────────────────────────┘
```

---

### ScanResultOverlay

```typescript
interface ScanResultOverlayProps {
  result: ScanResult | null;
  onDismiss: () => void;
  autoDismissMs?: number;
}
```

**Full-Screen Overlay Design:**

```
VALID TICKET:
┌────────────────────────────────────────────────────┐
│                                                     │
│                  ╭──────────────╮                   │
│                  │              │                   │
│                  │      ✅      │                   │
│                  │              │                   │
│                  ╰──────────────╯                   │
│                                                     │
│                  TICKET VALID                       │
│                                                     │
│                  VIP · #VIP-001                     │
│                                                     │
│              ────────────────────                   │
│              Tap anywhere to dismiss                │
│                                                     │
└────────────────────────────────────────────────────┘
Background: rgba(16, 185, 129, 0.95) with green pulse

USED TICKET:
┌────────────────────────────────────────────────────┐
│                  ╭──────────────╮                   │
│                  │      ⚠️      │                   │
│                  ╰──────────────╯                   │
│                                                     │
│                ALREADY SCANNED                      │
│                                                     │
│                VIP · #VIP-001                       │
│             Scanned: 2:30 PM today                  │
│                                                     │
└────────────────────────────────────────────────────┘
Background: rgba(249, 115, 22, 0.95) with orange pulse

INVALID TICKET:
┌────────────────────────────────────────────────────┐
│                  ╭──────────────╮                   │
│                  │      ❌      │                   │
│                  ╰──────────────╯                   │
│                                                     │
│                INVALID TICKET                       │
│                                                     │
│              Ticket not found                       │
│                                                     │
└────────────────────────────────────────────────────┘
Background: rgba(239, 68, 68, 0.95) with red pulse
```

---

## Templates

### AuthLayout

```typescript
interface AuthLayoutProps {
  children: React.ReactNode;
}
```

**Structure:**
```
┌────────────────────────────────────────────────────┐
│                                                     │
│                                                     │
│              [Centered Content]                     │
│                                                     │
│                                                     │
│                                                     │
│  ─────────────────────────────────────────────────  │
│  © 2026 263Tickets · v1.0.0                        │
└────────────────────────────────────────────────────┘
```

---

### DashboardLayout

```typescript
interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  showBack?: boolean;
  actions?: React.ReactNode;
}
```

**Structure:**
```
┌────────────────────────────────────────────────────┐
│  ← Back    Page Title               [Actions]      │
├────────────────────────────────────────────────────┤
│                                                     │
│                                                     │
│              [Page Content]                         │
│                                                     │
│                                                     │
├────────────────────────────────────────────────────┤
│  🏠       📋        📷        📊        ⚙️       │
│  Home    Events   Scanner   Reports  Settings      │
└────────────────────────────────────────────────────┘
```

---

### ScannerLayout

```typescript
interface ScannerLayoutProps {
  children: React.ReactNode;
  stats: ScanStats;
  connectionStatus: ConnectionStatusProps;
}
```

**Structure:**
```
┌────────────────────────────────────────────────────┐
│  [ConnectionStatus]               [Menu Button]    │
├────────────────────────────────────────────────────┤
│  [StatsBar]                                        │
├────────────────────────────────────────────────────┤
│                                                     │
│              [Scanner View]                         │
│                                                     │
│              [Scan Result Overlay]                  │
│                                                     │
├────────────────────────────────────────────────────┤
│  [Scanner Controls]                                │
└────────────────────────────────────────────────────┘
```

---

## Animation Guidelines

### Micro-interactions

| Element | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Button hover | Scale 1.02 | 150ms | ease-out |
| Button press | Scale 0.98 | 100ms | ease-in |
| Card hover | Translate Y -2px + shadow | 200ms | ease-out |
| Checkbox toggle | Scale bounce | 200ms | spring |
| Toast enter | Slide up + fade | 300ms | ease-out |
| Toast exit | Slide down + fade | 200ms | ease-in |
| Page transition | Fade + slide | 300ms | ease-out |

### Scan Result Animations

```typescript
// Valid scan
const validAnimation = {
  initial: { scale: 0, opacity: 0 },
  animate: { 
    scale: 1, 
    opacity: 1,
    backgroundColor: ['#10B981', '#34D399', '#10B981'], // Pulse
  },
  exit: { scale: 0.8, opacity: 0 },
  transition: { duration: 0.3, backgroundColor: { repeat: 2, duration: 0.5 } }
};

// Invalid scan
const invalidAnimation = {
  initial: { scale: 0, opacity: 0 },
  animate: { 
    scale: 1, 
    opacity: 1,
    x: [0, -10, 10, -10, 10, 0], // Shake
  },
  exit: { scale: 0.8, opacity: 0 },
  transition: { duration: 0.3, x: { duration: 0.4 } }
};
```

---

## Responsive Breakpoints

| Breakpoint | Width | Target |
|------------|-------|--------|
| `xs` | 0-479px | Small phones |
| `sm` | 480-639px | Large phones |
| `md` | 640-767px | Tablets portrait |
| `lg` | 768-1023px | Tablets landscape |
| `xl` | 1024-1279px | Small laptops |
| `2xl` | 1280px+ | Desktops |

**Mobile-First Approach:**
```css
/* Base styles for mobile */
.container {
  padding: 16px;
}

/* Tablet and up */
@media (min-width: 640px) {
  .container {
    padding: 24px;
  }
}

/* Desktop and up */
@media (min-width: 1024px) {
  .container {
    padding: 32px;
    max-width: 1200px;
    margin: 0 auto;
  }
}
```

---

## Accessibility Requirements

| Requirement | Implementation |
|-------------|----------------|
| Color contrast | Minimum 4.5:1 for text |
| Focus indicators | Visible focus ring on all interactive elements |
| Screen reader | Proper ARIA labels and roles |
| Keyboard navigation | All actions accessible via keyboard |
| Touch targets | Minimum 44x44px |
| Motion | Respect `prefers-reduced-motion` |
| Error messages | Associated with inputs via `aria-describedby` |
