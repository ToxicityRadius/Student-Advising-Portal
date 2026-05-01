import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import AdminDashboard from '../AdminDashboard';
import api from '../../../utils/api';
import { useAuth } from '../../../context/AuthContext';

jest.mock('../../../utils/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

jest.mock('../../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../../components/admin/AdminLayout', () => {
  return function MockAdminLayout({ children, activePage }) {
    return <div data-active-page={activePage}>{children}</div>;
  };
});

const programs = [
  { id: 8, code: 'BSCPE', name: 'Computer Engineering' },
  { id: 9, code: 'BSIT', name: 'Information Technology' },
];

const summary = {
  currentTerm: {
    id: 3,
    schoolYear: '2025-2026',
    semesterLabel: '1st Semester',
    program: { code: 'BSCPE' },
  },
  termManagement: {
    currentTerm: {
      id: 3,
      schoolYear: '2025-2026',
      semesterLabel: '1st Semester',
      program: { code: 'BSCPE' },
    },
  },
  curriculumHealth: {
    totalSARs: 24,
    pendingOverrideCount: 3,
    revalidationCount: 2,
    totalCurriculums: 4,
    activeCurriculumCount: 1,
    totalCourses: 120,
    totalEquivalencies: 5,
    totalElectiveTracks: 3,
  },
  forecastSnapshotPreview: {
    schoolYear: '2025-2026',
    semesterLabel: '2nd Semester',
    currentDemandCount: 10,
    nextSemesterForecastCount: 11,
    program: { code: 'BSCPE' },
  },
  quickActions: [{ key: 'users', label: 'Manage Users', path: '/admin/users' }],
  adviserWorkload: [
    { id: 5, name: 'Grace Adviser', email: 'grace@tip.edu.ph', assignedStudents: 6 },
  ],
  recentActivity: [
    {
      id: 1,
      action: 'sar.created',
      resourceLabel: 'Ada Student',
      createdAt: '2026-01-01T00:00:00.000Z',
      Actor: { firstName: 'Chair', lastName: 'Person' },
      Program: { code: 'BSCPE' },
    },
  ],
};

const renderDashboard = (user = { id: 1, role: 'superadmin' }) => {
  useAuth.mockReturnValue({ user });
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AdminDashboard />
    </MemoryRouter>,
  );
};

describe('AdminDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url === '/programs') return Promise.resolve({ data: { data: programs } });
      if (url === '/dashboard/summary') return Promise.resolve({ data: { data: summary } });
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
  });

  test('renders Super Admin all-program controls, dashboard cards, quick actions, and recent activity', async () => {
    renderDashboard();

    expect(await screen.findByText('Operations Dashboard')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'All Programs' })).toBeInTheDocument();
    expect(screen.getByText('Student Records')).toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument();
    expect(screen.getByText('Pending Overrides')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Manage Users' })).toHaveAttribute(
      'href',
      '/admin/users',
    );
    expect(screen.getByText('Grace Adviser')).toBeInTheDocument();
    expect(screen.getByText('Ada Student by Chair Person')).toBeInTheDocument();

    expect(api.get).toHaveBeenCalledWith('/dashboard/summary', { params: {} });
  });

  test('Program Chair defaults to an assigned program and cannot select all programs', async () => {
    renderDashboard({ id: 2, role: 'admin' });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/dashboard/summary', {
        params: { programId: '8' },
      });
    });

    expect(screen.queryByRole('option', { name: 'All Programs' })).not.toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'BSCPE - Computer Engineering' }),
    ).toBeInTheDocument();
  });

  test('reloads summary when Super Admin changes the selected program', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await screen.findByRole('option', { name: 'BSIT - Information Technology' });
    await user.selectOptions(screen.getByLabelText('Dashboard program filter'), '9');

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/dashboard/summary', {
        params: { programId: '9' },
      });
    });
  });
});
