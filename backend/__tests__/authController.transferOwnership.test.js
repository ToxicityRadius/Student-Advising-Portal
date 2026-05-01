jest.mock('../models', () => ({
  User: {
    findByPk: jest.fn(),
    update: jest.fn(),
  },
  UserProgramAssignment: {
    findAll: jest.fn(),
    bulkCreate: jest.fn(),
  },
  Program: {
    findOne: jest.fn(),
  },
}));

jest.mock('../utils/email', () => ({
  sendActivationEmail: jest.fn(),
  sendVerificationCode: jest.fn(),
  sendEmailChangeVerificationCode: jest.fn(),
}));

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const { User, UserProgramAssignment } = require('../models');
const { transferOwnership } = require('../controllers/authController');

describe('authController.transferOwnership', () => {
  const buildRes = () => {
    const res = {};
    res.status = jest.fn(() => res);
    res.json = jest.fn(() => res);
    return res;
  };

  const next = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
    User.update.mockResolvedValue([1]);
    UserProgramAssignment.bulkCreate.mockResolvedValue([]);
  });

  test('blocks Program Chair users from transferring ownership', async () => {
    User.findByPk
      .mockResolvedValueOnce({ id: 1, role: 'admin' })
      .mockResolvedValueOnce({ id: 2, role: 'adviser' });

    const req = { user: { id: 1, role: 'admin' }, body: { targetUserId: 2 } };
    const res = buildRes();

    await transferOwnership(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Only Super Admin can transfer Program Chair ownership',
    });
    expect(User.update).not.toHaveBeenCalled();
    expect(UserProgramAssignment.findAll).not.toHaveBeenCalled();
  });

  test('allows Super Admin to promote an assigned adviser to Program Chair', async () => {
    User.findByPk
      .mockResolvedValueOnce({ id: 1, role: 'superadmin' })
      .mockResolvedValueOnce({ id: 2, role: 'adviser' });
    UserProgramAssignment.findAll.mockResolvedValueOnce([{ programId: 10 }]);

    const req = { user: { id: 1, role: 'superadmin' }, body: { targetUserId: 2 } };
    const res = buildRes();

    await transferOwnership(req, res, next);

    expect(User.update).toHaveBeenCalledWith(
      { role: 'admin', updatedAt: expect.any(Number) },
      { where: { id: 2 } },
    );
    expect(User.update).toHaveBeenCalledTimes(1);
    expect(UserProgramAssignment.bulkCreate).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('requires the promoted adviser to already have an assigned program', async () => {
    User.findByPk
      .mockResolvedValueOnce({ id: 1, role: 'superadmin' })
      .mockResolvedValueOnce({ id: 2, role: 'adviser' });
    UserProgramAssignment.findAll.mockResolvedValueOnce([]);

    const req = { user: { id: 1, role: 'superadmin' }, body: { targetUserId: 2 } };
    const res = buildRes();

    await transferOwnership(req, res, next);

    expect(User.update).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Target adviser must be assigned to a program before transfer',
    });
  });
});
