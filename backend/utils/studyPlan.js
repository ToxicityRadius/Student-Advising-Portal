const toNumber = (value) => Number(value);

const slotIndexFromYearSemester = (yearLevel, semester) =>
  (Number(yearLevel) - 1) * 3 + (Number(semester) - 1);

const yearSemesterFromSlotIndex = (slotIndex) => ({
  yearLevel: Math.floor(slotIndex / 3) + 1,
  semester: (slotIndex % 3) + 1,
});

const normalizeRegularSlotIndex = (slotIndex) => {
  if (!Number.isInteger(slotIndex) || slotIndex < 0) {
    return slotIndex;
  }

  const { semester } = yearSemesterFromSlotIndex(slotIndex);
  return semester === 3 ? slotIndex + 1 : slotIndex;
};

const nextRegularSlotIndex = (slotIndex) => {
  const normalizedSlotIndex = normalizeRegularSlotIndex(slotIndex);
  const { semester } = yearSemesterFromSlotIndex(normalizedSlotIndex);

  return semester === 1 ? normalizedSlotIndex + 1 : normalizedSlotIndex + 2;
};

const isElectiveTrackSelectionRequired = ({ yearLevel, currentSemester }) => {
  const parsedYearLevel = toNumber(yearLevel);
  const parsedSemester = toNumber(currentSemester);

  if (parsedYearLevel > 2) {
    return true;
  }

  return parsedYearLevel === 2 && parsedSemester >= 2;
};

const ELECTIVE_TRACK_CHECKPOINT_SLOT = slotIndexFromYearSemester(2, 2);
const ELECTIVE_TRACK_TERMINAL_STATUSES = new Set([
  'passed',
  'failed',
  'dropped',
  'incomplete',
  'officially_dropped',
  'unofficially_dropped',
]);

const isElectiveTrackSelectionRequiredForSar = ({
  studyPlanCourses = [],
  curriculumCourses = [],
} = {}) => {
  const studyPlanStatusByCourseId = new Map(
    (studyPlanCourses || []).map((entry) => [String(entry.courseId), String(entry.status || '')]),
  );

  const checkpointCourseIds = (curriculumCourses || [])
    .filter((entry) => {
      if (entry?.isElective) {
        return false;
      }

      const yearLevel = toNumber(entry?.yearLevel);
      const semester = toNumber(entry?.semester);
      if (yearLevel <= 0 || semester <= 0) {
        return false;
      }

      return slotIndexFromYearSemester(yearLevel, semester) <= ELECTIVE_TRACK_CHECKPOINT_SLOT;
    })
    .map((entry) => String(entry.courseId));

  if (checkpointCourseIds.length === 0) {
    return false;
  }

  return checkpointCourseIds.every((courseId) =>
    ELECTIVE_TRACK_TERMINAL_STATUSES.has(studyPlanStatusByCourseId.get(courseId)),
  );
};

const hasExplicitTrackSlot = (entry) =>
  Number.isInteger(toNumber(entry?.yearLevel)) &&
  Number.isInteger(toNumber(entry?.semester)) &&
  toNumber(entry?.yearLevel) > 0 &&
  toNumber(entry?.semester) > 0;

const buildTrackCourseLabel = (entry) =>
  entry?.Course?.code ||
  entry?.Course?.name ||
  `course-${entry?.courseId || entry?.id || 'unknown'}`;

const assertElectiveTrackPlacements = (trackCourses = []) => {
  const missingPlacements = [];
  const slotToCourseLabels = new Map();

  trackCourses.forEach((entry) => {
    if (!hasExplicitTrackSlot(entry)) {
      missingPlacements.push(buildTrackCourseLabel(entry));
      return;
    }

    const slotKey = `${toNumber(entry.yearLevel)}-${toNumber(entry.semester)}`;
    const labels = slotToCourseLabels.get(slotKey) || [];
    labels.push(buildTrackCourseLabel(entry));
    slotToCourseLabels.set(slotKey, labels);
  });

  if (missingPlacements.length > 0) {
    const error = new Error(
      `Elective track course placements are required for: ${missingPlacements.join(', ')}`,
    );
    error.statusCode = 400;
    error.code = 'ELECTIVE_TRACK_SLOT_REQUIRED';
    throw error;
  }

  const conflictingSlots = [...slotToCourseLabels.entries()]
    .filter(([, labels]) => labels.length > 1)
    .map(([slotKey, labels]) => {
      const [yearLevel, semester] = slotKey.split('-').map(Number);
      return `Year ${yearLevel}, Semester ${semester}: ${labels.join(', ')}`;
    });

  if (conflictingSlots.length > 0) {
    const error = new Error(
      `Elective track courses must have unique placements. Conflicts found in ${conflictingSlots.join('; ')}`,
    );
    error.statusCode = 400;
    error.code = 'ELECTIVE_TRACK_SLOT_CONFLICT';
    throw error;
  }
};

const sortElectiveTrackCourses = (trackCourses = []) =>
  [...trackCourses].sort((left, right) => {
    const leftSlotIndex = slotIndexFromYearSemester(left.yearLevel, left.semester);
    const rightSlotIndex = slotIndexFromYearSemester(right.yearLevel, right.semester);
    if (leftSlotIndex !== rightSlotIndex) {
      return leftSlotIndex - rightSlotIndex;
    }

    return (
      String(left?.Course?.code || '').localeCompare(String(right?.Course?.code || '')) ||
      toNumber(left?.id) - toNumber(right?.id)
    );
  });

const sortStudyPlanCourses = (courses = []) =>
  [...courses].sort((left, right) => {
    if (left.yearLevel !== right.yearLevel) {
      return Number(left.yearLevel || 0) - Number(right.yearLevel || 0);
    }
    if (left.semester !== right.semester) {
      return Number(left.semester || 0) - Number(right.semester || 0);
    }
    return String(left?.Course?.code || '').localeCompare(String(right?.Course?.code || ''));
  });

const buildElectiveTrackPlan = (trackCourses = []) => {
  assertElectiveTrackPlacements(trackCourses);
  const orderedCourses = sortElectiveTrackCourses(trackCourses);

  return orderedCourses.map((entry, order) => {
    const resolvedSlotIndex = slotIndexFromYearSemester(entry.yearLevel, entry.semester);

    return {
      id: entry.id,
      courseId: toNumber(entry.courseId),
      yearLevel: toNumber(entry.yearLevel),
      semester: toNumber(entry.semester),
      sortKey: resolvedSlotIndex,
      order,
      source: entry,
    };
  });
};

module.exports = {
  buildElectiveTrackPlan,
  isElectiveTrackSelectionRequired,
  isElectiveTrackSelectionRequiredForSar,
  nextRegularSlotIndex,
  normalizeRegularSlotIndex,
  slotIndexFromYearSemester,
  sortElectiveTrackCourses,
  sortStudyPlanCourses,
  yearSemesterFromSlotIndex,
};
