import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../utils/api', () => ({
  __esModule: true,
  default: { post: jest.fn(), get: jest.fn() },
}));

jest.mock('../../utils/googleOAuthConfig', () => ({
  isGoogleOAuthConfigured: false,
}));

jest.mock('@react-oauth/google', () => ({
  GoogleLogin: () => <button data-testid="google-login">Google Sign-In</button>,
}));

jest.mock('../../assets/images/bg.png', () => 'bg.png');
jest.mock('../../assets/images/student yellow.png', () => 'student.png');
jest.mock('../../assets/images/teacher yellow.png', () => 'teacher.png');
jest.mock('../../assets/images/STUDENT ADVISING LOGO 1.png', () => 'logo.png');

import Login from '../Login';
import { useAuth } from '../../context/AuthContext';

describe('Login Page - OAuth Disabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    useAuth.mockReturnValue({ refreshUser: jest.fn(), setUser: jest.fn() });
  });

  test('shows fallback message and hides Google button when OAuth is not configured', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        initialEntries={['/login']}
      >
        <Login />
      </MemoryRouter>,
    );

    await user.click(screen.getByLabelText('Login as Student'));

    expect(screen.getByText(/Google Sign-In is currently unavailable/i)).toBeInTheDocument();
    expect(screen.queryByTestId('google-login')).not.toBeInTheDocument();
  });
});
