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

jest.mock('../utils/sarAnalytics', () => ({
  computeSarAnalytics: jest.fn(),
}));

const { StudentAcademicRecord } = require('../models');
const { exportSARPDF } = require('../controllers/exportController');

const createRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.setHeader = jest.fn();
  return res;
};

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
});
