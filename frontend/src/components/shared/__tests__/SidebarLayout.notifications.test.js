import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import SidebarLayout from '../SidebarLayout';
import { useAuth } from '../../../context/AuthContext';
import { useNotificationContext } from '../../../context/NotificationContext';

jest.mock('../../../context/AuthContext');
jest.mock('../../../context/NotificationContext');

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
        },
      ],
      unreadCount: 1,
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
    });
  });

  test('uses warning styling for prerequisite override notifications in the dropdown', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <SidebarLayout
          activePage="overrides"
          pageTitle="Prerequisite Overrides"
          navItems={[]}
          roleLabel="Program Chair"
        >
          <div>Page content</div>
        </SidebarLayout>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /Notifications \(1 unread\)/i }));

    expect(screen.getByText('Prerequisite override request')).toHaveStyle({
      color: '#e65100',
    });
  });
});
