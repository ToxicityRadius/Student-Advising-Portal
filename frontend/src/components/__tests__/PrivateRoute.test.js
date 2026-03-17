import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PrivateRoute from '../PrivateRoute';
import { useAuth } from '../../context/AuthContext';

// Mock AuthContext
jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn()
}));

const renderWithRouter = (ui, { initialEntries = ['/protected'] } = {}) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/dashboard" element={<div>Dashboard Page</div>} />
        <Route path="/change-email" element={<div>Change Email Page</div>} />
        <Route path="/protected" element={ui} />
      </Routes>
    </MemoryRouter>
  );
};

describe('PrivateRoute', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('shows loading state while auth is loading', () => {
    useAuth.mockReturnValue({ user: null, loading: true });

    renderWithRouter(
      <PrivateRoute><div>Protected Content</div></PrivateRoute>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  test('redirects to login when user is not authenticated', () => {
    useAuth.mockReturnValue({ user: null, loading: false });

    renderWithRouter(
      <PrivateRoute><div>Protected Content</div></PrivateRoute>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  test('renders children when user is authenticated', () => {
    useAuth.mockReturnValue({
      user: { id: 1, role: 'student' },
      loading: false
    });

    renderWithRouter(
      <PrivateRoute><div>Protected Content</div></PrivateRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  test('redirects to change-email when user has mustChangeEmail flag', () => {
    useAuth.mockReturnValue({
      user: { id: 1, role: 'student', mustChangeEmail: true },
      loading: false
    });

    renderWithRouter(
      <PrivateRoute><div>Protected Content</div></PrivateRoute>
    );

    expect(screen.getByText('Change Email Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  test('redirects non-admin to dashboard when adminOnly is true', () => {
    useAuth.mockReturnValue({
      user: { id: 1, role: 'student' },
      loading: false
    });

    renderWithRouter(
      <PrivateRoute adminOnly><div>Admin Content</div></PrivateRoute>
    );

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  test('allows admin access when adminOnly is true', () => {
    useAuth.mockReturnValue({
      user: { id: 1, role: 'admin' },
      loading: false
    });

    renderWithRouter(
      <PrivateRoute adminOnly><div>Admin Content</div></PrivateRoute>
    );

    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });

  test('redirects when user role is not in allowed roles', () => {
    useAuth.mockReturnValue({
      user: { id: 1, role: 'student' },
      loading: false
    });

    renderWithRouter(
      <PrivateRoute roles={['admin', 'adviser']}><div>Staff Content</div></PrivateRoute>
    );

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    expect(screen.queryByText('Staff Content')).not.toBeInTheDocument();
  });

  test('allows access when user role is in allowed roles', () => {
    useAuth.mockReturnValue({
      user: { id: 1, role: 'adviser' },
      loading: false
    });

    renderWithRouter(
      <PrivateRoute roles={['admin', 'adviser']}><div>Staff Content</div></PrivateRoute>
    );

    expect(screen.getByText('Staff Content')).toBeInTheDocument();
  });

  test('allows access when roles array is empty (no role restriction)', () => {
    useAuth.mockReturnValue({
      user: { id: 1, role: 'student' },
      loading: false
    });

    renderWithRouter(
      <PrivateRoute roles={[]}><div>Any Role Content</div></PrivateRoute>
    );

    expect(screen.getByText('Any Role Content')).toBeInTheDocument();
  });
});
