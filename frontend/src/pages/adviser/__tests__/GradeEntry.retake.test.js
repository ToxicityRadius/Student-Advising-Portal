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
    get: jest.fn(),
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
    Curriculum: {
      id: 77,
      name: 'BS CPE Curriculum 2025',
      isActive: true,
    },
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
    api.get.mockResolvedValue({ data: { items: [], meta: { totalItems: 0 } } });
    api.post.mockResolvedValue({ data: { data: { id: 8 } } });
  });

  test('sends retake placement and same-term prerequisite override request during regeneration', async () => {
    const user = userEvent.setup();
    renderGradeEntry();

    expect(screen.getByText('Retake Term')).toBeInTheDocument();
    const retakeTermSelect = screen.getByLabelText('CALC101 retake term');
    expect(retakeTermSelect).toHaveValue('1:2');
    expect(screen.queryByLabelText('CALC101 retake year')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('CALC101 retake semester')).not.toBeInTheDocument();
    expect([...retakeTermSelect.options].map((option) => option.value)).not.toContain('1:1');

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

    const retakeTermSelect = screen.getByLabelText('HIST201 retake term');
    expect(retakeTermSelect).toHaveValue('2:2');
    expect([...retakeTermSelect.options].map((option) => option.value)).not.toContain('2:1');

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
        Curriculum: {
          id: 77,
          name: 'BS CPE Curriculum 2025',
          isActive: true,
        },
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

  test('previews PDF checklist before importing matched grades', async () => {
    const user = userEvent.setup();
    const reload = jest.fn();
    useSarData.mockReturnValue({ ...makeSarData(), reload });
    api.post
      .mockResolvedValueOnce({
        data: {
          data: {
            identity: { studentName: 'Ada Student', studentNumber: '1234567' },
            curriculumTitle: '2023 CURRICULUM FOR BACHELOR OF SCIENCE IN COMPUTER ENGINEERING',
            matchedRows: [{ courseCode: 'CALC101', grade: '2.00', courseName: 'Calculus 1' }],
            unmatchedRows: [{ courseCode: 'UNKNOWN 001', grade: '1.50' }],
            invalidRows: [],
            duplicateRows: [],
            warnings: ['1 course code was not found in the active study plan.'],
            canImport: true,
          },
        },
      })
      .mockResolvedValueOnce({ data: { imported: 1, failed: 1 } });

    renderGradeEntry();

    await user.click(screen.getByRole('button', { name: /Import PDF Checklist/i }));
    await user.upload(
      screen.getByLabelText(/PDF checklist file/i),
      new File(['pdf'], 'checklist.pdf', { type: 'application/pdf' }),
    );
    await user.click(screen.getByRole('button', { name: /Preview PDF/i }));

    await waitFor(() => {
      expect(screen.getAllByText('Ada Student').length).toBeGreaterThan(1);
    });
    expect(screen.getAllByText('CALC101').length).toBeGreaterThan(1);
    expect(screen.getByText('UNKNOWN 001')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Import Matched Grades/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenNthCalledWith(
        1,
        '/sars/42/study-plan/active-version/grades/pdf-preview',
        expect.any(FormData),
        expect.objectContaining({ headers: { 'Content-Type': 'multipart/form-data' } }),
      );
      expect(api.post).toHaveBeenNthCalledWith(
        2,
        '/sars/42/study-plan/active-version/grades/pdf-import',
        expect.any(FormData),
        expect.objectContaining({ headers: { 'Content-Type': 'multipart/form-data' } }),
      );
      expect(reload).toHaveBeenCalled();
    });
  });

  test('requests Program Chair approval instead of regenerating an inactive curriculum SAR', async () => {
    const user = userEvent.setup();
    useSarData.mockReturnValue({
      ...makeSarData(),
      sar: {
        ...makeSarData().sar,
        Curriculum: {
          id: 2018,
          name: 'BS CPE Curriculum 2018',
          isActive: false,
        },
      },
    });
    api.post.mockResolvedValueOnce({ data: { data: { id: 99, status: 'pending' } } });

    renderGradeEntry();

    expect(screen.getByText(/inactive curriculum/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Regenerate Study Plan/i })).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Request Program Chair Approval/i })).toBeEnabled();
    });
    await user.click(screen.getByRole('button', { name: /Request Program Chair Approval/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/sars/42/study-plan/inactive-curriculum-regeneration-request',
        {
          reason:
            'Student is assigned to inactive BS CPE Curriculum 2018 and needs Program Chair approval before regeneration.',
        },
      );
    });
  });

  test('enables regeneration when Program Chair approval is recorded for the inactive curriculum', async () => {
    const user = userEvent.setup();
    useSarData.mockReturnValue({
      ...makeSarData(),
      sar: {
        ...makeSarData().sar,
        Curriculum: {
          id: 2018,
          name: 'BS CPE Curriculum 2018',
          isActive: false,
        },
      },
    });
    api.get.mockResolvedValueOnce({
      data: {
        items: [
          {
            id: 99,
            status: 'approved',
            studentAcademicRecordId: 42,
            studyPlanVersionId: activeVersion.id,
            curriculumId: 2018,
          },
        ],
      },
    });

    renderGradeEntry();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/inactive-curriculum-regeneration-requests', {
        params: {
          studentAcademicRecordId: '42',
          studyPlanVersionId: activeVersion.id,
          pageSize: 5,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        },
      });
    });

    expect(await screen.findByText(/Program Chair approval is recorded/i)).toBeInTheDocument();
    const regenerateButton = screen.getByRole('button', { name: /Regenerate Study Plan/i });
    expect(regenerateButton).not.toBeDisabled();

    await user.click(regenerateButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/sars/42/study-plan/regenerate', {
        retakePlacements: [{ studyPlanCourseId: 101, yearLevel: 1, semester: 2 }],
        prerequisiteOverrideRequests: [],
      });
    });
  });

  test('shows backend retake placement errors from stale or invalid browser state', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValueOnce({
      response: {
        data: {
          code: 'INVALID_RETAKE_PLACEMENT',
          message: 'MATH018 retake must be placed after Year 1 S1.',
        },
      },
    });

    renderGradeEntry();

    await user.click(screen.getByRole('button', { name: /Regenerate Study Plan/i }));

    expect(
      await screen.findByText('MATH018 retake must be placed after Year 1 S1.'),
    ).toBeInTheDocument();
  });
});
