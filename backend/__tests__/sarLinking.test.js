jest.mock('../models', () => ({
  StudentAcademicRecord: {
    findOne: jest.fn(),
  },
  User: {
    findByPk: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
}));

const { User } = require('../models');
const logger = require('../utils/logger');
const { syncSarToProfile } = require('../utils/sarLinking');

describe('sarLinking.syncSarToProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('updates both camelCase and snake_case aliases when one alias is stale', async () => {
    User.findByPk.mockResolvedValue({
      id: 7,
      studentId: '2023001',
      firstName: 'Old',
      first_name: 'Ada',
      lastName: 'Outdated',
      last_name: 'Lovelace',
    });

    const result = await syncSarToProfile({
      id: 5,
      userId: 7,
      studentNumber: '2023001',
      studentName: 'Ada Lovelace',
    });

    expect(User.update).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: 'Ada',
        first_name: 'Ada',
        lastName: 'Lovelace',
        last_name: 'Lovelace',
        updatedAt: expect.any(Number),
      }),
      { where: { id: 7 }, transaction: undefined },
    );

    expect(result.synced).toBe(true);
    expect(result.fields).toEqual(
      expect.arrayContaining(['firstName', 'first_name', 'lastName', 'last_name']),
    );
    expect(logger.info).toHaveBeenCalled();
  });

  test('returns no-changes when aliases are already synchronized', async () => {
    User.findByPk.mockResolvedValue({
      id: 7,
      studentId: '2023001',
      firstName: 'Ada',
      first_name: 'Ada',
      lastName: 'Lovelace',
      last_name: 'Lovelace',
    });

    const result = await syncSarToProfile({
      id: 5,
      userId: 7,
      studentNumber: '2023001',
      studentName: 'Ada Lovelace',
    });

    expect(User.update).not.toHaveBeenCalled();
    expect(result).toEqual({ synced: false, reason: 'no-changes' });
  });

  test('does not overwrite existing first name when SAR has a single-token name', async () => {
    User.findByPk.mockResolvedValue({
      id: 7,
      studentId: '2023001',
      firstName: 'Ada Marie',
      first_name: 'Ada Marie',
      lastName: 'Lovelace',
      last_name: 'Lovelace',
    });

    const result = await syncSarToProfile({
      id: 5,
      userId: 7,
      studentNumber: '2023001',
      studentName: 'Ada',
    });

    expect(User.update).not.toHaveBeenCalled();
    expect(result).toEqual({ synced: false, reason: 'no-changes' });
  });

  test('fills empty first-name aliases when SAR has a single-token name', async () => {
    User.findByPk.mockResolvedValue({
      id: 7,
      studentId: '2023001',
      firstName: '',
      first_name: '',
      lastName: 'Lovelace',
      last_name: 'Lovelace',
    });

    const result = await syncSarToProfile({
      id: 5,
      userId: 7,
      studentNumber: '2023001',
      studentName: 'Ada',
    });

    expect(User.update).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: 'Ada',
        first_name: 'Ada',
        updatedAt: expect.any(Number),
      }),
      { where: { id: 7 }, transaction: undefined },
    );
    expect(result.synced).toBe(true);
  });
});
