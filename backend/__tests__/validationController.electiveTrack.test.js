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
    CurriculumCourse: { findAll: jest.fn() },
    Prerequisite: { findAll: jest.fn() },
    PrerequisiteOverrideRequest: { findAll: jest.fn() },
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
  findStrictRetakePlacementViolation: jest.fn(() => null),
}));

jest.mock('../services/NotificationService', () => ({
  notify: jest.fn(),
}));

const models = require('../models');
const GradeService = require('../services/GradeService');
const {
  selectElectiveTrack,
  updateDraftVersionCourses,
} = require('../controllers/validationController');

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

describe('validationController.updateDraftVersionCourses strict retake placement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    GradeService.findStrictRetakePlacementViolation.mockReturnValue(null);
    GradeService.isPrerequisitePlacementAllowed.mockReturnValue({ allowed: true });
    models.CurriculumCourse.findAll.mockResolvedValue([]);
    models.Prerequisite.findAll.mockResolvedValue([]);
    models.PrerequisiteOverrideRequest.findAll.mockResolvedValue([]);
  });

  test('rejects draft edits that place a failed retake in its original slot', async () => {
    const sar = {
      id: 42,
      curriculumId: 10,
      StudyPlan: { id: 99 },
    };
    const activeVersion = {
      id: 7,
      studyPlanId: 99,
      status: 'active',
      StudyPlanCourses: [
        {
          id: 101,
          courseId: 1,
          yearLevel: 1,
          semester: 1,
          grade: '5.00',
          status: 'failed',
          Course: { id: 1, code: 'MATH018', name: 'Calculus 1', units: 3 },
        },
      ],
    };
    const draftRow = {
      id: 201,
      courseId: 1,
      yearLevel: 1,
      semester: 2,
      grade: null,
      status: 'pending',
      Course: { id: 1, code: 'MATH018', name: 'Calculus 1', units: 3 },
      get: jest.fn(() => ({
        id: 201,
        courseId: 1,
        yearLevel: 1,
        semester: 2,
        grade: null,
        status: 'pending',
        Course: { id: 1, code: 'MATH018', name: 'Calculus 1', units: 3 },
      })),
      update: jest.fn(),
    };
    const draftVersion = {
      id: 8,
      studyPlanId: 99,
      status: 'draft',
      StudyPlanCourses: [draftRow],
      update: jest.fn(),
    };
    const violation = {
      code: 'INVALID_RETAKE_PLACEMENT',
      message: 'MATH018 retake must be placed after Year 1 S1.',
    };

    models.StudentAcademicRecord.findByPk.mockResolvedValue(sar);
    models.StudyPlanVersion.findByPk.mockResolvedValue(draftVersion);
    models.StudyPlanVersion.findOne.mockResolvedValue(activeVersion);
    GradeService.findStrictRetakePlacementViolation.mockReturnValue(violation);

    const req = {
      params: { id: '42', versionId: '8' },
      body: { courses: [{ studyPlanCourseId: 201, yearLevel: 1, semester: 1 }] },
      user: { id: 9 },
    };
    const res = makeResponse();
    const next = jest.fn();

    await updateDraftVersionCourses(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(GradeService.findStrictRetakePlacementViolation).toHaveBeenCalledWith({
      originalEntries: activeVersion.StudyPlanCourses,
      proposedCourses: expect.arrayContaining([
        expect.objectContaining({ courseId: 1, yearLevel: 1, semester: 1 }),
      ]),
    });
    expect(models.__transaction.rollback).toHaveBeenCalled();
    expect(draftRow.update).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      code: 'INVALID_RETAKE_PLACEMENT',
      message: 'MATH018 retake must be placed after Year 1 S1.',
    });
  });
});
