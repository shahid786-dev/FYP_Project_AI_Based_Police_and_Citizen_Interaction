import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, X, XCircle } from 'lucide-react';
import { NotificationContext } from './notificationContext';

export default function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const nextId = useRef(0);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setNotifications(current => current.filter(notification => notification.id !== id));
  }, []);

  const notify = useCallback((type, title, message) => {
    const id = ++nextId.current;
    setNotifications(current => [...current, { id, type, title, message }]);
    timers.current.set(id, setTimeout(() => dismiss(id), 5000));
  }, [dismiss]);

  const success = useCallback((title, message) => notify('success', title, message), [notify]);
  const error = useCallback((title, message) => notify('error', title, message), [notify]);

  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
  }, []);

  const value = useMemo(() => ({ success, error }), [success, error]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3" aria-live="polite">
        {notifications.map(notification => {
          const isSuccess = notification.type === 'success';
          const Icon = isSuccess ? CheckCircle2 : XCircle;
          return (
            <div
              key={notification.id}
              role={isSuccess ? 'status' : 'alert'}
              className={`flex items-start gap-3 rounded-2xl border p-4 shadow-2xl backdrop-blur-xl ${
                isSuccess
                  ? 'border-emerald-400/30 bg-slate-950/95 text-emerald-300'
                  : 'border-red-400/30 bg-slate-950/95 text-red-300'
              }`}
            >
              <Icon size={20} className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white">{notification.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">{notification.message}</p>
              </div>
              <button
                type="button"
                onClick={() => dismiss(notification.id)}
                aria-label="Dismiss notification"
                className="rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
}
