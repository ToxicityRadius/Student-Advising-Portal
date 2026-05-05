import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter, useLocation } from 'react-router-dom';

jest.mock('../../utils/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../context/NotificationContext', () => ({
  useNotificationContext: jest.fn(),
}));

jest.mock('../../components/student/StudentLayout', () => {
  return function MockStudentLayout({ children }) {
    return <div data-testid="student-layout">{children}</div>;
  };
});

jest.mock('../../components/adviser/AdviserLayout', () => {
  return function MockAdviserLayout({ children }) {
    return <div data-testid="adviser-layout">{children}</div>;
  };
});

jest.mock('../../components/admin/AdminLayout', () => {
  return function MockAdminLayout({ children }) {
    return <div data-testid="admin-layout">{children}</div>;
  };
});

import Notifications from '../Notifications';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useNotificationContext } from '../../context/NotificationContext';

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
};

const renderNotifications = () =>
  render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      initialEntries={['/notifications']}
    >
      <Notifications />
      <LocationProbe />
    </MemoryRouter>,
  );

describe('Notifications page consistency', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    useAuth.mockReturnValue({
      user: { id: 1, role: 'student' },
    });

    useNotificationContext.mockReturnValue({
      markAsRead: jest.fn().mockResolvedValue(),
      markAllAsRead: jest.fn().mockResolvedValue(),
      refresh: jest.fn(),
    });

    api.get.mockResolvedValue({
      data: {
        data: [],
        totalPages: 1,
        totalItems: 0,
      },
    });
  });

  test('sends correct query params for all, unread, and type filters', async () => {
    const user = userEvent.setup();
    renderNotifications();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/notifications', {
        params: { page: 1, pageSize: 20 },
      });
    });

    await user.click(screen.getByRole('button', { name: 'Info' }));

    await waitFor(() => {
      expect(api.get).toHaveBeenLastCalledWith('/notifications', {
        params: { page: 1, pageSize: 20, type: 'info' },
      });
    });

    await user.click(screen.getByRole('button', { name: 'Unread' }));

    await waitFor(() => {
      expect(api.get).toHaveBeenLastCalledWith('/notifications', {
        params: { page: 1, pageSize: 20, unreadOnly: true },
      });
    });
  });

  test('does not render Invalid Date when notification timestamp is malformed', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 88,
            title: 'Malformed timestamp',
            body: 'Timestamp should fail gracefully.',
            type: 'info',
            isRead: false,
            createdAt: 'not-a-date',
          },
        ],
        totalPages: 1,
        totalItems: 1,
      },
    });

    renderNotifications();

    await waitFor(() => {
      expect(screen.getByText('Malformed timestamp')).toBeInTheDocument();
    });

    expect(screen.queryByText('Invalid Date')).not.toBeInTheDocument();
  });

  test('marks a notification as read and navigates to its target path when clicked', async () => {
    const user = userEvent.setup();
    const markAsRead = jest.fn().mockResolvedValue();
    useNotificationContext.mockReturnValue({
      markAsRead,
      markAllAsRead: jest.fn().mockResolvedValue(),
      refresh: jest.fn(),
    });
    api.get
      .mockResolvedValueOnce({
        data: {
          data: [
            {
              id: 88,
              title: 'Grades updated',
              body: 'Grades are ready.',
              type: 'info',
              isRead: false,
              targetPath: '/grades',
              createdAt: Date.now(),
            },
          ],
          totalPages: 1,
          totalItems: 1,
        },
      })
      .mockResolvedValue({
        data: {
          data: [],
          totalPages: 1,
          totalItems: 0,
        },
      });

    renderNotifications();

    await user.click(await screen.findByRole('button', { name: /Unread: Grades updated/i }));

    expect(markAsRead).toHaveBeenCalledWith(88);
    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/grades');
    });
  });

  test('keyboard activation navigates to notifications fallback when target path is missing', async () => {
    const user = userEvent.setup();
    const markAsRead = jest.fn().mockResolvedValue();
    useNotificationContext.mockReturnValue({
      markAsRead,
      markAllAsRead: jest.fn().mockResolvedValue(),
      refresh: jest.fn(),
    });
    api.get
      .mockResolvedValueOnce({
        data: {
          data: [
            {
              id: 99,
              title: 'General notice',
              body: 'No target path.',
              type: 'info',
              isRead: false,
              createdAt: Date.now(),
            },
          ],
          totalPages: 1,
          totalItems: 1,
        },
      })
      .mockResolvedValue({
        data: {
          data: [],
          totalPages: 1,
          totalItems: 0,
        },
      });

    renderNotifications();

    const card = await screen.findByRole('button', { name: /Unread: General notice/i });
    card.focus();
    await user.keyboard('{Space}');

    expect(markAsRead).toHaveBeenCalledWith(99);
    expect(screen.getByTestId('location')).toHaveTextContent('/notifications');
  });
});
