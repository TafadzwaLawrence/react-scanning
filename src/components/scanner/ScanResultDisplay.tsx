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
  autoDismissMs = 1200, // Fast auto-dismiss
}) => {
  useEffect(() => {
    if (result) {
      // Auto-dismiss all results
      const timer = setTimeout(onDismiss, result.type === 'valid' ? autoDismissMs : autoDismissMs + 300);
      return () => clearTimeout(timer);
    }
  }, [result, onDismiss, autoDismissMs]);

  if (!result) return null;

  const configs = {
    valid: {
      bg: 'bg-emerald-500',
      border: 'border-emerald-600',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      ),
      title: 'VALID',
    },
    used: {
      bg: 'bg-orange-500',
      border: 'border-orange-600',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      title: 'ALREADY USED',
    },
    invalid: {
      bg: 'bg-red-500',
      border: 'border-red-600',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      title: 'INVALID',
    },
    'wrong-type': {
      bg: 'bg-amber-500',
      border: 'border-amber-600',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      ),
      title: 'WRONG TYPE',
    },
    offline: {
      bg: 'bg-indigo-500',
      border: 'border-indigo-600',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0" />
        </svg>
      ),
      title: 'QUEUED',
    },
    error: {
      bg: 'bg-red-500',
      border: 'border-red-600',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'ERROR',
    },
  };

  const config = configs[result.type];

  return (
    <>
      {/* Semi-transparent backdrop - tap to dismiss */}
      <div 
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onDismiss}
      />
      
      {/* Modal at bottom */}
      <div
        onClick={onDismiss}
        className={`
          fixed bottom-20 left-4 right-4 z-50
          ${config.bg} ${config.border}
          border-2 rounded-2xl shadow-2xl
          text-white cursor-pointer
          animate-slide-up
        `}
      >
        <div className="p-4 flex items-center gap-4">
          {/* Icon */}
          <div className="p-3 rounded-full bg-white/20 flex-shrink-0">
            {config.icon}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold tracking-wide">{config.title}</h2>
            
            {result.ticket && (
              <p className="text-sm opacity-90 truncate">
                {result.ticket.type} • #{result.ticket.number}
              </p>
            )}
            
            {result.message && (
              <p className="text-xs opacity-75 truncate mt-1">
                {result.message}
              </p>
            )}
          </div>
          
          {/* Dismiss hint */}
          <div className="flex-shrink-0 opacity-60">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </div>
      </div>
    </>
  );
};
