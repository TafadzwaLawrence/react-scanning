# 🖼️ Logo & Branding Guidelines

## Logo Specifications

### Primary Logo

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    ┌─────────────────┐                      │
│                    │   ╔═══╗         │                      │
│                    │   ║ █ ║  SCAN   │                      │
│                    │   ╚═══╝         │                      │
│                    └─────────────────┘                      │
│                                                             │
│              Primary Logo (Icon + Wordmark)                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Logo Variants

| Variant | Usage | Minimum Size |
|---------|-------|--------------|
| Full (Icon + Text) | Headers, Marketing | 120px width |
| Icon Only | App icon, Favicon | 32px |
| Text Only | Footer, Documents | 80px width |
| Monochrome | Dark backgrounds | Same as above |

---

## Logo Icon Design

### Concept
The logo represents a QR code scanner frame with a checkmark, symbolizing successful ticket validation.

### SVG Structure
```svg
<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
  <!-- Scanner Frame -->
  <path d="M8 4H4v4M4 40v4h4M44 4h-4M40 44h4v-4" 
        stroke="#6366F1" 
        stroke-width="3" 
        fill="none"/>
  
  <!-- QR Code Pattern -->
  <rect x="12" y="12" width="8" height="8" fill="#6366F1"/>
  <rect x="28" y="12" width="8" height="8" fill="#6366F1"/>
  <rect x="12" y="28" width="8" height="8" fill="#6366F1"/>
  
  <!-- Center Check -->
  <circle cx="30" cy="30" r="10" fill="#10B981"/>
  <path d="M26 30l3 3 6-6" 
        stroke="white" 
        stroke-width="2" 
        fill="none"/>
</svg>
```

---

## Color Usage

### Primary Logo Colors
```
Primary Brand:  #6366F1 (Indigo)
Success Check:  #10B981 (Emerald)
White:          #FFFFFF
```

### On Dark Background
```
Scanner Frame:  #FFFFFF
QR Pattern:     #FFFFFF
Success Check:  #10B981
```

### Monochrome
```
All elements:   #6366F1 (or #FFFFFF on dark)
```

---

## Logo Clear Space

```
┌───────────────────────────────────────┐
│                                       │
│   ┌───┐                               │
│   │ X │  ← Minimum padding = X        │
│   └───┘    (where X = logo height/4)  │
│        ┌─────────────────────────┐    │
│    X   │                         │ X  │
│   ←──→ │    [  SCAN LOGO  ]      │←──→│
│        │                         │    │
│        └─────────────────────────┘    │
│                    X                  │
│                   ←─→                 │
│                                       │
└───────────────────────────────────────┘
```

---

## App Icons

### Sizes Required

| Platform | Size | Format |
|----------|------|--------|
| PWA Favicon | 16x16, 32x32 | ICO, PNG |
| PWA Touch | 192x192, 512x512 | PNG |
| iOS | 1024x1024 | PNG |
| Android | 192x192, 512x512 | PNG |
| Android Adaptive | 108x108 (foreground) | PNG |

### App Icon Design
```
┌─────────────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ░░░░┌────────────────────┐░░░░ │
│ ░░░░│ ████████  ████████ │░░░░ │
│ ░░░░│ ██    ██  ██    ██ │░░░░ │
│ ░░░░│ ████████  ████████ │░░░░ │
│ ░░░░│                    │░░░░ │
│ ░░░░│ ████████    ┌────┐ │░░░░ │
│ ░░░░│ ██    ██    │ ✓  │ │░░░░ │
│ ░░░░│ ████████    └────┘ │░░░░ │
│ ░░░░└────────────────────┘░░░░ │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
└─────────────────────────────────┘

Background: Gradient #6366F1 → #4F46E5
Icon: White with green checkmark
```

---

## Typography

### Logo Wordmark
```
Font: Inter (Bold 700)
Size: Proportional to icon
Color: Same as icon or #111827
Letter Spacing: -0.02em
```

### App Typography
```
Primary:    Inter (400, 500, 600, 700)
Fallback:   system-ui, -apple-system, sans-serif
Monospace:  'JetBrains Mono', monospace (for codes)
```

---

## Splash Screen

### Design
```
┌─────────────────────────────────────────┐
│                                         │
│                                         │
│                                         │
│                                         │
│            ┌─────────────┐              │
│            │             │              │
│            │   [LOGO]    │              │
│            │             │              │
│            └─────────────┘              │
│                                         │
│               SCAN                      │
│                                         │
│            ────────────                 │
│            Loading...                   │
│                                         │
│                                         │
│                                         │
│         Powered by 263tickets           │
│                                         │
└─────────────────────────────────────────┘

Background: White or Gradient
Logo: Centered, animated pulse
Text: Fade in after 500ms
```

---

## Brand Assets Checklist

### Required Files
```
assets/
├── logo/
│   ├── logo-full.svg
│   ├── logo-full.png (2x)
│   ├── logo-icon.svg
│   ├── logo-icon.png (2x)
│   ├── logo-text.svg
│   └── logo-monochrome.svg
├── icons/
│   ├── favicon.ico
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── apple-touch-icon.png
│   └── maskable-icon.png
├── splash/
│   ├── splash-640x1136.png
│   ├── splash-750x1334.png
│   ├── splash-1242x2208.png
│   └── splash-1125x2436.png
└── sounds/
    ├── success.mp3
    └── failure.mp3
```

---

## PWA Manifest

```json
{
  "name": "Scan - Ticket Scanner",
  "short_name": "Scan",
  "description": "Event ticket scanning and validation",
  "theme_color": "#6366F1",
  "background_color": "#FFFFFF",
  "display": "standalone",
  "orientation": "portrait",
  "start_url": "/",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "/icons/maskable-icon.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

---

## Do's and Don'ts

### ✅ Do
- Use official color codes
- Maintain clear space
- Use high-resolution assets
- Keep logo proportions

### ❌ Don't
- Stretch or distort logo
- Change logo colors arbitrarily
- Place on busy backgrounds
- Add effects (shadows, gradients to logo itself)
- Recreate logo in different fonts
