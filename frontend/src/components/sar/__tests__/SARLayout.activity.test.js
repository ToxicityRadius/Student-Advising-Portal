import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import SARLayout from '../SARLayout';
import api from '../../../utils/api';

jest.mock('../../../utils/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

jest.mock('../../adviser/ElectiveTrackSelector', () => {
  return function MockElectiveTrackSelector() {
    return <div data-testid="elective-track-selector" />;
  };
});

const sar = {
  id: 42,
  programId: 9,
  studentName: 'Ada Student',
  studentNumber: '2025-0001',
  email: 'ada@tip.edu.ph',
  yearLevel: 2,
  curriculumId: 3,
  electiveTrackId: 4,
  Student: {},
  Curriculum: { name: 'BSCPE 2025' },
  ElectiveTrack: { name: 'Systems' },
  analytics: {
    tags: {},
    progress: {
      completionPercentage: 0,
      completedSubjects: 0,
      totalSubjects: 0,
      completedUnits: 0,
      totalUnits: 0,
    },
    gpaMonitoring: {},
    prerequisiteChecking: {
      metSubjects: 0,
      unmetSubjects: 0,
      totalRules: 0,
      subjects: [],
    },
    curriculumChecklistOverview: {
      totalSubjects: 0,
      completedSubjects: 0,
      remainingSubjects: 0,
      items: [],
    },
  },
};

describe('SARLayout Activity tab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.patch.mockResolvedValue({ data: { success: true } });
    api.get.mockImplementation((url) => {
      if (url === '/terms') {
        return Promise.resolve({
          data: { items: [{ id: 1, schoolYear: '2025-2026', semester: 1, isCurrent: true }] },
        });
      }
      if (url === '/activity') {
        return Promise.resolve({
          data: {
            items: [
              {
                id: 1,
                action: 'sar.updated',
                resourceLabel: 'Ada Student',
                createdAt: '2026-01-01T00:00:00.000Z',
                Actor: { firstName: 'Grace', lastName: 'Adviser' },
              },
            ],
          },
        });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
  });

  test('fetches and renders SAR-scoped activity for Super Admin, Program Chair, or Adviser views', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <SARLayout sar={sar} role="superadmin" sarId="42" />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/activity', {
        params: { resourceType: 'sar', resourceId: '42', pageSize: 50 },
      });
    });

    await user.click(screen.getByRole('tab', { name: 'Activity' }));

    expect(screen.getByText('SAR Activity Timeline')).toBeInTheDocument();
    expect(screen.getByText('Ada Student by Grace Adviser')).toBeInTheDocument();
  });

  test('does not show the Activity tab in student view', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <SARLayout sar={sar} role="student" sarId="42" />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('tab', { name: 'Activity' })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(api.get).not.toHaveBeenCalledWith('/activity', expect.anything());
    });
  });

  test('shows advisers the current term without exposing the admin-only activation selector', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <SARLayout sar={sar} role="adviser" sarId="42" />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/terms', {
        params: {
          pageSize: 100,
          sortBy: 'schoolYear',
          sortOrder: 'DESC',
          programId: 9,
        },
      });
    });

    await user.click(screen.getByRole('tab', { name: 'Progress Summary' }));

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByText('2025-2026 1st Semester')).toBeInTheDocument();
    expect(api.patch).not.toHaveBeenCalled();
  });
});
