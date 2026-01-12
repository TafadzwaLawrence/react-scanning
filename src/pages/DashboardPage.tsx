import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Badge, Skeleton } from '@/components/ui';
import { useAuthStore, useEventStore, useSyncStore } from '@/stores';
import { useStatusBarColor, STATUS_BAR_COLORS } from '@/hooks';
import { db } from '@/services/db';
import { format } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { HourlyScanData } from '@/types';

export const DashboardPage: React.FC = () => {
  // Set status bar to white to match the header
  useStatusBarColor(STATUS_BAR_COLORS.SURFACE);

  const navigate = useNavigate();
  const { eventDetails, deviceId, gateName } = useAuthStore();
  const { selectedTicketTypes } = useEventStore();
  const { lastSyncTime, totalScans, syncedScans } = useSyncStore();

  const [isLoading, setIsLoading] = useState(true);
  const [totalTickets, setTotalTickets] = useState(0);
  const [scannedCount, setScannedCount] = useState(0);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [hourlyData, setHourlyData] = useState<HourlyScanData[]>([]);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const total = await db.countAllTickets();
        const scanned = await db.getScannedCount();
        const unsynced = await db.getUnsyncedCount();
        const hourly = await db.getHourlyScanData();

        setTotalTickets(total);
        setScannedCount(scanned);
        setUnsyncedCount(unsynced);
        setHourlyData(hourly);
      } catch (err) {
        console.error('Error loading stats:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();

    // Refresh stats every 10 seconds
    const interval = setInterval(loadStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const syncPercentage =
    totalScans > 0 ? Math.round((syncedScans / totalScans) * 100) : 100;
  
  const remainingTickets = totalTickets - scannedCount;
  const scannedPercentage = totalTickets > 0 ? Math.round((scannedCount / totalTickets) * 100) : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted pb-20">
        <div className="bg-surface border-b border-border p-6 pb-16">
          <Skeleton width="w-48" height="h-6" />
          <Skeleton width="w-32" height="h-4" className="mt-2" />
        </div>
        <div className="px-4 -mt-10 space-y-4">
          <Card variant="elevated" padding="lg"><Skeleton height="h-24"/></Card>
          <div className="grid grid-cols-3 gap-3">
            <Card variant="elevated" padding="md"><Skeleton height="h-16"/></Card>
            <Card variant="elevated" padding="md"><Skeleton height="h-16"/></Card>
            <Card variant="elevated" padding="md"><Skeleton height="h-16"/></Card>
          </div>
        </div>
      </div>
    );
  }

  // Show setup prompt if no tickets downloaded
  if (totalTickets === 0) {
    return (
      <div className="min-h-screen bg-muted pb-20">
        {/* Header */}
        <div className="bg-surface border-b border-border p-6 pb-20">
          <h1 className="text-2xl font-bold text-text-primary">
            {eventDetails?.event_name || 'Dashboard'}
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Device: {deviceId} {gateName && `• ${gateName}`}
          </p>
        </div>

        <div className="px-4 -mt-12">
          <Card variant="elevated" padding="lg" className="text-center shadow-xl">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-text-primary mb-2">Download Tickets</h2>
            <p className="text-sm text-text-secondary mb-6">
              Download tickets to start scanning. Go to Settings to select ticket types.
            </p>
            <Button
              variant="primary"
              fullWidth
              size="lg"
              onClick={() => navigate('/settings')}
            >
              Go to Settings
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted pb-20">
      {/* Header */}
      <div className="bg-surface border-b border-border p-6 pb-20">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-text-primary">
            {eventDetails?.event_name || 'Dashboard'}
          </h1>
          <button 
            onClick={() => navigate('/settings')}
            className="p-2 rounded-full bg-muted hover:bg-border transition-colors"
            aria-label="Settings"
          >
            <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
        <p className="text-text-secondary text-sm">
          Device: {deviceId} {gateName && `• ${gateName}`}
        </p>
      </div>

      {/* Main Stats Card - Floating */}
      <div className="px-4 -mt-12">
        <Card variant="elevated" padding="lg" className="shadow-xl">
          {/* Primary Scan Button */}
          <button
            onClick={() => navigate('/scanner')}
            className="w-full bg-primary hover:bg-primary-dark text-white rounded-2xl p-6 mb-6 transition-all active:scale-[0.98] shadow-lg"
          >
            <div className="flex items-center justify-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-xl font-bold">Start Scanning</p>
                <p className="text-white/80 text-sm">Tap to open camera</p>
              </div>
            </div>
          </button>

          {/* Progress Ring */}
          <div className="flex items-center gap-6 mb-6">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-muted"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={251.2}
                  strokeDashoffset={251.2 - (251.2 * scannedPercentage) / 100}
                  className="text-success transition-all duration-500"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-text-primary">{scannedPercentage}%</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-3xl font-bold text-text-primary">{scannedCount}</p>
              <p className="text-sm text-text-secondary">of {totalTickets} scanned</p>
              <p className="text-xs text-text-tertiary mt-1">{remainingTickets} remaining</p>
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-success">{scannedCount}</p>
              <p className="text-xs text-text-secondary">Scanned</p>
            </div>
            <div className="bg-muted rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-warning">{unsyncedCount}</p>
              <p className="text-xs text-text-secondary">Pending</p>
            </div>
            <div className="bg-muted rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-secondary">{syncPercentage}%</p>
              <p className="text-xs text-text-secondary">Synced</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Hourly Chart */}
        {hourlyData.length > 0 && (
          <Card variant="elevated" padding="md">
            <h2 className="text-sm font-semibold text-text-secondary mb-4">
              Today's Activity
            </h2>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 10 }}
                    interval={2}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 10 }} width={25} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: 'none', 
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Bar dataKey="count" fill="#00007c" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* Ticket Types & Sync Row */}
        <div className="grid grid-cols-2 gap-3">
          {/* Active Types */}
          <Card variant="elevated" padding="md" className="col-span-1">
            <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2">
              Ticket Types
            </h3>
            {selectedTicketTypes.length > 0 ? (
              <div className="space-y-1">
                {selectedTicketTypes.slice(0, 3).map((type) => (
                  <Badge key={type} variant="info" size="sm" className="mr-1">
                    {type}
                  </Badge>
                ))}
                {selectedTicketTypes.length > 3 && (
                  <span className="text-xs text-text-tertiary">+{selectedTicketTypes.length - 3} more</span>
                )}
              </div>
            ) : (
              <p className="text-xs text-text-tertiary">None selected</p>
            )}
          </Card>

          {/* Last Sync */}
          <Card variant="elevated" padding="md" className="col-span-1">
            <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2">
              Last Sync
            </h3>
            <p className="text-sm font-medium text-text-primary">
              {lastSyncTime
                ? format(new Date(lastSyncTime), 'h:mm a')
                : 'Never'}
            </p>
            <p className="text-xs text-text-tertiary">
              {lastSyncTime
                ? format(new Date(lastSyncTime), 'MMM d')
                : 'Not synced yet'}
            </p>
          </Card>
        </div>

        {/* Terms and Conditions */}
        <div className="text-center text-xs text-text-tertiary space-y-1 pt-4 pb-2">
          <p>
            <a 
              href="https://263tickets.com/terms" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-text-secondary hover:text-primary"
            >
              Terms
            </a>
            {' • '}
            <a 
              href="https://263tickets.com/privacy" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-text-secondary hover:text-primary"
            >
              Privacy
            </a>
          </p>
          <p>© 2026 263tickets</p>
        </div>
      </div>
    </div>
  );
};
