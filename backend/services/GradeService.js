/**
 * GradeService — Business logic for grade entry and study plan regeneration.
 *
 * Extracted from gradeController to separate HTTP concerns from domain logic.
 * Controllers delegate query composition and algorithmic operations here.
 */

const {
  StudentAcademicRecord,
  StudyPlan,
  StudyPlanVersion,
  StudyPlanCourse,
  Course,
  User,
} = require('../models');
const { parseGradeInput } = require('../utils/gradeValidation');
const { slotIndexFromYearSemester, sortStudyPlanCourses } = require('../utils/studyPlan');

const PERSON_ATTRIBUTES = ['id', 'firstName', 'lastName', 'email', 'role', 'studentId'];
const DEFAULT_MAX_UNITS_PER_SLOT = 25;

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

/**
 * Fetches a SAR record with its associated StudyPlan (if any).
 */
const getSarWithStudyPlan = async (sarId, transaction) => {
  return StudentAcademicRecord.findByPk(sarId, {
    include: [{ model: StudyPlan, attributes: ['id', 'studentAcademicRecordId'] }],
    transaction,
  });
};

/**
 * Fetches the active StudyPlanVersion for a study plan, including all courses.
 */
const getActiveVersion = async (studyPlanId, transaction) => {
  return StudyPlanVersion.findOne({
    where: { studyPlanId, status: 'active' },
    include: [
      {
        model: StudyPlanCourse,
        include: [{ model: Course, attributes: ['id', 'code', 'name', 'units'] }],
      },
    ],
    transaction,
  });
};

/**
 * Standard include set for returning a study plan version after a write operation.
 */
const buildVersionIncludes = () => [
  { model: User, as: 'GeneratedByAdviser', attributes: PERSON_ATTRIBUTES },
  {
    model: StudyPlanCourse,
    include: [{ model: Course, attributes: ['id', 'code', 'name', 'units'] }],
  },
];

// ---------------------------------------------------------------------------
// Serializers
// ---------------------------------------------------------------------------

/**
 * Serializes a StudyPlanVersion, sorting courses by yearLevel → semester → course code.
 */
const serializeVersion = (version) => {
  const plain = version?.get ? version.get({ plain: true }) : version;
  const courses = Array.isArray(plain.StudyPlanCourses)
    ? sortStudyPlanCourses(plain.StudyPlanCourses)
    : [];
  return { ...plain, StudyPlanCourses: courses };
};

// ---------------------------------------------------------------------------
// Graph algorithm helpers (study plan regeneration)
// ---------------------------------------------------------------------------

/**
 * Partitions a set of courseIds into connected components using the provided adjacency map.
 * Used to ensure co-requisite groups are placed together during plan regeneration.
 */
const collectConnectedComponents = (courseIds, adjacencyMap) => {
  const unvisited = new Set(courseIds);
  const components = [];

  while (unvisited.size > 0) {
    const [start] = unvisited;
    const queue = [start];
    unvisited.delete(start);
    const component = [start];

    while (queue.length > 0) {
      const current = queue.shift();
      const neighbors = adjacencyMap.get(current) || [];
      neighbors.forEach((neighbor) => {
        if (unvisited.has(neighbor)) {
          unvisited.delete(neighbor);
          queue.push(neighbor);
          component.push(neighbor);
        }
      });
    }

    components.push(component);
  }

  return components;
};

const makeCodedError = (message, statusCode, code) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

const normalizeSlot = ({ yearLevel, semester }) => {
  const normalizedYearLevel = Number(yearLevel);
  const normalizedSemester = Number(semester);

  if (!Number.isInteger(normalizedYearLevel) || normalizedYearLevel < 1) {
    throw makeCodedError('yearLevel must be a positive integer', 400, 'INVALID_RETAKE_PLACEMENT');
  }

  if (![1, 2, 3].includes(normalizedSemester)) {
    throw makeCodedError('semester must be 1, 2, or 3', 400, 'INVALID_RETAKE_PLACEMENT');
  }

  return {
    yearLevel: normalizedYearLevel,
    semester: normalizedSemester,
    slotIndex: slotIndexFromYearSemester(normalizedYearLevel, normalizedSemester),
  };
};

const buildRetakePlacementMap = ({ activeEntries = [], retakePlacements = [] } = {}) => {
  const placementByStudyPlanCourseId = new Map(
    (Array.isArray(retakePlacements) ? retakePlacements : [])
      .filter((item) => item?.studyPlanCourseId !== undefined && item?.studyPlanCourseId !== null)
      .map((item) => [String(item.studyPlanCourseId), item]),
  );
  const retakePlacementByCourseId = new Map();

  activeEntries.forEach((entry) => {
    const parsedStatus = parseGradeInput(entry.grade).status;
    const classification =
      parsedStatus === 'failed' || parsedStatus === 'dropped'
        ? parsedStatus
        : String(entry.status || '').toLowerCase();
    if (classification !== 'failed' && classification !== 'dropped') {
      return;
    }

    const placement = placementByStudyPlanCourseId.get(String(entry.id));
    if (!placement) {
      throw makeCodedError(
        'Retake placement is required for failed or dropped courses',
        400,
        'MISSING_RETAKE_PLACEMENT',
      );
    }

    const normalized = normalizeSlot(placement);
    const originalSlotIndex = slotIndexFromYearSemester(entry.yearLevel, entry.semester);
    if (normalized.slotIndex <= originalSlotIndex) {
      throw makeCodedError(
        'Retake placement must be after the failed or dropped course slot',
        400,
        'INVALID_RETAKE_PLACEMENT',
      );
    }

    retakePlacementByCourseId.set(String(entry.courseId), normalized);
  });

  return retakePlacementByCourseId;
};

const getEntryUnits = (entry) =>
  Number(entry?.Course?.units ?? entry?.source?.Course?.units ?? entry?.units ?? 0);

const addStandardUnitsForCourse = ({
  standardUnitsBySlot,
  countedCourseIds,
  courseId,
  yearLevel,
  semester,
  units,
}) => {
  if (courseId === undefined || courseId === null) {
    return;
  }

  const normalizedCourseId = String(courseId);
  if (countedCourseIds.has(normalizedCourseId)) {
    return;
  }

  const normalizedYearLevel = Number(yearLevel);
  const normalizedSemester = Number(semester);
  const normalizedUnits = Number(units || 0);

  if (
    !Number.isInteger(normalizedYearLevel) ||
    ![1, 2, 3].includes(normalizedSemester) ||
    !Number.isFinite(normalizedUnits) ||
    normalizedUnits <= 0
  ) {
    return;
  }

  const slotIndex = slotIndexFromYearSemester(normalizedYearLevel, normalizedSemester);
  standardUnitsBySlot.set(slotIndex, (standardUnitsBySlot.get(slotIndex) || 0) + normalizedUnits);
  countedCourseIds.add(normalizedCourseId);
};

const buildStandardUnitsBySlot = ({
  curriculumCourses = [],
  selectedTrackPlan = [],
  selectedTrackCourseIds = new Set(),
  curriculumTrackCourseIds = new Set(),
  hasSelectedTrack = false,
} = {}) => {
  const standardUnitsBySlot = new Map();
  const countedCourseIds = new Set();

  (Array.isArray(selectedTrackPlan) ? selectedTrackPlan : []).forEach((item) => {
    addStandardUnitsForCourse({
      standardUnitsBySlot,
      countedCourseIds,
      courseId: item?.courseId,
      yearLevel: item?.yearLevel,
      semester: item?.semester,
      units: getEntryUnits(item),
    });
  });

  (Array.isArray(curriculumCourses) ? curriculumCourses : []).forEach((item) => {
    const courseId = String(item?.courseId);
    const isUnselectedTrackCourse =
      hasSelectedTrack &&
      curriculumTrackCourseIds.has(courseId) &&
      !selectedTrackCourseIds.has(courseId);

    if (isUnselectedTrackCourse) {
      return;
    }

    addStandardUnitsForCourse({
      standardUnitsBySlot,
      countedCourseIds,
      courseId: item?.courseId,
      yearLevel: item?.yearLevel,
      semester: item?.semester,
      units: getEntryUnits(item),
    });
  });

  return standardUnitsBySlot;
};

const getAllowedUnitsForSlot = ({
  slotIndex,
  standardUnitsBySlot,
  defaultMaxUnits = DEFAULT_MAX_UNITS_PER_SLOT,
} = {}) =>
  Math.max(Number(defaultMaxUnits || 0), Number(standardUnitsBySlot?.get(Number(slotIndex)) || 0));

const buildPrerequisiteOverrideKey = ({
  prerequisiteCourseId,
  dependentCourseId,
  yearLevel,
  semester,
  slotIndex,
}) => {
  const resolvedSlotIndex =
    slotIndex !== undefined && slotIndex !== null
      ? Number(slotIndex)
      : slotIndexFromYearSemester(yearLevel, semester);
  return `${String(prerequisiteCourseId)}|${String(dependentCourseId)}|${resolvedSlotIndex}`;
};

const buildMutualPrerequisitePairKey = (leftCourseId, rightCourseId) =>
  [String(leftCourseId), String(rightCourseId)].sort().join('|');

const buildMutualPrerequisitePairSet = (prerequisites = []) => {
  const directedPairs = new Set();
  const mutualPairs = new Set();

  (Array.isArray(prerequisites) ? prerequisites : []).forEach((rule) => {
    if (rule?.courseId === undefined || rule?.prerequisiteCourseId === undefined) {
      return;
    }

    const dependentId = String(rule.courseId);
    const prerequisiteId = String(rule.prerequisiteCourseId);
    const forwardKey = `${prerequisiteId}->${dependentId}`;
    const reverseKey = `${dependentId}->${prerequisiteId}`;

    if (directedPairs.has(reverseKey)) {
      mutualPairs.add(buildMutualPrerequisitePairKey(prerequisiteId, dependentId));
    }

    directedPairs.add(forwardKey);
  });

  return mutualPairs;
};

const buildPrerequisiteOverrideMap = (overrides = []) => {
  const statusRank = { rejected: 1, pending: 2, approved: 3 };
  const map = new Map();

  (Array.isArray(overrides) ? overrides : []).forEach((override) => {
    if (
      override?.prerequisiteCourseId === undefined ||
      override?.dependentCourseId === undefined ||
      override?.yearLevel === undefined ||
      override?.semester === undefined
    ) {
      return;
    }

    const key = buildPrerequisiteOverrideKey(override);
    const status = String(override.status || 'pending').toLowerCase();
    const current = map.get(key);
    if (!current || (statusRank[status] || 0) > (statusRank[current.status] || 0)) {
      map.set(key, { ...override, status });
    }
  });

  return map;
};

const isPrerequisitePlacementAllowed = ({
  prerequisiteCourseId,
  dependentCourseId,
  prerequisiteSlotIndex,
  dependentSlotIndex,
  overrideMap,
  mutualPrerequisitePairs,
  allowPending = false,
}) => {
  if (prerequisiteSlotIndex === undefined || prerequisiteSlotIndex === null) {
    return { allowed: false, matchedOverrideStatus: null };
  }

  if (Number(prerequisiteSlotIndex) < Number(dependentSlotIndex)) {
    return { allowed: true, matchedOverrideStatus: null };
  }

  if (Number(prerequisiteSlotIndex) > Number(dependentSlotIndex)) {
    return { allowed: false, matchedOverrideStatus: null };
  }

  if (
    mutualPrerequisitePairs?.has(
      buildMutualPrerequisitePairKey(prerequisiteCourseId, dependentCourseId),
    )
  ) {
    return { allowed: true, matchedOverrideStatus: null };
  }

  const key = buildPrerequisiteOverrideKey({
    prerequisiteCourseId,
    dependentCourseId,
    slotIndex: dependentSlotIndex,
  });
  const matchedOverride = overrideMap?.get(key) || null;
  const status = matchedOverride?.status || null;
  const allowed = status === 'approved' || (allowPending && status === 'pending');

  return { allowed, matchedOverrideStatus: status };
};

module.exports = {
  getSarWithStudyPlan,
  getActiveVersion,
  buildVersionIncludes,
  serializeVersion,
  collectConnectedComponents,
  buildStandardUnitsBySlot,
  buildRetakePlacementMap,
  getAllowedUnitsForSlot,
  buildMutualPrerequisitePairSet,
  buildPrerequisiteOverrideKey,
  buildPrerequisiteOverrideMap,
  isPrerequisitePlacementAllowed,
};
