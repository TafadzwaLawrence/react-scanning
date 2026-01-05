# Scan - Ticket Scanner Application

A Progressive Web App (PWA) for scanning and validating tickets at 263tickets.com events.

## Features

- 🎫 QR Code ticket scanning
- 📱 Mobile-first responsive design
- 🔄 Offline-first with automatic sync
- 📊 Real-time statistics and charts
- 🔒 Secure authentication
- 💾 Local IndexedDB storage

## Tech Stack

- **React 18** - UI Framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **TanStack Query** - Server state
- **Dexie.js** - IndexedDB wrapper
- **html5-qrcode** - QR scanning
- **Recharts** - Charts

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Variables

Create a `.env.local` file:

```env
VITE_API_BASE_URL=https://api.263tickets.com/api/v1
```

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── auth/        # Authentication components
│   ├── layout/      # Layout components
│   ├── scanner/     # Scanner components
│   └── ui/          # Base UI components
├── pages/           # Page components
├── services/        # API & database services
├── stores/          # Zustand state stores
├── types/           # TypeScript types
└── main.tsx         # App entry point
```

## Usage

1. **Login** - Enter event code and password
2. **Setup** - Select ticket types and download tickets
3. **Scan** - Start scanning QR codes
4. **History** - View scan history
5. **Settings** - Manage data and logout

## Offline Mode

The app works offline by:
- Storing tickets locally in IndexedDB
- Validating against local database
- Queuing scans for sync when online

## License

© 2026 263tickets
