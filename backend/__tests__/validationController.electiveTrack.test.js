jest.mock('../models', () => {
  const transaction = {
    commit: jest.fn(),
    rollback: jest.fn(),
    LOCK: { UPDATE: 'UPDATE' },
  };

  return {
    sequelize: {
      transaction: jest.fn(async () => transaction),
    },
    __transaction: transaction,
    AcademicTerm: {},
    StudentAcademicRecord: { findByPk: jest.fn() },
    StudyPlan: {},
    StudyPlanVersion: {
      findByPk: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    StudyPlanCourse: { destroy: jest.fn(), bulkCreate: jest.fn() },
    CurriculumCourse: {},
    Prerequisite: {},
    PrerequisiteOverrideRequest: {},
    ElectiveTrack: { findByPk: jest.fn() },
    ElectiveTrackCourse: { findAll: jest.fn() },
    Course: {},
    User: {},
  };
});

jest.mock('../services/GradeService', () => ({
  buildPrerequisiteOverrideMap: jest.fn(() => new Map()),
  buildMutualPrerequisitePairSet: jest.fn(() => new Set()),
  isPrerequisitePlacementAllowed: jest.fn(() => ({ allowed: true })),
}));

jest.mock('../services/NotificationService', () => ({
  notify: jest.fn(),
}));

const models = require('../models');
const { selectElectiveTrack } = require('../controllers/validationController');

const makeResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('validationController.selectElectiveTrack', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('allows an already selected elective track to be changed as a per-student override', async () => {
    const sar = {
      id: 42,
      curriculumId: 10,
      programId: 3,
      userId: 7,
      electiveTrackId: 1,
      StudyPlan: null,
      update: jest.fn(async (updates) => Object.assign(sar, updates)),
    };
    const updatedSar = {
      get: jest.fn(() => ({
        id: 42,
        curriculumId: 10,
        electiveTrackId: 2,
        ElectiveTrack: { id: 2, name: 'Cybersecurity' },
      })),
    };

    models.StudentAcademicRecord.findByPk
      .mockResolvedValueOnce(sar)
      .mockResolvedValueOnce(updatedSar);
    models.ElectiveTrack.findByPk.mockResolvedValue({ id: 2, curriculumId: 10 });

    const req = {
      params: { id: '42' },
      body: { electiveTrackId: 2 },
      user: { id: 99, role: 'adviser' },
    };
    const res = makeResponse();
    const next = jest.fn();

    await selectElectiveTrack(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(sar.update).toHaveBeenCalledWith(
      expect.objectContaining({ electiveTrackId: 2 }),
      expect.objectContaining({ transaction: models.__transaction }),
    );
    expect(models.__transaction.commit).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          electiveTrackId: 2,
        }),
      }),
    );
  });
});
