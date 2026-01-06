import React from 'react';
import { useUIStore } from '@/stores';
import type { Toast as ToastType } from '@/types';

const ToastItem: React.FC<{ toast: ToastType; onClose: () => void }> = ({
  toast,
  onClose,
}) => {
  const variants = {
    success: {
      bg: 'bg-emerald-50 border-emerald-200',
      icon: 'text-emerald-500',
      title: 'text-emerald-800',
    },
    error: {
      bg: 'bg-red-50 border-red-200',
      icon: 'text-red-500',
      title: 'text-red-800',
    },
    warning: {
      bg: 'bg-amber-50 border-amber-200',
      icon: 'text-amber-500',
      title: 'text-amber-800',
    },
    info: {
      bg: 'bg-blue-50 border-blue-200',
      icon: 'text-blue-500',
      title: 'text-blue-800',
    },
  };

  const icons = {
    success: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  const style = variants[toast.type];

  return (
    <div
      className={`
        ${style.bg} border rounded-lg p-4 shadow-lg
        animate-slide-up max-w-sm w-full
      `}
    >
      <div className="flex items-start gap-3">
        <span className={style.icon}>{icons[toast.type]}</span>
        <div className="flex-1">
          <p className={`font-medium ${style.title}`}>{toast.title}</p>
          {toast.message && (
            <p className="text-sm text-gray-600 mt-1">{toast.message}</p>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Dismiss notification"
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const toasts = useUIStore((state) => state.toasts);
  const removeToast = useUIStore((state) => state.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};
