const { Op } = require('sequelize');

jest.mock('../models', () => ({
  InactiveCurriculumRegenerationRequest: {
    findOne: jest.fn(),
    create: jest.fn(),
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
  },
  StudentAcademicRecord: {
    findByPk: jest.fn(),
  },
  StudyPlan: {},
  StudyPlanVersion: {
    findOne: jest.fn(),
  },
  Curriculum: {
    findByPk: jest.fn(),
  },
  Program: {},
  User: {
    findAll: jest.fn(),
  },
}));

jest.mock('../services/NotificationService', () => ({
  notify: jest.fn(),
}));

jest.mock('../services/ActivityLogService', () => ({
  logSafe: jest.fn(),
}));

jest.mock('../utils/pagination', () => ({
  parsePaginationParams: jest.fn(() => ({
    page: 1,
    pageSize: 10,
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'DESC',
    offset: 0,
    limit: 10,
  })),
  buildPaginatedPayload: jest.fn(({ items, page, pageSize, totalItems }) => ({
    items,
    meta: { page, pageSize, totalItems },
  })),
}));

jest.mock('../utils/programAccess', () => ({
  buildProgramWhere: jest
    .fn()
    .mockResolvedValue({ allowed: true, where: { programId: 4 }, programIds: [4] }),
  canReadProgram: jest.fn().mockResolvedValue(true),
  canManageProgram: jest.fn().mockResolvedValue(true),
  isSuperadmin: jest.fn((user) => user?.role === 'superadmin'),
  normalizeProgramId: jest.fn((value) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }),
}));

const {
  InactiveCurriculumRegenerationRequest,
  StudentAcademicRecord,
  StudyPlanVersion,
  Curriculum,
  User,
} = require('../models');
const NotificationService = require('../services/NotificationService');
const {
  requestInactiveCurriculumRegenerationApproval,
  listInactiveCurriculumRegenerationRequests,
  decideInactiveCurriculumRegenerationRequest,
} = require('../controllers/inactiveCurriculumRegenerationController');

const makeResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const toModel = (plain) => ({
  ...plain,
  get: jest.fn(() => plain),
  update: jest.fn(async (updates) => Object.assign(plain, updates)),
});

describe('inactiveCurriculumRegenerationController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates a pending request and notifies Program Chairs before inactive regeneration', async () => {
    const sar = {
      id: 42,
      studentName: 'Ada Student',
      curriculumId: 2018,
      programId: 4,
      StudyPlan: { id: 88 },
    };
    const curriculum = { id: 2018, name: 'BS CPE Curriculum 2018', isActive: false };
    const activeVersion = { id: 7, versionNumber: 1, status: 'active' };
    const created = toModel({
      id: 5,
      studentAcademicRecordId: sar.id,
      curriculumId: curriculum.id,
      studyPlanVersionId: activeVersion.id,
      programId: sar.programId,
      status: 'pending',
      reason: 'Student needs regeneration from inactive curriculum.',
      requestedByAdviserId: 3,
    });

    StudentAcademicRecord.findByPk.mockResolvedValue(sar);
    Curriculum.findByPk.mockResolvedValue(curriculum);
    StudyPlanVersion.findOne.mockResolvedValue(activeVersion);
    InactiveCurriculumRegenerationRequest.findOne.mockResolvedValue(null);
    InactiveCurriculumRegenerationRequest.create.mockResolvedValue(created);
    User.findAll.mockResolvedValue([{ id: 9 }]);

    const req = {
      params: { id: String(sar.id) },
      body: { reason: 'Student needs regeneration from inactive curriculum.' },
      user: { id: 3, role: 'adviser', firstName: 'Grace', lastName: 'Adviser' },
    };
    const res = makeResponse();
    const next = jest.fn();

    await requestInactiveCurriculumRegenerationApproval(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(InactiveCurriculumRegenerationRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        studentAcademicRecordId: sar.id,
        curriculumId: curriculum.id,
        studyPlanVersionId: activeVersion.id,
        programId: sar.programId,
        status: 'pending',
        requestedByAdviserId: req.user.id,
      }),
    );
    expect(NotificationService.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: 9,
        category: 'inactive_curriculum_regeneration_requested',
      }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('lists inactive curriculum regeneration requests within Program Chair scope', async () => {
    InactiveCurriculumRegenerationRequest.findAndCountAll.mockResolvedValue({
      rows: [],
      count: 0,
    });

    const req = {
      user: { id: 1, role: 'admin' },
      query: { status: 'pending', programId: '4' },
    };
    const res = makeResponse();
    const next = jest.fn();

    await listInactiveCurriculumRegenerationRequests(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(InactiveCurriculumRegenerationRequest.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'pending',
          programId: 4,
        }),
        distinct: true,
      }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('lets Program Chair approve an inactive-curriculum regeneration request', async () => {
    const request = toModel({
      id: 12,
      status: 'pending',
      programId: 4,
      requestedByAdviserId: 3,
      curriculumId: 2018,
      Curriculum: { id: 2018, name: 'BS CPE Curriculum 2018' },
      StudentAcademicRecord: { id: 42, studentName: 'Ada Student', programId: 4 },
      StudyPlanVersion: { id: 7, versionNumber: 1 },
    });
    const updated = toModel({
      ...request.get(),
      status: 'approved',
      DecidedByAdmin: { id: 1, firstName: 'Chair', lastName: 'Person' },
    });

    InactiveCurriculumRegenerationRequest.findByPk
      .mockResolvedValueOnce(request)
      .mockResolvedValueOnce(updated);

    const req = {
      params: { id: String(request.id) },
      body: { status: 'approved', decisionNotes: 'Approved for migration planning.' },
      user: { id: 1, role: 'admin' },
    };
    const res = makeResponse();
    const next = jest.fn();

    await decideInactiveCurriculumRegenerationRequest(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(request.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'approved',
        decisionNotes: 'Approved for migration planning.',
        decidedByAdminId: req.user.id,
      }),
    );
    expect(NotificationService.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: 3,
        category: 'inactive_curriculum_regeneration_approved',
      }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
