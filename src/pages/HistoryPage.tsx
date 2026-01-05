import React from 'react';
import { Card, Badge } from '@/components/ui';
import { useScannerStore } from '@/stores';
import { format } from 'date-fns';

export const HistoryPage: React.FC = () => {
  const { scanHistory, clearHistory, stats } = useScannerStore();

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
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Scan History</h1>
          {scanHistory.length > 0 && (
            <button
              onClick={clearHistory}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Quick Stats */}
        <div className="flex gap-4 mt-4 text-sm">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-gray-600">{stats.valid} valid</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="text-gray-600">{stats.used} used</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-gray-600">{stats.invalid} invalid</span>
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="p-4">
        {scanHistory.length === 0 ? (
          <Card variant="filled" padding="lg" className="text-center">
            <svg
              className="w-12 h-12 text-gray-300 mx-auto mb-3"
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
            <p className="text-gray-500">No scans yet</p>
            <p className="text-sm text-gray-400 mt-1">
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
                          <span className="text-sm text-gray-500">
                            {scan.ticket.type}
                          </span>
                        )}
                      </div>

                      {scan.ticket?.number && (
                        <p className="mt-1 font-mono text-sm text-gray-900">
                          #{scan.ticket.number}
                        </p>
                      )}

                      <p className="mt-1 text-xs text-gray-500 truncate max-w-[200px]">
                        {scan.qrCode}
                      </p>

                      {scan.message && (
                        <p className="mt-1 text-xs text-gray-400">
                          {scan.message}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-gray-400">
                        {format(new Date(scan.scannedAt), 'h:mm a')}
                      </p>
                      <p className="text-xs text-gray-300">
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
