# 📁 React Project Folder Structure

## Recommended Structure

```
scan-app/
│
├── 📄 package.json
├── 📄 tsconfig.json
├── 📄 vite.config.ts          # or next.config.js
├── 📄 tailwind.config.js
├── 📄 .env.example
├── 📄 .env.local
├── 📄 .gitignore
├── 📄 README.md
│
├── 📁 public/
│   ├── 📄 index.html
│   ├── 📄 manifest.json
│   ├── 📄 robots.txt
│   ├── 📁 icons/
│   │   ├── favicon.ico
│   │   ├── icon-192.png
│   │   ├── icon-512.png
│   │   └── apple-touch-icon.png
│   └── 📁 sounds/
│       ├── success.mp3
│       └── failure.mp3
│
├── 📁 src/
│   │
│   ├── 📄 main.tsx              # App entry point
│   ├── 📄 App.tsx               # Root component
│   ├── 📄 index.css             # Global styles
│   │
│   ├── 📁 assets/               # Static assets
│   │   ├── 📁 images/
│   │   │   ├── logo.svg
│   │   │   └── logo-white.svg
│   │   └── 📁 icons/
│   │       └── ... (SVG icons)
│   │
│   ├── 📁 components/           # Reusable UI components
│   │   ├── 📁 common/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Spinner.tsx
│   │   │   ├── Toast.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── 📁 layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── BottomNav.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── 📁 scanner/
│   │   │   ├── QRScanner.tsx
│   │   │   ├── ScanOverlay.tsx
│   │   │   ├── ScanResultDialog.tsx
│   │   │   ├── FlashButton.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── 📁 events/
│   │   │   ├── EventCard.tsx
│   │   │   ├── EventsList.tsx
│   │   │   ├── EventHeader.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── 📁 tickets/
│   │   │   ├── TicketTypeCard.tsx
│   │   │   ├── TicketTypesList.tsx
│   │   │   ├── SelectionSummary.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── 📁 stats/
│   │   │   ├── StatsCard.tsx
│   │   │   ├── ScanChart.tsx
│   │   │   ├── SyncIndicator.tsx
│   │   │   └── index.ts
│   │   │
│   │   └── 📁 dialogs/
│   │       ├── ValidTicketDialog.tsx
│   │       ├── UsedTicketDialog.tsx
│   │       ├── InvalidTicketDialog.tsx
│   │       ├── ConfirmDialog.tsx
│   │       ├── PasswordDialog.tsx
│   │       └── index.ts
│   │
│   ├── 📁 pages/                # Page components (routes)
│   │   ├── LoginPage.tsx
│   │   ├── EventsPage.tsx
│   │   ├── TicketGroupsPage.tsx
│   │   ├── ScannerPage.tsx
│   │   ├── CameraScanPage.tsx
│   │   ├── ReportsPage.tsx
│   │   ├── SettingsPage.tsx
│   │   └── index.ts
│   │
│   ├── 📁 hooks/                # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useScanner.ts
│   │   ├── useOnlineStatus.ts
│   │   ├── useSync.ts
│   │   ├── useSound.ts
│   │   ├── useVibration.ts
│   │   ├── useLocalStorage.ts
│   │   └── index.ts
│   │
│   ├── 📁 services/             # API & business logic
│   │   ├── 📁 api/
│   │   │   ├── client.ts        # Axios/fetch instance
│   │   │   ├── auth.api.ts
│   │   │   ├── events.api.ts
│   │   │   ├── tickets.api.ts
│   │   │   ├── sync.api.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── 📁 db/
│   │   │   ├── database.ts      # IndexedDB setup
│   │   │   ├── tickets.db.ts
│   │   │   ├── config.db.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── scanner.service.ts
│   │   ├── sync.service.ts
│   │   ├── export.service.ts
│   │   └── sound.service.ts
│   │
│   ├── 📁 store/                # State management
│   │   ├── index.ts             # Store setup
│   │   ├── auth.store.ts
│   │   ├── events.store.ts
│   │   ├── scanner.store.ts
│   │   ├── sync.store.ts
│   │   └── ui.store.ts
│   │
│   ├── 📁 types/                # TypeScript types
│   │   ├── api.types.ts
│   │   ├── models.types.ts
│   │   ├── store.types.ts
│   │   └── index.ts
│   │
│   ├── 📁 utils/                # Utility functions
│   │   ├── constants.ts
│   │   ├── helpers.ts
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   └── index.ts
│   │
│   ├── 📁 config/               # App configuration
│   │   ├── app.config.ts
│   │   ├── api.config.ts
│   │   ├── scanner.config.ts
│   │   └── index.ts
│   │
│   ├── 📁 theme/                # Styling system
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   ├── shadows.ts
│   │   ├── theme.ts
│   │   └── index.ts
│   │
│   └── 📁 routes/               # Routing configuration
│       ├── index.tsx
│       ├── ProtectedRoute.tsx
│       └── routes.config.ts
│
├── 📁 tests/                    # Test files
│   ├── 📁 unit/
│   ├── 📁 integration/
│   └── 📁 e2e/
│
└── 📁 docs/                     # Documentation
    └── ... (this folder)
```

---

## Key Files Explained

### Entry Points
```
src/main.tsx        → React DOM render
src/App.tsx         → Root component, providers
src/index.css       → Global CSS, Tailwind imports
```

### Core Services
```
services/api/       → All API calls
services/db/        → IndexedDB operations
services/*.ts       → Business logic services
```

### State Management
```
store/index.ts      → Combined store
store/*.store.ts    → Individual slices
```

---

## Import Aliases

```typescript
// tsconfig.json / vite.config.ts
{
  "paths": {
    "@/*": ["src/*"],
    "@components/*": ["src/components/*"],
    "@pages/*": ["src/pages/*"],
    "@hooks/*": ["src/hooks/*"],
    "@services/*": ["src/services/*"],
    "@store/*": ["src/store/*"],
    "@types/*": ["src/types/*"],
    "@utils/*": ["src/utils/*"],
    "@theme/*": ["src/theme/*"],
    "@config/*": ["src/config/*"],
    "@assets/*": ["src/assets/*"]
  }
}
```

### Usage Example
```typescript
// Before
import { Button } from '../../../components/common/Button';

// After
import { Button } from '@components/common';
```

---

## Feature-Based Alternative

For larger projects, consider feature-based organization:

```
src/
├── features/
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── store/
│   │   └── index.ts
│   │
│   ├── events/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── index.ts
│   │
│   ├── scanner/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── index.ts
│   │
│   └── sync/
│       ├── components/
│       ├── hooks/
│       ├── services/
│       └── index.ts
│
├── shared/
│   ├── components/
│   ├── hooks/
│   └── utils/
│
└── app/
    ├── routes/
    ├── store/
    └── config/
```

---

## Package.json Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx",
    "lint:fix": "eslint . --ext ts,tsx --fix",
    "format": "prettier --write .",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "type-check": "tsc --noEmit"
  }
}
```
