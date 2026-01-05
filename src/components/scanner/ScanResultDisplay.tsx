import React, { useEffect } from 'react';
import type { ScanResult } from '@/types';

interface ScanResultDisplayProps {
  result: ScanResult | null;
  onDismiss: () => void;
  autoDismissMs?: number;
}

export const ScanResultDisplay: React.FC<ScanResultDisplayProps> = ({
  result,
  onDismiss,
  autoDismissMs = 1500, // Faster auto-dismiss for valid tickets
}) => {
  useEffect(() => {
    if (result && result.type === 'valid') {
      const timer = setTimeout(onDismiss, autoDismissMs);
      return () => clearTimeout(timer);
    }
  }, [result, onDismiss, autoDismissMs]);

  if (!result) return null;

  const configs = {
    valid: {
      bg: 'bg-emerald-500',
      icon: (
        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      title: 'TICKET VALID',
      animation: 'animate-pulse-success',
    },
    used: {
      bg: 'bg-orange-500',
      icon: (
        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      title: 'ALREADY SCANNED',
      animation: '',
    },
    invalid: {
      bg: 'bg-red-500',
      icon: (
        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      title: 'INVALID TICKET',
      animation: 'animate-shake',
    },
    'wrong-type': {
      bg: 'bg-amber-500',
      icon: (
        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      ),
      title: 'WRONG TICKET TYPE',
      animation: '',
    },
    offline: {
      bg: 'bg-indigo-500',
      icon: (
        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
        </svg>
      ),
      title: 'QUEUED FOR SYNC',
      animation: '',
    },
    error: {
      bg: 'bg-red-500',
      icon: (
        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'ERROR',
      animation: '',
    },
  };

  const config = configs[result.type];

  return (
    <div
      onClick={onDismiss}
      className={`
        fixed inset-0 z-50 flex flex-col items-center justify-center
        ${config.bg} ${config.animation}
        text-white cursor-pointer
      `}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="p-4 rounded-full bg-white/20">{config.icon}</div>
        <h1 className="text-2xl font-bold tracking-wider">{config.title}</h1>

        {result.ticket && (
          <div className="text-center mt-2">
            <p className="text-lg opacity-90">
              {result.ticket.type} • #{result.ticket.number}
            </p>
          </div>
        )}

        {result.message && (
          <p className="text-sm opacity-80 mt-2 text-center max-w-xs">
            {result.message}
          </p>
        )}

        {result.requiredTypes && result.requiredTypes.length > 0 && (
          <div className="text-center mt-2">
            <p className="text-sm opacity-70">Accepted types:</p>
            <p className="text-sm opacity-90">
              {result.requiredTypes.join(', ')}
            </p>
          </div>
        )}

        <p className="text-xs opacity-60 mt-4">Tap anywhere to dismiss</p>
      </div>
    </div>
  );
};
