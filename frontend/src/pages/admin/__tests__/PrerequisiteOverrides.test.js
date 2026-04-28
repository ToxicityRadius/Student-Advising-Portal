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

jest.mock('../../../components/admin/AdminLayout', () => {
  return function MockAdminLayout({ children }) {
    return <div data-testid="admin-layout">{children}</div>;
  };
});

describe('PrerequisiteOverrides admin queue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.get.mockResolvedValue({
      data: {
        data: [
          {
            id: 9,
            status: 'pending',
            yearLevel: 1,
            semester: 2,
            reason: 'Student is too far behind.',
            sar: { studentName: 'Ada Student', studentNumber: '2025-0001' },
            prerequisiteCourse: { code: 'CALC101', name: 'Calculus 1' },
            dependentCourse: { code: 'CALC102', name: 'Calculus 2' },
            requestedByAdviser: { firstName: 'Grace', lastName: 'Adviser' },
          },
        ],
      },
    });
    api.patch.mockResolvedValue({ data: { data: { id: 9, status: 'approved' } } });
  });

  test('approves a pending prerequisite override request', async () => {
    const user = userEvent.setup();
    render(<PrerequisiteOverrides />);

    await waitFor(() => {
      expect(screen.getByText('CALC101')).toBeInTheDocument();
      expect(screen.getByText('CALC102')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Approve/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/prerequisite-overrides/9/decision', {
        status: 'approved',
        decisionNotes: '',
      });
    });
  });
});
