import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RegenerationReview from '../RegenerationReview';
import useSarData from '../../../hooks/useSarData';

jest.mock('../../../hooks/useSarData');

jest.mock('../../../utils/api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

jest.mock('../../../components/adviser/AdviserLayout', () => {
  return function MockAdviserLayout({ children }) {
    return <div data-testid="adviser-layout">{children}</div>;
  };
});

const regeneratedVersion = {
  id: 8,
  versionNumber: 2,
  status: 'draft',
  StudyPlanCourses: [],
};

const previousVersion = {
  id: 7,
  versionNumber: 1,
  status: 'active',
  StudyPlanCourses: [],
};

const failedCourseAnalysis = {
  failedCourses: [
    {
      courseId: 101,
      code: 'MATH 018',
      name: 'Calculus 1',
      grade: '5.00',
      status: 'failed',
      placedAt: { yearLevel: 1, semester: 2 },
      blockedCourses: [
        { courseId: 102, code: 'MATH 019', name: 'Calculus 2', depth: 1 },
        { courseId: 103, code: 'MATH 021', name: 'Differential Equations', depth: 3 },
      ],
      availability: [
        {
          curriculumName: 'BS CPE Curriculum 2018',
          curriculumIsActive: false,
          isAvailable: false,
          unavailableReason: 'Inactive curriculum; no new batch is assumed.',
          yearLevel: 1,
          semester: 1,
        },
      ],
    },
  ],
};

const renderReview = (stateOverrides = {}) =>
  render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: '/adviser/students/42/plan/8/review',
          state: {
            previousVersion,
            regeneratedVersion,
            failedCourseAnalysis,
            ...stateOverrides,
          },
        },
      ]}
    >
      <Routes>
        <Route
          path="/adviser/students/:sarId/plan/:versionId/review"
          element={<RegenerationReview />}
        />
      </Routes>
    </MemoryRouter>,
  );

describe('RegenerationReview failed course analysis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSarData.mockReturnValue({
      sar: {
        id: 42,
        studentName: 'Sample Student',
        studentNumber: '2024-0001',
        Curriculum: { name: 'BS CPE Curriculum 2018' },
      },
      versions: [previousVersion, regeneratedVersion],
      loading: false,
      error: '',
      reload: jest.fn(),
    });
  });

  test('shows inactive curriculum availability as unavailable and excludes it from available semester summary', () => {
    renderReview();

    expect(screen.getAllByText('BS CPE Curriculum 2018').length).toBeGreaterThan(0);
    expect(screen.getByText('Unavailable')).toBeInTheDocument();
    expect(screen.getByText('Inactive curriculum; no new batch is assumed.')).toBeInTheDocument();
    expect(screen.getByText('No available future offering found.')).toBeInTheDocument();
    expect(screen.queryByText(/Available in semester\(s\):/i)).not.toBeInTheDocument();
  });

  test('renders one blocked-course arrow per row and uses spacing for dependency depth', () => {
    const { container } = renderReview();

    const arrowTexts = Array.from(container.querySelectorAll('.text-danger'))
      .map((node) => node.textContent)
      .filter((text) => text === '\u2192' || text?.includes('\u2192\u2192'));

    expect(arrowTexts).toEqual(['\u2192', '\u2192']);
  });

  test('shows on-track graduation pacing when the latest planned term stays within target', () => {
    renderReview({
      graduationPacing: {
        isOnTrack: true,
        targetTerm: { label: 'Year 4 - 2nd Semester' },
        latestPlannedTerm: { label: 'Year 4 - 2nd Semester' },
        termsDelayed: 0,
        delayedCourses: [],
        message: 'Generated plan stays within the curriculum target graduation term.',
      },
    });

    expect(screen.getByText(/Graduation pacing:\s*On track/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Target: Year 4 - 2nd Semester .* Latest planned: Year 4 - 2nd Semester/i),
    ).toBeInTheDocument();
  });

  test('shows delayed graduation pacing with delayed courses', () => {
    renderReview({
      graduationPacing: {
        isOnTrack: false,
        targetTerm: { label: 'Year 4 - 2nd Semester' },
        latestPlannedTerm: { label: 'Year 5 - 1st Semester' },
        termsDelayed: 2,
        delayedCourses: [{ courseId: 201, code: 'CPE 450', name: 'CpE Elective' }],
        message: 'Generated plan is the closest valid placement under current rules.',
      },
    });

    expect(screen.getByText(/Graduation pacing:\s*Delayed/i)).toBeInTheDocument();
    expect(screen.getByText('2 terms delayed')).toBeInTheDocument();
    expect(screen.getByText(/Delayed courses:\s*CPE 450/i)).toBeInTheDocument();
  });

  test('shows curriculum conversion recommendation when returned by the backend', () => {
    renderReview({
      curriculumMigrationRecommendation: {
        curriculumId: 2024,
        curriculumName: 'BS CPE Curriculum 2024',
        estimatedLatestTerm: { label: 'Year 4 - 1st Semester' },
      },
    });

    expect(screen.getByText('Curriculum conversion recommendation')).toBeInTheDocument();
    expect(screen.getByText('BS CPE Curriculum 2024')).toBeInTheDocument();
    expect(screen.getByText(/Estimated latest remaining requirement:/i)).toBeInTheDocument();
  });
});
