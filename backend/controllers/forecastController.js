const { Op } = require('sequelize');
const {
  AcademicTerm,
  Course,
  ForecastSnapshot,
  StudyPlan,
  StudyPlanCourse,
  StudyPlanVersion,
  StudentAcademicRecord,
  User,
} = require('../models');
const {
  parsePaginationParams,
  buildPaginatedPayload,
  paginateArray,
} = require('../utils/pagination');

const triggeredByAttributes = ['id', 'firstName', 'lastName', 'email'];

const semesterLabel = {
  1: '1st Semester',
  2: '2nd Semester',
  3: 'Summer',
};

const normalizeNumber = (value) => Number(value || 0);
const DEFAULT_SECTION_CAP = 45;
const FORECAST_CACHE_TTL_MS = 60 * 1000;
const demandResponseCache = new Map();

const formatUserName = (user) => {
  if (!user) {
    return null;
  }

  const firstName = String(user.firstName || '').trim();
  const lastName = String(user.lastName || '').trim();
  return [firstName, lastName].filter(Boolean).join(' ') || user.email || null;
};

const getSemesterDisplay = (semester) => semesterLabel[Number(semester)] || `Semester ${semester}`;

const buildTermMeta = (term) => ({
  id: term.id,
  schoolYear: term.schoolYear,
  semester: term.semester,
  semesterLabel: getSemesterDisplay(term.semester),
});

const advanceSlot = ({ yearLevel, semester }) => {
  if (Number(semester) === 3) {
    return {
      yearLevel: Number(yearLevel) + 1,
      semester: 1,
    };
  }

  return {
    yearLevel: Number(yearLevel),
    semester: Number(semester) + 1,
  };
};

const sortDemandRows = (left, right) => {
  if (Number(right.studentCount) !== Number(left.studentCount)) {
    return Number(right.studentCount) - Number(left.studentCount);
  }

  return String(left.courseCode || '').localeCompare(String(right.courseCode || ''));
};

const sortComparisonRows = (left, right) =>
  String(left.courseCode || '').localeCompare(String(right.courseCode || ''));

const sortRowsBy = ({ rows, sortBy, sortOrder }) => {
  const direction = sortOrder === 'DESC' ? -1 : 1;

  return rows.slice().sort((left, right) => {
    const leftValue = left?.[sortBy];
    const rightValue = right?.[sortBy];

    if (typeof leftValue === 'number' || typeof rightValue === 'number') {
      return (Number(leftValue || 0) - Number(rightValue || 0)) * direction;
    }

    return String(leftValue || '').localeCompare(String(rightValue || '')) * direction;
  });
};

const getDemandCacheKey = ({ termId, semesterOffset, sectionCap }) =>
  `${termId}:${semesterOffset}:${sectionCap}`;

const getCachedDemandResponse = (key) => {
  const entry = demandResponseCache.get(key);
  if (!entry) {
    return null;
  }

  if (Date.now() - entry.cachedAt > FORECAST_CACHE_TTL_MS) {
    demandResponseCache.delete(key);
    return null;
  }

  return entry.value;
};

const setCachedDemandResponse = (key, value) => {
  demandResponseCache.set(key, {
    value,
    cachedAt: Date.now(),
  });
};

const normalizeSectionCap = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_SECTION_CAP;
  }

  return Math.floor(parsed);
};

const getCurrentAcademicTerm = async (transaction) =>
  AcademicTerm.findOne({
    where: { isCurrent: true },
    transaction,
  });

const getDemandDataForTerm = async ({
  term,
  semesterOffset = 0,
  sectionCap = DEFAULT_SECTION_CAP,
  transaction,
}) => {
  // Pre-compute the target semester for DB-level filtering.
  // The semester component after advancing is deterministic (same for all students).
  // Only yearLevel varies per-student and is checked in JS below.
  let semesterForFilter = normalizeNumber(term.semester);
  for (let idx = 0; idx < semesterOffset; idx += 1) {
    semesterForFilter = advanceSlot({ yearLevel: 1, semester: semesterForFilter }).semester;
  }

  const records = await StudentAcademicRecord.findAll({
    attributes: ['id', 'yearLevel'],
    include: [
      {
        model: StudyPlan,
        required: true,
        attributes: ['id'],
        include: [
          {
            model: StudyPlanVersion,
            required: true,
            where: { status: 'active' },
            attributes: ['id'],
            include: [
              {
                model: StudyPlanCourse,
                required: false,
                where: { status: 'pending', semester: semesterForFilter },
                attributes: ['courseId', 'yearLevel'],
                include: [
                  {
                    model: Course,
                    attributes: ['id', 'code', 'name', 'units', 'maxStudentsPerSection'],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    transaction,
  });

  const demandByCourseId = new Map();
  const uniqueStudentIds = new Set();
  const effectiveSectionCap = normalizeSectionCap(sectionCap);

  records.forEach((record) => {
    uniqueStudentIds.add(String(record.id));

    let targetYearLevel = normalizeNumber(record.yearLevel);
    let tempSemester = normalizeNumber(term.semester);

    if (!targetYearLevel || !tempSemester) {
      return;
    }

    for (let index = 0; index < semesterOffset; index += 1) {
      const advanced = advanceSlot({ yearLevel: targetYearLevel, semester: tempSemester });
      targetYearLevel = advanced.yearLevel;
      tempSemester = advanced.semester;
    }

    const countedCoursesForStudent = new Set();
    const activeVersions = record.StudyPlan?.StudyPlanVersions || [];

    activeVersions.forEach((version) => {
      (version.StudyPlanCourses || []).forEach((entry) => {
        // semester already filtered at DB level; only check yearLevel per-student
        if (normalizeNumber(entry.yearLevel) !== targetYearLevel || !entry.Course) {
          return;
        }

        const courseKey = String(entry.courseId);
        if (countedCoursesForStudent.has(courseKey)) {
          return;
        }

        countedCoursesForStudent.add(courseKey);

        if (!demandByCourseId.has(courseKey)) {
          demandByCourseId.set(courseKey, {
            courseId: entry.Course.id,
            courseCode: entry.Course.code,
            courseName: entry.Course.name,
            units: entry.Course.units,
            maxStudentsPerSection: entry.Course.maxStudentsPerSection || null,
            studentCount: 0,
            expectedSections: 0,
          });
        }

        demandByCourseId.get(courseKey).studentCount += 1;
      });
    });
  });

  const rows = [...demandByCourseId.values()]
    .map((row) => {
      const students = normalizeNumber(row.studentCount);
      const courseCap =
        row.maxStudentsPerSection && row.maxStudentsPerSection > 0
          ? row.maxStudentsPerSection
          : effectiveSectionCap;
      return {
        ...row,
        expectedSections: Math.ceil(students / courseCap),
      };
    })
    .sort(sortDemandRows);

  return {
    rows,
    uniqueSarCount: uniqueStudentIds.size,
    sectionCap: effectiveSectionCap,
  };
};

const normalizeSnapshotForecastRows = (snapshot) => {
  const nextSemesterForecast = snapshot?.snapshotData?.nextSemesterForecast;
  const currentDemand = snapshot?.snapshotData?.currentDemand;

  if (Array.isArray(nextSemesterForecast)) {
    return nextSemesterForecast;
  }

  if (Array.isArray(currentDemand)) {
    return currentDemand;
  }

  if (Array.isArray(snapshot?.snapshotData)) {
    return snapshot.snapshotData;
  }

  return [];
};

const buildDemandResponse = async ({
  semesterOffset = 0,
  sectionCap = DEFAULT_SECTION_CAP,
  transaction,
} = {}) => {
  const currentTerm = await getCurrentAcademicTerm(transaction);
  if (!currentTerm) {
    const error = new Error('No active current term found');
    error.statusCode = 404;
    throw error;
  }

  let targetSlot = { yearLevel: 1, semester: currentTerm.semester };
  for (let index = 0; index < semesterOffset; index += 1) {
    targetSlot = advanceSlot(targetSlot);
  }

  const normalizedSectionCap = normalizeSectionCap(sectionCap);
  const cacheKey = getDemandCacheKey({
    termId: currentTerm.id,
    semesterOffset,
    sectionCap: normalizedSectionCap,
  });

  const cachedResponse = transaction ? null : getCachedDemandResponse(cacheKey);
  if (cachedResponse) {
    return cachedResponse;
  }

  const demandData = await getDemandDataForTerm({
    term: currentTerm,
    semesterOffset,
    sectionCap: normalizedSectionCap,
    transaction,
  });

  const response = {
    data: demandData.rows,
    meta: {
      currentTerm: buildTermMeta(currentTerm),
      sectionCap: demandData.sectionCap,
      validatedSarCount: demandData.uniqueSarCount,
      offsetSemester:
        semesterOffset === 0
          ? buildTermMeta(currentTerm)
          : {
              schoolYear: currentTerm.schoolYear,
              semester: targetSlot.semester,
              semesterLabel: getSemesterDisplay(targetSlot.semester),
              relativeYearOffset: targetSlot.yearLevel - 1,
            },
    },
  };

  if (!transaction) {
    setCachedDemandResponse(cacheKey, response);
  }

  return response;
};

const storeForecastSnapshot = async (termId, userId, options = {}) => {
  const { transaction, createdAt, sectionCap = DEFAULT_SECTION_CAP } = options;

  const term = options.term || (await AcademicTerm.findByPk(termId, { transaction }));
  if (!term) {
    const error = new Error('Academic term not found for forecast snapshot');
    error.statusCode = 404;
    throw error;
  }

  const snapshotTimestamp = Number(createdAt || Date.now());
  const [currentDemandData, nextSemesterForecastData] = await Promise.all([
    getDemandDataForTerm({ term, semesterOffset: 0, sectionCap, transaction }),
    getDemandDataForTerm({ term, semesterOffset: 1, sectionCap, transaction }),
  ]);

  return ForecastSnapshot.create(
    {
      academicTermId: term.id,
      schoolYear: term.schoolYear,
      semester: term.semester,
      snapshotData: {
        sectionCap: currentDemandData.sectionCap,
        validatedSarCount: currentDemandData.uniqueSarCount,
        currentDemand: currentDemandData.rows,
        nextSemesterForecast: nextSemesterForecastData.rows,
        generatedAt: snapshotTimestamp,
      },
      triggeredByUserId: userId,
      createdAt: snapshotTimestamp,
    },
    { transaction },
  );
};

// @desc   Get current semester demand by course
// @route  GET /api/forecast/current
// @access admin, adviser
exports.getCurrentDemand = async (req, res, next) => {
  try {
    const response = await buildDemandResponse({
      semesterOffset: 0,
      sectionCap: req.query.sectionCap,
    });
    const { page, pageSize, search, sortBy, sortOrder } = parsePaginationParams(req.query, {
      defaultSortBy: 'courseCode',
      allowedSortBy: ['courseCode', 'courseName', 'units', 'studentCount', 'expectedSections'],
    });

    const filtered = (response.data || []).filter((row) => {
      if (!search) return true;
      const query = search.toLowerCase();
      return (
        String(row.courseCode || '')
          .toLowerCase()
          .includes(query) ||
        String(row.courseName || '')
          .toLowerCase()
          .includes(query)
      );
    });

    const sorted = sortRowsBy({ rows: filtered, sortBy, sortOrder });
    const paged = paginateArray({ items: sorted, page, pageSize });
    const payload = buildPaginatedPayload({
      items: paged.items,
      page,
      pageSize,
      totalItems: paged.totalItems,
      extraMeta: response.meta,
    });

    return res.status(200).json({ success: true, ...payload });
  } catch (error) {
    next(error);
  }
};

// @desc   Get next semester forecast by course
// @route  GET /api/forecast/next
// @access admin, adviser
exports.getNextSemesterForecast = async (req, res, next) => {
  try {
    const response = await buildDemandResponse({
      semesterOffset: 1,
      sectionCap: req.query.sectionCap,
    });
    const { page, pageSize, search, sortBy, sortOrder } = parsePaginationParams(req.query, {
      defaultSortBy: 'courseCode',
      allowedSortBy: ['courseCode', 'courseName', 'units', 'studentCount', 'expectedSections'],
    });

    const filtered = (response.data || []).filter((row) => {
      if (!search) return true;
      const query = search.toLowerCase();
      return (
        String(row.courseCode || '')
          .toLowerCase()
          .includes(query) ||
        String(row.courseName || '')
          .toLowerCase()
          .includes(query)
      );
    });

    const sorted = sortRowsBy({ rows: filtered, sortBy, sortOrder });
    const paged = paginateArray({ items: sorted, page, pageSize });
    const payload = buildPaginatedPayload({
      items: paged.items,
      page,
      pageSize,
      totalItems: paged.totalItems,
      extraMeta: response.meta,
    });

    return res.status(200).json({ success: true, ...payload });
  } catch (error) {
    next(error);
  }
};

// @desc   Get comparison report for actual demand vs previous forecast
// @route  GET /api/forecast/comparison
// @access admin, adviser
exports.getComparisonReport = async (req, res, next) => {
  try {
    const currentTerm = await getCurrentAcademicTerm();
    if (!currentTerm) {
      return res.status(404).json({ success: false, message: 'No active current term found' });
    }

    const [actualDemand, previousSnapshot] = await Promise.all([
      getDemandDataForTerm({
        term: currentTerm,
        semesterOffset: 0,
        sectionCap: req.query.sectionCap,
      }),
      ForecastSnapshot.findOne({
        where: {
          academicTermId: { [Op.ne]: currentTerm.id },
        },
        include: [{ model: User, as: 'TriggeredBy', attributes: triggeredByAttributes }],
        order: [
          ['createdAt', 'DESC'],
          ['id', 'DESC'],
        ],
      }),
    ]);

    const forecastRows = normalizeSnapshotForecastRows(previousSnapshot);
    const actualByCode = new Map(
      (actualDemand.rows || []).map((entry) => [String(entry.courseCode), entry]),
    );
    const forecastByCode = new Map(forecastRows.map((entry) => [String(entry.courseCode), entry]));
    const allCodes = [...new Set([...actualByCode.keys(), ...forecastByCode.keys()])];

    const comparison = allCodes.map((courseCode) => {
      const actual = actualByCode.get(courseCode);
      const forecast = forecastByCode.get(courseCode);
      const actualDemandCount = normalizeNumber(actual?.studentCount);
      const forecastedDemand = normalizeNumber(forecast?.studentCount);

      return {
        courseCode,
        courseName: actual?.courseName || forecast?.courseName || '',
        forecastedDemand,
        actualDemand: actualDemandCount,
        difference: actualDemandCount - forecastedDemand,
      };
    });

    const { page, pageSize, search, sortBy, sortOrder } = parsePaginationParams(req.query, {
      defaultSortBy: 'courseCode',
      allowedSortBy: ['courseCode', 'courseName', 'forecastedDemand', 'actualDemand', 'difference'],
    });

    const filtered = comparison.filter((row) => {
      if (!search) return true;
      const query = search.toLowerCase();
      return (
        String(row.courseCode || '')
          .toLowerCase()
          .includes(query) ||
        String(row.courseName || '')
          .toLowerCase()
          .includes(query)
      );
    });

    const sorted =
      sortBy === 'courseCode' && sortOrder === 'ASC'
        ? filtered.slice().sort(sortComparisonRows)
        : sortRowsBy({ rows: filtered, sortBy, sortOrder });
    const paged = paginateArray({ items: sorted, page, pageSize });
    const payload = buildPaginatedPayload({
      items: paged.items,
      page,
      pageSize,
      totalItems: paged.totalItems,
      extraMeta: {
        currentTerm: buildTermMeta(currentTerm),
        previousSnapshot: previousSnapshot
          ? {
              id: previousSnapshot.id,
              academicTermId: previousSnapshot.academicTermId,
              schoolYear: previousSnapshot.schoolYear,
              semester: previousSnapshot.semester,
              semesterLabel: getSemesterDisplay(previousSnapshot.semester),
              createdAt: previousSnapshot.createdAt,
              triggeredByName: formatUserName(previousSnapshot.TriggeredBy),
            }
          : null,
      },
    });

    return res.status(200).json({
      success: true,
      ...payload,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Get stored forecast history
// @route  GET /api/forecast/history
// @access admin, adviser
exports.getForecastHistory = async (req, res, next) => {
  try {
    const { page, pageSize, search, sortBy, sortOrder, offset, limit } = parsePaginationParams(
      req.query,
      {
        defaultSortBy: 'createdAt',
        allowedSortBy: ['createdAt', 'schoolYear', 'semester'],
      },
    );

    const where = search
      ? {
          [Op.or]: [{ schoolYear: { [Op.iLike]: `%${search}%` } }],
        }
      : {};

    const { rows, count } = await ForecastSnapshot.findAndCountAll({
      where,
      include: [{ model: User, as: 'TriggeredBy', attributes: triggeredByAttributes }],
      order: [
        [sortBy, sortOrder],
        ['id', 'DESC'],
      ],
      offset,
      limit,
    });

    const data = rows.map((snapshot) => ({
      id: snapshot.id,
      academicTermId: snapshot.academicTermId,
      schoolYear: snapshot.schoolYear,
      semester: snapshot.semester,
      semesterLabel: getSemesterDisplay(snapshot.semester),
      createdAt: snapshot.createdAt,
      triggeredBy: snapshot.TriggeredBy
        ? {
            id: snapshot.TriggeredBy.id,
            name: formatUserName(snapshot.TriggeredBy),
            email: snapshot.TriggeredBy.email,
          }
        : null,
      snapshotData: snapshot.snapshotData,
      currentDemandCount: Array.isArray(snapshot.snapshotData?.currentDemand)
        ? snapshot.snapshotData.currentDemand.length
        : 0,
      nextSemesterForecastCount: Array.isArray(snapshot.snapshotData?.nextSemesterForecast)
        ? snapshot.snapshotData.nextSemesterForecast.length
        : 0,
    }));

    const payload = buildPaginatedPayload({
      items: data,
      page,
      pageSize,
      totalItems: count,
    });

    return res.status(200).json({ success: true, ...payload });
  } catch (error) {
    next(error);
  }
};

exports.storeForecastSnapshot = storeForecastSnapshot;
