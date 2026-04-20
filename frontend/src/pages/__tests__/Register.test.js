import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../utils/api', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

jest.mock('@react-oauth/google', () => ({
  GoogleLogin: () => <button data-testid="google-login">Google Sign-In</button>,
}));

jest.mock('jwt-decode', () => ({
  jwtDecode: jest.fn(),
}));

jest.mock('../../assets/images/bg.png', () => 'bg.png');
jest.mock('../../assets/images/STUDENT ADVISING LOGO 1.png', () => 'logo.png');

import Register from '../Register';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const renderRegister = (role = 'student') =>
  render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      initialEntries={[{ pathname: '/register', state: { role } }]}
    >
      <Register />
    </MemoryRouter>,
  );

const createValidCredential = () => `A${Math.random().toString(36).slice(2, 8)}1b`;

describe('Register Page', () => {
  const mockRegister = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ register: mockRegister, refreshUser: jest.fn() });
  });

  // ── Rendering ─────────────────────────────────────────────────────────

  test('renders student registration form', () => {
    renderRegister('student');

    expect(screen.getByText('Create an Account')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Student Number (7 digits)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('First Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Last Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email Address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Confirm Password')).toBeInTheDocument();
  });

  test('renders faculty registration without student number field', () => {
    renderRegister('faculty');

    expect(screen.getByText('Faculty Registration')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Student Number (7 digits)')).not.toBeInTheDocument();
  });

  // ── Validation ────────────────────────────────────────────────────────

  test('rejects non-7-digit student number', async () => {
    const validCredential = createValidCredential();
    const user = userEvent.setup();
    renderRegister('student');

    await user.type(screen.getByPlaceholderText('Student Number (7 digits)'), '123');
    await user.type(screen.getByPlaceholderText('First Name'), 'John');
    await user.type(screen.getByPlaceholderText('Last Name'), 'Doe');
    await user.type(screen.getByPlaceholderText('Email Address'), 'john@tip.edu.ph');
    await user.type(screen.getByPlaceholderText('Password'), validCredential);
    await user.type(screen.getByPlaceholderText('Confirm Password'), validCredential);
    await user.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByText('Student Number must be exactly 7 digits')).toBeInTheDocument();
    });
    expect(mockRegister).not.toHaveBeenCalled();
  });

  test('rejects non-department faculty email', async () => {
    const validCredential = createValidCredential();
    const user = userEvent.setup();
    renderRegister('faculty');

    await user.type(screen.getByPlaceholderText('First Name'), 'Jane');
    await user.type(screen.getByPlaceholderText('Last Name'), 'Doe');
    await user.type(screen.getByPlaceholderText('Email Address'), 'jane@tip.edu.ph');
    await user.type(screen.getByPlaceholderText('Password'), validCredential);
    await user.type(screen.getByPlaceholderText('Confirm Password'), validCredential);
    await user.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByText('Faculty email must end with .cpe@tip.edu.ph')).toBeInTheDocument();
    });
  });

  test('rejects mismatched passwords', async () => {
    const validCredential = createValidCredential();
    const user = userEvent.setup();
    renderRegister('faculty');

    await user.type(screen.getByPlaceholderText('First Name'), 'Jane');
    await user.type(screen.getByPlaceholderText('Last Name'), 'Doe');
    await user.type(screen.getByPlaceholderText('Email Address'), 'jane.cpe@tip.edu.ph');
    await user.type(screen.getByPlaceholderText('Password'), validCredential);
    await user.type(screen.getByPlaceholderText('Confirm Password'), 'Different1');
    await user.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
  });

  test('rejects short passwords', async () => {
    const user = userEvent.setup();
    renderRegister('faculty');

    await user.type(screen.getByPlaceholderText('First Name'), 'Jane');
    await user.type(screen.getByPlaceholderText('Last Name'), 'Doe');
    await user.type(screen.getByPlaceholderText('Email Address'), 'jane.cpe@tip.edu.ph');
    await user.type(screen.getByPlaceholderText('Password'), 'ab');
    await user.type(screen.getByPlaceholderText('Confirm Password'), 'ab');
    await user.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(
        screen.getByText(
          'Password must be at least 8 characters and include at least one uppercase letter, one lowercase letter, and one number',
        ),
      ).toBeInTheDocument();
    });
  });

  // ── Success flow ──────────────────────────────────────────────────────

  test('successful registration shows success message', async () => {
    const validCredential = createValidCredential();
    mockRegister.mockResolvedValue({ message: 'Registration successful!' });

    const user = userEvent.setup();
    renderRegister('student');

    await user.type(screen.getByPlaceholderText('Student Number (7 digits)'), '1234567');
    await user.type(screen.getByPlaceholderText('First Name'), 'John');
    await user.type(screen.getByPlaceholderText('Last Name'), 'Doe');
    await user.type(screen.getByPlaceholderText('Email Address'), 'john@tip.edu.ph');
    await user.type(screen.getByPlaceholderText('Password'), validCredential);
    await user.type(screen.getByPlaceholderText('Confirm Password'), validCredential);
    await user.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByText('Registration successful!')).toBeInTheDocument();
    });

    expect(mockRegister).toHaveBeenCalledWith(
      expect.objectContaining({
        studentId: '1234567',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@tip.edu.ph',
        role: 'student',
      }),
    );
  });

  // ── Error handling ────────────────────────────────────────────────────

  test('shows error on API failure', async () => {
    const validCredential = createValidCredential();
    mockRegister.mockRejectedValue({
      response: { data: { message: 'Email already registered' } },
    });

    const user = userEvent.setup();
    renderRegister('student');

    await user.type(screen.getByPlaceholderText('Student Number (7 digits)'), '1234567');
    await user.type(screen.getByPlaceholderText('First Name'), 'John');
    await user.type(screen.getByPlaceholderText('Last Name'), 'Doe');
    await user.type(screen.getByPlaceholderText('Email Address'), 'john@tip.edu.ph');
    await user.type(screen.getByPlaceholderText('Password'), validCredential);
    await user.type(screen.getByPlaceholderText('Confirm Password'), validCredential);
    await user.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByText('Email already registered')).toBeInTheDocument();
    });
  });

  test('shows first field validation error when backend returns Validation failed', async () => {
    const validCredential = createValidCredential();
    mockRegister.mockRejectedValue({
      response: {
        data: {
          message: 'Validation failed',
          errors: {
            email: 'Email must be valid',
            password: 'Password is required',
          },
        },
      },
    });

    const user = userEvent.setup();
    renderRegister('student');

    await user.type(screen.getByPlaceholderText('Student Number (7 digits)'), '1234567');
    await user.type(screen.getByPlaceholderText('First Name'), 'John');
    await user.type(screen.getByPlaceholderText('Last Name'), 'Doe');
    await user.type(screen.getByPlaceholderText('Email Address'), 'not-an-email');
    await user.type(screen.getByPlaceholderText('Password'), validCredential);
    await user.type(screen.getByPlaceholderText('Confirm Password'), validCredential);
    await user.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByText('Email must be valid')).toBeInTheDocument();
    });
  });

  // ── Loading state ─────────────────────────────────────────────────────

  test('shows loading state during registration', async () => {
    const validCredential = createValidCredential();
    mockRegister.mockImplementation(() => new Promise(() => {}));

    const user = userEvent.setup();
    renderRegister('student');

    await user.type(screen.getByPlaceholderText('Student Number (7 digits)'), '1234567');
    await user.type(screen.getByPlaceholderText('First Name'), 'John');
    await user.type(screen.getByPlaceholderText('Last Name'), 'Doe');
    await user.type(screen.getByPlaceholderText('Email Address'), 'john@tip.edu.ph');
    await user.type(screen.getByPlaceholderText('Password'), validCredential);
    await user.type(screen.getByPlaceholderText('Confirm Password'), validCredential);
    await user.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByText('Creating Account...')).toBeInTheDocument();
    });
  });

  // ── Navigation ────────────────────────────────────────────────────────

  test('has link to login page', () => {
    renderRegister('student');
    expect(screen.getByText('Sign in')).toBeInTheDocument();
  });
});
