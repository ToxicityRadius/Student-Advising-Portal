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
    create: jest.fn(),
    findByPk: jest.fn(),
  },
  StudyPlanCourse: {
    findAll: jest.fn(),
    bulkCreate: jest.fn(),
  },
  CurriculumCourse: {
    findAll: jest.fn(),
  },
  Curriculum: {
    findByPk: jest.fn(),
    findAll: jest.fn(),
  },
  Prerequisite: {
    findAll: jest.fn(),
  },
  CoRequisite: {
    findAll: jest.fn(),
  },
  ElectiveTrack: {},
  ElectiveTrackCourse: {
    findAll: jest.fn(),
  },
  Course: {},
  User: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
  },
  CourseEquivalency: {
    findAll: jest.fn(),
  },
  PrerequisiteOverrideRequest: {
    findOne: jest.fn(),
    bulkCreate: jest.fn(),
  },
  InactiveCurriculumRegenerationRequest: {
    findOne: jest.fn(),
  },
}));

jest.mock('../services/NotificationService', () => ({
  notify: jest.fn(),
}));

jest.mock('../services/ActivityLogService', () => ({
  logSafe: jest.fn(),
}));

const { triggerRegeneration } = require('../controllers/gradeController');
const {
  sequelize,
  StudentAcademicRecord,
  StudyPlanVersion,
  StudyPlanCourse,
  CurriculumCourse,
  Curriculum,
  Prerequisite,
  CoRequisite,
  ElectiveTrackCourse,
  User,
  CourseEquivalency,
  PrerequisiteOverrideRequest,
  InactiveCurriculumRegenerationRequest,
} = require('../models');

const makeCourse = ({ id, code, units }) => ({ id, code, name: code, units });

describe('gradeController regeneration placement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sequelize.transaction.mockResolvedValue(transaction);
    transaction.commit.mockResolvedValue();
    transaction.rollback.mockResolvedValue();
    User.findAll.mockResolvedValue([]);
    User.findByPk.mockResolvedValue(null);
    CourseEquivalency.findAll.mockResolvedValue([]);
    CoRequisite.findAll.mockResolvedValue([]);
    ElectiveTrackCourse.findAll.mockResolvedValue([]);
    StudyPlanCourse.bulkCreate.mockResolvedValue([]);
    Curriculum.findAll.mockResolvedValue([]);
    Curriculum.findByPk.mockResolvedValue({
      id: 77,
      name: 'Active CPE Curriculum',
      isActive: true,
    });
    InactiveCurriculumRegenerationRequest.findOne.mockResolvedValue(null);
    PrerequisiteOverrideRequest.findOne.mockResolvedValue(null);
    PrerequisiteOverrideRequest.bulkCreate.mockResolvedValue([]);
  });

  test('honors a same-term prerequisite override even when that requested term is already full', async () => {
    const calculus1 = makeCourse({ id: 101, code: 'MATH018', units: 3 });
    const calculus2 = makeCourse({ id: 102, code: 'MATH019', units: 3 });
    const heavyTermCourse = makeCourse({ id: 103, code: 'CPE105', units: 23 });

    const sar = {
      id: 44,
      curriculumId: 77,
      programId: 9,
      userId: 55,
      electiveTrackId: null,
      StudyPlan: { id: 88 },
    };

    const activeVersion = {
      id: 12,
      studyPlanId: sar.StudyPlan.id,
      status: 'active',
      StudyPlanCourses: [
        {
          id: 202,
          courseId: calculus2.id,
          Course: calculus2,
          yearLevel: 1,
          semester: 2,
          grade: null,
          status: 'pending',
        },
        {
          id: 201,
          courseId: calculus1.id,
          Course: calculus1,
          yearLevel: 1,
          semester: 1,
          grade: '5.00',
          status: 'failed',
        },
        {
          id: 203,
          courseId: heavyTermCourse.id,
          Course: heavyTermCourse,
          yearLevel: 1,
          semester: 2,
          grade: null,
          status: 'pending',
        },
      ],
    };

    StudentAcademicRecord.findByPk.mockResolvedValue(sar);
    StudyPlanVersion.findOne
      .mockResolvedValueOnce(activeVersion)
      .mockResolvedValueOnce({ id: activeVersion.id, versionNumber: 1 });
    StudyPlanVersion.create.mockResolvedValue({ id: 99, versionNumber: 2 });
    StudyPlanVersion.findByPk.mockResolvedValue({
      id: 99,
      versionNumber: 2,
      StudyPlanCourses: [],
    });

    CurriculumCourse.findAll.mockResolvedValue([
      {
        curriculumId: sar.curriculumId,
        courseId: calculus1.id,
        Course: calculus1,
        Curriculum: {
          id: sar.curriculumId,
          name: 'Active CPE Curriculum',
          isActive: true,
        },
        yearLevel: 1,
        semester: 1,
        isElective: false,
      },
      {
        curriculumId: sar.curriculumId,
        courseId: heavyTermCourse.id,
        Course: heavyTermCourse,
        Curriculum: {
          id: sar.curriculumId,
          name: 'Active CPE Curriculum',
          isActive: true,
        },
        yearLevel: 1,
        semester: 2,
        isElective: false,
      },
      {
        curriculumId: sar.curriculumId,
        courseId: calculus2.id,
        Course: calculus2,
        Curriculum: {
          id: sar.curriculumId,
          name: 'Active CPE Curriculum',
          isActive: true,
        },
        yearLevel: 1,
        semester: 2,
        isElective: false,
      },
    ]);
    Prerequisite.findAll.mockResolvedValue([
      {
        curriculumId: sar.curriculumId,
        courseId: calculus2.id,
        prerequisiteCourseId: calculus1.id,
      },
    ]);

    const req = {
      params: { id: String(sar.id) },
      body: {
        retakePlacements: [{ studyPlanCourseId: 201, yearLevel: 1, semester: 2 }],
        prerequisiteOverrideRequests: [
          {
            prerequisiteCourseId: calculus1.id,
            dependentCourseId: calculus2.id,
            yearLevel: 1,
            semester: 2,
            reason: 'Manual same-term catch-up request.',
          },
        ],
      },
      user: {
        id: 7,
        firstName: 'Ada',
        lastName: 'Adviser',
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();

    await triggerRegeneration(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json.mock.calls[0][0].failedCourseAnalysis.failedCourses[0].availability).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          curriculumName: 'Active CPE Curriculum',
          curriculumIsActive: true,
          isAvailable: true,
          unavailableReason: null,
        }),
      ]),
    );
    expect(PrerequisiteOverrideRequest.bulkCreate).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          studentAcademicRecordId: sar.id,
          prerequisiteCourseId: calculus1.id,
          dependentCourseId: calculus2.id,
          yearLevel: 1,
          semester: 2,
          status: 'pending',
        }),
      ],
      { transaction },
    );

    const createdCourses = StudyPlanCourse.bulkCreate.mock.calls[0][0];
    expect(createdCourses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          courseId: calculus1.id,
          yearLevel: 1,
          semester: 2,
        }),
        expect.objectContaining({
          courseId: calculus2.id,
          yearLevel: 1,
          semester: 2,
        }),
      ]),
    );
  });

  test('does not block regeneration on co-requisites that are not in the student plan', async () => {
    const failedCourse = makeCourse({ id: 101, code: 'MATH018', units: 3 });
    const pendingCourse = makeCourse({ id: 203, code: 'CPE203', units: 4 });
    const absentElective = makeCourse({ id: 331, code: 'CPE331A', units: 3 });

    const sar = {
      id: 45,
      curriculumId: 78,
      programId: 9,
      userId: 56,
      electiveTrackId: null,
      StudyPlan: { id: 89 },
    };

    const activeVersion = {
      id: 13,
      studyPlanId: sar.StudyPlan.id,
      status: 'active',
      StudyPlanCourses: [
        {
          id: 301,
          courseId: failedCourse.id,
          Course: failedCourse,
          yearLevel: 1,
          semester: 1,
          grade: '5.00',
          status: 'failed',
        },
        {
          id: 302,
          courseId: pendingCourse.id,
          Course: pendingCourse,
          yearLevel: 2,
          semester: 2,
          grade: null,
          status: 'pending',
        },
      ],
    };

    StudentAcademicRecord.findByPk.mockResolvedValue(sar);
    StudyPlanVersion.findOne
      .mockResolvedValueOnce(activeVersion)
      .mockResolvedValueOnce({ id: activeVersion.id, versionNumber: 1 });
    StudyPlanVersion.create.mockResolvedValue({ id: 100, versionNumber: 2 });
    StudyPlanVersion.findByPk.mockResolvedValue({
      id: 100,
      versionNumber: 2,
      StudyPlanCourses: [],
    });

    CurriculumCourse.findAll.mockResolvedValue([
      {
        curriculumId: sar.curriculumId,
        courseId: failedCourse.id,
        Course: failedCourse,
        yearLevel: 1,
        semester: 1,
        isElective: false,
      },
      {
        curriculumId: sar.curriculumId,
        courseId: pendingCourse.id,
        Course: pendingCourse,
        yearLevel: 2,
        semester: 2,
        isElective: false,
      },
    ]);
    Prerequisite.findAll.mockResolvedValue([]);
    CoRequisite.findAll.mockResolvedValue([
      {
        curriculumId: sar.curriculumId,
        courseId: absentElective.id,
        coRequisiteCourseId: pendingCourse.id,
      },
    ]);

    const req = {
      params: { id: String(sar.id) },
      body: {
        retakePlacements: [{ studyPlanCourseId: 301, yearLevel: 1, semester: 2 }],
      },
      user: {
        id: 7,
        firstName: 'Ada',
        lastName: 'Adviser',
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();

    await triggerRegeneration(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    const createdCourses = StudyPlanCourse.bulkCreate.mock.calls[0][0];
    expect(createdCourses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          courseId: pendingCourse.id,
          yearLevel: 2,
          semester: 2,
        }),
      ]),
    );
  });

  test('requires Program Chair approval before regenerating from an inactive SAR curriculum', async () => {
    const failedCourse = makeCourse({ id: 501, code: 'MATH018', units: 3 });
    const sar = {
      id: 51,
      curriculumId: 2018,
      programId: 9,
      userId: 57,
      electiveTrackId: null,
      StudyPlan: { id: 91 },
    };
    const activeVersion = {
      id: 21,
      studyPlanId: sar.StudyPlan.id,
      status: 'active',
      StudyPlanCourses: [
        {
          id: 601,
          courseId: failedCourse.id,
          Course: failedCourse,
          yearLevel: 1,
          semester: 1,
          grade: '5.00',
          status: 'failed',
        },
      ],
    };

    StudentAcademicRecord.findByPk.mockResolvedValue(sar);
    Curriculum.findByPk.mockResolvedValue({
      id: sar.curriculumId,
      name: 'BS CPE Curriculum 2018',
      isActive: false,
    });
    StudyPlanVersion.findOne.mockResolvedValueOnce(activeVersion);
    CurriculumCourse.findAll.mockResolvedValue([
      {
        curriculumId: sar.curriculumId,
        courseId: failedCourse.id,
        Course: failedCourse,
        yearLevel: 1,
        semester: 1,
        isElective: false,
      },
    ]);
    Prerequisite.findAll.mockResolvedValue([]);

    const req = {
      params: { id: String(sar.id) },
      body: {
        retakePlacements: [{ studyPlanCourseId: 601, yearLevel: 1, semester: 2 }],
      },
      user: { id: 7, firstName: 'Ada', lastName: 'Adviser' },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();

    await triggerRegeneration(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(InactiveCurriculumRegenerationRequest.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          studentAcademicRecordId: sar.id,
          studyPlanVersionId: activeVersion.id,
          curriculumId: sar.curriculumId,
          status: 'approved',
        }),
      }),
    );
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: 'INACTIVE_CURRICULUM_APPROVAL_REQUIRED',
      }),
    );
    expect(StudyPlanVersion.create).not.toHaveBeenCalled();
  });

  test('allows inactive-curriculum regeneration after Program Chair approval', async () => {
    const failedCourse = makeCourse({ id: 701, code: 'MATH018', units: 3 });
    const sar = {
      id: 52,
      curriculumId: 2018,
      programId: 9,
      userId: 58,
      electiveTrackId: null,
      StudyPlan: { id: 92 },
    };
    const activeVersion = {
      id: 22,
      studyPlanId: sar.StudyPlan.id,
      status: 'active',
      StudyPlanCourses: [
        {
          id: 801,
          courseId: failedCourse.id,
          Course: failedCourse,
          yearLevel: 1,
          semester: 1,
          grade: '5.00',
          status: 'failed',
        },
      ],
    };

    StudentAcademicRecord.findByPk.mockResolvedValue(sar);
    Curriculum.findByPk.mockResolvedValue({
      id: sar.curriculumId,
      name: 'BS CPE Curriculum 2018',
      isActive: false,
    });
    InactiveCurriculumRegenerationRequest.findOne.mockResolvedValue({
      id: 31,
      status: 'approved',
      studyPlanVersionId: activeVersion.id,
    });
    StudyPlanVersion.findOne
      .mockResolvedValueOnce(activeVersion)
      .mockResolvedValueOnce({ id: activeVersion.id, versionNumber: 1 });
    StudyPlanVersion.create.mockResolvedValue({ id: 101, versionNumber: 2 });
    StudyPlanVersion.findByPk.mockResolvedValue({
      id: 101,
      versionNumber: 2,
      StudyPlanCourses: [],
    });
    CurriculumCourse.findAll.mockResolvedValue([
      {
        curriculumId: sar.curriculumId,
        courseId: failedCourse.id,
        Course: failedCourse,
        yearLevel: 1,
        semester: 1,
        isElective: false,
      },
    ]);
    Prerequisite.findAll.mockResolvedValue([]);

    const req = {
      params: { id: String(sar.id) },
      body: {
        retakePlacements: [{ studyPlanCourseId: 801, yearLevel: 1, semester: 2 }],
      },
      user: { id: 7, firstName: 'Ada', lastName: 'Adviser' },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();

    await triggerRegeneration(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(InactiveCurriculumRegenerationRequest.findOne).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(StudyPlanVersion.create).toHaveBeenCalled();
  });

  test('places same-term prerequisite before its dependent even when active rows arrive out of order', async () => {
    const calculus1 = makeCourse({ id: 901, code: 'MATH 018', units: 3 });
    const calculus2 = makeCourse({ id: 902, code: 'MATH 019', units: 3 });

    const sar = {
      id: 53,
      curriculumId: 79,
      programId: 9,
      userId: 59,
      electiveTrackId: null,
      StudyPlan: { id: 93 },
    };

    const activeVersion = {
      id: 23,
      studyPlanId: sar.StudyPlan.id,
      status: 'active',
      StudyPlanCourses: [
        {
          id: 9020,
          courseId: calculus2.id,
          Course: calculus2,
          yearLevel: 1,
          semester: 2,
          grade: null,
          status: 'pending',
        },
        {
          id: 9010,
          courseId: calculus1.id,
          Course: calculus1,
          yearLevel: 1,
          semester: 2,
          grade: null,
          status: 'pending',
        },
      ],
    };

    StudentAcademicRecord.findByPk.mockResolvedValue(sar);
    StudyPlanVersion.findOne
      .mockResolvedValueOnce(activeVersion)
      .mockResolvedValueOnce({ id: activeVersion.id, versionNumber: 1 });
    StudyPlanVersion.create.mockResolvedValue({ id: 102, versionNumber: 2 });
    StudyPlanVersion.findByPk.mockResolvedValue({
      id: 102,
      versionNumber: 2,
      StudyPlanCourses: [],
    });
    CurriculumCourse.findAll.mockResolvedValue([
      {
        curriculumId: sar.curriculumId,
        courseId: calculus1.id,
        Course: calculus1,
        yearLevel: 1,
        semester: 2,
        isElective: false,
      },
      {
        curriculumId: sar.curriculumId,
        courseId: calculus2.id,
        Course: calculus2,
        yearLevel: 1,
        semester: 2,
        isElective: false,
      },
    ]);
    Prerequisite.findAll.mockResolvedValue([
      {
        curriculumId: sar.curriculumId,
        courseId: calculus2.id,
        prerequisiteCourseId: calculus1.id,
      },
    ]);

    const req = {
      params: { id: String(sar.id) },
      body: {},
      user: { id: 7, firstName: 'Ada', lastName: 'Adviser' },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();

    await triggerRegeneration(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);

    const createdCourses = StudyPlanCourse.bulkCreate.mock.calls[0][0];
    expect(createdCourses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          courseId: calculus1.id,
          yearLevel: 1,
          semester: 2,
        }),
        expect.objectContaining({
          courseId: calculus2.id,
          yearLevel: 1,
          semester: 3,
        }),
      ]),
    );
  });

  test('places unresolved courses whose curriculum slot is the first term', async () => {
    const calculus1 = makeCourse({ id: 1001, code: 'MATH 018', units: 3 });

    const sar = {
      id: 54,
      curriculumId: 80,
      programId: 9,
      userId: 60,
      electiveTrackId: null,
      StudyPlan: { id: 94 },
    };

    const activeVersion = {
      id: 24,
      studyPlanId: sar.StudyPlan.id,
      status: 'active',
      StudyPlanCourses: [
        {
          id: 10010,
          courseId: calculus1.id,
          Course: calculus1,
          yearLevel: 1,
          semester: 1,
          grade: null,
          status: 'pending',
        },
      ],
    };

    StudentAcademicRecord.findByPk.mockResolvedValue(sar);
    StudyPlanVersion.findOne
      .mockResolvedValueOnce(activeVersion)
      .mockResolvedValueOnce({ id: activeVersion.id, versionNumber: 1 });
    StudyPlanVersion.create.mockResolvedValue({ id: 103, versionNumber: 2 });
    StudyPlanVersion.findByPk.mockResolvedValue({
      id: 103,
      versionNumber: 2,
      StudyPlanCourses: [],
    });
    CurriculumCourse.findAll.mockResolvedValue([
      {
        curriculumId: sar.curriculumId,
        courseId: calculus1.id,
        Course: calculus1,
        yearLevel: 1,
        semester: 1,
        isElective: false,
      },
    ]);
    Prerequisite.findAll.mockResolvedValue([]);

    const req = {
      params: { id: String(sar.id) },
      body: {},
      user: { id: 7, firstName: 'Ada', lastName: 'Adviser' },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();

    await triggerRegeneration(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(StudyPlanCourse.bulkCreate.mock.calls[0][0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          courseId: calculus1.id,
          yearLevel: 1,
          semester: 1,
        }),
      ]),
    );
  });

  test('returns graduation pacing metadata when the regenerated plan stays within the curriculum endpoint', async () => {
    const foundations = makeCourse({ id: 1101, code: 'CPE 101', units: 3 });
    const capstone = makeCourse({ id: 1102, code: 'CPE 499', units: 3 });

    const sar = {
      id: 55,
      curriculumId: 81,
      programId: 9,
      userId: 61,
      electiveTrackId: null,
      StudyPlan: { id: 95 },
    };

    const activeVersion = {
      id: 25,
      studyPlanId: sar.StudyPlan.id,
      status: 'active',
      StudyPlanCourses: [
        {
          id: 11010,
          courseId: foundations.id,
          Course: foundations,
          yearLevel: 1,
          semester: 1,
          grade: null,
          status: 'pending',
        },
        {
          id: 11020,
          courseId: capstone.id,
          Course: capstone,
          yearLevel: 4,
          semester: 2,
          grade: null,
          status: 'pending',
        },
      ],
    };

    StudentAcademicRecord.findByPk.mockResolvedValue(sar);
    StudyPlanVersion.findOne
      .mockResolvedValueOnce(activeVersion)
      .mockResolvedValueOnce({ id: activeVersion.id, versionNumber: 1 });
    StudyPlanVersion.create.mockResolvedValue({ id: 104, versionNumber: 2 });
    StudyPlanVersion.findByPk.mockResolvedValue({
      id: 104,
      versionNumber: 2,
      StudyPlanCourses: [],
    });
    CurriculumCourse.findAll.mockResolvedValue([
      {
        curriculumId: sar.curriculumId,
        courseId: foundations.id,
        Course: foundations,
        yearLevel: 1,
        semester: 1,
        isElective: false,
      },
      {
        curriculumId: sar.curriculumId,
        courseId: capstone.id,
        Course: capstone,
        yearLevel: 4,
        semester: 2,
        isElective: false,
      },
    ]);
    Prerequisite.findAll.mockResolvedValue([]);

    const req = {
      params: { id: String(sar.id) },
      body: {},
      user: { id: 7, firstName: 'Ada', lastName: 'Adviser' },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();

    await triggerRegeneration(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json.mock.calls[0][0].graduationPacing).toEqual(
      expect.objectContaining({
        isOnTrack: true,
        termsDelayed: 0,
        targetTerm: expect.objectContaining({ yearLevel: 4, semester: 2 }),
        latestPlannedTerm: expect.objectContaining({ yearLevel: 4, semester: 2 }),
      }),
    );
  });

  test('returns delayed graduation pacing advisory when the closest valid plan exceeds the curriculum endpoint', async () => {
    const delayedCourse = makeCourse({ id: 1201, code: 'CPE 450', units: 3 });

    const sar = {
      id: 56,
      curriculumId: 82,
      programId: 9,
      userId: 62,
      electiveTrackId: null,
      StudyPlan: { id: 96 },
    };

    const activeVersion = {
      id: 26,
      studyPlanId: sar.StudyPlan.id,
      status: 'active',
      StudyPlanCourses: [
        {
          id: 12010,
          courseId: delayedCourse.id,
          Course: delayedCourse,
          yearLevel: 4,
          semester: 2,
          grade: null,
          status: 'pending',
        },
      ],
    };

    StudentAcademicRecord.findByPk.mockResolvedValue(sar);
    StudyPlanVersion.findOne
      .mockResolvedValueOnce(activeVersion)
      .mockResolvedValueOnce({ id: activeVersion.id, versionNumber: 1 });
    StudyPlanVersion.create.mockResolvedValue({ id: 105, versionNumber: 2 });
    StudyPlanVersion.findByPk.mockResolvedValue({
      id: 105,
      versionNumber: 2,
      StudyPlanCourses: [],
    });
    CurriculumCourse.findAll.mockResolvedValue([
      {
        curriculumId: sar.curriculumId,
        courseId: delayedCourse.id,
        Course: delayedCourse,
        yearLevel: 4,
        semester: 2,
        isElective: false,
      },
    ]);
    Prerequisite.findAll.mockResolvedValue([]);

    const req = {
      params: { id: String(sar.id) },
      body: {
        semesterOverrides: [{ courseId: delayedCourse.id, yearLevel: 5, semester: 1 }],
      },
      user: { id: 7, firstName: 'Ada', lastName: 'Adviser' },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();

    await triggerRegeneration(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json.mock.calls[0][0].graduationPacing).toEqual(
      expect.objectContaining({
        isOnTrack: false,
        termsDelayed: 2,
        targetTerm: expect.objectContaining({ yearLevel: 4, semester: 2 }),
        latestPlannedTerm: expect.objectContaining({ yearLevel: 5, semester: 1 }),
        delayedCourses: expect.arrayContaining([
          expect.objectContaining({ courseId: delayedCourse.id, code: delayedCourse.code }),
        ]),
      }),
    );
  });

  test('prioritizes critical prerequisite chains before standalone courses when early capacity competes', async () => {
    const filler = makeCourse({ id: 1301, code: 'FILL 001', units: 23 });
    const chain1 = makeCourse({ id: 1302, code: 'CHAIN 1', units: 2 });
    const chain2 = makeCourse({ id: 1303, code: 'CHAIN 2', units: 2 });
    const standalone = makeCourse({ id: 1304, code: 'FREE 1', units: 2 });

    const sar = {
      id: 57,
      curriculumId: 83,
      programId: 9,
      userId: 63,
      electiveTrackId: null,
      StudyPlan: { id: 97 },
    };

    const activeVersion = {
      id: 27,
      studyPlanId: sar.StudyPlan.id,
      status: 'active',
      StudyPlanCourses: [
        {
          id: 13010,
          courseId: filler.id,
          Course: filler,
          yearLevel: 1,
          semester: 1,
          grade: '1.00',
          status: 'passed',
        },
        {
          id: 13020,
          courseId: chain1.id,
          Course: chain1,
          yearLevel: 1,
          semester: 1,
          grade: null,
          status: 'pending',
        },
        {
          id: 13030,
          courseId: chain2.id,
          Course: chain2,
          yearLevel: 1,
          semester: 2,
          grade: null,
          status: 'pending',
        },
        {
          id: 13040,
          courseId: standalone.id,
          Course: standalone,
          yearLevel: 1,
          semester: 1,
          grade: null,
          status: 'pending',
        },
      ],
    };

    StudentAcademicRecord.findByPk.mockResolvedValue(sar);
    StudyPlanVersion.findOne
      .mockResolvedValueOnce(activeVersion)
      .mockResolvedValueOnce({ id: activeVersion.id, versionNumber: 1 });
    StudyPlanVersion.create.mockResolvedValue({ id: 106, versionNumber: 2 });
    StudyPlanVersion.findByPk.mockResolvedValue({
      id: 106,
      versionNumber: 2,
      StudyPlanCourses: [],
    });
    CurriculumCourse.findAll.mockResolvedValue([
      {
        curriculumId: sar.curriculumId,
        courseId: filler.id,
        Course: filler,
        yearLevel: 1,
        semester: 2,
        isElective: false,
      },
      {
        curriculumId: sar.curriculumId,
        courseId: chain1.id,
        Course: chain1,
        yearLevel: 1,
        semester: 1,
        isElective: false,
      },
      {
        curriculumId: sar.curriculumId,
        courseId: standalone.id,
        Course: standalone,
        yearLevel: 1,
        semester: 1,
        isElective: false,
      },
      {
        curriculumId: sar.curriculumId,
        courseId: chain2.id,
        Course: chain2,
        yearLevel: 1,
        semester: 2,
        isElective: false,
      },
    ]);
    Prerequisite.findAll.mockResolvedValue([
      {
        curriculumId: sar.curriculumId,
        courseId: chain2.id,
        prerequisiteCourseId: chain1.id,
      },
    ]);

    const req = {
      params: { id: String(sar.id) },
      body: {},
      user: { id: 7, firstName: 'Ada', lastName: 'Adviser' },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();

    await triggerRegeneration(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    const createdCourses = StudyPlanCourse.bulkCreate.mock.calls[0][0];
    expect(createdCourses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ courseId: chain1.id, yearLevel: 1, semester: 1 }),
        expect.objectContaining({ courseId: standalone.id, yearLevel: 1, semester: 2 }),
      ]),
    );
  });

  test('recommends active curriculum conversion for irregular students in inactive curricula when a newer curriculum covers remaining courses', async () => {
    const remaining = makeCourse({ id: 1401, code: 'CPE 420', units: 3 });
    const candidateCourse = makeCourse({ id: 2401, code: 'CPE 420', units: 3 });

    const sar = {
      id: 58,
      curriculumId: 2018,
      programId: 9,
      userId: 64,
      electiveTrackId: null,
      StudyPlan: { id: 98 },
    };

    const activeVersion = {
      id: 28,
      studyPlanId: sar.StudyPlan.id,
      status: 'active',
      StudyPlanCourses: [
        {
          id: 14010,
          courseId: remaining.id,
          Course: remaining,
          yearLevel: 4,
          semester: 2,
          grade: null,
          status: 'pending',
        },
      ],
    };

    StudentAcademicRecord.findByPk.mockResolvedValue(sar);
    User.findByPk.mockResolvedValue({ id: sar.userId, student_type: 'irregular' });
    Curriculum.findByPk.mockResolvedValue({
      id: sar.curriculumId,
      name: 'BS CPE Curriculum 2018',
      isActive: false,
      programId: sar.programId,
    });
    InactiveCurriculumRegenerationRequest.findOne.mockResolvedValue({
      id: 32,
      status: 'approved',
      studyPlanVersionId: activeVersion.id,
    });
    StudyPlanVersion.findOne
      .mockResolvedValueOnce(activeVersion)
      .mockResolvedValueOnce({ id: activeVersion.id, versionNumber: 1 });
    StudyPlanVersion.create.mockResolvedValue({ id: 107, versionNumber: 2 });
    StudyPlanVersion.findByPk.mockResolvedValue({
      id: 107,
      versionNumber: 2,
      StudyPlanCourses: [],
    });
    CurriculumCourse.findAll.mockResolvedValue([
      {
        curriculumId: sar.curriculumId,
        courseId: remaining.id,
        Course: remaining,
        yearLevel: 4,
        semester: 2,
        isElective: false,
      },
    ]);
    Curriculum.findAll.mockResolvedValue([
      {
        id: 2024,
        name: 'BS CPE Curriculum 2024',
        isActive: true,
        CurriculumCourses: [
          {
            curriculumId: 2024,
            courseId: candidateCourse.id,
            Course: candidateCourse,
            yearLevel: 4,
            semester: 1,
            isElective: false,
          },
        ],
      },
    ]);
    Prerequisite.findAll.mockResolvedValue([]);

    const req = {
      params: { id: String(sar.id) },
      body: {},
      user: { id: 7, firstName: 'Ada', lastName: 'Adviser' },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();

    await triggerRegeneration(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json.mock.calls[0][0].curriculumMigrationRecommendation).toEqual(
      expect.objectContaining({
        recommended: true,
        curriculumId: 2024,
        curriculumName: 'BS CPE Curriculum 2024',
        remainingCourseCount: 1,
        coveredCourseCount: 1,
      }),
    );
  });

  test('does not recommend curriculum conversion when no active curriculum covers all remaining courses', async () => {
    const remaining = makeCourse({ id: 1501, code: 'CPE 421', units: 3 });
    const unrelated = makeCourse({ id: 2501, code: 'CPE 999', units: 3 });

    const sar = {
      id: 59,
      curriculumId: 2018,
      programId: 9,
      userId: 65,
      electiveTrackId: null,
      StudyPlan: { id: 99 },
    };

    const activeVersion = {
      id: 29,
      studyPlanId: sar.StudyPlan.id,
      status: 'active',
      StudyPlanCourses: [
        {
          id: 15010,
          courseId: remaining.id,
          Course: remaining,
          yearLevel: 4,
          semester: 2,
          grade: null,
          status: 'pending',
        },
      ],
    };

    StudentAcademicRecord.findByPk.mockResolvedValue(sar);
    User.findByPk.mockResolvedValue({ id: sar.userId, student_type: 'irregular' });
    Curriculum.findByPk.mockResolvedValue({
      id: sar.curriculumId,
      name: 'BS CPE Curriculum 2018',
      isActive: false,
      programId: sar.programId,
    });
    InactiveCurriculumRegenerationRequest.findOne.mockResolvedValue({
      id: 33,
      status: 'approved',
      studyPlanVersionId: activeVersion.id,
    });
    StudyPlanVersion.findOne
      .mockResolvedValueOnce(activeVersion)
      .mockResolvedValueOnce({ id: activeVersion.id, versionNumber: 1 });
    StudyPlanVersion.create.mockResolvedValue({ id: 108, versionNumber: 2 });
    StudyPlanVersion.findByPk.mockResolvedValue({
      id: 108,
      versionNumber: 2,
      StudyPlanCourses: [],
    });
    CurriculumCourse.findAll.mockResolvedValue([
      {
        curriculumId: sar.curriculumId,
        courseId: remaining.id,
        Course: remaining,
        yearLevel: 4,
        semester: 2,
        isElective: false,
      },
    ]);
    Curriculum.findAll.mockResolvedValue([
      {
        id: 2024,
        name: 'BS CPE Curriculum 2024',
        isActive: true,
        CurriculumCourses: [
          {
            curriculumId: 2024,
            courseId: unrelated.id,
            Course: unrelated,
            yearLevel: 4,
            semester: 1,
            isElective: false,
          },
        ],
      },
    ]);
    Prerequisite.findAll.mockResolvedValue([]);

    const req = {
      params: { id: String(sar.id) },
      body: {},
      user: { id: 7, firstName: 'Ada', lastName: 'Adviser' },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();

    await triggerRegeneration(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json.mock.calls[0][0].curriculumMigrationRecommendation).toBeNull();
  });
});
