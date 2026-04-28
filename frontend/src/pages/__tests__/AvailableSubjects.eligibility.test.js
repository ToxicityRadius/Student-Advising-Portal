import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AvailableSubjects from '../AvailableSubjects';
import api from '../../utils/api';

jest.mock('../../utils/api', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

jest.mock('../../components/student/StudentLayout', () => {
  return function MockStudentLayout({ children }) {
    return <div data-testid="student-layout">{children}</div>;
  };
});

jest.mock('../../utils/formatters', () => ({
  formatYearLevel: (value) => `Year ${value}`,
}));

describe('AvailableSubjects prerequisite eligibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('hides available subjects whose prerequisites are not eligible', async () => {
    api.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          semesterSummary: [
            {
              yearLevel: 1,
              semester: 2,
              courses: [
                {
                  code: 'CALC102',
                  name: 'Calculus 2',
                  units: 3,
                  status: 'pending',
                  isEligible: false,
                },
                {
                  code: 'CPE104',
                  name: 'Computer Engineering 104',
                  units: 3,
                  status: 'pending',
                  isEligible: true,
                },
              ],
            },
          ],
        },
      },
    });

    render(<AvailableSubjects />);

    await waitFor(() => {
      expect(screen.getByText('CPE104')).toBeInTheDocument();
    });

    expect(screen.queryByText('CALC102')).not.toBeInTheDocument();
  });
});
