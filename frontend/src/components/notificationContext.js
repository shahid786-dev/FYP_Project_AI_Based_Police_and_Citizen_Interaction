import { createContext, useContext } from 'react';

export const NotificationContext = createContext(null);

export function getApiErrorMessage(error, fallback) {
  const data = error?.response?.data;
  const detail = data?.error || data?.detail || data?.message;

  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const message = detail.find(item => typeof item === 'string' && item.trim());
    if (message) return message;
  }
  if (data && typeof data === 'object') {
    for (const value of Object.values(data)) {
      if (typeof value === 'string' && value.trim()) return value;
      if (Array.isArray(value)) {
        const message = value.find(item => typeof item === 'string' && item.trim());
        if (message) return message;
      }
    }
  }
  return fallback;
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider.');
  }
  return context;
}
