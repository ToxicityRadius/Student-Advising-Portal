// sarAnalytics exports: computeSarAnalytics, inferSubjectStatus, semesterLabel
// We test the publicly-exported helpers plus internal helpers exposed via the module.
// computeSarAnalytics is very large — we test it through a minimal integration scenario.

// Need to access internal helpers that aren't exported — re-read via rewire or test through public API.
// The module only exports { computeSarAnalytics, inferSubjectStatus, semesterLabel }.

const { computeSarAnalytics, inferSubjectStatus, semesterLabel } = require('../utils/sarAnalytics');

describe('sarAnalytics', () => {
  // ---- semesterLabel ----

  describe('semesterLabel', () => {
    test('returns "1st Semester" for 1', () => {
      expect(semesterLabel(1)).toBe('1st Semester');
    });

    test('returns "2nd Semester" for 2', () => {
      expect(semesterLabel(2)).toBe('2nd Semester');
    });

    test('returns "Summer" for 3', () => {
      expect(semesterLabel(3)).toBe('Summer');
    });

    test('returns fallback for unknown', () => {
      expect(semesterLabel(4)).toBe('Semester 4');
    });

    test('handles string input', () => {
      expect(semesterLabel('1')).toBe('1st Semester');
    });

    test('handles null', () => {
      expect(semesterLabel(null)).toBe('Semester null');
    });
  });

  // ---- inferSubjectStatus ----

  describe('inferSubjectStatus', () => {
    const base = {
      rawStatus: '',
      grade: null,
      yearLevel: 1,
      semester: 1,
      currentYearLevel: 2,
      currentSemester: 1,
    };

    test('returns "completed" for passed status', () => {
      expect(inferSubjectStatus({ ...base, rawStatus: 'passed', grade: '1.5' })).toBe('completed');
    });

    test('returns "credited" for passed with credited grade', () => {
      expect(inferSubjectStatus({ ...base, rawStatus: 'passed', grade: 'credited' })).toBe(
        'credited',
      );
    });

    test('returns "failed" for failed status', () => {
      expect(inferSubjectStatus({ ...base, rawStatus: 'failed' })).toBe('failed');
    });

    test('returns "dropped" for dropped status', () => {
      expect(inferSubjectStatus({ ...base, rawStatus: 'dropped' })).toBe('dropped');
    });

    test('returns "incomplete" for incomplete status', () => {
      expect(inferSubjectStatus({ ...base, rawStatus: 'incomplete' })).toBe('incomplete');
    });

    test('returns "not yet taken" for future semester', () => {
      expect(
        inferSubjectStatus({
          rawStatus: '',
          grade: null,
          yearLevel: 3,
          semester: 1,
          currentYearLevel: 2,
          currentSemester: 1,
        }),
      ).toBe('not yet taken');
    });

    test('returns "not yet taken" for later semester same year', () => {
      expect(
        inferSubjectStatus({
          rawStatus: '',
          grade: null,
          yearLevel: 2,
          semester: 2,
          currentYearLevel: 2,
          currentSemester: 1,
        }),
      ).toBe('not yet taken');
    });

    test('returns "ongoing" for current semester', () => {
      expect(
        inferSubjectStatus({
          rawStatus: '',
          grade: null,
          yearLevel: 2,
          semester: 1,
          currentYearLevel: 2,
          currentSemester: 1,
        }),
      ).toBe('ongoing');
    });

    test('returns "pending" for past semester with no status', () => {
      expect(
        inferSubjectStatus({
          rawStatus: '',
          grade: null,
          yearLevel: 1,
          semester: 1,
          currentYearLevel: 2,
          currentSemester: 1,
        }),
      ).toBe('pending');
    });

    test('is case-insensitive for rawStatus', () => {
      expect(inferSubjectStatus({ ...base, rawStatus: 'PASSED', grade: '1.0' })).toBe('completed');
    });

    test('is case-insensitive for credited grade', () => {
      expect(inferSubjectStatus({ ...base, rawStatus: 'Passed', grade: 'Credited' })).toBe(
        'credited',
      );
    });
  });

  // ---- computeSarAnalytics (integration) ----

  describe('computeSarAnalytics', () => {
    test('returns full analytics with empty inputs', () => {
      const result = computeSarAnalytics({
        sar: null,
        studyPlanVersions: [],
        activeStudyPlanVersion: null,
        curriculumCourses: [],
        prerequisites: [],
        currentTerm: { schoolYear: '2024-2025', semester: 1 },
        electiveTrackCourses: [],
        allCurriculumTrackCourses: [],
      });

      expect(result).toHaveProperty('tags');
      expect(result).toHaveProperty('progress');
      expect(result).toHaveProperty('gpaMonitoring');
      expect(result).toHaveProperty('statusCounters');
      expect(result).toHaveProperty('curriculumChecklistOverview');
      expect(result).toHaveProperty('remainingSemestersTracking');
      expect(result).toHaveProperty('estimatedGraduationDate');
      expect(result.progress.totalUnits).toBe(0);
      expect(result.progress.completedUnits).toBe(0);
      expect(result.curriculumChecklistOverview.items).toEqual([]);
    });

    test('computes progress with curriculum courses', () => {
      const curriculumCourses = [
        {
          courseId: 1,
          yearLevel: 1,
          semester: 1,
          isElective: false,
          Course: { id: 1, code: 'CS101', name: 'Intro to CS', units: 3 },
        },
        {
          courseId: 2,
          yearLevel: 1,
          semester: 1,
          isElective: false,
          Course: { id: 2, code: 'MATH101', name: 'Calculus I', units: 3 },
        },
      ];

      const versions = [
        {
          versionNumber: 1,
          status: 'active',
          StudyPlanCourses: [
            {
              courseId: 1,
              status: 'passed',
              grade: '1.5',
              yearLevel: 1,
              semester: 1,
              Course: curriculumCourses[0].Course,
            },
            {
              courseId: 2,
              status: '',
              grade: null,
              yearLevel: 1,
              semester: 1,
              Course: curriculumCourses[1].Course,
            },
          ],
        },
      ];

      const result = computeSarAnalytics({
        sar: { yearLevel: 1 },
        studyPlanVersions: versions,
        activeStudyPlanVersion: versions[0],
        curriculumCourses,
        prerequisites: [],
        currentTerm: { schoolYear: '2024-2025', semester: 1 },
        electiveTrackCourses: [],
        allCurriculumTrackCourses: [],
      });

      expect(result.progress.totalUnits).toBe(6);
      expect(result.progress.completedUnits).toBe(3);
      expect(result.progress.completionPercentage).toBe(50);
      expect(result.curriculumChecklistOverview.totalSubjects).toBe(2);
      expect(result.curriculumChecklistOverview.completedSubjects).toBe(1);
    });

    test('computes GWA correctly', () => {
      const courses = [
        {
          courseId: 1,
          yearLevel: 1,
          semester: 1,
          isElective: false,
          Course: { id: 1, code: 'A', name: 'A', units: 3 },
        },
        {
          courseId: 2,
          yearLevel: 1,
          semester: 1,
          isElective: false,
          Course: { id: 2, code: 'B', name: 'B', units: 3 },
        },
      ];

      const versions = [
        {
          versionNumber: 1,
          status: 'active',
          StudyPlanCourses: [
            {
              courseId: 1,
              status: 'passed',
              grade: '1.0',
              yearLevel: 1,
              semester: 1,
              Course: courses[0].Course,
            },
            {
              courseId: 2,
              status: 'passed',
              grade: '2.0',
              yearLevel: 1,
              semester: 1,
              Course: courses[1].Course,
            },
          ],
        },
      ];

      const result = computeSarAnalytics({
        sar: { yearLevel: 2 },
        studyPlanVersions: versions,
        activeStudyPlanVersion: versions[0],
        curriculumCourses: courses,
        prerequisites: [],
        currentTerm: { schoolYear: '2024-2025', semester: 1 },
        electiveTrackCourses: [],
        allCurriculumTrackCourses: [],
      });

      // GWA = (1.0*3 + 2.0*3) / (3+3) = 9/6 = 1.5
      expect(result.gpaMonitoring.gwa).toBe(1.5);
    });

    test('GWA includes failed (5.00) courses weighted by units', () => {
      const courses = [
        {
          courseId: 1,
          yearLevel: 1,
          semester: 1,
          isElective: false,
          Course: { id: 1, code: 'A', name: 'A', units: 3 },
        },
        {
          courseId: 2,
          yearLevel: 1,
          semester: 1,
          isElective: false,
          Course: { id: 2, code: 'B', name: 'B', units: 3 },
        },
      ];
      const versions = [
        {
          versionNumber: 1,
          status: 'active',
          StudyPlanCourses: [
            {
              courseId: 1,
              status: 'passed',
              grade: '1.00',
              yearLevel: 1,
              semester: 1,
              Course: courses[0].Course,
            },
            {
              courseId: 2,
              status: 'failed',
              grade: '5.00',
              yearLevel: 1,
              semester: 1,
              Course: courses[1].Course,
            },
          ],
        },
      ];
      const result = computeSarAnalytics({
        sar: { yearLevel: 2 },
        studyPlanVersions: versions,
        activeStudyPlanVersion: versions[0],
        curriculumCourses: courses,
        prerequisites: [],
        currentTerm: { schoolYear: '2024-2025', semester: 1 },
        electiveTrackCourses: [],
        allCurriculumTrackCourses: [],
      });
      // GWA = (1.00*3 + 5.00*3) / (3+3) = 18/6 = 3.0
      expect(result.gpaMonitoring.gwa).toBe(3);
      expect(result.gpaMonitoring.gradedSubjects).toBe(2);
    });

    test('GWA includes dropped (4.00) courses weighted by units', () => {
      const courses = [
        {
          courseId: 1,
          yearLevel: 1,
          semester: 1,
          isElective: false,
          Course: { id: 1, code: 'A', name: 'A', units: 3 },
        },
        {
          courseId: 2,
          yearLevel: 1,
          semester: 1,
          isElective: false,
          Course: { id: 2, code: 'B', name: 'B', units: 3 },
        },
      ];
      const versions = [
        {
          versionNumber: 1,
          status: 'active',
          StudyPlanCourses: [
            {
              courseId: 1,
              status: 'passed',
              grade: '2.00',
              yearLevel: 1,
              semester: 1,
              Course: courses[0].Course,
            },
            {
              courseId: 2,
              status: 'dropped',
              grade: '4.00',
              yearLevel: 1,
              semester: 1,
              Course: courses[1].Course,
            },
          ],
        },
      ];
      const result = computeSarAnalytics({
        sar: { yearLevel: 2 },
        studyPlanVersions: versions,
        activeStudyPlanVersion: versions[0],
        curriculumCourses: courses,
        prerequisites: [],
        currentTerm: { schoolYear: '2024-2025', semester: 1 },
        electiveTrackCourses: [],
        allCurriculumTrackCourses: [],
      });
      // GWA = (2.00*3 + 4.00*3) / (3+3) = 18/6 = 3.0
      expect(result.gpaMonitoring.gwa).toBe(3);
      expect(result.gpaMonitoring.gradedSubjects).toBe(2);
    });

    test('GWA excludes INC (incomplete) courses', () => {
      const courses = [
        {
          courseId: 1,
          yearLevel: 1,
          semester: 1,
          isElective: false,
          Course: { id: 1, code: 'A', name: 'A', units: 3 },
        },
        {
          courseId: 2,
          yearLevel: 1,
          semester: 1,
          isElective: false,
          Course: { id: 2, code: 'B', name: 'B', units: 3 },
        },
      ];
      const versions = [
        {
          versionNumber: 1,
          status: 'active',
          StudyPlanCourses: [
            {
              courseId: 1,
              status: 'passed',
              grade: '1.50',
              yearLevel: 1,
              semester: 1,
              Course: courses[0].Course,
            },
            {
              courseId: 2,
              status: 'incomplete',
              grade: 'INC',
              yearLevel: 1,
              semester: 1,
              Course: courses[1].Course,
            },
          ],
        },
      ];
      const result = computeSarAnalytics({
        sar: { yearLevel: 2 },
        studyPlanVersions: versions,
        activeStudyPlanVersion: versions[0],
        curriculumCourses: courses,
        prerequisites: [],
        currentTerm: { schoolYear: '2024-2025', semester: 1 },
        electiveTrackCourses: [],
        allCurriculumTrackCourses: [],
      });
      // GWA = only the passed course: 1.50
      expect(result.gpaMonitoring.gwa).toBe(1.5);
      expect(result.gpaMonitoring.gradedSubjects).toBe(1);
    });

    test('GWA excludes credited courses', () => {
      const courses = [
        {
          courseId: 1,
          yearLevel: 1,
          semester: 1,
          isElective: false,
          Course: { id: 1, code: 'A', name: 'A', units: 3 },
        },
        {
          courseId: 2,
          yearLevel: 1,
          semester: 1,
          isElective: false,
          Course: { id: 2, code: 'B', name: 'B', units: 3 },
        },
      ];
      const versions = [
        {
          versionNumber: 1,
          status: 'active',
          StudyPlanCourses: [
            {
              courseId: 1,
              status: 'passed',
              grade: '2.00',
              yearLevel: 1,
              semester: 1,
              Course: courses[0].Course,
            },
            {
              courseId: 2,
              status: 'passed',
              grade: 'credited',
              yearLevel: 1,
              semester: 1,
              Course: courses[1].Course,
            },
          ],
        },
      ];
      const result = computeSarAnalytics({
        sar: { yearLevel: 2 },
        studyPlanVersions: versions,
        activeStudyPlanVersion: versions[0],
        curriculumCourses: courses,
        prerequisites: [],
        currentTerm: { schoolYear: '2024-2025', semester: 1 },
        electiveTrackCourses: [],
        allCurriculumTrackCourses: [],
      });
      // GWA = only the numerically-graded passed course: 2.00
      expect(result.gpaMonitoring.gwa).toBe(2);
      expect(result.gpaMonitoring.gradedSubjects).toBe(1);
    });

    test('GWA is null when no graded courses exist', () => {
      const courses = [
        {
          courseId: 1,
          yearLevel: 1,
          semester: 1,
          isElective: false,
          Course: { id: 1, code: 'A', name: 'A', units: 3 },
        },
      ];
      const versions = [
        {
          versionNumber: 1,
          status: 'active',
          StudyPlanCourses: [
            {
              courseId: 1,
              status: 'incomplete',
              grade: 'INC',
              yearLevel: 1,
              semester: 1,
              Course: courses[0].Course,
            },
          ],
        },
      ];
      const result = computeSarAnalytics({
        sar: { yearLevel: 1 },
        studyPlanVersions: versions,
        activeStudyPlanVersion: versions[0],
        curriculumCourses: courses,
        prerequisites: [],
        currentTerm: { schoolYear: '2024-2025', semester: 1 },
        electiveTrackCourses: [],
        allCurriculumTrackCourses: [],
      });
      expect(result.gpaMonitoring.gwa).toBeNull();
      expect(result.gpaMonitoring.gradedSubjects).toBe(0);
    });

    test('GWA weighs units correctly for unequal-unit courses', () => {
      const courses = [
        {
          courseId: 1,
          yearLevel: 1,
          semester: 1,
          isElective: false,
          Course: { id: 1, code: 'A', name: 'A', units: 3 },
        },
        {
          courseId: 2,
          yearLevel: 1,
          semester: 1,
          isElective: false,
          Course: { id: 2, code: 'B', name: 'B', units: 1 },
        },
      ];
      const versions = [
        {
          versionNumber: 1,
          status: 'active',
          StudyPlanCourses: [
            {
              courseId: 1,
              status: 'passed',
              grade: '1.00',
              yearLevel: 1,
              semester: 1,
              Course: courses[0].Course,
            },
            {
              courseId: 2,
              status: 'passed',
              grade: '3.00',
              yearLevel: 1,
              semester: 1,
              Course: courses[1].Course,
            },
          ],
        },
      ];
      const result = computeSarAnalytics({
        sar: { yearLevel: 2 },
        studyPlanVersions: versions,
        activeStudyPlanVersion: versions[0],
        curriculumCourses: courses,
        prerequisites: [],
        currentTerm: { schoolYear: '2024-2025', semester: 1 },
        electiveTrackCourses: [],
        allCurriculumTrackCourses: [],
      });
      // GWA = (1.00*3 + 3.00*1) / (3+1) = (3+3)/4 = 6/4 = 1.5
      // NOT a simple average of (1.00+3.00)/2 = 2.00
      expect(result.gpaMonitoring.gwa).toBe(1.5);
    });

    test('handles prerequisite checking', () => {
      const courses = [
        {
          courseId: 1,
          yearLevel: 1,
          semester: 1,
          isElective: false,
          Course: { id: 1, code: 'CS101', name: 'Intro', units: 3 },
        },
        {
          courseId: 2,
          yearLevel: 1,
          semester: 2,
          isElective: false,
          Course: { id: 2, code: 'CS102', name: 'Data Structures', units: 3 },
        },
      ];

      const prerequisites = [
        {
          courseId: 2,
          prerequisiteCourseId: 1,
          PrerequisiteCourse: { code: 'CS101', name: 'Intro' },
        },
      ];

      const versions = [
        {
          versionNumber: 1,
          status: 'active',
          StudyPlanCourses: [
            {
              courseId: 1,
              status: '',
              grade: null,
              yearLevel: 1,
              semester: 1,
              Course: courses[0].Course,
            },
            {
              courseId: 2,
              status: '',
              grade: null,
              yearLevel: 1,
              semester: 2,
              Course: courses[1].Course,
            },
          ],
        },
      ];

      const result = computeSarAnalytics({
        sar: { yearLevel: 1 },
        studyPlanVersions: versions,
        activeStudyPlanVersion: versions[0],
        curriculumCourses: courses,
        prerequisites,
        currentTerm: { schoolYear: '2024-2025', semester: 1 },
        electiveTrackCourses: [],
        allCurriculumTrackCourses: [],
      });

      expect(result.prerequisiteChecking.unmetSubjects).toBe(1);
      const cs102 = result.curriculumChecklistOverview.items.find((i) => i.code === 'CS102');
      expect(cs102.isPrerequisiteMet).toBe(false);
      expect(cs102.unmetPrerequisites).toHaveLength(1);
    });

    test('returns semester academic summary', () => {
      const courses = [
        {
          courseId: 1,
          yearLevel: 1,
          semester: 1,
          isElective: false,
          Course: { id: 1, code: 'A', name: 'A', units: 3 },
        },
        {
          courseId: 2,
          yearLevel: 1,
          semester: 2,
          isElective: false,
          Course: { id: 2, code: 'B', name: 'B', units: 3 },
        },
      ];

      const result = computeSarAnalytics({
        sar: { yearLevel: 1 },
        studyPlanVersions: [],
        activeStudyPlanVersion: null,
        curriculumCourses: courses,
        prerequisites: [],
        currentTerm: { schoolYear: '2024-2025', semester: 1 },
        electiveTrackCourses: [],
        allCurriculumTrackCourses: [],
      });

      expect(result.semesterAcademicSummary).toHaveLength(2);
      expect(result.semesterAcademicSummary[0].label).toBe('Year 1 1st Semester');
      expect(result.semesterAcademicSummary[1].label).toBe('Year 1 2nd Semester');
    });
  });
});
