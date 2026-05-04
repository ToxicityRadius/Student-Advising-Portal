const { Op } = require('sequelize');

jest.mock('../models', () => ({
  AcademicTerm: {
    findOne: jest.fn(),
    findAll: jest.fn(),
  },
  Course: {
    count: jest.fn(),
  },
  CourseEquivalency: {
    count: jest.fn(),
  },
  Curriculum: {
    findAll: jest.fn(),
  },
  CurriculumCourse: {},
  ElectiveTrack: {
    count: jest.fn(),
  },
  ElectiveTrackCourse: {},
  ForecastSnapshot: {
    findOne: jest.fn(),
  },
  Program: {},
  Prerequisite: {},
  PrerequisiteOverrideRequest: {
    count: jest.fn(),
  },
  StudentAcademicRecord: {
    count: jest.fn(),
    findAll: jest.fn(),
  },
  StudyPlan: {},
  StudyPlanVersion: {
    count: jest.fn(),
  },
  StudyPlanCourse: {},
  User: {
    findAll: jest.fn(),
  },
  ActivityLog: {
    findAll: jest.fn(),
  },
}));

jest.mock('../utils/sarAnalytics', () => ({
  computeSarAnalytics: jest.fn(),
}));

jest.mock('../utils/programAccess', () => ({
  buildProgramWhere: jest.fn().mockResolvedValue({
    allowed: true,
    where: { programId: 8 },
    programIds: [8],
  }),
  isSuperadmin: jest.fn((user) => user?.role === 'superadmin'),
  normalizeProgramId: jest.fn((value) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }),
}));

const {
  AcademicTerm,
  Course,
  CourseEquivalency,
  Curriculum,
  ElectiveTrack,
  ForecastSnapshot,
  PrerequisiteOverrideRequest,
  StudentAcademicRecord,
  StudyPlanVersion,
  User,
  ActivityLog,
} = require('../models');
const { buildProgramWhere } = require('../utils/programAccess');
const { getDashboardSummary } = require('../controllers/dashboardController');

describe('dashboardController operations summary', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    AcademicTerm.findOne.mockResolvedValue({
      id: 3,
      programId: 8,
      schoolYear: '2025-2026',
      semester: 1,
      Program: { id: 8, code: 'BSCPE', name: 'Computer Engineering' },
    });
    AcademicTerm.findAll.mockResolvedValue([]);
    ForecastSnapshot.findOne.mockResolvedValue(null);
    Curriculum.findAll.mockResolvedValue([{ id: 2, name: 'BSCPE 2025', isActive: true }]);
    Course.count.mockResolvedValue(12);
    CourseEquivalency.count.mockResolvedValue(2);
    ElectiveTrack.count.mockResolvedValue(1);
    StudentAcademicRecord.count.mockResolvedValue(30);
    StudentAcademicRecord.findAll.mockResolvedValue([]);
    PrerequisiteOverrideRequest.count.mockResolvedValue(4);
    StudyPlanVersion.count.mockResolvedValue(5);
    User.findAll.mockResolvedValue([]);
    ActivityLog.findAll.mockResolvedValue([{ id: 1, action: 'sar.created' }]);
  });

  test('returns program-scoped Program Chair summary payload', async () => {
    const req = { user: { id: 9, role: 'admin' }, query: { programId: '8' } };
    const res = { status: jest.fn(() => res), json: jest.fn(() => res) };
    const next = jest.fn();

    await getDashboardSummary(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(buildProgramWhere).toHaveBeenCalledWith(req.user, 8, { allowStudent: true });
    expect(Course.count).toHaveBeenCalledWith({ where: { programId: 8 } });
    expect(ActivityLog.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          [Op.and]: [
            { programId: 8 },
            {
              [Op.or]: [
                { actorId: { [Op.is]: null } },
                { '$Actor.role$': { [Op.ne]: 'superadmin' } },
              ],
            },
          ],
        },
        limit: 8,
      }),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          role: 'admin',
          curriculumHealth: expect.objectContaining({
            totalSARs: 30,
            pendingOverrideCount: 4,
            revalidationCount: 5,
          }),
          recentActivity: [{ id: 1, action: 'sar.created' }],
        }),
      }),
    );
  });

  test('returns Super Admin all-program summary without narrowing global reads', async () => {
    buildProgramWhere.mockResolvedValueOnce({ allowed: true, where: {}, programIds: null });
    const req = { user: { id: 1, role: 'superadmin' }, query: {} };
    const res = { status: jest.fn(() => res), json: jest.fn(() => res) };
    const next = jest.fn();

    await getDashboardSummary(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(buildProgramWhere).toHaveBeenCalledWith(req.user, null, { allowStudent: true });
    expect(Course.count).toHaveBeenCalledWith({ where: {} });
    expect(CourseEquivalency.count).toHaveBeenCalledWith({ where: {} });
    expect(ActivityLog.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
        limit: 8,
      }),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ role: 'superadmin' }),
      }),
    );
  });

  test('denies Program Chair dashboard reads outside assigned program scope', async () => {
    buildProgramWhere.mockResolvedValueOnce({ allowed: false, where: {}, programIds: [] });
    const req = { user: { id: 9, role: 'admin' }, query: { programId: '99' } };
    const res = { status: jest.fn(() => res), json: jest.fn(() => res) };
    const next = jest.fn();

    await getDashboardSummary(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(Course.count).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
