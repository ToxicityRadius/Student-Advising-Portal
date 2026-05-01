import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import AdviserDashboard from '../AdviserDashboard';
import api from '../../../utils/api';

jest.mock('../../../utils/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 7, role: 'adviser' } }),
}));

jest.mock('../../../components/adviser/AdviserLayout', () => {
  return function MockAdviserLayout({ children, activePage }) {
    return <div data-active-page={activePage}>{children}</div>;
  };
});

const programs = [{ id: 8, code: 'BSCPE', name: 'Computer Engineering' }];

const summary = {
  totalSARs: 40,
  myAssignedStudents: 12,
  myCreatedSARs: 7,
  pendingOverrideCount: 2,
  studentsNeedingReview: 5,
  prerequisiteRiskCount: 4,
  quickActions: [
    { key: 'assigned', label: 'Assigned to Me', path: '/adviser/students?scope=assigned' },
  ],
  recentStudents: [
    {
      id: 42,
      studentName: 'Ada Student',
      studentNumber: '2025-0001',
      yearLevel: 2,
      curriculumName: 'BSCPE 2025',
    },
  ],
  recentActivity: [
    {
      id: 1,
      action: 'grade.entered',
      resourceLabel: 'Ada Student',
      createdAt: '2026-01-01T00:00:00.000Z',
      Actor: { firstName: 'Grace', lastName: 'Adviser' },
    },
  ],
};

describe('AdviserDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url === '/programs') return Promise.resolve({ data: { data: programs } });
      if (url === '/dashboard/summary') return Promise.resolve({ data: { data: summary } });
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
  });

  test('renders program-scoped adviser metrics, quick actions, recent SARs, and activity', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AdviserDashboard />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Adviser Dashboard')).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'All Programs' })).not.toBeInTheDocument();
    expect(screen.getByText('Total SARs')).toBeInTheDocument();
    expect(screen.getByText('40')).toBeInTheDocument();
    expect(screen.getAllByText('Assigned to Me').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Ada Student' })).toHaveAttribute(
      'href',
      '/adviser/students/42',
    );
    expect(screen.getByText('Ada Student by Grace Adviser')).toBeInTheDocument();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/dashboard/summary', {
        params: { programId: '8' },
      });
    });
  });

  test('reloads adviser summary with a selected program filter', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AdviserDashboard />
      </MemoryRouter>,
    );

    await screen.findByRole('option', { name: 'BSCPE - Computer Engineering' });
    await user.selectOptions(screen.getByLabelText('Adviser dashboard program filter'), '8');

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/dashboard/summary', {
        params: { programId: '8' },
      });
    });
  });
});
