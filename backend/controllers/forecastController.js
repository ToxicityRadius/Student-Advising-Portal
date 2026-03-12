const { Op } = require('sequelize');
const {
  AcademicTerm,
  Course,
  ForecastSnapshot,
  StudyPlan,
  StudyPlanCourse,
  StudyPlanVersion,
  StudentAcademicRecord,
  User
} = require('../models');

const triggeredByAttributes = ['id', 'firstName', 'lastName', 'email'];

const semesterLabel = {
  1: '1st Semester',
  2: '2nd Semester',
  3: 'Summer'
};

const normalizeNumber = (value) => Number(value || 0);

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
  semesterLabel: getSemesterDisplay(term.semester)
});

const advanceSlot = ({ yearLevel, semester }) => {
  if (Number(semester) === 3) {
    return {
      yearLevel: Number(yearLevel) + 1,
      semester: 1
    };
  }

  return {
    yearLevel: Number(yearLevel),
    semester: Number(semester) + 1
  };
};

const sortDemandRows = (left, right) => {
  if (Number(right.studentCount) !== Number(left.studentCount)) {
    return Number(right.studentCount) - Number(left.studentCount);
  }

  return String(left.courseCode || '').localeCompare(String(right.courseCode || ''));
};

const sortComparisonRows = (left, right) => String(left.courseCode || '').localeCompare(String(right.courseCode || ''));

const getCurrentAcademicTerm = async (transaction) => AcademicTerm.findOne({
  where: { isCurrent: true },
  transaction
});

const getDemandDataForTerm = async ({ term, semesterOffset = 0, transaction }) => {
  const versions = await StudyPlanVersion.findAll({
    where: { status: 'active' },
    include: [
      {
        model: StudyPlan,
        attributes: ['id', 'studentAcademicRecordId'],
        include: [{
          model: StudentAcademicRecord,
          attributes: ['id', 'studentName', 'studentNumber', 'yearLevel']
        }]
      },
      {
        model: StudyPlanCourse,
        required: false,
        where: { status: 'pending' },
        attributes: ['id', 'courseId', 'yearLevel', 'semester', 'status'],
        include: [{ model: Course, attributes: ['id', 'code', 'name', 'units'] }]
      }
    ],
    transaction
  });

  const demandByCourseId = new Map();

  versions.forEach((version) => {
    const sar = version.StudyPlan?.StudentAcademicRecord;
    if (!sar) {
      return;
    }

    let targetSlot = {
      yearLevel: normalizeNumber(sar.yearLevel),
      semester: normalizeNumber(term.semester)
    };

    if (!targetSlot.yearLevel || !targetSlot.semester) {
      return;
    }

    for (let index = 0; index < semesterOffset; index += 1) {
      targetSlot = advanceSlot(targetSlot);
    }

    const countedCoursesForStudent = new Set();

    (version.StudyPlanCourses || []).forEach((entry) => {
      if (
        normalizeNumber(entry.yearLevel) !== targetSlot.yearLevel ||
        normalizeNumber(entry.semester) !== targetSlot.semester ||
        !entry.Course
      ) {
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
          studentCount: 0
        });
      }

      demandByCourseId.get(courseKey).studentCount += 1;
    });
  });

  return [...demandByCourseId.values()].sort(sortDemandRows);
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

const buildDemandResponse = async ({ semesterOffset = 0, transaction } = {}) => {
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

  const data = await getDemandDataForTerm({
    term: currentTerm,
    semesterOffset,
    transaction
  });

  return {
    data,
    meta: {
      currentTerm: buildTermMeta(currentTerm),
      offsetSemester: semesterOffset === 0 ? buildTermMeta(currentTerm) : {
        schoolYear: currentTerm.schoolYear,
        semester: targetSlot.semester,
        semesterLabel: getSemesterDisplay(targetSlot.semester),
        relativeYearOffset: targetSlot.yearLevel - 1
      }
    }
  };
};

const storeForecastSnapshot = async (termId, userId, options = {}) => {
  const { transaction, createdAt } = options;

  const term = options.term || await AcademicTerm.findByPk(termId, { transaction });
  if (!term) {
    const error = new Error('Academic term not found for forecast snapshot');
    error.statusCode = 404;
    throw error;
  }

  const snapshotTimestamp = Number(createdAt || Date.now());
  const [currentDemand, nextSemesterForecast] = await Promise.all([
    getDemandDataForTerm({ term, semesterOffset: 0, transaction }),
    getDemandDataForTerm({ term, semesterOffset: 1, transaction })
  ]);

  return ForecastSnapshot.create({
    academicTermId: term.id,
    schoolYear: term.schoolYear,
    semester: term.semester,
    snapshotData: {
      currentDemand,
      nextSemesterForecast,
      generatedAt: snapshotTimestamp
    },
    triggeredByUserId: userId,
    createdAt: snapshotTimestamp
  }, { transaction });
};

// @desc   Get current semester demand by course
// @route  GET /api/forecast/current
// @access admin, adviser
exports.getCurrentDemand = async (req, res, next) => {
  try {
    const response = await buildDemandResponse({ semesterOffset: 0 });
    return res.status(200).json({ success: true, ...response });
  } catch (error) {
    next(error);
  }
};

// @desc   Get next semester forecast by course
// @route  GET /api/forecast/next
// @access admin, adviser
exports.getNextSemesterForecast = async (req, res, next) => {
  try {
    const response = await buildDemandResponse({ semesterOffset: 1 });
    return res.status(200).json({ success: true, ...response });
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
      getDemandDataForTerm({ term: currentTerm, semesterOffset: 0 }),
      ForecastSnapshot.findOne({
        where: {
          academicTermId: { [Op.ne]: currentTerm.id }
        },
        include: [{ model: User, as: 'TriggeredBy', attributes: triggeredByAttributes }],
        order: [['createdAt', 'DESC'], ['id', 'DESC']]
      })
    ]);

    const forecastRows = normalizeSnapshotForecastRows(previousSnapshot);
    const actualByCode = new Map(actualDemand.map((entry) => [String(entry.courseCode), entry]));
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
        difference: actualDemandCount - forecastedDemand
      };
    }).sort(sortComparisonRows);

    return res.status(200).json({
      success: true,
      data: comparison,
      meta: {
        currentTerm: buildTermMeta(currentTerm),
        previousSnapshot: previousSnapshot ? {
          id: previousSnapshot.id,
          academicTermId: previousSnapshot.academicTermId,
          schoolYear: previousSnapshot.schoolYear,
          semester: previousSnapshot.semester,
          semesterLabel: getSemesterDisplay(previousSnapshot.semester),
          createdAt: previousSnapshot.createdAt,
          triggeredByName: formatUserName(previousSnapshot.TriggeredBy)
        } : null
      }
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
    const snapshots = await ForecastSnapshot.findAll({
      include: [{ model: User, as: 'TriggeredBy', attributes: triggeredByAttributes }],
      order: [['createdAt', 'DESC'], ['id', 'DESC']]
    });

    const data = snapshots.map((snapshot) => ({
      id: snapshot.id,
      academicTermId: snapshot.academicTermId,
      schoolYear: snapshot.schoolYear,
      semester: snapshot.semester,
      semesterLabel: getSemesterDisplay(snapshot.semester),
      createdAt: snapshot.createdAt,
      triggeredBy: snapshot.TriggeredBy ? {
        id: snapshot.TriggeredBy.id,
        name: formatUserName(snapshot.TriggeredBy),
        email: snapshot.TriggeredBy.email
      } : null,
      snapshotData: snapshot.snapshotData,
      currentDemandCount: Array.isArray(snapshot.snapshotData?.currentDemand)
        ? snapshot.snapshotData.currentDemand.length
        : 0,
      nextSemesterForecastCount: Array.isArray(snapshot.snapshotData?.nextSemesterForecast)
        ? snapshot.snapshotData.nextSemesterForecast.length
        : 0
    }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

exports.storeForecastSnapshot = storeForecastSnapshot;