# 🎨 Color System & Theme

## Brand Colors

### Primary Palette

```
┌─────────────────────────────────────────────────────────────┐
│                      PRIMARY COLORS                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │              │  │              │  │              │      │
│  │   PRIMARY    │  │  SECONDARY   │  │   ACCENT     │      │
│  │   #6366F1    │  │   #8B5CF6    │  │   #F59E0B    │      │
│  │              │  │              │  │              │      │
│  │  Indigo 500  │  │  Violet 500  │  │  Amber 500   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Color Definitions

```typescript
export const colors = {
  // Primary Brand Colors
  primary: {
    50:  '#EEF2FF',
    100: '#E0E7FF',
    200: '#C7D2FE',
    300: '#A5B4FC',
    400: '#818CF8',
    500: '#6366F1',  // ← Main Primary
    600: '#4F46E5',
    700: '#4338CA',
    800: '#3730A3',
    900: '#312E81',
  },

  // Secondary Colors
  secondary: {
    50:  '#F5F3FF',
    100: '#EDE9FE',
    200: '#DDD6FE',
    300: '#C4B5FD',
    400: '#A78BFA',
    500: '#8B5CF6',  // ← Main Secondary
    600: '#7C3AED',
    700: '#6D28D9',
    800: '#5B21B6',
    900: '#4C1D95',
  },

  // Accent Colors
  accent: {
    50:  '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',  // ← Main Accent
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },
};
```

---

## Semantic Colors

### Status Colors

```
┌─────────────────────────────────────────────────────────────┐
│                      STATUS COLORS                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  ✓ SUCCESS   │  │  ⚠ WARNING   │  │  ✗ ERROR     │      │
│  │   #10B981    │  │   #F59E0B    │  │   #EF4444    │      │
│  │  Emerald 500 │  │  Amber 500   │  │   Red 500    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │  ℹ INFO      │  │  USED/WARN   │                        │
│  │   #3B82F6    │  │   #F97316    │                        │
│  │   Blue 500   │  │  Orange 500  │                        │
│  └──────────────┘  └──────────────┘                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

```typescript
export const statusColors = {
  success: {
    light: '#D1FAE5',   // Background
    main:  '#10B981',   // Primary
    dark:  '#047857',   // Dark variant
    text:  '#065F46',   // Text on light bg
  },

  warning: {
    light: '#FEF3C7',
    main:  '#F59E0B',
    dark:  '#B45309',
    text:  '#92400E',
  },

  error: {
    light: '#FEE2E2',
    main:  '#EF4444',
    dark:  '#B91C1C',
    text:  '#991B1B',
  },

  info: {
    light: '#DBEAFE',
    main:  '#3B82F6',
    dark:  '#1D4ED8',
    text:  '#1E40AF',
  },

  // Special status for "already used" tickets
  used: {
    light: '#FFEDD5',
    main:  '#F97316',
    dark:  '#C2410C',
    text:  '#9A3412',
  },
};
```

---

## Neutral Colors

```typescript
export const neutrals = {
  // Backgrounds
  white:      '#FFFFFF',
  background: '#F9FAFB',  // Gray 50
  surface:    '#FFFFFF',
  
  // Borders
  border:     '#E5E7EB',  // Gray 200
  divider:    '#D1D5DB',  // Gray 300
  
  // Text
  text: {
    primary:   '#111827',  // Gray 900
    secondary: '#6B7280',  // Gray 500
    disabled:  '#9CA3AF',  // Gray 400
    hint:      '#D1D5DB',  // Gray 300
  },
  
  // Grays (full scale)
  gray: {
    50:  '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
};
```

---

## Scan Result Colors

### Dialog Color Coding

```
┌─────────────────────────────────────────────────────────────┐
│                    SCAN RESULT COLORS                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  VALID TICKET                    ALREADY USED               │
│  ┌──────────────────────┐       ┌──────────────────────┐   │
│  │ ██████████████████ │         │ ██████████████████ │   │
│  │ ██  ✓ VALID     ██ │         │ ██  ! USED      ██ │   │
│  │ ██████████████████ │       │ ██████████████████ │   │
│  │       #10B981       │       │       #F97316       │   │
│  └──────────────────────┘       └──────────────────────┘   │
│                                                             │
│  INVALID TICKET                  ERROR                      │
│  ┌──────────────────────┐       ┌──────────────────────┐   │
│  │ ██████████████████   │       │ ██████████████████ │   │
│  │ ██  ✗ INVALID   ██   │       │ ██  ⚠ ERROR     ██ │   │
│  │ ██████████████████ │       │ ██████████████████ │   │
│  │       #EF4444       │       │       #EF4444       │   │
│  └──────────────────────┘       └──────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

```typescript
export const scanResultColors = {
  valid: {
    background: '#10B981',
    text: '#FFFFFF',
    icon: '#FFFFFF',
  },
  used: {
    background: '#F97316',
    text: '#FFFFFF',
    icon: '#FFFFFF',
  },
  invalid: {
    background: '#EF4444',
    text: '#FFFFFF',
    icon: '#FFFFFF',
  },
  error: {
    background: '#EF4444',
    text: '#FFFFFF',
    icon: '#FFFFFF',
  },
};
```

---

## Connection Status Colors

```typescript
export const connectionColors = {
  online: {
    icon: '#10B981',      // Green
    badge: '#D1FAE5',
    text: 'Online',
  },
  offline: {
    icon: '#EF4444',      // Red
    badge: '#FEE2E2',
    text: 'Offline',
  },
  syncing: {
    icon: '#F59E0B',      // Amber
    badge: '#FEF3C7',
    text: 'Syncing...',
  },
};
```

---

## Dark Mode (Optional)

```typescript
export const darkTheme = {
  background: '#0F172A',    // Slate 900
  surface:    '#1E293B',    // Slate 800
  card:       '#334155',    // Slate 700
  
  text: {
    primary:   '#F1F5F9',   // Slate 100
    secondary: '#94A3B8',   // Slate 400
  },
  
  border:     '#334155',    // Slate 700
  
  // Primary stays same
  primary:    '#6366F1',
};
```

---

## Complete Theme Object

```typescript
export const theme = {
  colors: {
    // Brand
    primary: '#6366F1',
    primaryLight: '#818CF8',
    primaryDark: '#4F46E5',
    
    secondary: '#8B5CF6',
    secondaryLight: '#A78BFA',
    secondaryDark: '#7C3AED',
    
    accent: '#F59E0B',
    
    // Status
    success: '#10B981',
    successLight: '#D1FAE5',
    
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    
    error: '#EF4444',
    errorLight: '#FEE2E2',
    
    info: '#3B82F6',
    infoLight: '#DBEAFE',
    
    // Scan Results
    validTicket: '#10B981',
    usedTicket: '#F97316',
    invalidTicket: '#EF4444',
    
    // Neutrals
    white: '#FFFFFF',
    black: '#000000',
    background: '#F9FAFB',
    surface: '#FFFFFF',
    border: '#E5E7EB',
    
    // Text
    textPrimary: '#111827',
    textSecondary: '#6B7280',
    textDisabled: '#9CA3AF',
  },
  
  // Gradients
  gradients: {
    primary: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
    success: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
    header:  'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
  },
  
  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
};
```

---

## CSS Custom Properties

```css
:root {
  /* Primary */
  --color-primary: #6366F1;
  --color-primary-light: #818CF8;
  --color-primary-dark: #4F46E5;
  
  /* Secondary */
  --color-secondary: #8B5CF6;
  
  /* Status */
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-error: #EF4444;
  --color-info: #3B82F6;
  
  /* Scan Results */
  --color-valid: #10B981;
  --color-used: #F97316;
  --color-invalid: #EF4444;
  
  /* Backgrounds */
  --color-background: #F9FAFB;
  --color-surface: #FFFFFF;
  --color-border: #E5E7EB;
  
  /* Text */
  --color-text-primary: #111827;
  --color-text-secondary: #6B7280;
  --color-text-disabled: #9CA3AF;
}
```

---

## Usage Examples

### React Component
```tsx
import { theme } from './theme';

const ValidTicketDialog = () => (
  <div style={{ 
    backgroundColor: theme.colors.validTicket,
    color: theme.colors.white 
  }}>
    ✓ Valid Ticket
  </div>
);
```

### Tailwind Config
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#6366F1',
        secondary: '#8B5CF6',
        accent: '#F59E0B',
        valid: '#10B981',
        used: '#F97316',
        invalid: '#EF4444',
      },
    },
  },
};
```
