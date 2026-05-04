process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://user:pass@localhost:5432/test';

const transaction = {
  LOCK: { UPDATE: 'UPDATE' },
  commit: jest.fn(),
  rollback: jest.fn(),
};

jest.mock('../models', () => ({
  sequelize: {
    transaction: jest.fn(),
  },
  StudentAcademicRecord: {
    findByPk: jest.fn(),
  },
  StudyPlan: {},
  StudyPlanVersion: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
  },
  StudyPlanCourse: {
    findAll: jest.fn(),
  },
  Curriculum: {},
  CurriculumCourse: {},
  Prerequisite: {},
  CoRequisite: {},
  ElectiveTrack: {},
  ElectiveTrackCourse: {},
  Course: {},
  User: {},
  CourseEquivalency: {},
  PrerequisiteOverrideRequest: {},
  InactiveCurriculumRegenerationRequest: {},
}));

jest.mock('../utils/pdfChecklistParser', () => {
  const actual = jest.requireActual('../utils/pdfChecklistParser');
  return {
    ...actual,
    extractChecklistFromPdf: jest.fn(),
  };
});

jest.mock('../services/NotificationService', () => ({
  notify: jest.fn(),
}));

jest.mock('../services/ActivityLogService', () => ({
  logSafe: jest.fn(),
}));

const {
  sequelize,
  StudentAcademicRecord,
  StudyPlanVersion,
  StudyPlanCourse,
} = require('../models');
const { extractChecklistFromPdf } = require('../utils/pdfChecklistParser');
const NotificationService = require('../services/NotificationService');
const {
  previewPdfChecklistGrades,
  importPdfChecklistGrades,
} = require('../controllers/gradeController');

const makeRes = () => {
  const res = { status: jest.fn(() => res), json: jest.fn(() => res) };
  return res;
};

const makePlanRow = ({ id, code, name = code }) => ({
  id,
  Course: { id: id + 100, code, name },
  update: jest.fn(),
});

describe('gradeController PDF checklist import', () => {
  let calcRow;

  beforeEach(() => {
    jest.clearAllMocks();
    transaction.commit.mockResolvedValue();
    transaction.rollback.mockResolvedValue();
    sequelize.transaction.mockResolvedValue(transaction);
    StudentAcademicRecord.findByPk.mockResolvedValue({
      id: 42,
      studentName: 'Dexter Aic Mendoza Soriano',
      studentNumber: '2310675',
      userId: 88,
      StudyPlan: { id: 9 },
    });
    StudyPlanVersion.findOne.mockResolvedValue({ id: 10, status: 'active', studyPlanId: 9 });
    calcRow = makePlanRow({ id: 501, code: 'MATH 141', name: 'Calculus 1' });
    StudyPlanCourse.findAll.mockResolvedValue([calcRow]);
    StudyPlanVersion.findByPk.mockResolvedValue({
      id: 10,
      StudyPlanCourses: [
        {
          id: 501,
          grade: '2.75',
          status: 'passed',
          yearLevel: 1,
          semester: 1,
          Course: { code: 'MATH 141', name: 'Calculus 1', units: 4 },
        },
      ],
    });
    extractChecklistFromPdf.mockResolvedValue({
      identity: {
        studentName: 'SORIANO, DEXTER AIC MENDOZA',
        studentNumber: '2310675',
      },
      curriculumTitle: '2023 CURRICULUM FOR BACHELOR OF SCIENCE IN COMPUTER ENGINEERING',
      rows: [
        { courseCode: 'MATH 141', grade: '2.75' },
        { courseCode: 'UNKNOWN 001', grade: '1.50' },
      ],
      duplicateRows: [],
      warnings: [],
    });
  });

  test('previews matched and unmatched PDF grade rows without writing grades', async () => {
    const req = {
      params: { id: '42' },
      file: { buffer: Buffer.from('%PDF') },
      user: { id: 7, role: 'adviser' },
    };
    const res = makeRes();

    await previewPdfChecklistGrades(req, res, jest.fn());

    expect(calcRow.update).not.toHaveBeenCalled();
    expect(StudyPlanCourse.findAll).toHaveBeenCalledWith(
      expect.not.objectContaining({
        lock: expect.anything(),
      }),
    );
    expect(transaction.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          canImport: true,
          matchedRows: [expect.objectContaining({ courseCode: 'MATH 141', grade: '2.75' })],
          unmatchedRows: [expect.objectContaining({ courseCode: 'UNKNOWN 001' })],
        }),
      }),
    );
  });

  test('blocks PDF preview when the student number does not match the SAR', async () => {
    extractChecklistFromPdf.mockResolvedValueOnce({
      identity: { studentName: 'SORIANO, DEXTER AIC MENDOZA', studentNumber: '9999999' },
      curriculumTitle: '2023 CURRICULUM',
      rows: [{ courseCode: 'MATH 141', grade: '2.75' }],
      duplicateRows: [],
      warnings: [],
    });
    const req = {
      params: { id: '42' },
      file: { buffer: Buffer.from('%PDF') },
      user: { id: 7, role: 'adviser' },
    };
    const res = makeRes();

    await previewPdfChecklistGrades(req, res, jest.fn());

    expect(calcRow.update).not.toHaveBeenCalled();
    expect(transaction.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: 'PDF_STUDENT_MISMATCH',
      }),
    );
  });

  test('blocks PDF preview when the student number matches but last name differs', async () => {
    extractChecklistFromPdf.mockResolvedValueOnce({
      identity: { studentName: 'WRONGSURNAME, DEXTER AIC MENDOZA', studentNumber: '2310675' },
      curriculumTitle: '2023 CURRICULUM',
      rows: [{ courseCode: 'MATH 141', grade: '2.75' }],
      duplicateRows: [],
      warnings: [],
    });
    const req = {
      params: { id: '42' },
      file: { buffer: Buffer.from('%PDF') },
      user: { id: 7, role: 'adviser' },
    };
    const res = makeRes();

    await previewPdfChecklistGrades(req, res, jest.fn());

    expect(calcRow.update).not.toHaveBeenCalled();
    expect(transaction.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: 'PDF_STUDENT_MISMATCH',
      }),
    );
  });

  test('accepts PDF identity when only the student number and last name match', async () => {
    extractChecklistFromPdf.mockResolvedValueOnce({
      identity: { studentName: 'SORIANO, DIFFERENT GIVEN NAME', studentNumber: '2310675' },
      curriculumTitle: '2023 CURRICULUM',
      rows: [{ courseCode: 'MATH 141', grade: '2.75' }],
      duplicateRows: [],
      warnings: [],
    });
    const req = {
      params: { id: '42' },
      file: { buffer: Buffer.from('%PDF') },
      user: { id: 7, role: 'adviser' },
    };
    const res = makeRes();

    await previewPdfChecklistGrades(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          matchedRows: [expect.objectContaining({ courseCode: 'MATH 141' })],
        }),
      }),
    );
  });

  test('accepts PDF identity when the student number and last name match', async () => {
    StudentAcademicRecord.findByPk.mockResolvedValueOnce({
      id: 42,
      studentName: 'Legacy SAR Name',
      studentNumber: '2310675',
      userId: 88,
      Student: {
        first_name: 'Dexter Aic',
        middle_name: 'Mendoza',
        last_name: 'Soriano',
      },
      StudyPlan: { id: 9 },
    });
    const req = {
      params: { id: '42' },
      file: { buffer: Buffer.from('%PDF') },
      user: { id: 7, role: 'adviser' },
    };
    const res = makeRes();

    await previewPdfChecklistGrades(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          matchedRows: [expect.objectContaining({ courseCode: 'MATH 141' })],
        }),
      }),
    );
  });

  test('imports only matched PDF grade rows after identity validation', async () => {
    const req = {
      params: { id: '42' },
      file: { buffer: Buffer.from('%PDF') },
      user: { id: 7, role: 'adviser' },
    };
    const res = makeRes();

    await importPdfChecklistGrades(req, res, jest.fn());

    expect(calcRow.update).toHaveBeenCalledWith(
      { grade: '2.75', status: 'passed', updatedAt: expect.any(Number) },
      { transaction },
    );
    expect(transaction.commit).toHaveBeenCalled();
    expect(NotificationService.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: 88,
        actorId: 7,
        category: 'grades_entered',
        meta: { gradeCount: 1, pdfImport: true },
      }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        imported: 1,
        failed: 1,
      }),
    );
  });
});
