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
  autoDismissMs = 2000, // 2 second auto-dismiss
}) => {
  useEffect(() => {
    if (result) {
      // Auto-dismiss all results
      const timer = setTimeout(onDismiss, result.type === 'valid' ? autoDismissMs : autoDismissMs + 500);
      return () => clearTimeout(timer);
    }
  }, [result, onDismiss, autoDismissMs]);

  if (!result) return null;

  const configs = {
    valid: {
      bg: 'bg-success',
      ring: 'ring-success/30',
      icon: (
        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      ),
      title: 'VALID',
    },
    used: {
      bg: 'bg-warning',
      ring: 'ring-warning/30',
      icon: (
        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      title: 'ALREADY USED',
    },
    invalid: {
      bg: 'bg-error',
      ring: 'ring-error/30',
      icon: (
        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      title: 'INVALID',
    },
    'wrong-type': {
      bg: 'bg-warning',
      ring: 'ring-warning/30',
      icon: (
        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      ),
      title: 'WRONG TYPE',
    },
    offline: {
      bg: 'bg-secondary',
      ring: 'ring-secondary/30',
      icon: (
        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0" />
        </svg>
      ),
      title: 'QUEUED',
    },
    error: {
      bg: 'bg-error',
      ring: 'ring-error/30',
      icon: (
        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'ERROR',
    },
  };

  const config = configs[result.type];

  return (
    <div
      onClick={onDismiss}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 cursor-pointer animate-fade-in"
    >
      <div className="flex flex-col items-center animate-scale-in">
        {/* Circular icon container */}
        <div
          className={`
            w-32 h-32 rounded-full ${config.bg} ${config.ring}
            ring-8 shadow-2xl
            flex items-center justify-center
            text-white
          `}
        >
          {config.icon}
        </div>
        
        {/* Title */}
        <h2 className="mt-4 text-2xl font-bold text-white tracking-wider">
          {config.title}
        </h2>
        
        {/* Ticket info */}
        {result.ticket && (
          <p className="mt-2 text-base text-white/90">
            {result.ticket.type} • #{result.ticket.number}
          </p>
        )}
        
        {/* Message */}
        {result.message && (
          <p className="mt-1 text-sm text-white/70 max-w-[250px] text-center">
            {result.message}
          </p>
        )}
        
        {/* Tap to dismiss hint */}
        <p className="mt-6 text-xs text-white/50">
          Tap anywhere to dismiss
        </p>
      </div>
    </div>
  );
};
