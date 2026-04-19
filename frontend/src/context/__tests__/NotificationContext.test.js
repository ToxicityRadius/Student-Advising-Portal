import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { NotificationProvider, useNotificationContext } from '../NotificationContext';

jest.mock('../../utils/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

jest.mock('../AuthContext', () => ({
  useAuth: jest.fn(),
}));

import api from '../../utils/api';
import { useAuth } from '../AuthContext';

const Consumer = () => {
  const { notifications, unreadCount, refresh } = useNotificationContext();

  return (
    <div>
      <span data-testid="notif-count">{notifications.length}</span>
      <span data-testid="unread-count">{unreadCount}</span>
      <button data-testid="refresh-btn" onClick={refresh}>
        Refresh
      </button>
    </div>
  );
};

describe('NotificationContext dual-endpoint fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: 1, role: 'adviser', notifInapp: true },
    });
  });

  test('uses unread-count endpoint when both requests succeed', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/notifications') {
        return Promise.resolve({
          data: {
            data: [
              { id: 10, isRead: false },
              { id: 11, isRead: true },
            ],
          },
        });
      }
      if (url === '/notifications/unread-count') {
        return Promise.resolve({ data: { data: { count: 7 } } });
      }
      return Promise.reject(new Error('Unexpected endpoint'));
    });

    render(
      <NotificationProvider>
        <Consumer />
      </NotificationProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('notif-count')).toHaveTextContent('2');
      expect(screen.getByTestId('unread-count')).toHaveTextContent('7');
    });
  });

  test('falls back to local unread calculation when unread-count endpoint fails', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/notifications') {
        return Promise.resolve({
          data: {
            data: [
              { id: 20, isRead: false },
              { id: 21, isRead: false },
              { id: 22, isRead: true },
            ],
          },
        });
      }
      if (url === '/notifications/unread-count') {
        return Promise.reject(new Error('count endpoint down'));
      }
      return Promise.reject(new Error('Unexpected endpoint'));
    });

    render(
      <NotificationProvider>
        <Consumer />
      </NotificationProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('notif-count')).toHaveTextContent('3');
      expect(screen.getByTestId('unread-count')).toHaveTextContent('2');
    });
  });

  test('preserves existing notifications when notifications endpoint fails but unread count succeeds', async () => {
    let notificationsCall = 0;
    let unreadCountCall = 0;

    api.get.mockImplementation((url) => {
      if (url === '/notifications') {
        notificationsCall += 1;
        if (notificationsCall === 1) {
          return Promise.resolve({
            data: {
              data: [
                { id: 30, isRead: false },
                { id: 31, isRead: true },
              ],
            },
          });
        }
        return Promise.reject(new Error('notifications endpoint down'));
      }

      if (url === '/notifications/unread-count') {
        unreadCountCall += 1;
        if (unreadCountCall === 1) {
          return Promise.resolve({ data: { data: { count: 1 } } });
        }
        return Promise.resolve({ data: { data: { count: 5 } } });
      }

      return Promise.reject(new Error('Unexpected endpoint'));
    });

    const user = userEvent.setup();

    render(
      <NotificationProvider>
        <Consumer />
      </NotificationProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('notif-count')).toHaveTextContent('2');
      expect(screen.getByTestId('unread-count')).toHaveTextContent('1');
    });

    await user.click(screen.getByTestId('refresh-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('notif-count')).toHaveTextContent('2');
      expect(screen.getByTestId('unread-count')).toHaveTextContent('5');
    });
  });

  test('keeps last known unread count when unread-count endpoint fails', async () => {
    let notificationsCall = 0;
    let unreadCountCall = 0;

    api.get.mockImplementation((url) => {
      if (url === '/notifications') {
        notificationsCall += 1;
        return Promise.resolve({
          data: {
            data: [
              { id: 40, isRead: false },
              { id: 41, isRead: false },
            ],
          },
        });
      }

      if (url === '/notifications/unread-count') {
        unreadCountCall += 1;
        if (unreadCountCall === 1) {
          return Promise.resolve({ data: { data: { count: 9 } } });
        }
        return Promise.reject(new Error('count endpoint down'));
      }

      return Promise.reject(new Error('Unexpected endpoint'));
    });

    const user = userEvent.setup();

    render(
      <NotificationProvider>
        <Consumer />
      </NotificationProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('notif-count')).toHaveTextContent('2');
      expect(screen.getByTestId('unread-count')).toHaveTextContent('9');
    });

    await user.click(screen.getByTestId('refresh-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('notif-count')).toHaveTextContent('2');
      expect(screen.getByTestId('unread-count')).toHaveTextContent('9');
    });
  });

  test('clears notifications when both endpoints fail', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/notifications' || url === '/notifications/unread-count') {
        return Promise.reject(new Error('both endpoints down'));
      }
      return Promise.reject(new Error('Unexpected endpoint'));
    });

    render(
      <NotificationProvider>
        <Consumer />
      </NotificationProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('notif-count')).toHaveTextContent('0');
      expect(screen.getByTestId('unread-count')).toHaveTextContent('0');
    });
  });
});
