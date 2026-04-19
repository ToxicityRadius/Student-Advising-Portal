jest.mock('../models', () => ({
  User: {
    update: jest.fn(),
    findByPk: jest.fn(),
  },
  AcademicTerm: {
    findOne: jest.fn(),
  },
  Curriculum: {
    findAll: jest.fn(),
  },
}));

jest.mock('../services/UserService', () => ({
  NO_ACTIVE_TERM_KEY: 'NO_ACTIVE_TERM',
  getTermKey: jest.fn(),
  getStudentProfileLockMeta: jest.fn(),
  listUsers: jest.fn(),
  getCurriculumOptions: jest.fn(),
}));

jest.mock('../utils/jwt', () => ({
  generateToken: jest.fn(() => 'test-token'),
}));

jest.mock('../utils/sarLinking', () => ({
  linkStudentAccountToSar: jest.fn(),
  syncProfileToSar: jest.fn(),
}));

jest.mock('../utils/pagination', () => ({
  parsePaginationParams: jest.fn(),
  buildPaginatedPayload: jest.fn(),
}));

jest.mock('../utils/profileStorage', () => ({
  uploadProfilePicture: jest.fn(),
  deleteProfilePictureAsset: jest.fn(),
}));

jest.mock('../utils/imageValidation', () => ({
  validateUploadedImageFile: jest.fn(),
}));

jest.mock('../utils/sanitize', () => ({
  sanitizeUserWithProfile: jest.fn((user) => user),
}));

const { User } = require('../models');
const { updateUser } = require('../controllers/userController');

describe('userController.updateUser', () => {
  const buildRes = () => {
    const res = {};
    res.status = jest.fn(() => res);
    res.json = jest.fn(() => res);
    return res;
  };

  const next = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('keeps camelCase and snake_case name aliases synchronized on admin updates', async () => {
    User.findByPk.mockResolvedValueOnce({ id: 3 }).mockResolvedValueOnce({
      id: 3,
      firstName: 'Ada',
      first_name: 'Ada',
      lastName: 'Lovelace',
      last_name: 'Lovelace',
      email: 'ada@example.com',
      role: 'adviser',
      isActive: true,
    });

    const req = {
      params: { id: '3' },
      body: {
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        role: 'adviser',
        isActive: true,
      },
    };
    const res = buildRes();

    await updateUser(req, res, next);

    expect(User.update).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: 'Ada',
        first_name: 'Ada',
        lastName: 'Lovelace',
        last_name: 'Lovelace',
        email: 'ada@example.com',
        role: 'adviser',
        isActive: true,
        updatedAt: expect.any(Number),
      }),
      { where: { id: '3' } },
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'User updated successfully',
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });
});
