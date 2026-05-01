const { Op } = require('sequelize');

jest.mock('../models', () => ({
  ActivityLog: {
    findAndCountAll: jest.fn(),
  },
  Program: {},
  StudentAcademicRecord: {
    findByPk: jest.fn(),
  },
  User: {},
}));

jest.mock('../utils/pagination', () => ({
  parsePaginationParams: jest.fn(() => ({
    page: 1,
    pageSize: 50,
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'DESC',
    offset: 0,
    limit: 50,
  })),
  buildPaginatedPayload: jest.fn(({ items, page, pageSize, totalItems }) => ({
    items,
    meta: { page, pageSize, totalItems },
  })),
}));

jest.mock('../utils/programAccess', () => ({
  buildProgramWhere: jest.fn(),
  canReadProgram: jest.fn(),
  isSuperadmin: jest.fn((user) => user?.role === 'superadmin'),
  normalizeProgramId: jest.fn((value) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }),
}));

const { ActivityLog, StudentAcademicRecord } = require('../models');
const { parsePaginationParams } = require('../utils/pagination');
const { buildProgramWhere, canReadProgram } = require('../utils/programAccess');
const { listActivity } = require('../controllers/activityController');

describe('activityController listActivity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    parsePaginationParams.mockReturnValue({
      page: 1,
      pageSize: 50,
      search: '',
      sortBy: 'createdAt',
      sortOrder: 'DESC',
      offset: 0,
      limit: 50,
    });
    ActivityLog.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
  });

  test('allows adviser SAR-scoped timeline reads without assignment scoping', async () => {
    StudentAcademicRecord.findByPk.mockResolvedValue({ id: 42, programId: 8 });
    const req = {
      user: { id: 5, role: 'adviser' },
      query: { resourceType: 'sar', resourceId: '42', pageSize: '50' },
    };
    const res = { status: jest.fn(() => res), json: jest.fn(() => res) };
    const next = jest.fn();

    await listActivity(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(buildProgramWhere).not.toHaveBeenCalled();
    expect(ActivityLog.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          [Op.and]: [{ resourceType: 'sar', resourceId: '42' }, { programId: 8 }],
        },
        offset: 0,
        limit: 50,
      }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('blocks Program Chair SAR timelines outside assigned programs', async () => {
    StudentAcademicRecord.findByPk.mockResolvedValue({ id: 42, programId: 8 });
    canReadProgram.mockResolvedValue(false);
    const req = {
      user: { id: 6, role: 'admin' },
      query: { resourceType: 'sar', resourceId: '42' },
    };
    const res = { status: jest.fn(() => res), json: jest.fn(() => res) };
    const next = jest.fn();

    await listActivity(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(canReadProgram).toHaveBeenCalledWith(req.user, 8);
    expect(ActivityLog.findAndCountAll).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('allows Super Admin global activity reads without forcing program scope', async () => {
    buildProgramWhere.mockResolvedValue({ allowed: true, where: {}, programIds: null });
    const req = { user: { id: 1, role: 'superadmin' }, query: {} };
    const res = { status: jest.fn(() => res), json: jest.fn(() => res) };
    const next = jest.fn();

    await listActivity(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(buildProgramWhere).toHaveBeenCalledWith(req.user, null);
    expect(ActivityLog.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
        offset: 0,
        limit: 50,
      }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('applies program, resource, actor, action, search, and pagination filters', async () => {
    parsePaginationParams.mockReturnValueOnce({
      page: 2,
      pageSize: 10,
      search: 'term',
      sortBy: 'action',
      sortOrder: 'ASC',
      offset: 10,
      limit: 10,
    });
    buildProgramWhere.mockResolvedValue({
      allowed: true,
      where: { programId: 8 },
      programIds: [8],
    });
    const req = {
      user: { id: 6, role: 'admin' },
      query: {
        programId: '8',
        resourceType: 'term',
        actorId: '5',
        action: 'term.activated',
        search: 'term',
      },
    };
    const res = { status: jest.fn(() => res), json: jest.fn(() => res) };
    const next = jest.fn();

    await listActivity(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(buildProgramWhere).toHaveBeenCalledWith(req.user, 8);
    expect(ActivityLog.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          [Op.and]: [
            { resourceType: 'term', actorId: 5, action: 'term.activated' },
            { programId: { [Op.in]: [8] } },
            {
              [Op.or]: [
                { action: { [Op.iLike]: '%term%' } },
                { resourceType: { [Op.iLike]: '%term%' } },
                { resourceLabel: { [Op.iLike]: '%term%' } },
              ],
            },
          ],
        },
        order: [
          ['action', 'ASC'],
          ['id', 'DESC'],
        ],
        offset: 10,
        limit: 10,
      }),
    );
  });
});
