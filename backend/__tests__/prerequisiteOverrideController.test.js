const { Op } = require('sequelize');

jest.mock('../models', () => ({
  PrerequisiteOverrideRequest: {
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
  },
  StudentAcademicRecord: {},
  StudyPlanVersion: {},
  Course: {},
  User: {},
  Program: {},
}));

jest.mock('../services/NotificationService', () => ({
  notify: jest.fn(),
}));

jest.mock('../utils/pagination', () => ({
  parsePaginationParams: jest.fn(() => ({
    page: 2,
    pageSize: 5,
    search: 'ada',
    sortBy: 'createdAt',
    sortOrder: 'DESC',
    offset: 5,
    limit: 5,
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
  isSuperadmin: jest.fn((user) => user?.role === 'superadmin'),
  normalizeProgramId: jest.fn((value) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }),
}));

const { PrerequisiteOverrideRequest } = require('../models');
const { buildProgramWhere } = require('../utils/programAccess');
const { listPrerequisiteOverrides } = require('../controllers/prerequisiteOverrideController');

describe('prerequisiteOverrideController list', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    PrerequisiteOverrideRequest.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
  });

  test('returns paginated override rows with status, search, and program filters', async () => {
    const req = {
      user: { id: 1, role: 'admin' },
      query: { status: 'pending', search: 'ada', programId: '4' },
    };
    const res = { status: jest.fn(() => res), json: jest.fn(() => res) };
    const next = jest.fn();

    await listPrerequisiteOverrides(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(PrerequisiteOverrideRequest.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          [Op.and]: expect.arrayContaining([
            expect.objectContaining({ status: 'pending' }),
            expect.objectContaining({ programId: 4 }),
          ]),
        }),
        offset: 5,
        limit: 5,
        distinct: true,
      }),
    );
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      items: [],
      meta: { page: 2, pageSize: 5, totalItems: 0 },
    });
  });

  test('denies Program Chair override reads outside assigned program scope', async () => {
    buildProgramWhere.mockResolvedValueOnce({ allowed: false, where: {}, programIds: [] });
    const req = {
      user: { id: 1, role: 'admin' },
      query: { programId: '99' },
    };
    const res = { status: jest.fn(() => res), json: jest.fn(() => res) };
    const next = jest.fn();

    await listPrerequisiteOverrides(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(PrerequisiteOverrideRequest.findAndCountAll).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
