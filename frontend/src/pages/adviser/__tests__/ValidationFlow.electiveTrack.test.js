import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ValidationFlow from '../ValidationFlow';
import api from '../../../utils/api';

jest.mock('../../../utils/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

jest.mock('../../../components/adviser/AdviserLayout', () => {
  return function MockAdviserLayout({ children }) {
    return <div data-testid="adviser-layout">{children}</div>;
  };
});

jest.mock('../../../components/adviser/ElectiveTrackSelector', () => {
  return function MockElectiveTrackSelector() {
    return <div data-testid="elective-track-selector" />;
  };
});

const sar = {
  id: 42,
  yearLevel: 3,
  curriculumId: 10,
  electiveTrackId: null,
  studentName: 'Sample Student',
  studentNumber: '2024-0001',
  Curriculum: { name: 'BS CPE Curriculum 2025' },
};

const renderValidationFlow = async (studyPlanCourses) => {
  api.get.mockImplementation((url) => {
    if (url === '/sars/42') {
      return Promise.resolve({ data: { data: sar } });
    }
    if (url === '/sars/42/study-plan/versions') {
      return Promise.resolve({
        data: {
          data: [
            {
              id: 8,
              versionNumber: 2,
              status: 'draft',
              StudyPlanCourses: studyPlanCourses,
            },
          ],
        },
      });
    }
    if (url === '/terms/current') {
      return Promise.resolve({ data: { data: { schoolYear: '2025-2026', semester: 2 } } });
    }
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });

  render(
    <MemoryRouter initialEntries={['/adviser/students/42/validate/8']}>
      <Routes>
        <Route path="/adviser/students/:sarId/validate/:versionId" element={<ValidationFlow />} />
      </Routes>
    </MemoryRouter>,
  );

  await waitFor(() => {
    expect(screen.getByText('Sample Student')).toBeInTheDocument();
  });
};

describe('ValidationFlow elective track readiness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('does not show blocking elective track warning before checkpoint courses are finished', async () => {
    await renderValidationFlow([
      { id: 1, courseId: 1, yearLevel: 1, semester: 1, status: 'passed' },
      { id: 2, courseId: 2, yearLevel: 2, semester: 2, status: 'pending' },
    ]);

    expect(
      screen.queryByText(/Select an elective track before validating/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('elective-track-selector')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Validate Plan/i })).not.toBeDisabled();
  });

  test('shows elective track selector after checkpoint courses are finished', async () => {
    await renderValidationFlow([
      { id: 1, courseId: 1, yearLevel: 1, semester: 1, status: 'passed' },
      { id: 2, courseId: 2, yearLevel: 2, semester: 2, status: 'failed' },
    ]);

    expect(screen.getByText(/Select an elective track before validating/i)).toBeInTheDocument();
    expect(screen.getByTestId('elective-track-selector')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Validate Plan/i })).toBeDisabled();
  });
});
