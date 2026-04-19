import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../../utils/api', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

jest.mock('../../assets/images/bg.png', () => 'bg.png');
jest.mock('../../assets/images/STUDENT ADVISING LOGO 1.png', () => 'logo.png');

import ForgotPassword from '../ForgotPassword';
import api from '../../utils/api';

const renderForgotPassword = () =>
  render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      initialEntries={['/forgot-password']}
    >
      <ForgotPassword />
    </MemoryRouter>,
  );

describe('ForgotPassword Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders forgot password form', () => {
    renderForgotPassword();

    expect(screen.getByText('Forgot Password?')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email Address')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
    expect(screen.getByText('← Back to Login')).toBeInTheDocument();
  });

  test('submits email and shows success message', async () => {
    api.post.mockResolvedValue({
      data: { message: 'Reset link sent to your email' },
    });

    const user = userEvent.setup();
    renderForgotPassword();

    await user.type(screen.getByPlaceholderText('Email Address'), 'test@tip.edu.ph');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText('Reset link sent to your email')).toBeInTheDocument();
    });

    expect(api.post).toHaveBeenCalledWith('/auth/forgot-password', { email: 'test@tip.edu.ph' });
  });

  test('shows error on API failure', async () => {
    api.post.mockRejectedValue({
      response: { data: { message: 'User not found' } },
    });

    const user = userEvent.setup();
    renderForgotPassword();

    await user.type(screen.getByPlaceholderText('Email Address'), 'bad@tip.edu.ph');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText('User not found')).toBeInTheDocument();
    });
  });

  test('shows loading state during submission', async () => {
    api.post.mockImplementation(() => new Promise(() => {}));

    const user = userEvent.setup();
    renderForgotPassword();

    await user.type(screen.getByPlaceholderText('Email Address'), 'test@tip.edu.ph');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText('Sending...')).toBeInTheDocument();
    });
  });

  test('clears email field after successful submission', async () => {
    api.post.mockResolvedValue({
      data: { message: 'Reset link sent' },
    });

    const user = userEvent.setup();
    renderForgotPassword();

    const emailInput = screen.getByPlaceholderText('Email Address');
    await user.type(emailInput, 'test@tip.edu.ph');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(emailInput).toHaveValue('');
    });
  });
});
