const CHECKPOINT_YEAR_LEVEL = 2;
const CHECKPOINT_SEMESTER = 2;

const terminalStatuses = new Set([
  'passed',
  'failed',
  'dropped',
  'incomplete',
  'officially_dropped',
  'unofficially_dropped',
  'completed',
  'credited',
]);

const toNumber = (value) => Number(value || 0);

const courseIdOf = (entry) => String(entry?.courseId ?? entry?.Course?.id ?? entry?.id ?? '');

const isAtOrBeforeCheckpoint = (entry) => {
  const yearLevel = toNumber(entry?.yearLevel);
  const semester = toNumber(entry?.semester);

  return (
    yearLevel > 0 &&
    semester > 0 &&
    (yearLevel < CHECKPOINT_YEAR_LEVEL ||
      (yearLevel === CHECKPOINT_YEAR_LEVEL && semester <= CHECKPOINT_SEMESTER))
  );
};

export const isElectiveTrackSelectionRequiredForPlan = (courses = []) => {
  const checkpointCourses = (courses || []).filter(
    (entry) => isAtOrBeforeCheckpoint(entry) && !entry?.isElective,
  );

  if (checkpointCourses.length === 0) {
    return false;
  }

  return checkpointCourses.every((entry) => terminalStatuses.has(String(entry?.status || '')));
};

export const mergeStudyPlanCoursesForReadiness = (versionCourses = [], checklistItems = []) => {
  if (!Array.isArray(checklistItems) || checklistItems.length === 0) {
    return versionCourses || [];
  }

  const checklistByCourseId = new Map();
  (checklistItems || []).forEach((item) => {
    const id = courseIdOf(item);
    if (id) {
      checklistByCourseId.set(id, item);
    }
  });

  const versionByCourseId = new Map();
  (versionCourses || []).forEach((course) => {
    const id = courseIdOf(course);
    if (id) {
      versionByCourseId.set(id, course);
    }
  });

  return [...checklistByCourseId.values()].map((checklistItem) => {
    const course = versionByCourseId.get(courseIdOf(checklistItem));
    return {
      ...checklistItem,
      ...course,
      yearLevel: checklistItem?.yearLevel ?? course?.yearLevel,
      semester: checklistItem?.semester ?? course?.semester,
      isElective: Boolean(checklistItem?.isElective || course?.isElective),
      status: course?.status || checklistItem?.status,
    };
  });
};
