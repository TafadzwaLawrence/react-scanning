import React from 'react';
import { Card, Badge } from '@/components/ui';
import { useScannerStore } from '@/stores';
import { useStatusBarColor, STATUS_BAR_COLORS } from '@/hooks';
import { format } from 'date-fns';

export const HistoryPage: React.FC = () => {
  // Set status bar to white to match the header
  useStatusBarColor(STATUS_BAR_COLORS.SURFACE);

  const { scanHistory, stats } = useScannerStore();

  const getStatusConfig = (type: string) => {
    switch (type) {
      case 'valid':
        return { variant: 'success' as const, label: 'Valid', icon: '✓' };
      case 'used':
        return { variant: 'warning' as const, label: 'Used', icon: '!' };
      case 'invalid':
        return { variant: 'error' as const, label: 'Invalid', icon: '✗' };
      case 'wrong-type':
        return { variant: 'warning' as const, label: 'Wrong Type', icon: '⚠' };
      case 'offline':
        return { variant: 'info' as const, label: 'Offline', icon: '◌' };
      default:
        return { variant: 'default' as const, label: 'Error', icon: '?' };
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-surface border-b border-border p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-text-primary">Scan History</h1>
        </div>

        {/* Quick Stats */}
        <div className="flex gap-4 mt-4 text-sm">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-success" />
            <span className="text-text-secondary">{stats.valid} valid</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-warning" />
            <span className="text-text-secondary">{stats.used} used</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-error" />
            <span className="text-text-secondary">{stats.invalid} invalid</span>
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="p-4">
        {scanHistory.length === 0 ? (
          <Card variant="filled" padding="lg" className="text-center">
            <svg
              className="w-12 h-12 text-text-tertiary mx-auto mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-text-secondary">No scans yet</p>
            <p className="text-sm text-text-tertiary mt-1">
              Start scanning to see history here
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {scanHistory.map((scan) => {
              const config = getStatusConfig(scan.type);
              return (
                <Card key={scan.id} variant="elevated" padding="md">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant={config.variant} size="sm">
                          {config.label}
                        </Badge>
                        {scan.ticket?.type && (
                          <span className="text-sm text-text-secondary">
                            {scan.ticket.type}
                          </span>
                        )}
                      </div>

                      {scan.ticket?.number && (
                        <p className="mt-1 font-mono text-sm text-text-primary">
                          #{scan.ticket.number}
                        </p>
                      )}

                      <p className="mt-1 text-xs text-text-secondary truncate max-w-[200px]">
                        {scan.qrCode}
                      </p>

                      {scan.message && (
                        <p className="mt-1 text-xs text-text-tertiary">
                          {scan.message}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-text-tertiary">
                        {format(new Date(scan.scannedAt), 'h:mm a')}
                      </p>
                      <p className="text-xs text-text-tertiary">
                        {format(new Date(scan.scannedAt), 'MMM d')}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
