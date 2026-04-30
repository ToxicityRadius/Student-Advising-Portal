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
const { parseGradeInput, isBlockingStatus } = require('../utils/gradeValidation');
const { slotIndexFromYearSemester, sortStudyPlanCourses } = require('../utils/studyPlan');

const PERSON_ATTRIBUTES = ['id', 'firstName', 'lastName', 'email', 'role', 'studentId'];

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
  const placementItems = Array.isArray(retakePlacements) ? retakePlacements : [];
  const placementByStudyPlanCourseId = new Map(
    placementItems
      .filter((item) => item?.studyPlanCourseId !== undefined && item?.studyPlanCourseId !== null)
      .map((item) => [String(item.studyPlanCourseId), item]),
  );
  const placementByCourseId = new Map(
    placementItems
      .filter((item) => item?.courseId !== undefined && item?.courseId !== null)
      .map((item) => [String(item.courseId), item]),
  );
  const retakePlacementByCourseId = new Map();

  activeEntries.forEach((entry) => {
    const parsedStatus = parseGradeInput(entry.grade).status;
    const storedStatus = String(entry.status || '').toLowerCase();
    const classification = parsedStatus !== 'pending' ? parsedStatus : storedStatus;
    const requiresRetakePlacement =
      isBlockingStatus(classification) || classification === 'dropped';

    if (!requiresRetakePlacement) {
      return;
    }

    const placement =
      placementByStudyPlanCourseId.get(String(entry.id)) ||
      placementByCourseId.get(String(entry.courseId));
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
  buildRetakePlacementMap,
  buildPrerequisiteOverrideKey,
  buildPrerequisiteOverrideMap,
  isPrerequisitePlacementAllowed,
};
