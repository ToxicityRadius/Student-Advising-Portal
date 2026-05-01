jest.mock('../models', () => ({
  sequelize: {},
  Curriculum: {},
  Course: {},
  CurriculumCourse: {},
  Prerequisite: {},
  CoRequisite: {},
  CourseEquivalency: {},
  ElectiveTrack: {},
  ElectiveTrackCourse: {},
  StudyPlanCourse: {},
  User: {},
  Program: {},
  ActivityLog: { create: jest.fn() },
}));

const { __testables } = require('../controllers/curriculumController');

const headers = [
  'exportVersion',
  'rowType',
  'curriculumId',
  'curriculumName',
  'courseCode',
  'courseName',
  'lectureHours',
  'laboratoryHours',
  'units',
  'yearLevel',
  'semester',
  'isElective',
  'minYearStandingRequired',
  'relatedCourseCode',
  'trackName',
  'notes',
];

const row = (overrides) =>
  headers.map((header) => {
    const base = {
      exportVersion: '1',
      curriculumId: '',
      curriculumName: 'BS CPE Curriculum 2025',
      rowType: 'structure',
      courseCode: 'CPE 101',
      courseName: 'Computer Engineering as a Discipline',
      units: '1',
      yearLevel: '1',
      semester: '1',
      isElective: 'false',
    };
    return overrides[header] ?? base[header] ?? '';
  });

const validate = (rows) =>
  __testables.validateAndNormalizeCsvRows({
    csvRows: [headers, ...rows],
    expectedCurriculumId: 25,
    expectedCurriculumName: 'BS CPE Curriculum 2025',
  });

describe('curriculum import validation', () => {
  test('rejects curriculum-name mismatches', () => {
    const result = validate([
      row({
        curriculumName: 'BS CPE Curriculum 2023',
      }),
    ]);

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rowNumber: 2,
          message: expect.stringContaining('does not match selected curriculum'),
        }),
      ]),
    );
  });

  test('rejects duplicate structure and elective track course rows', () => {
    const result = validate([
      row({ courseCode: 'CPE 101' }),
      row({ courseCode: 'CPE 101' }),
      row({
        rowType: 'elective_track',
        trackName: 'Cybersecurity',
        courseCode: '',
        courseName: '',
      }),
      row({
        rowType: 'elective_track_course',
        trackName: 'Cybersecurity',
        courseCode: 'CPE 209',
        courseName: 'Fundamentals of Cybersecurity',
        units: '3',
        yearLevel: '2',
        semester: '2',
      }),
      row({
        rowType: 'elective_track_course',
        trackName: 'Cybersecurity',
        courseCode: 'CPE 209',
        courseName: 'Fundamentals of Cybersecurity',
        units: '3',
        yearLevel: '2',
        semester: '2',
      }),
    ]);

    expect(result.errors.map((error) => error.message)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Duplicate structure row'),
        expect.stringContaining('Duplicate elective track course row'),
      ]),
    );
  });

  test('rejects track courses without track headers and unavailable references', () => {
    const result = validate([
      row({ courseCode: 'CPE 101' }),
      row({
        rowType: 'elective_track_course',
        trackName: 'Cybersecurity',
        courseCode: 'CPE 209',
        courseName: 'Fundamentals of Cybersecurity',
        units: '3',
        yearLevel: '2',
        semester: '2',
      }),
      row({
        rowType: 'prerequisite',
        courseCode: 'CPE 320',
        relatedCourseCode: 'CPE 999',
      }),
    ]);

    expect(result.errors.map((error) => error.message)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('without an elective_track header row'),
        expect.stringContaining('courseCode CPE 320 is not available'),
        expect.stringContaining('relatedCourseCode CPE 999 is not available'),
      ]),
    );
  });
});
