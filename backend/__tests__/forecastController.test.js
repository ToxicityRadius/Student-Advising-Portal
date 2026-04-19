jest.mock('../models', () => ({
  AcademicTerm: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
  },
  Course: {},
  ForecastSnapshot: {
    findOne: jest.fn(),
    findAndCountAll: jest.fn(),
    create: jest.fn(),
  },
  StudyPlan: {},
  StudyPlanCourse: {},
  StudyPlanVersion: {},
  StudentAcademicRecord: {
    findAll: jest.fn(),
  },
  User: {},
}));

const { AcademicTerm, StudentAcademicRecord, ForecastSnapshot } = require('../models');
const {
  getCurrentDemand,
  getForecastHistory,
  getComparisonReport,
} = require('../controllers/forecastController');

const createRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('forecastController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getCurrentDemand returns paginated demand rows', async () => {
    AcademicTerm.findOne.mockResolvedValue({
      id: 11,
      schoolYear: '2025-2026',
      semester: 1,
      isCurrent: true,
    });

    StudentAcademicRecord.findAll.mockResolvedValue([
      {
        id: 1,
        yearLevel: 1,
        StudyPlan: {
          StudyPlanVersions: [
            {
              StudyPlanCourses: [
                {
                  courseId: 101,
                  yearLevel: 1,
                  Course: {
                    id: 101,
                    code: 'CPE101',
                    name: 'Programming Logic',
                    units: 3,
                    maxStudentsPerSection: 40,
                  },
                },
              ],
            },
          ],
        },
      },
      {
        id: 2,
        yearLevel: 1,
        StudyPlan: {
          StudyPlanVersions: [
            {
              StudyPlanCourses: [
                {
                  courseId: 101,
                  yearLevel: 1,
                  Course: {
                    id: 101,
                    code: 'CPE101',
                    name: 'Programming Logic',
                    units: 3,
                    maxStudentsPerSection: 40,
                  },
                },
              ],
            },
          ],
        },
      },
    ]);

    const req = {
      query: {
        page: '1',
        pageSize: '10',
        sectionCap: '45',
        search: 'CPE',
      },
    };
    const res = createRes();
    const next = jest.fn();

    await getCurrentDemand(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.meta.totalItems).toBe(1);
    expect(payload.items[0]).toMatchObject({
      courseCode: 'CPE101',
      courseName: 'Programming Logic',
      studentCount: 2,
      expectedSections: 1,
    });
    expect(payload.meta.validatedSarCount).toBe(2);
  });

  test('getComparisonReport returns 404 response when no current term is active', async () => {
    AcademicTerm.findOne.mockResolvedValue(null);

    const req = { query: {} };
    const res = createRes();
    const next = jest.fn();

    await getComparisonReport(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'No active current term found',
    });
  });

  test('getForecastHistory maps triggeredBy metadata', async () => {
    ForecastSnapshot.findAndCountAll.mockResolvedValue({
      count: 1,
      rows: [
        {
          id: 77,
          academicTermId: 15,
          schoolYear: '2025-2026',
          semester: 2,
          createdAt: 1735819200000,
          TriggeredBy: {
            id: 9,
            firstName: 'Ada',
            lastName: 'Lovelace',
            email: 'ada@example.com',
          },
          snapshotData: {
            currentDemand: [{ courseCode: 'CPE201' }],
            nextSemesterForecast: [{ courseCode: 'CPE202' }],
          },
        },
      ],
    });

    const req = {
      query: {
        page: '1',
        pageSize: '10',
      },
    };
    const res = createRes();
    const next = jest.fn();

    await getForecastHistory(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.items[0].triggeredBy).toEqual({
      id: 9,
      name: 'Ada Lovelace',
      email: 'ada@example.com',
    });
    expect(payload.items[0].currentDemandCount).toBe(1);
    expect(payload.items[0].nextSemesterForecastCount).toBe(1);
  });
});
