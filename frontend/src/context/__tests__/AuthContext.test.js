import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { AuthProvider, useAuth } from '../AuthContext';

// Mock api module
jest.mock('../../utils/api', () => ({
  __esModule: true,
  clearStoredTokens: jest.fn(),
  default: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

import api from '../../utils/api';

// Test consumer component that exposes auth state
const AuthConsumer = ({ onRender }) => {
  const auth = useAuth();
  React.useEffect(() => {
    if (onRender) onRender(auth);
  });
  return (
    <div>
      <span data-testid="loading">{String(auth.loading)}</span>
      <span data-testid="user">{auth.user ? JSON.stringify(auth.user) : 'null'}</span>
      <span data-testid="isAuthenticated">{String(auth.isAuthenticated)}</span>
      <span data-testid="isAdmin">{String(auth.isAdmin)}</span>
      <button data-testid="login-btn" onClick={() => auth.login('test@test.com', 'password123')}>
        Login
      </button>
      <button data-testid="logout-btn" onClick={() => auth.logout()}>
        Logout
      </button>
      <button
        data-testid="register-btn"
        onClick={() => auth.register({ email: 'new@test.com', password: 'Pass1234!' })}
      >
        Register
      </button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('useAuth throws when used outside AuthProvider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const BadComponent = () => {
      useAuth();
      return null;
    };

    expect(() => render(<BadComponent />)).toThrow('useAuth must be used within an AuthProvider');
    consoleSpy.mockRestore();
  });

  test('initial state is loading=true then loading=false with no user', async () => {
    api.get.mockRejectedValueOnce(new Error('no active session'));

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    // After mount, checkAuth runs and sets loading=false
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
    expect(screen.getByTestId('user')).toHaveTextContent('null');
    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
  });

  test('hydrates user from cached localStorage user and refreshes from /auth/me', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 1, role: 'student', firstName: 'Alice' }));

    api.get.mockResolvedValueOnce({
      data: {
        user: {
          id: 1,
          role: 'student',
          firstName: 'Alice',
          lastName: 'Smith',
          email: 'alice@test.com',
        },
      },
    });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
    });

    const userData = JSON.parse(screen.getByTestId('user').textContent);
    expect(userData.id).toBe(1);
    expect(userData.role).toBe('student');
    expect(userData.lastName).toBe('Smith');
  });

  test('clears auth state when /auth/me fails during startup', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 1, role: 'student' }));
    api.get.mockRejectedValueOnce(new Error('expired session'));

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(localStorage.getItem('user')).toBeNull();
    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
  });

  test('login with credentials refreshes user from /auth/me', async () => {
    api.get.mockRejectedValueOnce(new Error('not authenticated')); // startup refresh

    api.post.mockResolvedValueOnce({
      data: { success: true },
    });
    api.get.mockResolvedValueOnce({
      data: {
        user: {
          id: 2,
          role: 'adviser',
          firstName: 'Bob',
          lastName: 'Jones',
          email: 'bob@test.com',
        },
      },
    });

    const user = userEvent.setup();

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    await user.click(screen.getByTestId('login-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
    });

    expect(api.post).toHaveBeenCalledWith('/auth/login', {
      email: 'test@test.com',
      password: 'password123',
    });
    const storedUser = JSON.parse(localStorage.getItem('user'));
    expect(storedUser.id).toBe(2);
  });

  test('login returns requiresVerification payload without setting user', async () => {
    api.get.mockRejectedValueOnce(new Error('not authenticated')); // startup refresh
    api.post.mockResolvedValueOnce({
      data: { success: true, requiresVerification: true, userId: 44 },
    });

    const user = userEvent.setup();

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    await user.click(screen.getByTestId('login-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
    });
  });

  test('logout clears user and localStorage', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 1, role: 'student', firstName: 'Alice' }));

    api.get.mockResolvedValueOnce({
      data: { user: { id: 1, role: 'student', firstName: 'Alice' } },
    });
    api.post.mockResolvedValueOnce({}); // logout call

    const user = userEvent.setup();

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
    });

    await user.click(screen.getByTestId('logout-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
    });

    expect(localStorage.getItem('user')).toBeNull();
    expect(screen.getByTestId('user')).toHaveTextContent('null');
  });

  test('register calls API without auto-login', async () => {
    api.post.mockResolvedValueOnce({
      data: { success: true, message: 'Registration successful' },
    });

    const user = userEvent.setup();

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    await user.click(screen.getByTestId('register-btn'));

    expect(api.post).toHaveBeenCalledWith('/auth/register', {
      email: 'new@test.com',
      password: 'Pass1234!',
    });
    // User should NOT be set after register
    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
  });

  test('isAdmin is true for Program Chair role', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 3, role: 'admin', firstName: 'Admin' }));

    api.get.mockResolvedValueOnce({
      data: { user: { id: 3, role: 'admin', firstName: 'Admin' } },
    });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('isAdmin')).toHaveTextContent('true');
    });
  });

  test('isAdmin is true for superadmin role', async () => {
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 4, role: 'superadmin', firstName: 'Developer' }),
    );

    api.get.mockResolvedValueOnce({
      data: { user: { id: 4, role: 'superadmin', firstName: 'Developer' } },
    });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('isAdmin')).toHaveTextContent('true');
    });
  });

  test('normalizes user properties from snake_case to camelCase', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        user: {
          id: 1,
          role: 'student',
          first_name: 'Alice',
          last_name: 'Smith',
          year_level: 3,
          contact_number: '09123456789',
          profile_picture: '/uploads/profiles/pic.jpg',
        },
      },
    });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
    });

    const userData = JSON.parse(screen.getByTestId('user').textContent);
    expect(userData.firstName).toBe('Alice');
    expect(userData.lastName).toBe('Smith');
    expect(userData.yearLevel).toBe(3);
    expect(userData.contactNumber).toBe('09123456789');
    expect(userData.profilePicture).toBe('/uploads/profiles/pic.jpg');
  });
});
