import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../utils/googleOAuthConfig', () => ({
  isGoogleOAuthConfigured: true,
}));

jest.mock('../../utils/api', () => ({
  __esModule: true,
  default: { post: jest.fn(), patch: jest.fn(), get: jest.fn() },
}));

jest.mock('jwt-decode', () => ({
  jwtDecode: jest.fn(),
}));

jest.mock('@react-oauth/google', () => ({
  GoogleLogin: ({ onSuccess }) => (
    <button
      data-testid="google-login"
      onClick={() => onSuccess({ credential: 'mock-google-id-token' })}
    >
      Google Sign-In
    </button>
  ),
}));

jest.mock('../../assets/images/bg.png', () => 'bg.png');
jest.mock('../../assets/images/student yellow.png', () => 'student.png');
jest.mock('../../assets/images/teacher yellow.png', () => 'teacher.png');
jest.mock('../../assets/images/STUDENT ADVISING LOGO 1.png', () => 'logo.png');

import Login from '../Login';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { jwtDecode } from 'jwt-decode';

const mockLogin = jest.fn();

describe('Login Page - Google student ID completion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();

    useAuth.mockReturnValue({
      login: mockLogin.mockResolvedValue({
        role: 'student',
        yearLevel: 1,
        curriculum_id: 1,
        student_type: 'regular',
      }),
    });

    jwtDecode.mockReturnValue({
      email: 'newstudent@tip.edu.ph',
      name: 'New Student',
    });
  });

  test('uses the authenticated self-update endpoint for Google student ID submission', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        token: 'app-jwt-token',
        user: {
          id: 17,
          role: 'student',
          studentId: null,
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

    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Login />
      </MemoryRouter>,
    );

    await user.click(screen.getByLabelText('Login as Student'));
    await user.click(screen.getByTestId('google-login'));

    expect(await screen.findByText('Enter Your Student Number')).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();

    await user.type(screen.getByPlaceholderText('e.g. 2100123'), '2310675');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/users/update-student-id',
        {
          studentId: '2310675',
        },
        {
          headers: {
            Authorization: 'Bearer app-jwt-token',
          },
        },
      );
    });

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('app-jwt-token');
    });
  });
});
