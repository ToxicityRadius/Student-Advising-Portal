import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../utils/api";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext({
  notifications: [],
  notifCount: 0,
  refresh: () => {},
});

export function NotificationProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = useCallback(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      return;
    }
    const abortController = new AbortController();

    api
      .get("/users/me/notifications", { signal: abortController.signal })
      .then((response) => {
        const payload = Array.isArray(response.data?.data) ? response.data.data : [];
        setNotifications(payload);
      })
      .catch((err) => {
        if (err.name === "CanceledError" || err.name === "AbortError") return;
        setNotifications([]);
      });

    return () => abortController.abort();
  }, [isAuthenticated]);

  useEffect(() => {
    const cleanup = fetchNotifications();
    return cleanup;
  }, [fetchNotifications]);

  const value = {
    notifications,
    notifCount: notifications.length,
    refresh: fetchNotifications,
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
