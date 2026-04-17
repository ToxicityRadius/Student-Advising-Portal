import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../utils/googleOAuthConfig', () => ({
  isGoogleOAuthConfigured: false,
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

describe('Register Page - OAuth Disabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ register: jest.fn(), login: jest.fn() });
  });

  test('shows fallback message and hides Google button when OAuth is not configured', () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/register', state: { role: 'student' } }]}>
        <Register />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Google Sign-In is currently unavailable/i)).toBeInTheDocument();
    expect(screen.queryByTestId('google-login')).not.toBeInTheDocument();
  });
});
