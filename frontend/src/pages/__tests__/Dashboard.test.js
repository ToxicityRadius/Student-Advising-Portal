import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

// Mock dependencies
jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../utils/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));

jest.mock('../../utils/roleRedirect', () => ({
  getHomePathForRole: jest.fn(() => '/dashboard'),
}));

jest.mock('../../utils/formatters', () => ({
  formatYearLevel: jest.fn((y) => `Year ${y}`),
}));

// Mock StudentLayout to avoid its deep dependency tree
jest.mock('../../components/student/StudentLayout', () => {
  return function MockStudentLayout({ children }) {
    return <div data-testid="student-layout">{children}</div>;
  };
});

import Dashboard from '../Dashboard';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const renderDashboard = () =>
  render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      initialEntries={['/dashboard']}
    >
      <Dashboard />
    </MemoryRouter>,
  );

const mockDashboardResponse = (overrides = {}) => ({
  data: {
    success: true,
    data: {
      currentTerm: { semester: 1, schoolYear: '2025-2026' },
      sar: {
        kpis: {
          completedUnits: 60,
          totalUnits: 180,
          gwa: '1.75',
          completedSubjects: 20,
          remainingSubjects: 40,
        },
        semesterSummary: [],
      },
      ...overrides,
    },
  },
});

describe('Dashboard Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({
      user: { id: 1, role: 'student', year_level: 2 },
      loading: false,
    });
  });

  test('shows loading state initially', () => {
    api.get.mockImplementation(() => new Promise(() => {})); // hang
    renderDashboard();

    expect(screen.getByText('Loading dashboard data...')).toBeInTheDocument();
  });

  test('renders dashboard data after successful fetch', async () => {
    api.get.mockResolvedValue(mockDashboardResponse());
    renderDashboard();

    await waitFor(() => {
      expect(screen.queryByText('Loading dashboard data...')).not.toBeInTheDocument();
    });

    // KPI values should be present (rendered as "60 UNITS", "180 UNITS")
    expect(screen.getByText('60 UNITS')).toBeInTheDocument();
    expect(screen.getByText('180 UNITS')).toBeInTheDocument();
  });

  test('shows error state with retry button on API failure', async () => {
    api.get.mockRejectedValue({
      response: { data: { message: 'Server error' } },
    });
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  test('retry button refetches data', async () => {
    api.get
      .mockRejectedValueOnce({ response: { data: { message: 'Server error' } } })
      .mockResolvedValueOnce(mockDashboardResponse());

    const user = userEvent.setup();
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Retry'));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(2);
    });
  });
});
