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
    jest.clearAllMocks();
    User.update.mockResolvedValue([1]);
    UserProgramAssignment.bulkCreate.mockResolvedValue([]);
  });

  test('blocks transfer to an adviser outside the Program Chair assigned scope', async () => {
    User.findByPk
      .mockResolvedValueOnce({ id: 1, role: 'admin' })
      .mockResolvedValueOnce({ id: 2, role: 'adviser' });
    UserProgramAssignment.findAll
      .mockResolvedValueOnce([{ programId: 10 }])
      .mockResolvedValueOnce([{ programId: 20 }]);

    const req = { user: { id: 1, role: 'admin' }, body: { targetUserId: 2 } };
    const res = buildRes();

    await transferOwnership(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Target adviser is outside your assigned program scope',
    });
    expect(User.update).not.toHaveBeenCalled();
  });

  test('allows transfer to an adviser with an overlapping assigned program', async () => {
    User.findByPk
      .mockResolvedValueOnce({ id: 1, role: 'admin' })
      .mockResolvedValueOnce({ id: 2, role: 'adviser' });
    UserProgramAssignment.findAll
      .mockResolvedValueOnce([{ programId: 10 }])
      .mockResolvedValueOnce([{ programId: 10 }])
      .mockResolvedValueOnce([{ programId: 10 }]);

    const req = { user: { id: 1, role: 'admin' }, body: { targetUserId: 2 } };
    const res = buildRes();

    await transferOwnership(req, res, next);

    expect(User.update).toHaveBeenCalledWith(
      { role: 'admin', updatedAt: expect.any(Number) },
      { where: { id: 2 } },
    );
    expect(User.update).toHaveBeenCalledWith(
      { role: 'adviser', updatedAt: expect.any(Number) },
      { where: { id: 1 } },
    );
    expect(UserProgramAssignment.bulkCreate).toHaveBeenCalledWith(
      [
        {
          userId: 2,
          programId: 10,
          createdAt: expect.any(Number),
          updatedAt: expect.any(Number),
        },
      ],
      { ignoreDuplicates: true },
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
