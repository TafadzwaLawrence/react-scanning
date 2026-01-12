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
        <h1 className="text-2xl font-bold text-text-primary mb-1">
          {eventDetails?.event_name || 'Dashboard'}
        </h1>
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

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-2xl font-bold text-text-primary">{scannedCount}<span className="text-sm font-normal text-text-tertiary">/{totalTickets}</span></span>
              <span className="text-sm text-text-secondary">{scannedPercentage}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-success rounded-full transition-all duration-500"
                style={{ width: `${scannedPercentage}%` }}
              />
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
