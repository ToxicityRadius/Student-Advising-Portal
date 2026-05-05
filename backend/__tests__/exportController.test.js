jest.mock('../models', () => ({
  StudentAcademicRecord: {
    findByPk: jest.fn(),
  },
  StudyPlan: {},
  StudyPlanVersion: {
    findAll: jest.fn(),
  },
  StudyPlanCourse: {},
  Curriculum: {},
  CurriculumCourse: {
    findAll: jest.fn(),
  },
  Prerequisite: {
    findAll: jest.fn(),
  },
  AcademicTerm: {
    findOne: jest.fn(),
  },
  Course: {},
  ElectiveTrack: {},
  User: {},
}));

const { Writable } = require('stream');
const https = require('https');
const pdf = require('pdf-parse');
const { StudentAcademicRecord, Prerequisite } = require('../models');
const { exportSARPDF } = require('../controllers/exportController');

const createRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.setHeader = jest.fn();
  return res;
};

const createPdfRes = () => {
  const chunks = [];
  const res = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(Buffer.from(chunk));
      callback();
    },
  });

  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.setHeader = jest.fn();
  res.getPdfBuffer = () => Buffer.concat(chunks);

  return res;
};

const makeCourse = (overrides = {}) => ({
  id: overrides.id || 1,
  code: overrides.code || 'CPE 101',
  name: overrides.name || 'Computer Engineering Orientation',
  units: overrides.units ?? 3,
  lectureHours: overrides.lectureHours ?? 3,
  laboratoryHours: overrides.laboratoryHours ?? 0,
});

const makeStudyPlanCourse = (overrides = {}) => ({
  id: overrides.id || 1,
  courseId: overrides.courseId || overrides.Course?.id || 1,
  yearLevel: overrides.yearLevel ?? 1,
  semester: overrides.semester ?? 1,
  grade: overrides.grade ?? null,
  status: overrides.status || 'pending',
  Course: overrides.Course || makeCourse({ id: overrides.courseId || 1 }),
});

describe('exportController.exportSARPDF', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 404 when SAR is missing', async () => {
    StudentAcademicRecord.findByPk.mockResolvedValue(null);

    const req = {
      params: { id: '999' },
      user: { id: 1, role: 'admin', email: 'admin@example.com' },
    };
    const res = createRes();
    const next = jest.fn();

    await exportSARPDF(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Student academic record not found',
    });
  });

  test('returns 403 when student user does not own the SAR', async () => {
    StudentAcademicRecord.findByPk.mockResolvedValue({
      id: 10,
      userId: 999,
      email: 'owner@example.com',
      studentNumber: '1234567',
      StudyPlan: {
        StudyPlanVersions: [{ validatedAt: Date.now() }],
      },
    });

    const req = {
      params: { id: '10' },
      user: {
        id: 1,
        role: 'student',
        email: 'student@example.com',
        studentId: '7654321',
      },
    };
    const res = createRes();
    const next = jest.fn();

    await exportSARPDF(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Forbidden' });
  });

  test('returns 403 when student tries exporting an unvalidated study plan', async () => {
    StudentAcademicRecord.findByPk.mockResolvedValue({
      id: 11,
      userId: 1,
      email: 'student@example.com',
      studentNumber: '7654321',
      StudyPlan: {
        StudyPlanVersions: [{ validatedAt: null }],
      },
    });

    const req = {
      params: { id: '11' },
      user: {
        id: 1,
        role: 'student',
        email: 'student@example.com',
        studentId: '7654321',
      },
    };
    const res = createRes();
    const next = jest.fn();

    await exportSARPDF(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Study plan PDF can only be exported after adviser validation.',
    });
  });

  test('exports an official-style study plan PDF without profile photo or dashboard sections', async () => {
    const passedCourse = makeStudyPlanCourse({
      id: 101,
      courseId: 201,
      yearLevel: 1,
      semester: 1,
      grade: '1.75',
      status: 'passed',
      Course: makeCourse({
        id: 201,
        code: 'GEC 001',
        name: 'Programming Logic and Design',
        units: 3,
        lectureHours: 2,
        laboratoryHours: 3,
      }),
    });
    const pendingCourse = makeStudyPlanCourse({
      id: 102,
      courseId: 202,
      yearLevel: 1,
      semester: 2,
      status: 'pending',
      Course: makeCourse({
        id: 202,
        code: 'CPE 105',
        name: 'Object Oriented Programming',
        units: 3,
        lectureHours: 2,
        laboratoryHours: 3,
      }),
    });
    const failedCourse = makeStudyPlanCourse({
      id: 103,
      courseId: 203,
      yearLevel: 2,
      semester: 1,
      grade: '5.00',
      status: 'failed',
      Course: makeCourse({
        id: 203,
        code: 'CPE 106',
        name: 'Data and Digital Communications',
        units: 3,
        lectureHours: 3,
        laboratoryHours: 0,
      }),
    });

    StudentAcademicRecord.findByPk.mockResolvedValue({
      id: 42,
      userId: 1,
      studentName: 'Ada Student',
      studentNumber: '2023001',
      email: 'ada.student@tip.edu.ph',
      curriculumId: 7,
      Curriculum: { id: 7, name: 'BS CPE Curriculum 2023' },
      ElectiveTrack: { id: 3, name: 'Embedded Systems' },
      Student: { id: 1, profile_picture: 'https://example.com/profile.png' },
      StudyPlan: {
        id: 5,
        StudyPlanVersions: [
          {
            id: 8,
            versionNumber: 2,
            status: 'active',
            validatedAt: 1710000000000,
            ValidatedByAdviser: {
              firstName: 'Grace',
              lastName: 'Adviser',
              email: 'grace.cpe@tip.edu.ph',
            },
            StudyPlanCourses: [passedCourse, pendingCourse, failedCourse],
          },
        ],
      },
    });
    Prerequisite.findAll.mockResolvedValue([
      {
        courseId: 202,
        PrerequisiteCourse: { id: 201, code: 'GEC 001', name: 'Programming Logic and Design' },
      },
    ]);

    const getSpy = jest.spyOn(https, 'get').mockImplementation(() => {
      throw new Error('profile photo should not be requested for PDF export');
    });

    const req = {
      params: { id: '42' },
      user: { id: 9, role: 'adviser', email: 'grace.cpe@tip.edu.ph' },
    };
    const res = createPdfRes();
    const next = jest.fn();
    const finished = new Promise((resolve) => res.on('finish', resolve));

    await exportSARPDF(req, res, next);
    await finished;

    const parsed = await pdf(res.getPdfBuffer());
    const text = parsed.text.replace(/\s+/g, ' ');

    expect(next).not.toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(text).toContain('Ada Student');
    expect(text).toContain('2023001');
    expect(text).not.toContain('Programming Logic and Design');
    expect(text).not.toContain('1.75');
    expect(text).not.toContain('PASSED');
    expect(text).toContain('CPE 105');
    expect(text).toContain('Object Oriented Programming');
    expect(text).toContain('GEC 001');
    expect(text).toContain('CPE 106');
    expect(text).toContain('Data and Digital Communications');
    expect(text).toContain('5.00');
    expect(text).not.toContain('STATUS');
    expect(text).not.toContain('PENDING');
    expect(text).not.toContain('FAILED');
    expect(text).not.toContain('ada.student@tip.edu.ph');
    expect(text).not.toContain('Progress Snapshot');
    expect(text).not.toContain('Academic Intelligence');
    expect(text).not.toContain('Remaining Coursework');
    expect(getSpy).not.toHaveBeenCalled();

    getSpy.mockRestore();
  });
});
