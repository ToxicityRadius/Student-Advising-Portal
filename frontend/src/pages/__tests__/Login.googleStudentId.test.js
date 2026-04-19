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

const mockRefreshUser = jest.fn();

describe('Login Page - Google student ID completion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();

    useAuth.mockReturnValue({
      refreshUser: mockRefreshUser.mockResolvedValue({
        role: 'student',
        yearLevel: 1,
        curriculum_id: 1,
        student_type: 'regular',
        sex: 'Male',
      }),
      setUser: jest.fn(),
    });

    jwtDecode.mockReturnValue({
      email: 'newstudent@tip.edu.ph',
      name: 'New Student',
    });
  });

  test('uses the authenticated self-update endpoint for Google student ID submission', async () => {
    api.post.mockResolvedValueOnce({
      data: {
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
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        initialEntries={['/login']}
      >
        <Login />
      </MemoryRouter>,
    );

    await user.click(screen.getByLabelText('Login as Student'));
    await user.click(screen.getByTestId('google-login'));

    expect(await screen.findByText('Enter Your Student Number')).toBeInTheDocument();
    expect(mockRefreshUser).not.toHaveBeenCalled();

    await user.type(screen.getByPlaceholderText('e.g. 2100123'), '2310675');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/users/update-student-id', {
        studentId: '2310675',
      });
    });

    await waitFor(() => {
      expect(mockRefreshUser).toHaveBeenCalledTimes(1);
    });
  });

  test('opens academic onboarding when sex is missing and persists onboarding payload', async () => {
    mockRefreshUser.mockReset();
    mockRefreshUser
      .mockResolvedValueOnce({
        role: 'student',
        yearLevel: 2,
        curriculum_id: 1,
        student_type: 'regular',
        sex: null,
      })
      .mockResolvedValueOnce({
        role: 'student',
        yearLevel: 2,
        curriculum_id: 1,
        student_type: 'regular',
        sex: 'Male',
      });

    api.post.mockResolvedValueOnce({
      data: {
        user: {
          id: 17,
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

    api.post.mockResolvedValueOnce({
      data: {
        success: true,
        user: {
          id: 17,
          current_year_level: 2,
          curriculum_id: 1,
          student_type: 'regular',
          sex: 'Male',
        },
      },
    });

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
    await user.click(screen.getByTestId('google-login'));

    expect(await screen.findByText('Complete Your Academic Profile')).toBeInTheDocument();

    const yearLevelSelect = document.querySelector('select[name="year_level"]');
    const programSelect = document.querySelector('select[name="program"]');
    const curriculumSelect = document.querySelector('select[name="curriculum_id"]');
    const studentTypeSelect = document.querySelector('select[name="student_type"]');
    const sexSelect = document.querySelector('select[name="sex"]');

    await user.selectOptions(yearLevelSelect, '2');
    await user.selectOptions(programSelect, 'BSCpE');
    await user.selectOptions(curriculumSelect, '1');
    await user.selectOptions(studentTypeSelect, 'regular');
    await user.selectOptions(sexSelect, 'Male');

    await user.click(screen.getByRole('button', { name: /save & continue/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/users/onboard', {
        current_year_level: 2,
        program: 'BSCpE',
        curriculum_id: 1,
        student_type: 'regular',
        sex: 'Male',
      });
    });

    await waitFor(() => {
      expect(mockRefreshUser).toHaveBeenCalledTimes(2);
    });
  });
});
