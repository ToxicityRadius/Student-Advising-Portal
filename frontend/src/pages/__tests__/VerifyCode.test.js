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

jest.mock('../../utils/roleRedirect', () => ({
  getHomePathForRole: jest.fn(() => '/dashboard'),
}));

jest.mock('../../assets/images/bg.png', () => 'bg.png');
jest.mock('../../assets/images/STUDENT ADVISING LOGO 1.png', () => 'logo.png');

import VerifyCode from '../VerifyCode';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const renderVerifyCode = (state = { userId: 42, email: 'test@tip.edu.ph' }) =>
  render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      initialEntries={[{ pathname: '/verify', state }]}
    >
      <VerifyCode />
    </MemoryRouter>,
  );

describe('VerifyCode Page', () => {
  const mockRefreshUser = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ refreshUser: mockRefreshUser });
  });

  test('renders verification form with email', () => {
    renderVerifyCode();

    expect(screen.getByText('Verify Your Identity')).toBeInTheDocument();
    expect(screen.getByText('test@tip.edu.ph')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /verify code/i })).toBeInTheDocument();
  });

  test('shows 6 code input boxes', () => {
    renderVerifyCode();

    for (let i = 0; i < 6; i++) {
      expect(document.getElementById(`code-input-${i}`)).toBeInTheDocument();
    }
  });

  test('rejects incomplete code submission', async () => {
    const user = userEvent.setup();
    renderVerifyCode();

    // Type only 3 digits
    await user.type(document.getElementById('code-input-0'), '1');
    await user.type(document.getElementById('code-input-1'), '2');
    await user.type(document.getElementById('code-input-2'), '3');

    await user.click(screen.getByRole('button', { name: /verify code/i }));

    await waitFor(() => {
      expect(screen.getByText('Please enter the complete 6-digit code')).toBeInTheDocument();
    });
  });

  test('successful verification refreshes user session', async () => {
    api.post.mockResolvedValue({
      data: { success: true },
    });
    mockRefreshUser.mockResolvedValue(undefined);

    const user = userEvent.setup();
    renderVerifyCode();

    // Type all 6 digits
    for (let i = 0; i < 6; i++) {
      await user.type(document.getElementById(`code-input-${i}`), String(i + 1));
    }

    await user.click(screen.getByRole('button', { name: /verify code/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/verify-code', {
        userId: 42,
        code: '123456',
      });
    });

    await waitFor(() => {
      expect(mockRefreshUser).toHaveBeenCalled();
    });
  });

  test('shows error on invalid code', async () => {
    api.post.mockRejectedValue({
      response: { data: { message: 'Invalid verification code' } },
    });

    const user = userEvent.setup();
    renderVerifyCode();

    for (let i = 0; i < 6; i++) {
      await user.type(document.getElementById(`code-input-${i}`), '9');
    }

    await user.click(screen.getByRole('button', { name: /verify code/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid verification code')).toBeInTheDocument();
    });
  });

  test('shows loading state during verification', async () => {
    api.post.mockImplementation(() => new Promise(() => {}));

    const user = userEvent.setup();
    renderVerifyCode();

    for (let i = 0; i < 6; i++) {
      await user.type(document.getElementById(`code-input-${i}`), String(i + 1));
    }

    await user.click(screen.getByRole('button', { name: /verify code/i }));

    await waitFor(() => {
      expect(screen.getByText('Verifying...')).toBeInTheDocument();
    });
  });

  test('resend button triggers resend API call', async () => {
    api.post.mockResolvedValue({ data: {} });

    const user = userEvent.setup();
    renderVerifyCode();

    await user.click(screen.getByText('Resend Code'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/resend-code', { userId: 42 });
    });
  });
});
