jest.mock('../models', () => ({
  Program: {
    findOne: jest.fn(),
  },
  UserProgramAssignment: {
    findAll: jest.fn(),
  },
}));

const { Program, UserProgramAssignment } = require('../models');
const {
  ROLE_SUPERADMIN,
  ROLE_PROGRAM_CHAIR,
  isSuperadmin,
  getAccessibleProgramIds,
  canManageProgram,
} = require('../utils/programAccess');

describe('programAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Program.findOne.mockResolvedValue({ id: 1 });
  });

  test('identifies superadmin and program chair roles', () => {
    expect(isSuperadmin({ role: ROLE_SUPERADMIN })).toBe(true);
    expect(isSuperadmin({ role: ROLE_PROGRAM_CHAIR })).toBe(false);
  });

  test('superadmin has global program access', async () => {
    await expect(getAccessibleProgramIds({ id: 1, role: ROLE_SUPERADMIN })).resolves.toBeNull();
    expect(UserProgramAssignment.findAll).not.toHaveBeenCalled();
  });

  test('program chair access comes from user program assignments', async () => {
    UserProgramAssignment.findAll.mockResolvedValue([
      { programId: 10 },
      { programId: 11 },
      { programId: 10 },
    ]);

    await expect(getAccessibleProgramIds({ id: 2, role: ROLE_PROGRAM_CHAIR })).resolves.toEqual([
      10, 11,
    ]);
  });

  test('program chair can manage assigned programs only', async () => {
    UserProgramAssignment.findAll.mockResolvedValue([{ programId: 20 }]);

    await expect(canManageProgram({ id: 3, role: ROLE_PROGRAM_CHAIR }, 20)).resolves.toBe(true);
    await expect(canManageProgram({ id: 3, role: ROLE_PROGRAM_CHAIR }, 21)).resolves.toBe(false);
  });

  test('advisers can read assigned programs but cannot manage them', async () => {
    UserProgramAssignment.findAll.mockResolvedValue([{ programId: 30 }]);

    await expect(getAccessibleProgramIds({ id: 4, role: 'adviser' })).resolves.toEqual([30]);
    await expect(canManageProgram({ id: 4, role: 'adviser' }, 30)).resolves.toBe(false);
  });

  test('unassigned staff have no implicit default-program access', async () => {
    UserProgramAssignment.findAll.mockResolvedValue([]);

    await expect(getAccessibleProgramIds({ id: 5, role: ROLE_PROGRAM_CHAIR })).resolves.toEqual([]);
    expect(Program.findOne).not.toHaveBeenCalled();
  });
});
