jest.mock('../models', () => ({
  StudentAcademicRecord: {
    findAndCountAll: jest.fn(),
  },
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
  Program: {},
}));

jest.mock('../utils/programAccess', () => ({
  buildProgramWhere: jest
    .fn()
    .mockResolvedValue({ allowed: true, where: { programId: 22 }, programIds: [22] }),
  canReadProgram: jest.fn(),
  isProgramChair: jest.fn((user) => user?.role === 'admin'),
}));

jest.mock('../utils/sarAnalytics', () => ({
  computeSarAnalytics: jest.fn(),
}));

const { StudentAcademicRecord } = require('../models');
const { buildProgramWhere } = require('../utils/programAccess');
const SARService = require('../services/SARService');

describe('SARService.listSARs queue filters', () => {
  const paginationParams = {
    page: 1,
    pageSize: 20,
    search: '',
    sortBy: 'studentName',
    sortOrder: 'ASC',
    offset: 0,
    limit: 20,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    StudentAcademicRecord.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
  });

  test('filters adviser assigned queue through student adviser assignment', async () => {
    await SARService.listSARs({
      user: { id: 9, role: 'adviser' },
      paginationParams,
      scope: 'assigned',
    });

    expect(StudentAcademicRecord.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          '$Student.adviserId$': 9,
        }),
      }),
    );
    expect(buildProgramWhere).not.toHaveBeenCalled();
  });

  test('combines program, missing plan, and missing elective track filters', async () => {
    await SARService.listSARs({
      user: { id: 2, role: 'admin' },
      paginationParams,
      programId: 22,
      hasStudyPlan: 'false',
      electiveTrackStatus: 'missing',
    });

    expect(StudentAcademicRecord.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          programId: 22,
          '$StudyPlan.id$': null,
          electiveTrackId: null,
        }),
        include: expect.arrayContaining([
          expect.objectContaining({ model: expect.anything(), required: false }),
        ]),
      }),
    );
  });

  test('applies optional program scoping for adviser program-filtered SAR reads', async () => {
    await SARService.listSARs({
      user: { id: 9, role: 'adviser' },
      paginationParams,
      programId: 22,
    });

    expect(buildProgramWhere).toHaveBeenCalledWith({ id: 9, role: 'adviser' }, 22);
    expect(StudentAcademicRecord.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          programId: 22,
        }),
      }),
    );
  });
});
