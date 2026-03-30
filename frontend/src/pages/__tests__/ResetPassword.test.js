import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

jest.mock('../../utils/api', () => ({
  __esModule: true,
  default: { put: jest.fn() },
}));

jest.mock('../../assets/images/bg.png', () => 'bg.png');
jest.mock('../../assets/images/STUDENT ADVISING LOGO 1.png', () => 'logo.png');

import ResetPassword from '../ResetPassword';
import api from '../../utils/api';

const renderResetPassword = (token = 'abc123') =>
  render(
    <MemoryRouter initialEntries={[`/reset-password/${token}`]}>
      <Routes>
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe('ResetPassword Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders reset password form', () => {
    renderResetPassword();

    expect(screen.getByRole('heading', { name: /reset password/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('New Password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Confirm New Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
  });

  test('rejects short passwords', async () => {
    const user = userEvent.setup();
    renderResetPassword();

    await user.type(screen.getByPlaceholderText('New Password'), 'ab');
    await user.type(screen.getByPlaceholderText('Confirm New Password'), 'ab');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters long')).toBeInTheDocument();
    });
    expect(api.put).not.toHaveBeenCalled();
  });

  test('rejects mismatched passwords', async () => {
    const user = userEvent.setup();
    renderResetPassword();

    await user.type(screen.getByPlaceholderText('New Password'), 'Password1!');
    await user.type(screen.getByPlaceholderText('Confirm New Password'), 'Different1!');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
    expect(api.put).not.toHaveBeenCalled();
  });

  test('successful reset shows success message', async () => {
    api.put.mockResolvedValue({ data: { message: 'Password reset successful' } });

    const user = userEvent.setup();
    renderResetPassword('valid-token');

    await user.type(screen.getByPlaceholderText('New Password'), 'NewPass1!');
    await user.type(screen.getByPlaceholderText('Confirm New Password'), 'NewPass1!');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(screen.getByText('Password Reset Successful!')).toBeInTheDocument();
    });

    expect(api.put).toHaveBeenCalledWith('/auth/reset-password/valid-token', {
      password: 'NewPass1!',
    });
  });

  test('shows error on API failure', async () => {
    api.put.mockRejectedValue({
      response: { data: { message: 'Token expired or invalid' } },
    });

    const user = userEvent.setup();
    renderResetPassword();

    await user.type(screen.getByPlaceholderText('New Password'), 'NewPass1!');
    await user.type(screen.getByPlaceholderText('Confirm New Password'), 'NewPass1!');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(screen.getByText('Token expired or invalid')).toBeInTheDocument();
    });
  });

  test('shows loading state during submission', async () => {
    api.put.mockImplementation(() => new Promise(() => {}));

    const user = userEvent.setup();
    renderResetPassword();

    await user.type(screen.getByPlaceholderText('New Password'), 'NewPass1!');
    await user.type(screen.getByPlaceholderText('Confirm New Password'), 'NewPass1!');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(screen.getByText('Resetting...')).toBeInTheDocument();
    });
  });
});
