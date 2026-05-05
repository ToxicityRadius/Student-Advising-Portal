import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import PrerequisiteOverrides from '../PrerequisiteOverrides';
import api from '../../../utils/api';

jest.mock('../../../utils/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 3, role: 'admin' } }),
}));

jest.mock('../../../components/admin/AdminLayout', () => {
  return function MockAdminLayout({ children }) {
    return <div data-testid="admin-layout">{children}</div>;
  };
});

jest.mock('../../../components/PaginationControls', () => {
  return function MockPaginationControls() {
    return <div data-testid="pagination-controls" />;
  };
});

const makeOverrideItem = (overrides = {}) => ({
  id: 9,
  status: 'pending',
  yearLevel: 1,
  semester: 2,
  reason: 'Student is too far behind.',
  sar: { studentName: 'Ada Student', studentNumber: '2025-0001' },
  program: { code: 'BSCPE' },
  prerequisiteCourse: { code: 'CALC101', name: 'Calculus 1' },
  dependentCourse: { code: 'CALC102', name: 'Calculus 2' },
  requestedByAdviser: { firstName: 'Grace', lastName: 'Adviser' },
  decidedByAdmin: null,
  decidedAt: null,
  decisionNotes: null,
  ...overrides,
});

const makePaginatedResponse = (items = [makeOverrideItem()]) => ({
  data: {
    items,
    meta: { page: 1, pageSize: 10, totalItems: items.length, totalPages: 1 },
  },
});

const makeInactiveRequestItem = (overrides = {}) => ({
  id: 14,
  status: 'pending',
  reason: 'Inactive curriculum regeneration needs chair approval.',
  sar: { studentName: 'Ada Student', studentNumber: '2025-0001' },
  program: { code: 'BSCPE' },
  curriculum: { name: 'BS CPE Curriculum 2018' },
  studyPlanVersion: { versionNumber: 1, status: 'active' },
  requestedByAdviser: { firstName: 'Grace', lastName: 'Adviser' },
  decidedByAdmin: null,
  decidedAt: null,
  decisionNotes: null,
  ...overrides,
});

describe('PrerequisiteOverrides admin queue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.history.pushState({}, '', '/');
    api.get.mockImplementation((url) => {
      if (url === '/programs') return Promise.resolve({ data: { data: [] } });
      if (url === '/inactive-curriculum-regeneration-requests') {
        return Promise.resolve(makePaginatedResponse([]));
      }
      return Promise.resolve(makePaginatedResponse());
    });
    api.patch.mockResolvedValue({ data: { data: { id: 9, status: 'approved' } } });
  });

  test('renders search box, program filter, and sort controls', async () => {
    render(<PrerequisiteOverrides />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search students/i)).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: /all programs/i })).not.toBeInTheDocument();
      expect(screen.getByRole('option', { name: /newest/i })).toBeInTheDocument();
    });
  });

  test('shows paginated student and course data from meta payload', async () => {
    render(<PrerequisiteOverrides />);

    await waitFor(() => {
      expect(screen.getByText('CALC101')).toBeInTheDocument();
      expect(screen.getByText('CALC102')).toBeInTheDocument();
      expect(screen.getByText('Ada Student')).toBeInTheDocument();
      // paginated count in badge
      expect(screen.getByText(/1 requests/i)).toBeInTheDocument();
    });

    // pagination controls mounted
    expect(screen.getByTestId('pagination-controls')).toBeInTheDocument();
  });

  test('renders program code from the override context', async () => {
    render(<PrerequisiteOverrides />);
    await waitFor(() => {
      expect(screen.getByText('BSCPE')).toBeInTheDocument();
    });
  });

  test('shows Pending in decision column for pending requests', async () => {
    render(<PrerequisiteOverrides />);
    await waitFor(() => {
      expect(screen.getAllByText('Pending').length).toBeGreaterThan(0);
    });
  });

  test('shows decision actor name and date for decided requests', async () => {
    const decided = makeOverrideItem({
      status: 'approved',
      decidedByAdmin: { firstName: 'Chair', lastName: 'Person', email: 'chair@uni.edu' },
      decidedAt: '2025-01-15T00:00:00.000Z',
      decisionNotes: 'Approved per committee.',
    });
    api.get.mockImplementation((url) => {
      if (url === '/programs') return Promise.resolve({ data: { data: [] } });
      return Promise.resolve(makePaginatedResponse([decided]));
    });

    render(<PrerequisiteOverrides />);
    await waitFor(() => {
      expect(screen.getByText('Chair Person')).toBeInTheDocument();
    });
  });

  test('approves a pending prerequisite override request', async () => {
    const user = userEvent.setup();
    render(<PrerequisiteOverrides />);

    await waitFor(() => {
      expect(screen.getByText('CALC101')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Approve/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/prerequisite-overrides/9/decision', {
        status: 'approved',
        decisionNotes: '',
      });
    });
  });

  test('reviews and approves inactive curriculum regeneration requests', async () => {
    const user = userEvent.setup();
    api.get.mockImplementation((url) => {
      if (url === '/programs') return Promise.resolve({ data: { data: [] } });
      if (url === '/inactive-curriculum-regeneration-requests') {
        return Promise.resolve(makePaginatedResponse([makeInactiveRequestItem()]));
      }
      return Promise.resolve(makePaginatedResponse());
    });

    render(<PrerequisiteOverrides />);

    await user.click(await screen.findByRole('tab', { name: /Inactive Curriculum/i }));

    await waitFor(() => {
      expect(screen.getByText('BS CPE Curriculum 2018')).toBeInTheDocument();
      expect(
        screen.getByText(/inactive curriculum regeneration needs chair approval/i),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Approve/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/inactive-curriculum-regeneration-requests/14/decision',
        {
          status: 'approved',
          decisionNotes: '',
        },
      );
    });
  });

  test('opens inactive approval queue from notification query parameters', async () => {
    window.history.pushState(
      {},
      '',
      '/admin/prerequisite-overrides?queue=inactive&status=approved',
    );
    api.get.mockImplementation((url) => {
      if (url === '/programs') return Promise.resolve({ data: { data: [] } });
      if (url === '/inactive-curriculum-regeneration-requests') {
        return Promise.resolve(
          makePaginatedResponse([makeInactiveRequestItem({ status: 'approved' })]),
        );
      }
      return Promise.resolve(makePaginatedResponse([]));
    });

    render(<PrerequisiteOverrides />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Inactive Curriculum/i })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      expect(screen.getByText('BS CPE Curriculum 2018')).toBeInTheDocument();
    });
    expect(api.get).toHaveBeenCalledWith(
      '/inactive-curriculum-regeneration-requests',
      expect.objectContaining({
        params: expect.objectContaining({ status: 'approved' }),
      }),
    );
  });
});
