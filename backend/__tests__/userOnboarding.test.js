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
  computeProfileCompletionScore: jest.fn(() => 0),
}));

const { User } = require('../models');
const { completeOnboarding } = require('../controllers/userController');

describe('userController.completeOnboarding', () => {
  const buildReq = (body) => ({
    body,
    user: { id: 7 },
  });

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
    User.findByPk.mockResolvedValue({ id: 7, current_year_level: 2, sex: 'Male' });
  });

  test('persists onboarding with current_year_level and sex', async () => {
    const req = buildReq({
      current_year_level: 2,
      program: 'BSCpE',
      curriculum_id: 1,
      student_type: 'regular',
      sex: 'Male',
    });
    const res = buildRes();

    await completeOnboarding(req, res, next);

    expect(User.update).toHaveBeenCalledWith(
      expect.objectContaining({
        current_year_level: 2,
        program: 'BSCpE',
        curriculum_id: 1,
        student_type: 'regular',
        sex: 'Male',
        is_onboarded: true,
      }),
      { where: { id: 7 } },
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'Onboarding completed successfully',
      }),
    );
  });

  test('rejects onboarding when both sex and gender are missing', async () => {
    const req = buildReq({
      current_year_level: 2,
      program: 'BSCpE',
      curriculum_id: 1,
      student_type: 'regular',
    });
    const res = buildRes();

    await completeOnboarding(req, res, next);

    expect(User.update).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'sex or gender is required' }),
    );
  });

  test('rejects onboarding when sex and gender mismatch', async () => {
    const req = buildReq({
      current_year_level: 2,
      program: 'BSCpE',
      curriculum_id: 1,
      student_type: 'regular',
      sex: 'Male',
      gender: 'Female',
    });
    const res = buildRes();

    await completeOnboarding(req, res, next);

    expect(User.update).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'sex and gender must match when both are provided',
      }),
    );
  });

  test('accepts gender alias and persists it as sex', async () => {
    const req = buildReq({
      current_year_level: 3,
      curriculum_id: 2,
      student_type: 'irregular',
      gender: 'Female',
    });
    const res = buildRes();

    await completeOnboarding(req, res, next);

    expect(User.update).toHaveBeenCalledWith(
      expect.objectContaining({
        current_year_level: 3,
        curriculum_id: 2,
        student_type: 'irregular',
        sex: 'Female',
      }),
      { where: { id: 7 } },
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
