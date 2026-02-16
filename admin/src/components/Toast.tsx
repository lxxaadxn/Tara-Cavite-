import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import styles from './Toast.module.css';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

const ToastContext = createContext<((msg: string, type?: 'success' | 'error' | 'info') => void) | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className={styles.container}>
        {toasts.map((t) => (
          <div key={t.id} className={`${styles.toast} ${styles[t.type]}`}>
            {t.type === 'success' && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            )}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function ToastContainer() {
  return null;
}
