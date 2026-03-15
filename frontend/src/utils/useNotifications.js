import { useEffect, useState } from 'react';
import api from './api';

export default function useNotifications() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    let mounted = true;

    api
      .get('/users/me/notifications')
      .then((response) => {
        if (!mounted) return;
        const payload = Array.isArray(response.data?.data) ? response.data.data : [];
        setNotifications(payload);
      })
      .catch(() => {
        if (!mounted) return;
        setNotifications([]);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return { notifications, notifCount: notifications.length };
}
