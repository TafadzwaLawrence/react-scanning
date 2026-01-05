# 📝 Typography System

## Font Stack

### Primary Font: Inter

The primary font for all UI text, providing excellent readability at all sizes.

```css
--font-family-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 
                       Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', 
                       sans-serif;
```

### Mono Font: JetBrains Mono

Used for ticket numbers, QR codes, device IDs, and technical information.

```css
--font-family-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, 
                    Consolas, 'Liberation Mono', 'Courier New', monospace;
```

---

## Font Installation

### Google Fonts (Recommended)

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### NPM Package

```bash
npm install @fontsource/inter @fontsource/jetbrains-mono
```

```typescript
// In your app entry point
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
```

---

## Type Scale

| Name | Size | Line Height | Weight | Use Case |
|------|------|-------------|--------|----------|
| `display-xl` | 48px / 3rem | 56px / 1.17 | 700 | Hero headings |
| `display-lg` | 36px / 2.25rem | 44px / 1.22 | 700 | Page titles |
| `display-md` | 30px / 1.875rem | 38px / 1.27 | 700 | Section headings |
| `heading-lg` | 24px / 1.5rem | 32px / 1.33 | 600 | Card titles |
| `heading-md` | 20px / 1.25rem | 28px / 1.4 | 600 | Subsection titles |
| `heading-sm` | 18px / 1.125rem | 26px / 1.44 | 600 | Small headings |
| `body-lg` | 18px / 1.125rem | 28px / 1.56 | 400 | Lead paragraphs |
| `body-md` | 16px / 1rem | 24px / 1.5 | 400 | Default body text |
| `body-sm` | 14px / 0.875rem | 20px / 1.43 | 400 | Secondary text |
| `caption` | 12px / 0.75rem | 16px / 1.33 | 400 | Captions, labels |
| `overline` | 11px / 0.6875rem | 16px / 1.45 | 500 | Overlines, badges |

---

## CSS Variables

```css
:root {
  /* Font Families */
  --font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
  
  /* Font Sizes */
  --text-xs: 0.6875rem;   /* 11px */
  --text-sm: 0.75rem;     /* 12px */
  --text-base: 0.875rem;  /* 14px */
  --text-md: 1rem;        /* 16px */
  --text-lg: 1.125rem;    /* 18px */
  --text-xl: 1.25rem;     /* 20px */
  --text-2xl: 1.5rem;     /* 24px */
  --text-3xl: 1.875rem;   /* 30px */
  --text-4xl: 2.25rem;    /* 36px */
  --text-5xl: 3rem;       /* 48px */
  
  /* Font Weights */
  --font-regular: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
  
  /* Line Heights */
  --leading-none: 1;
  --leading-tight: 1.25;
  --leading-snug: 1.375;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;
  --leading-loose: 2;
  
  /* Letter Spacing */
  --tracking-tighter: -0.05em;
  --tracking-tight: -0.025em;
  --tracking-normal: 0;
  --tracking-wide: 0.025em;
  --tracking-wider: 0.05em;
  --tracking-widest: 0.1em;
}
```

---

## Typography Classes

### Tailwind CSS Configuration

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    fontFamily: {
      sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
    },
    fontSize: {
      'xs': ['0.6875rem', { lineHeight: '1rem' }],
      'sm': ['0.75rem', { lineHeight: '1rem' }],
      'base': ['0.875rem', { lineHeight: '1.25rem' }],
      'md': ['1rem', { lineHeight: '1.5rem' }],
      'lg': ['1.125rem', { lineHeight: '1.75rem' }],
      'xl': ['1.25rem', { lineHeight: '1.75rem' }],
      '2xl': ['1.5rem', { lineHeight: '2rem' }],
      '3xl': ['1.875rem', { lineHeight: '2.375rem' }],
      '4xl': ['2.25rem', { lineHeight: '2.75rem' }],
      '5xl': ['3rem', { lineHeight: '3.5rem' }],
    },
  },
};
```

---

## Component Typography

### Headings

```typescript
// Display XL - Hero sections
<h1 className="text-5xl font-bold tracking-tight text-gray-900">
  Welcome Back
</h1>

// Display LG - Page titles
<h1 className="text-4xl font-bold text-gray-900">
  Select Your Event
</h1>

// Display MD - Section headings
<h2 className="text-3xl font-bold text-gray-900">
  Ticket Types
</h2>

// Heading LG - Card titles
<h3 className="text-2xl font-semibold text-gray-900">
  Summer Music Festival
</h3>

// Heading MD - Subsections
<h4 className="text-xl font-semibold text-gray-900">
  VIP Tickets
</h4>

// Heading SM - Small headings
<h5 className="text-lg font-semibold text-gray-900">
  Scan Statistics
</h5>
```

### Body Text

```typescript
// Body LG - Lead paragraphs
<p className="text-lg text-gray-600 leading-relaxed">
  Select the ticket types you want to scan at this entry point.
</p>

// Body MD - Default paragraphs
<p className="text-md text-gray-600">
  This will download all selected tickets for offline scanning.
</p>

// Body SM - Secondary text
<p className="text-base text-gray-500">
  Last synced 5 minutes ago
</p>

// Caption - Small labels
<span className="text-sm text-gray-400">
  Ticket #VIP-001
</span>

// Overline - Category labels
<span className="text-xs font-medium uppercase tracking-wider text-gray-500">
  Entry Point
</span>
```

### Monospace Text

```typescript
// Ticket numbers
<span className="font-mono text-md font-medium">
  VIP-2026-001234
</span>

// QR Code value
<code className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
  QR123ABC456DEF
</code>

// Device ID
<span className="font-mono text-sm text-gray-500">
  Device: ABC12345
</span>
```

---

## Text Colors

### Light Mode

| Usage | Color | Hex | Tailwind |
|-------|-------|-----|----------|
| Primary text | Gray 900 | `#111827` | `text-gray-900` |
| Secondary text | Gray 600 | `#4B5563` | `text-gray-600` |
| Tertiary text | Gray 500 | `#6B7280` | `text-gray-500` |
| Placeholder | Gray 400 | `#9CA3AF` | `text-gray-400` |
| Disabled | Gray 300 | `#D1D5DB` | `text-gray-300` |
| Links | Indigo 600 | `#4F46E5` | `text-indigo-600` |
| Success | Green 600 | `#059669` | `text-green-600` |
| Warning | Amber 600 | `#D97706` | `text-amber-600` |
| Error | Red 600 | `#DC2626` | `text-red-600` |

### Dark Mode

| Usage | Color | Hex | Tailwind |
|-------|-------|-----|----------|
| Primary text | Gray 50 | `#F9FAFB` | `dark:text-gray-50` |
| Secondary text | Gray 300 | `#D1D5DB` | `dark:text-gray-300` |
| Tertiary text | Gray 400 | `#9CA3AF` | `dark:text-gray-400` |
| Placeholder | Gray 500 | `#6B7280` | `dark:text-gray-500` |
| Disabled | Gray 600 | `#4B5563` | `dark:text-gray-600` |
| Links | Indigo 400 | `#818CF8` | `dark:text-indigo-400` |
| Success | Green 400 | `#34D399` | `dark:text-green-400` |
| Warning | Amber 400 | `#FBBF24` | `dark:text-amber-400` |
| Error | Red 400 | `#F87171` | `dark:text-red-400` |

---

## Typography Utilities

### React Component

```typescript
// src/components/ui/Text.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const textVariants = cva('', {
  variants: {
    variant: {
      'display-xl': 'text-5xl font-bold tracking-tight',
      'display-lg': 'text-4xl font-bold',
      'display-md': 'text-3xl font-bold',
      'heading-lg': 'text-2xl font-semibold',
      'heading-md': 'text-xl font-semibold',
      'heading-sm': 'text-lg font-semibold',
      'body-lg': 'text-lg leading-relaxed',
      'body-md': 'text-md',
      'body-sm': 'text-base',
      'caption': 'text-sm',
      'overline': 'text-xs font-medium uppercase tracking-wider',
    },
    color: {
      default: 'text-gray-900 dark:text-gray-50',
      muted: 'text-gray-600 dark:text-gray-300',
      subtle: 'text-gray-500 dark:text-gray-400',
      success: 'text-green-600 dark:text-green-400',
      warning: 'text-amber-600 dark:text-amber-400',
      error: 'text-red-600 dark:text-red-400',
    },
  },
  defaultVariants: {
    variant: 'body-md',
    color: 'default',
  },
});

interface TextProps
  extends React.HTMLAttributes<HTMLParagraphElement>,
    VariantProps<typeof textVariants> {
  as?: 'p' | 'span' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'label';
}

export function Text({ 
  className, 
  variant, 
  color, 
  as: Component = 'p', 
  ...props 
}: TextProps) {
  return (
    <Component
      className={cn(textVariants({ variant, color, className }))}
      {...props}
    />
  );
}
```

### Usage

```typescript
import { Text } from '@/components/ui/Text';

// Page title
<Text as="h1" variant="display-lg">
  Select Your Event
</Text>

// Section heading
<Text as="h2" variant="heading-lg">
  Available Ticket Types
</Text>

// Body text
<Text variant="body-md" color="muted">
  Select the ticket types you want to scan.
</Text>

// Caption
<Text variant="caption" color="subtle">
  Last updated 5 minutes ago
</Text>

// Success message
<Text variant="body-sm" color="success">
  Ticket validated successfully!
</Text>
```

---

## Responsive Typography

```typescript
// Mobile-first responsive headings
<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">
  Welcome Back
</h1>

// Responsive body text
<p className="text-base md:text-md lg:text-lg text-gray-600">
  Scan tickets for your event quickly and easily.
</p>
```

### Recommended Responsive Scale

| Element | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Hero Heading | 36px | 42px | 48px |
| Page Title | 30px | 33px | 36px |
| Section Heading | 24px | 27px | 30px |
| Card Title | 20px | 22px | 24px |
| Body Text | 14px | 15px | 16px |
| Caption | 12px | 12px | 12px |

---

## Best Practices

### ✅ Do

- Use the type scale consistently throughout the app
- Maintain proper hierarchy (one h1 per page, logical heading structure)
- Use appropriate line-height for readability
- Apply sufficient color contrast (minimum 4.5:1)
- Use monospace font for technical content (IDs, codes)

### ❌ Don't

- Skip heading levels (h1 → h3)
- Use too many different font sizes on one screen
- Apply bold weight to large blocks of text
- Use all caps for sentences (only overlines/badges)
- Mix serif and sans-serif unnecessarily

---

## Accessibility

| Requirement | Implementation |
|-------------|----------------|
| Minimum font size | 14px for body text |
| Color contrast | 4.5:1 for normal text, 3:1 for large text |
| Focus indication | Visible focus styles on all interactive text |
| Text scaling | Support up to 200% text scaling |
| Line length | 45-75 characters per line optimal |
