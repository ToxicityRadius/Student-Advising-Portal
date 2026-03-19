import { useEffect, useState } from 'react';
import api from './api';

export default function useNotifications() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const abortController = new AbortController();

    api
      .get('/users/me/notifications', { signal: abortController.signal })
      .then((response) => {
        const payload = Array.isArray(response.data?.data) ? response.data.data : [];
        setNotifications(payload);
      })
      .catch((err) => {
        if (err.name === 'CanceledError' || err.name === 'AbortError') return;
        setNotifications([]);
      });

    return () => {
      abortController.abort();
    };
  }, []);

  return { notifications, notifCount: notifications.length };
}
