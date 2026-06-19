'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

// ============================================================
// Toast notification system
// Enterprise-grade: no emoji, clean typography, auto-dismiss
// ============================================================

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (message: string, variant?: ToastVariant) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext>
  );
}

// ============================================================
// Toast UI
// ============================================================

const variantStyles: Record<ToastVariant, string> = {
  success: 'border-l-emerald-500 bg-white',
  error: 'border-l-red-500 bg-white',
  warning: 'border-l-amber-500 bg-white',
  info: 'border-l-blue-500 bg-white',
};

const variantIcons: Record<ToastVariant, string> = {
  success: 'Berhasil',
  error: 'Gagal',
  warning: 'Peringatan',
  info: 'Info',
};

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`animate-toast border-l-4 rounded-md shadow-lg px-4 py-3 flex items-start gap-3 ${variantStyles[toast.variant]}`}
          role="alert"
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-0.5">
              {variantIcons[toast.variant]}
            </p>
            <p className="text-sm text-slate-800 leading-snug">{toast.message}</p>
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            className="text-slate-400 hover:text-slate-600 text-lg leading-none mt-0.5 flex-shrink-0"
            aria-label="Tutup notifikasi"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
