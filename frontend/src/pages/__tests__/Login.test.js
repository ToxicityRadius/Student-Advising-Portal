import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

// Mock dependencies before importing component
jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../utils/api', () => ({
  __esModule: true,
  default: { post: jest.fn(), get: jest.fn() },
}));

jest.mock('@react-oauth/google', () => ({
  GoogleLogin: () => <button data-testid="google-login">Google Sign-In</button>,
}));

// Mock image imports
jest.mock('../../assets/images/bg.png', () => 'bg.png');
jest.mock('../../assets/images/student yellow.png', () => 'student.png');
jest.mock('../../assets/images/teacher yellow.png', () => 'teacher.png');
jest.mock('../../assets/images/STUDENT ADVISING LOGO 1.png', () => 'logo.png');

import Login from '../Login';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const renderLogin = (initialEntries = ['/login']) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <Login />
    </MemoryRouter>,
  );

describe('Login Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    useAuth.mockReturnValue({ login: jest.fn() });
  });

  // ── Role Selection Screen ─────────────────────────────────────────────

  test('renders role selection screen initially', () => {
    renderLogin();

    expect(screen.getByText('Welcome Back!')).toBeInTheDocument();
    expect(screen.getByLabelText('Login as Student')).toBeInTheDocument();
    expect(screen.getByLabelText('Login as Faculty')).toBeInTheDocument();
  });

  test('selecting Student role shows login form', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByLabelText('Login as Student'));

    expect(screen.getByText('Sign in as Student')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email Address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
  });

  test('selecting Faculty role shows login form', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByLabelText('Login as Faculty'));

    expect(screen.getByText('Sign in as Instructor')).toBeInTheDocument();
  });

  // ── Login Form ────────────────────────────────────────────────────────

  test('back button returns to role selection', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByLabelText('Login as Student'));
    expect(screen.getByText('Sign in as Student')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Go back to role selection'));
    expect(screen.getByText('Welcome Back!')).toBeInTheDocument();
  });

  test('successful login navigates to home', async () => {
    const mockLogin = jest.fn().mockResolvedValue({ role: 'student' });
    useAuth.mockReturnValue({ login: mockLogin });
    api.post.mockResolvedValue({
      data: { token: 'jwt-token', user: { role: 'student' } },
    });

    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByLabelText('Login as Student'));
    await user.type(screen.getByPlaceholderText('Email Address'), 'student@tip.edu.ph');
    await user.type(screen.getByPlaceholderText('Password'), 'Password1!');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/auth/login',
        expect.objectContaining({
          email: 'student@tip.edu.ph',
          password: 'Password1!',
        }),
      );
    });
  });

  test('shows error on login failure', async () => {
    api.post.mockRejectedValue({
      response: { data: { message: 'Invalid Credentials' } },
    });

    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByLabelText('Login as Student'));
    await user.type(screen.getByPlaceholderText('Email Address'), 'student@tip.edu.ph');
    await user.type(screen.getByPlaceholderText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid Credentials')).toBeInTheDocument();
    });
  });

  test('faculty login rejects non-department email', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByLabelText('Login as Faculty'));
    await user.type(screen.getByPlaceholderText('Email Address'), 'student@tip.edu.ph');
    await user.type(screen.getByPlaceholderText('Password'), 'Password1!');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Faculty\/Admin login requires a department email/),
      ).toBeInTheDocument();
    });
    expect(api.post).not.toHaveBeenCalled();
  });

  test('shows loading state during submission', async () => {
    // Make the API call hang
    api.post.mockImplementation(() => new Promise(() => {}));

    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByLabelText('Login as Student'));
    await user.type(screen.getByPlaceholderText('Email Address'), 'test@tip.edu.ph');
    await user.type(screen.getByPlaceholderText('Password'), 'Password1!');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText('Logging in...')).toBeInTheDocument();
    });
  });

  test('renders forgot password and register links', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByLabelText('Login as Student'));

    expect(screen.getByText('Forgot your password?')).toBeInTheDocument();
    expect(screen.getByText('Create an Account')).toBeInTheDocument();
  });
});
