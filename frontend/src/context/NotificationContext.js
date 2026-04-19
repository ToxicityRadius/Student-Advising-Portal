import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import api from '../utils/api';
import { useAuth } from './AuthContext';

const POLL_INTERVAL = 60_000; // 60 seconds

const NotificationContext = createContext({
  notifications: [],
  notifCount: 0,
  unreadCount: 0,
  refresh: () => {},
  markAsRead: () => {},
  markAllAsRead: () => {},
});

const isAbortLikeError = (err) =>
  err?.name === 'CanceledError' || err?.name === 'AbortError' || err?.code === 'ERR_CANCELED';

export function NotificationProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const notifEnabled = isAuthenticated && user?.notifInapp !== false;
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef(null);

  const fetchNotifications = useCallback(() => {
    if (!notifEnabled) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    const abortController = new AbortController();

    Promise.allSettled([
      api.get('/notifications', {
        params: { page: 1, pageSize: 20 },
        signal: abortController.signal,
      }),
      api.get('/notifications/unread-count', { signal: abortController.signal }),
    ]).then(([notificationsResult, unreadCountResult]) => {
      const notificationsError =
        notificationsResult.status === 'rejected' ? notificationsResult.reason : null;
      const unreadCountError =
        unreadCountResult.status === 'rejected' ? unreadCountResult.reason : null;

      if (isAbortLikeError(notificationsError) || isAbortLikeError(unreadCountError)) {
        return;
      }

      const notificationsFulfilled = notificationsResult.status === 'fulfilled';
      const unreadCountFulfilled = unreadCountResult.status === 'fulfilled';

      if (!notificationsFulfilled && !unreadCountFulfilled) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      let payload = null;
      if (notificationsFulfilled) {
        payload = Array.isArray(notificationsResult.value.data?.data)
          ? notificationsResult.value.data.data
          : [];
        setNotifications(payload);
      }

      if (unreadCountFulfilled) {
        const countFromApi = Number(unreadCountResult.value.data?.data?.count);
        if (Number.isFinite(countFromApi) && countFromApi >= 0) {
          setUnreadCount(countFromApi);
          return;
        }
      }

      if (Array.isArray(payload)) {
        const localUnreadCount = payload.filter((n) => !n.isRead).length;
        setUnreadCount((previousCount) => Math.max(previousCount, localUnreadCount));
      }
    });

    return () => abortController.abort();
  }, [notifEnabled]);

  // Initial fetch + polling
  useEffect(() => {
    const cleanup = fetchNotifications();

    if (notifEnabled) {
      intervalRef.current = setInterval(fetchNotifications, POLL_INTERVAL);
    }

    return () => {
      if (typeof cleanup === 'function') cleanup();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchNotifications, notifEnabled]);

  const markAsRead = useCallback(async (id) => {
    if (!id || typeof id === 'string') return; // skip ephemeral hints
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silent
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // silent
    }
  }, []);

  const value = {
    notifications,
    notifCount: notifications.length,
    unreadCount,
    refresh: fetchNotifications,
    markAsRead,
    markAllAsRead,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotificationContext() {
  return useContext(NotificationContext);
}

export default NotificationContext;
