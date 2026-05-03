jest.mock('../models', () => ({
  StudentAcademicRecord: {},
  StudyPlan: {},
  StudyPlanVersion: {},
  StudyPlanCourse: {},
  Curriculum: {},
  CurriculumCourse: {},
  Prerequisite: {},
  PrerequisiteOverrideRequest: {},
  AcademicTerm: {},
  Course: {},
  ElectiveTrack: {},
  ElectiveTrackCourse: {},
  User: {},
  Program: {
    findOne: jest.fn(),
  },
}));

jest.mock('../utils/programAccess', () => ({
  buildProgramWhere: jest.fn(),
  canReadProgram: jest.fn(),
  isProgramChair: jest.fn((user) => user?.role === 'admin'),
  isSuperadmin: jest.fn((user) => user?.role === 'superadmin'),
}));

jest.mock('../utils/sarAnalytics', () => ({
  computeSarAnalytics: jest.fn(),
}));

const { Program } = require('../models');
const SARService = require('../services/SARService');

describe('SARService.authorizeSARProfileProgramUpdate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rejects program changes from non-superadmin users', async () => {
    const result = await SARService.authorizeSARProfileProgramUpdate({
      profileUpdates: { program: 'BSIT', contact_number: '09170000000' },
      linkedStudent: { program: 'BSCpE' },
      user: { id: 7, role: 'adviser' },
    });

    expect(result.error).toEqual({
      status: 403,
      message: 'Only Super Admin can change the program',
    });
    expect(result.profileUpdates).toBeNull();
    expect(Program.findOne).not.toHaveBeenCalled();
  });

  test('ignores unchanged program values from non-superadmin users', async () => {
    const result = await SARService.authorizeSARProfileProgramUpdate({
      profileUpdates: { program: 'BSCpE', contact_number: '09170000000' },
      linkedStudent: { program: 'BSCpE' },
      user: { id: 7, role: 'adviser' },
    });

    expect(result.error).toBeNull();
    expect(result.profileUpdates).toEqual({ contact_number: '09170000000' });
    expect(Program.findOne).not.toHaveBeenCalled();
  });

  test('allows superadmin users to change program to a database program code', async () => {
    Program.findOne.mockResolvedValue({ code: 'BSIT', name: 'Information Technology' });

    const result = await SARService.authorizeSARProfileProgramUpdate({
      profileUpdates: { program: 'BSIT', contact_number: '09170000000' },
      linkedStudent: { program: 'BSCpE' },
      user: { id: 1, role: 'superadmin' },
    });

    expect(result.error).toBeNull();
    expect(result.profileUpdates).toEqual({ program: 'BSIT', contact_number: '09170000000' });
    expect(Program.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.any(Object),
      }),
    );
  });

  test('rejects superadmin program changes when the selected program does not exist', async () => {
    Program.findOne.mockResolvedValue(null);

    const result = await SARService.authorizeSARProfileProgramUpdate({
      profileUpdates: { program: 'UNKNOWN' },
      linkedStudent: { program: 'BSCpE' },
      user: { id: 1, role: 'superadmin' },
    });

    expect(result.error).toEqual({
      status: 400,
      message: 'Selected program does not exist',
    });
    expect(result.profileUpdates).toBeNull();
  });
});
