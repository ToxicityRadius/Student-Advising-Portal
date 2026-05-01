import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import GradeEntry from '../GradeEntry';
import api from '../../../utils/api';
import useSarData from '../../../hooks/useSarData';

jest.mock('../../../utils/api', () => ({
  __esModule: true,
  default: {
    put: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock('../../../hooks/useSarData');

jest.mock('../../../components/adviser/AdviserLayout', () => {
  return function MockAdviserLayout({ children }) {
    return <div data-testid="adviser-layout">{children}</div>;
  };
});

const activeVersion = {
  id: 7,
  versionNumber: 1,
  status: 'active',
  StudyPlanCourses: [
    {
      id: 101,
      courseId: 1,
      yearLevel: 1,
      semester: 1,
      grade: '5.00',
      status: 'failed',
      Course: { id: 1, code: 'CALC101', name: 'Calculus 1', units: 3 },
    },
    {
      id: 102,
      courseId: 2,
      yearLevel: 1,
      semester: 2,
      grade: null,
      status: 'pending',
      Course: { id: 2, code: 'CALC102', name: 'Calculus 2', units: 3 },
    },
  ],
};

const makeSarData = (version = activeVersion) => ({
  sar: {
    id: 42,
    studentName: 'Ada Student',
    analytics: {
      prerequisiteChecking: {
        subjects: [
          {
            courseId: 2,
            code: 'CALC102',
            prerequisites: [{ courseId: 1, code: 'CALC101', name: 'Calculus 1' }],
          },
        ],
      },
    },
  },
  versions: [version],
  loading: false,
  error: '',
  reload: jest.fn(),
});

const renderGradeEntry = () =>
  render(
    <MemoryRouter initialEntries={['/adviser/students/42/grades']}>
      <Routes>
        <Route path="/adviser/students/:sarId/grades" element={<GradeEntry />} />
      </Routes>
    </MemoryRouter>,
  );

describe('GradeEntry retake placement and override request', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSarData.mockReturnValue(makeSarData());
    api.post.mockResolvedValue({ data: { data: { id: 8 } } });
  });

  test('sends retake placement and same-term prerequisite override request during regeneration', async () => {
    const user = userEvent.setup();
    renderGradeEntry();

    expect(screen.getByText('Retake Term')).toBeInTheDocument();
    expect(screen.getByLabelText('CALC101 retake year')).toHaveValue('1');
    expect(screen.getByLabelText('CALC101 retake semester')).toHaveValue('2');

    await user.click(screen.getByLabelText('Request same-term override with CALC102'));
    await user.type(
      screen.getByLabelText('Reason for CALC101 and CALC102 override'),
      'Student is too far behind and needs concurrent enrollment.',
    );
    await user.click(screen.getByRole('button', { name: /Regenerate Study Plan/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/sars/42/study-plan/regenerate', {
        retakePlacements: [{ studyPlanCourseId: 101, yearLevel: 1, semester: 2 }],
        prerequisiteOverrideRequests: [
          {
            prerequisiteCourseId: 1,
            dependentCourseId: 2,
            yearLevel: 1,
            semester: 2,
            reason: 'Student is too far behind and needs concurrent enrollment.',
          },
        ],
      });
    });
  });

  test('does not offer regeneration when the only unresolved grade is incomplete', () => {
    useSarData.mockReturnValue(
      makeSarData({
        id: 7,
        versionNumber: 1,
        status: 'active',
        StudyPlanCourses: [
          {
            id: 201,
            courseId: 3,
            yearLevel: 1,
            semester: 1,
            grade: '4.00',
            status: 'incomplete',
            Course: { id: 3, code: 'ENG101', name: 'English 1', units: 3 },
          },
        ],
      }),
    );

    renderGradeEntry();

    expect(screen.getByText('Incomplete')).toBeInTheDocument();
    expect(screen.getByText('Not required')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Regenerate Study Plan/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Awaiting grade completion/i })).toBeDisabled();
  });

  test('sends retake placement for officially dropped grades during regeneration', async () => {
    const user = userEvent.setup();
    useSarData.mockReturnValue(
      makeSarData({
        id: 7,
        versionNumber: 1,
        status: 'active',
        StudyPlanCourses: [
          {
            id: 301,
            courseId: 4,
            yearLevel: 2,
            semester: 1,
            grade: '6.00',
            status: 'officially_dropped',
            Course: { id: 4, code: 'HIST201', name: 'History 2', units: 3 },
          },
        ],
      }),
    );

    renderGradeEntry();

    expect(screen.getByLabelText('HIST201 retake year')).toHaveValue('2');
    expect(screen.getByLabelText('HIST201 retake semester')).toHaveValue('2');

    await user.click(screen.getByRole('button', { name: /Regenerate Study Plan/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/sars/42/study-plan/regenerate', {
        retakePlacements: [{ studyPlanCourseId: 301, yearLevel: 2, semester: 2 }],
        prerequisiteOverrideRequests: [],
      });
    });
  });

  test('allows regeneration after completed passing grades when future courses are still pending', async () => {
    const user = userEvent.setup();
    useSarData.mockReturnValue({
      sar: {
        id: 42,
        studentName: 'Ada Student',
        analytics: {
          prerequisiteChecking: {
            subjects: [],
          },
        },
      },
      versions: [
        {
          ...activeVersion,
          StudyPlanCourses: [
            {
              ...activeVersion.StudyPlanCourses[0],
              grade: '2.00',
              status: 'passed',
            },
            {
              ...activeVersion.StudyPlanCourses[1],
              grade: null,
              status: 'pending',
            },
          ],
        },
      ],
      loading: false,
      error: '',
      reload: jest.fn(),
    });

    renderGradeEntry();

    await user.click(screen.getByRole('button', { name: /Regenerate Study Plan/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/sars/42/study-plan/regenerate', {
        retakePlacements: [],
        prerequisiteOverrideRequests: [],
      });
    });
  });
});
