import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import api from "../utils/api";
import { useAuth } from "./AuthContext";

const POLL_INTERVAL = 60_000; // 60 seconds

const NotificationContext = createContext({
  notifications: [],
  notifCount: 0,
  unreadCount: 0,
  refresh: () => {},
  markAsRead: () => {},
  markAllAsRead: () => {},
});

export function NotificationProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef(null);

  const fetchNotifications = useCallback(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    const abortController = new AbortController();

    api
      .get("/users/me/notifications", { signal: abortController.signal })
      .then((response) => {
        const payload = Array.isArray(response.data?.data) ? response.data.data : [];
        setNotifications(payload);
        setUnreadCount(payload.filter((n) => !n.isRead).length);
      })
      .catch((err) => {
        if (err.name === "CanceledError" || err.name === "AbortError") return;
        setNotifications([]);
        setUnreadCount(0);
      });

    return () => abortController.abort();
  }, [isAuthenticated]);

  // Initial fetch + polling
  useEffect(() => {
    const cleanup = fetchNotifications();

    if (isAuthenticated) {
      intervalRef.current = setInterval(fetchNotifications, POLL_INTERVAL);
    }

    return () => {
      if (typeof cleanup === "function") cleanup();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchNotifications, isAuthenticated]);

  const markAsRead = useCallback(
    async (id) => {
      if (!id || typeof id === "string") return; // skip ephemeral hints
      try {
        await api.patch(`/notifications/${id}/read`);
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // silent
      }
    },
    []
  );

  const markAllAsRead = useCallback(async () => {
    try {
      await api.patch("/notifications/read-all");
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

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  return useContext(NotificationContext);
}

export default NotificationContext;
