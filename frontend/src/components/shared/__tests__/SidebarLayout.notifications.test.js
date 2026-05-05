import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter, useLocation } from 'react-router-dom';
import SidebarLayout from '../SidebarLayout';
import { useAuth } from '../../../context/AuthContext';
import { useNotificationContext } from '../../../context/NotificationContext';

jest.mock('../../../context/AuthContext');
jest.mock('../../../context/NotificationContext');

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
};

const renderWithRouter = (ui) =>
  render(
    <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      {ui}
      <LocationProbe />
    </MemoryRouter>,
  );

describe('SidebarLayout notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    useAuth.mockReturnValue({
      user: {
        firstName: 'Grace',
        lastName: 'Chair',
        role: 'admin',
      },
      logout: jest.fn(),
    });

    useNotificationContext.mockReturnValue({
      notifications: [
        {
          id: 7,
          type: 'warning',
          title: 'Prerequisite override request',
          body: 'Concurrent enrollment approval was requested.',
          isRead: false,
          targetPath: '/admin/prerequisite-overrides?status=pending',
        },
      ],
      unreadCount: 1,
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
    });
  });

  test('uses warning styling for prerequisite override notifications in the dropdown', async () => {
    const user = userEvent.setup();

    renderWithRouter(
      <>
        <SidebarLayout
          activePage="overrides"
          pageTitle="Prerequisite Overrides"
          navItems={[]}
          roleLabel="Program Chair"
        >
          <div>Page content</div>
        </SidebarLayout>
      </>,
    );

    await user.click(screen.getByRole('button', { name: /Notifications \(1 unread\)/i }));

    expect(screen.getByText('Prerequisite override request')).toHaveStyle({
      color: '#e65100',
    });
  });

  test('marks a dropdown notification as read and navigates to its target path', async () => {
    const user = userEvent.setup();
    const markAsRead = jest.fn().mockResolvedValue();
    useNotificationContext.mockReturnValue({
      notifications: [
        {
          id: 7,
          type: 'warning',
          title: 'Prerequisite override request',
          body: 'Concurrent enrollment approval was requested.',
          isRead: false,
          targetPath: '/admin/prerequisite-overrides?status=pending',
        },
      ],
      unreadCount: 1,
      markAsRead,
      markAllAsRead: jest.fn(),
    });

    renderWithRouter(
      <>
        <SidebarLayout
          activePage="overrides"
          pageTitle="Prerequisite Overrides"
          navItems={[]}
          roleLabel="Program Chair"
        >
          <div>Page content</div>
        </SidebarLayout>
      </>,
    );

    await user.click(screen.getByRole('button', { name: /Notifications \(1 unread\)/i }));
    await user.click(screen.getByText('Prerequisite override request'));

    expect(markAsRead).toHaveBeenCalledWith(7);
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/admin/prerequisite-overrides?status=pending',
    );
  });
});
