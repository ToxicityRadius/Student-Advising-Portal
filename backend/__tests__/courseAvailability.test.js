process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://user:pass@localhost:5432/test';

jest.mock('../models', () => ({
  CurriculumCourse: {
    findAll: jest.fn(),
  },
  Curriculum: {},
  Course: {},
}));

const { getCrossCurriculumAvailability } = require('../utils/courseAvailability');
const { CurriculumCourse } = require('../models');

describe('course availability utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('marks inactive curriculum offerings unavailable while active curriculums remain recurring options', async () => {
    CurriculumCourse.findAll.mockResolvedValue([
      {
        courseId: 101,
        yearLevel: 1,
        semester: 1,
        Curriculum: {
          id: 1,
          name: 'BS CPE Curriculum 2018',
          isActive: false,
        },
      },
      {
        courseId: 101,
        yearLevel: 1,
        semester: 1,
        Curriculum: {
          id: 2,
          name: 'BS CPE Curriculum 2025',
          isActive: true,
        },
      },
      {
        courseId: 101,
        yearLevel: 1,
        semester: 2,
        Curriculum: {
          id: 3,
          name: 'BS CPE Curriculum 2026',
          isActive: true,
        },
      },
    ]);

    const availability = await getCrossCurriculumAvailability([101]);
    const rows = availability.get('101');

    expect(rows).toEqual([
      expect.objectContaining({
        curriculumName: 'BS CPE Curriculum 2025',
        curriculumIsActive: true,
        isAvailable: true,
        unavailableReason: null,
      }),
      expect.objectContaining({
        curriculumName: 'BS CPE Curriculum 2026',
        curriculumIsActive: true,
        isAvailable: true,
        unavailableReason: null,
      }),
      expect.objectContaining({
        curriculumName: 'BS CPE Curriculum 2018',
        curriculumIsActive: false,
        isAvailable: false,
        unavailableReason: 'Inactive curriculum; no new batch is assumed.',
      }),
    ]);
  });
});
