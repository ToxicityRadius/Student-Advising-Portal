const { Op } = require('sequelize');

jest.mock('../models', () => ({
  User: {
    findAndCountAll: jest.fn(),
  },
  AcademicTerm: {
    findOne: jest.fn(),
  },
  Curriculum: {
    findAll: jest.fn(),
  },
  Program: {},
}));

jest.mock('../utils/sanitize', () => ({
  sanitizeUserWithProfile: jest.fn((user) => user),
}));

jest.mock('../utils/programAccess', () => ({
  buildProgramWhere: jest.fn().mockResolvedValue({ allowed: true, programIds: [10] }),
  isProgramChair: jest.fn((user) => user?.role === 'admin'),
}));

const { User } = require('../models');
const { buildProgramWhere } = require('../utils/programAccess');
const UserService = require('../services/UserService');

describe('UserService.listUsers operations filters', () => {
  const paginationParams = {
    page: 1,
    pageSize: 20,
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'DESC',
    offset: 0,
    limit: 20,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    User.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
  });

  test('applies active status and adviser filters', async () => {
    await UserService.listUsers({
      paginationParams,
      roleFilter: 'student',
      status: 'active',
      adviserId: '15',
      requestUser: { id: 1, role: 'superadmin' },
    });

    expect(User.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          role: 'student',
          isActive: true,
          adviserId: 15,
        }),
      }),
    );
  });

  test('includes assigned adviser and assigned programs in user rows', async () => {
    await UserService.listUsers({
      paginationParams,
      requestUser: { id: 1, role: 'superadmin' },
    });

    const include = User.findAndCountAll.mock.calls[0][0].include;
    expect(include).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ as: 'AssignedPrograms' }),
        expect.objectContaining({ as: 'Adviser' }),
      ]),
    );
  });

  test('limits Program Chair user listings to students and advisers in assigned programs', async () => {
    await UserService.listUsers({
      paginationParams,
      requestUser: { id: 7, role: 'admin' },
    });

    expect(buildProgramWhere).toHaveBeenCalledWith({ id: 7, role: 'admin' }, undefined);
    expect(User.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          [Op.and]: [
            { role: { [Op.in]: ['student', 'adviser'] } },
            {
              [Op.or]: [
                { '$AssignedPrograms.id$': { [Op.in]: [10] } },
                { '$CurriculumRef.programId$': { [Op.in]: [10] } },
              ],
            },
          ],
        },
      }),
    );
  });

  test('prevents Program Chair from listing Program Chair or Super Admin rows', async () => {
    await UserService.listUsers({
      paginationParams,
      roleFilter: 'admin',
      requestUser: { id: 7, role: 'admin' },
    });

    expect(User.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          [Op.and]: [
            { role: 'admin', id: null },
            {
              [Op.or]: [
                { '$AssignedPrograms.id$': { [Op.in]: [10] } },
                { '$CurriculumRef.programId$': { [Op.in]: [10] } },
              ],
            },
          ],
        },
      }),
    );
  });
});
