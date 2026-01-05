import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Loading } from '@/components/ui';
import { useAuthStore, useSyncStore, useToast } from '@/stores';
import { reportsAPI } from '@/services/api';
import type { ReconciliationReport } from '@/types';
import { format } from 'date-fns';

export const ReportsPage: React.FC = () => {
  const toast = useToast();
  const { eventDetails } = useAuthStore();
  const { isOnline } = useSyncStore();

  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<ReconciliationReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const eventId = eventDetails?.event_id;

  const loadReport = async () => {
    if (!eventId) {
      setError('No event selected');
      return;
    }

    if (!isOnline) {
      setError('You are offline. Connect to the internet to view reports.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await reportsAPI.getReconciliation(eventId);
      setReport(data);
    } catch (err) {
      console.error('Error loading report:', err);
      setError('Failed to load report. Please try again.');
      toast.error('Error', 'Failed to load reconciliation report');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (eventId && isOnline) {
      loadReport();
    }
  }, [eventId, isOnline]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (!isOnline) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="bg-white border-b border-gray-200 p-4">
          <h1 className="text-xl font-bold text-gray-900">Reports</h1>
        </div>
        <div className="p-4 flex flex-col items-center justify-center" style={{ minHeight: 'calc(100vh - 200px)' }}>
          <Card variant="elevated" padding="lg" className="w-full max-w-sm text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">You're Offline</h2>
            <p className="text-sm text-gray-600">
              Reports require an internet connection. Please connect to view the reconciliation report.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Reports</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadReport}
            disabled={isLoading}
          >
            <svg className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {isLoading && !report ? (
          <div className="flex items-center justify-center py-20">
            <Loading size="lg" message="Loading report..." />
          </div>
        ) : error && !report ? (
          <Card variant="elevated" padding="lg" className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Report</h2>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <Button variant="primary" size="sm" onClick={loadReport}>
              Try Again
            </Button>
          </Card>
        ) : report ? (
          <>
            {/* Report Header */}
            <Card variant="elevated" padding="md">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-gray-700">
                  Reconciliation Report
                </h2>
                <Badge variant="success" size="sm">Live</Badge>
              </div>
              <p className="text-xs text-gray-500">
                Generated: {report.report_generated_at} ({report.timezone})
              </p>
            </Card>

            {/* Summary Stats */}
            <Card variant="elevated" padding="md">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">
                Summary
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-indigo-600">
                    {report.summary.total_tickets.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">Total Tickets</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-emerald-600">
                    {report.summary.scanned_tickets.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">Scanned</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-violet-600">
                    {formatPercentage(report.summary.scan_rate)}
                  </p>
                  <p className="text-xs text-gray-500">Scan Rate</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-amber-600">
                    {(report.summary.total_tickets - report.summary.scanned_tickets).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">Remaining</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Scan Progress</span>
                  <span>{formatPercentage(report.summary.scan_rate)}</span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(report.summary.scan_rate, 100)}%` }}
                  />
                </div>
              </div>
            </Card>

            {/* Revenue Summary */}
            <Card variant="elevated" padding="md">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">
                Revenue
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Revenue</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(report.summary.total_revenue)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Scanned Revenue</span>
                  <span className="font-semibold text-emerald-600">
                    {formatCurrency(report.summary.scanned_revenue)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-gray-600">Unscanned Revenue</span>
                  <span className="font-semibold text-amber-600">
                    {formatCurrency(report.summary.total_revenue - report.summary.scanned_revenue)}
                  </span>
                </div>
              </div>
            </Card>

            {/* Ticket Type Breakdown */}
            <Card variant="elevated" padding="md">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">
                By Ticket Type
              </h2>
              <div className="space-y-4">
                {Object.entries(report.ticket_type_analysis).map(([type, data]) => (
                  <div key={type} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{type}</span>
                      <Badge
                        variant={data.scan_rate > 50 ? 'success' : data.scan_rate > 25 ? 'warning' : 'default'}
                        size="sm"
                      >
                        {formatPercentage(data.scan_rate)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-gray-500">Total</p>
                        <p className="font-medium">{data.total_count.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Scanned</p>
                        <p className="font-medium text-emerald-600">{data.scanned_count.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Avg Price</p>
                        <p className="font-medium">{formatCurrency(data.average_price)}</p>
                      </div>
                    </div>
                    {/* Mini progress bar */}
                    <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${Math.min(data.scan_rate, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Device Analysis */}
            {Object.keys(report.device_analysis).length > 0 && (
              <Card variant="elevated" padding="md">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">
                  By Device
                </h2>
                <div className="space-y-2">
                  {Object.entries(report.device_analysis)
                    .sort(([, a], [, b]) => b - a)
                    .map(([deviceId, count]) => (
                      <div
                        key={deviceId}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                      >
                        <span className="font-mono text-sm text-gray-700">{deviceId}</span>
                        <Badge variant="info" size="sm">
                          {count.toLocaleString()} scans
                        </Badge>
                      </div>
                    ))}
                </div>
              </Card>
            )}

            {/* Last Updated */}
            <p className="text-center text-xs text-gray-400">
              Last refreshed: {format(new Date(), 'MMM d, h:mm a')}
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
};
