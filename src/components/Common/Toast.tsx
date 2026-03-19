import { createContext, useCallback, useContext, useRef, useState } from 'react';
import './Toast.css';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ToastItem {
  id: string;
  message: string;
  undoLabel?: string;
  onUndo?: () => void;
  /** ms before auto-dismiss; default 5000 */
  duration?: number;
}

interface ToastContextValue {
  show(item: Omit<ToastItem, 'id'>): void;
}

// ── Context ────────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue>({ show: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

// ── Provider + Container ───────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const show = useCallback((item: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    const duration = item.duration ?? 10000;
    setToasts(prev => [...prev, { ...item, id, duration }]);
    const timer = setTimeout(() => dismiss(id), duration);
    timers.current.set(id, timer);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="toast-container" aria-live="polite" aria-atomic="false">
        {toasts.map(toast => (
          <div key={toast.id} className="toast">
            <div className="toast-body">
              <span className="toast-message">{toast.message}</span>
              <div className="toast-actions">
                {toast.onUndo && (
                  <button
                    className="toast-undo-btn"
                    onClick={() => { toast.onUndo!(); dismiss(toast.id); }}
                  >
                    {toast.undoLabel ?? 'Undo'}
                  </button>
                )}
                <button
                  className="toast-dismiss-btn"
                  onClick={() => dismiss(toast.id)}
                  aria-label="Dismiss"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            </div>
            <div className="toast-progress">
              <div
                className="toast-progress-bar"
                style={{ animationDuration: `${toast.duration ?? 20000}ms` }}
              />
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
