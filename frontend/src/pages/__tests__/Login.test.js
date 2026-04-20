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
  default: { post: jest.fn(), get: jest.fn(), patch: jest.fn() },
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
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      initialEntries={initialEntries}
    >
      <Login />
    </MemoryRouter>,
  );

describe('Login Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    useAuth.mockReturnValue({
      refreshUser: jest.fn(),
      setUser: jest.fn(),
      user: null,
      loading: false,
    });
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
    const mockRefreshUser = jest.fn().mockResolvedValue({ role: 'student' });
    useAuth.mockReturnValue({
      refreshUser: mockRefreshUser,
      setUser: jest.fn(),
      user: null,
      loading: false,
    });
    api.post.mockResolvedValue({
      data: { user: { role: 'student' } },
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

    await waitFor(() => {
      expect(mockRefreshUser).toHaveBeenCalled();
    });
  });

  test('email login shows student number modal first, then academic onboarding when fields are missing', async () => {
    const mockRefreshUser = jest
      .fn()
      .mockResolvedValueOnce({
        role: 'student',
        email: 'student@tip.edu.ph',
        studentId: null,
        yearLevel: null,
        program: null,
        curriculum_id: null,
        student_type: null,
        sex: null,
      })
      .mockResolvedValueOnce({
        role: 'student',
        email: 'student@tip.edu.ph',
        studentId: '2310675',
        yearLevel: null,
        program: null,
        curriculum_id: null,
        student_type: null,
        sex: null,
      });

    useAuth.mockReturnValue({
      refreshUser: mockRefreshUser,
      setUser: jest.fn(),
      user: null,
      loading: false,
    });

    api.post.mockResolvedValueOnce({
      data: {
        user: {
          role: 'student',
        },
      },
    });

    api.patch.mockResolvedValueOnce({
      data: {
        success: true,
        user: {
          role: 'student',
          studentId: '2310675',
        },
      },
    });

    api.get.mockResolvedValueOnce({
      data: {
        items: [{ id: 1, name: 'BS CPE Curriculum 2025' }],
      },
    });

    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByLabelText('Login as Student'));
    await user.type(screen.getByPlaceholderText('Email Address'), 'student@tip.edu.ph');
    await user.type(screen.getByPlaceholderText('Password'), 'Password1!');
    await user.click(screen.getByRole('button', { name: /login/i }));

    expect(await screen.findByText('Enter Your Student Number')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('e.g. 2100123'), '2310675');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/users/update-student-id', {
        studentId: '2310675',
      });
    });

    expect(await screen.findByText('Complete Your Academic Profile')).toBeInTheDocument();
  });

  test('email login shows academic onboarding when only one required field is missing', async () => {
    const mockRefreshUser = jest.fn().mockResolvedValue({
      role: 'student',
      email: 'student@tip.edu.ph',
      studentId: '2310675',
      yearLevel: 2,
      program: 'BS CpE',
      curriculum_id: 1,
      student_type: null,
      sex: 'Male',
    });

    useAuth.mockReturnValue({
      refreshUser: mockRefreshUser,
      setUser: jest.fn(),
      user: null,
      loading: false,
    });

    api.post.mockResolvedValueOnce({
      data: {
        user: {
          role: 'student',
        },
      },
    });

    api.get.mockResolvedValueOnce({
      data: {
        items: [{ id: 1, name: 'BS CPE Curriculum 2025' }],
      },
    });

    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByLabelText('Login as Student'));
    await user.type(screen.getByPlaceholderText('Email Address'), 'student@tip.edu.ph');
    await user.type(screen.getByPlaceholderText('Password'), 'Password1!');
    await user.click(screen.getByRole('button', { name: /login/i }));

    expect(await screen.findByText('Complete Your Academic Profile')).toBeInTheDocument();
  });

  test('authenticated student session forces academic onboarding when one required field is missing', async () => {
    useAuth.mockReturnValue({
      refreshUser: jest.fn(),
      setUser: jest.fn(),
      user: {
        role: 'student',
        email: 'student@tip.edu.ph',
        studentId: '2310675',
        yearLevel: 2,
        program: 'BS CpE',
        curriculum_id: 1,
        student_type: 'regular',
        sex: '',
      },
      loading: false,
    });

    api.get.mockResolvedValueOnce({
      data: {
        items: [{ id: 1, name: 'BS CPE Curriculum 2025' }],
      },
    });

    renderLogin();

    expect(await screen.findByText('Complete Your Academic Profile')).toBeInTheDocument();
  });

  test('authenticated student session forces student number modal when only student number is missing', async () => {
    useAuth.mockReturnValue({
      refreshUser: jest.fn(),
      setUser: jest.fn(),
      user: {
        role: 'student',
        email: 'student@tip.edu.ph',
        studentId: null,
        yearLevel: 2,
        program: 'BS CpE',
        curriculum_id: 1,
        student_type: 'regular',
        sex: 'Male',
      },
      loading: false,
    });

    renderLogin();

    expect(await screen.findByText('Enter Your Student Number')).toBeInTheDocument();
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
