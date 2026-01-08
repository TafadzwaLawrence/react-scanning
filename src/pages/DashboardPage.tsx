import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Badge, Skeleton } from '@/components/ui';
import { useAuthStore, useEventStore, useSyncStore } from '@/stores';
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
  const navigate = useNavigate();
  const { eventDetails, deviceId } = useAuthStore();
  const { selectedTicketTypes } = useEventStore();
  const { isOnline, lastSyncTime, totalScans, syncedScans } = useSyncStore();

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="bg-surface border-b border-border text-text-primary p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">
                <Skeleton width="w-48" height="h-6" />
              </h1>
              <p className="text-sm text-text-secondary mt-1">
                <Skeleton width="w-32" />
              </p>
            </div>
            <div>
              <Skeleton width="w-16" height="h-6" />
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Card variant="elevated" padding="md"><Skeleton height="h-12"/></Card>
            <Card variant="elevated" padding="md"><Skeleton height="h-12"/></Card>
            <Card variant="elevated" padding="md"><Skeleton height="h-12"/></Card>
            <Card variant="elevated" padding="md"><Skeleton height="h-12"/></Card>
          </div>

          <Card variant="elevated" padding="md">
            <h2 className="text-sm font-semibold text-text-secondary mb-4"><Skeleton width="w-32"/></h2>
            <div className="h-48"><Skeleton height="h-48"/></div>
          </Card>
        </div>
      </div>
    );
  }

  // Show setup prompt if no tickets downloaded
  if (totalTickets === 0) {
    return (
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <div className="bg-surface border-b border-border text-text-primary p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-text-primary">
                {eventDetails?.event_name || 'Dashboard'}
              </h1>
              <p className="text-sm text-text-secondary mt-1">
                Device: <span className="font-mono">{deviceId}</span>
              </p>
            </div>
            <Badge variant={isOnline ? 'success' : 'error'} size="sm">
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
          </div>
        </div>

        <div className="p-4 flex flex-col items-center justify-center" style={{ minHeight: 'calc(100vh - 200px)' }}>
          <Card variant="elevated" padding="lg" className="w-full max-w-sm text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">Setup Required</h2>
            <p className="text-sm text-text-secondary mb-6">
              You need to download tickets before you can start scanning. Go to Settings to select ticket types and download.
            </p>
            <Button
              variant="primary"
              fullWidth
              className="bg-black text-white hover:bg-black/90"
              onClick={() => navigate('/settings')}
              leftIcon={
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            >
              Go to Settings
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-surface border-b border-border text-text-primary p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">
              {eventDetails?.event_name || 'Dashboard'}
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Device: <span className="font-mono">{deviceId}</span>
            </p>
          </div>
          <Badge variant={isOnline ? 'success' : 'error'} size="sm">
            {isOnline ? 'Online' : 'Offline'}
          </Badge>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card variant="elevated" padding="md">
            <div className="text-center">
              <p className="text-3xl font-bold text-text-primary">{totalTickets}</p>
              <p className="text-xs text-text-secondary mt-1">Total Tickets</p>
            </div>
          </Card>

          <Card variant="elevated" padding="md">
            <div className="text-center">
              <p className="text-3xl font-bold text-success">{scannedCount}</p>
              <p className="text-xs text-text-secondary mt-1">Scanned</p>
            </div>
          </Card>

          <Card variant="elevated" padding="md">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{unsyncedCount}</p>
              <p className="text-xs text-text-secondary mt-1">Pending Sync</p>
            </div>
          </Card>

          <Card variant="elevated" padding="md">
            <div className="text-center">
              <p className="text-3xl font-bold text-secondary">{syncPercentage}%</p>
              <p className="text-xs text-text-secondary mt-1">Sync Progress</p>
            </div>
          </Card>
        </div>

        {/* Hourly Chart */}
        <Card variant="elevated" padding="md">
                <h2 className="text-sm font-semibold text-text-secondary mb-4">
            Scans by Hour
          </h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData}>
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 10 }}
                  interval={2}
                />
                <YAxis tick={{ fontSize: 10 }} width={30} />
                <Tooltip />
                <Bar dataKey="count" fill="#00007c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Active Ticket Types */}
        <Card variant="elevated" padding="md">
          <h2 className="text-sm font-semibold text-text-secondary mb-3">
            Active Ticket Types
          </h2>
          {selectedTicketTypes.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedTicketTypes.map((type) => (
                <Badge key={type} variant="info" size="md">
                  {type}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-secondary">No ticket types selected</p>
          )}
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => navigate('/settings')}
          >
            Change Types
          </Button>
        </Card>

        {/* Last Sync */}
        <Card variant="filled" padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">Last sync</p>
              <p className="text-sm font-medium text-text-primary">
                {lastSyncTime
                  ? format(new Date(lastSyncTime), 'MMM d, h:mm a')
                  : 'Never'}
              </p>
            </div>
            <svg
              className={`w-5 h-5 ${
                isOnline ? 'text-success' : 'text-text-tertiary'
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </div>
        </Card>

        {/* Scan Button */}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          className="bg-black text-white hover:bg-black/90"
          onClick={() => navigate('/scanner')}
          leftIcon={
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          }
        >
          Start Scanning
        </Button>
      </div>
    </div>
  );
};
