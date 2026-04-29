import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotificationContext } from '../context/NotificationContext';
import api from '../utils/api';
import AdminLayout from '../components/admin/AdminLayout';
import AdviserLayout from '../components/adviser/AdviserLayout';
import StudentLayout from '../components/student/StudentLayout';

const YELLOW = '#FFC107';
const PAGE_SIZE = 20;

const TYPE_COLORS = {
  error: { bg: '#fff0f0', border: '#e53935', title: '#c62828', body: '#e57373', badge: '#e53935' },
  info: { bg: '#f0f4ff', border: '#1e88e5', title: '#1565c0', body: '#64b5f6', badge: '#1e88e5' },
  success: {
    bg: '#f0fff4',
    border: '#43a047',
    title: '#2e7d32',
    body: '#81c784',
    badge: '#43a047',
  },
  warning: {
    bg: '#fffbf0',
    border: '#f9a825',
    title: '#e65100',
    body: '#ffb74d',
    badge: '#f9a825',
  },
};

const FilterButton = ({ label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      padding: '6px 14px',
      borderRadius: 20,
      border: active ? `2px solid ${YELLOW}` : '1.5px solid #e0e0e0',
      background: active ? '#FFF8E1' : '#fff',
      color: active ? '#7B6A00' : '#555',
      fontWeight: active ? 700 : 500,
      fontSize: '0.82rem',
      cursor: 'pointer',
      transition: 'all 0.15s',
    }}
  >
    {label}
  </button>
);

const parseDateValue = (value) => {
  if (value === null || value === undefined || value === '') return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'number') {
    const normalized = value < 1e12 ? value * 1000 : value;
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (/^\d+$/.test(trimmed)) {
      const numeric = Number(trimmed);
      if (!Number.isNaN(numeric)) {
        const normalized = numeric < 1e12 ? numeric * 1000 : numeric;
        const parsed = new Date(normalized);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
      }
    }

    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
};

const formatTime = (timestamp) => {
  const date = parseDateValue(timestamp);
  if (!date) return '';
  const now = new Date();
  const diffMs = now - date;
  if (Number.isNaN(diffMs)) return '';
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

const NotificationCard = ({ notification, onMarkRead }) => {
  const c = TYPE_COLORS[notification.type] || TYPE_COLORS.info;
  const isRead = notification.isRead;

  return (
    <div
      onClick={() => {
        if (!isRead) onMarkRead(notification.id);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !isRead) onMarkRead(notification.id);
      }}
      aria-label={`${isRead ? 'Read' : 'Unread'}: ${notification.title}`}
      style={{
        display: 'flex',
        alignItems: 'stretch',
        borderRadius: 10,
        overflow: 'hidden',
        background: c.bg,
        opacity: isRead ? 0.55 : 1,
        transition: 'opacity 0.2s, box-shadow 0.15s',
        cursor: isRead ? 'default' : 'pointer',
        boxShadow: isRead ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ width: 5, background: c.border, flexShrink: 0 }} />
      <div
        style={{
          padding: '14px 16px',
          flex: 1,
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          alignItems: 'flex-start',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: c.title }}>
              {notification.title}
            </span>
            {!isRead && (
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: c.badge,
                  flexShrink: 0,
                  display: 'inline-block',
                }}
              />
            )}
          </div>
          <div style={{ fontSize: '0.82rem', color: c.body, lineHeight: 1.4 }}>
            {notification.body}
          </div>
          {notification.actor && (
            <div style={{ fontSize: '0.75rem', color: '#999', marginTop: 4 }}>
              By {notification.actor.firstName} {notification.actor.lastName}
            </div>
          )}
        </div>
        <div
          style={{
            fontSize: '0.75rem',
            color: '#999',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            paddingTop: 2,
          }}
        >
          {formatTime(notification.createdAt)}
        </div>
      </div>
    </div>
  );
};

const NotificationsContent = () => {
  const { markAsRead, markAllAsRead, refresh: refreshContext } = useNotificationContext();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [filter, setFilter] = useState('all'); // all | unread | info | success | error | warning

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, pageSize: PAGE_SIZE };
      if (filter === 'unread') params.unreadOnly = true;
      if (['info', 'success', 'error', 'warning'].includes(filter)) params.type = filter;
      const res = await api.get('/notifications', { params });
      const items = res.data?.data || res.data?.items || [];

      setNotifications(items);
      setTotalPages(res.data?.totalPages || 1);
      setTotalItems(res.data?.totalItems || items.length);
    } catch (err) {
      setError('Failed to load notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkRead = async (id) => {
    if (typeof id !== 'number') return;
    await markAsRead(id);
    await fetchNotifications();
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    refreshContext();
    await fetchNotifications();
  };

  const unreadInView = notifications.filter((n) => !n.isRead).length;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111', margin: 0 }}>
            Notifications
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#888', margin: '2px 0 0' }}>
            {totalItems} total notification{totalItems !== 1 ? 's' : ''}
          </p>
        </div>
        {unreadInView > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            style={{
              padding: '7px 16px',
              borderRadius: 8,
              background: YELLOW,
              border: 'none',
              color: '#000',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: 'All' },
          { key: 'unread', label: 'Unread' },
          { key: 'info', label: 'Info' },
          { key: 'success', label: 'Success' },
          { key: 'error', label: 'Error' },
          { key: 'warning', label: 'Warning' },
        ].map((f) => (
          <FilterButton
            key={f.key}
            label={f.label}
            active={filter === f.key}
            onClick={() => {
              setFilter(f.key);
              setPage(1);
            }}
          />
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#888', fontSize: '0.9rem' }}>
          Loading notifications…
        </div>
      ) : error ? (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: '#c62828', fontWeight: 600, fontSize: '0.9rem' }}>{error}</p>
          <button
            type="button"
            onClick={fetchNotifications}
            style={{
              padding: '7px 18px',
              borderRadius: 8,
              background: YELLOW,
              border: 'none',
              color: '#000',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              marginTop: 8,
            }}
          >
            Retry
          </button>
        </div>
      ) : notifications.length === 0 ? (
        <div style={{ padding: '48px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔔</div>
          <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#333' }}>No notifications</p>
          <p style={{ fontSize: '0.82rem', color: '#888' }}>
            {filter === 'unread'
              ? 'All caught up! No unread notifications.'
              : 'Nothing to show for this filter.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {notifications.map((n) => (
            <NotificationCard key={n.id} notification={n} onMarkRead={handleMarkRead} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 12,
            marginTop: 24,
          }}
        >
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: '1.5px solid #e0e0e0',
              background: '#fff',
              color: page <= 1 ? '#ccc' : '#333',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: page <= 1 ? 'default' : 'pointer',
            }}
          >
            Previous
          </button>
          <span style={{ fontSize: '0.82rem', color: '#666' }}>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: '1.5px solid #e0e0e0',
              background: '#fff',
              color: page >= totalPages ? '#ccc' : '#333',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: page >= totalPages ? 'default' : 'pointer',
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

const Notifications = () => {
  const { user } = useAuth();

  if (user?.role === 'admin' || user?.role === 'superadmin') {
    return (
      <AdminLayout activePage="" pageTitle="Notifications">
        <NotificationsContent />
      </AdminLayout>
    );
  }

  if (user?.role === 'adviser') {
    return (
      <AdviserLayout activePage="" pageTitle="Notifications">
        <NotificationsContent />
      </AdviserLayout>
    );
  }

  return (
    <StudentLayout activePage="" pageTitle="Notifications">
      <NotificationsContent />
    </StudentLayout>
  );
};

export default Notifications;
