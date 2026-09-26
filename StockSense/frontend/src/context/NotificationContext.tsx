import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface NotificationContextType {
  notify: (type: ToastType, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const notify = useCallback((type: ToastType, title: string, message?: string) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newToast: Toast = { id, type, title, message };
    setToasts(prev => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  const success = useCallback((title: string, message?: string) => notify('success', title, message), [notify]);
  const error = useCallback((title: string, message?: string) => notify('error', title, message), [notify]);
  const warning = useCallback((title: string, message?: string) => notify('warning', title, message), [notify]);
  const info = useCallback((title: string, message?: string) => notify('info', title, message), [notify]);

  return (
    <NotificationContext.Provider value={{ notify, success, error, warning, info }}>
      {children}
      {/* Toast Render Overlay */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
        {toasts.map(toast => {
          let bg = 'bg-slate-900 border-slate-700 text-white';
          let icon = <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />;

          if (toast.type === 'success') {
            bg = 'bg-emerald-950/95 border-emerald-700/80 text-emerald-100';
            icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />;
          } else if (toast.type === 'error') {
            bg = 'bg-rose-950/95 border-rose-700/80 text-rose-100';
            icon = <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />;
          } else if (toast.type === 'warning') {
            bg = 'bg-amber-950/95 border-amber-700/80 text-amber-100';
            icon = <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />;
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto p-4 rounded-xl border shadow-xl flex items-start gap-3 backdrop-blur-md transition-all duration-200 animate-in slide-in-from-bottom-2 ${bg}`}
            >
              {icon}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold tracking-tight">{toast.title}</h4>
                {toast.message && (
                  <p className="text-xs opacity-90 mt-0.5 leading-relaxed break-words">{toast.message}</p>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="opacity-70 hover:opacity-100 transition-opacity p-1 -mr-1 rounded hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
