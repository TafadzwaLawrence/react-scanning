import React from 'react';
import { Card } from '@/components/ui';

interface ScanStatsProps {
  stats: {
    valid: number;
    used: number;
    invalid: number;
    total: number;
  };
  syncPercentage: number;
}

export const ScanStats: React.FC<ScanStatsProps> = ({ stats, syncPercentage }) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Card variant="filled" padding="md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-success/10 rounded-lg">
            <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-text-primary">{stats.valid}</p>
            <p className="text-xs text-text-secondary">Valid Scans</p>
          </div>
        </div>
      </Card>

      <Card variant="filled" padding="md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-warning/10 rounded-lg">
            <svg className="w-5 h-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-text-primary">{stats.used}</p>
            <p className="text-xs text-text-secondary">Already Used</p>
          </div>
        </div>
      </Card>

      <Card variant="filled" padding="md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-error/10 rounded-lg">
            <svg className="w-5 h-5 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-text-primary">{stats.invalid}</p>
            <p className="text-xs text-text-secondary">Invalid</p>
          </div>
        </div>
      </Card>

      <Card variant="filled" padding="md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-secondary/10 rounded-lg">
            <svg className="w-5 h-5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-text-primary">{syncPercentage}%</p>
            <p className="text-xs text-text-secondary">Synced</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
