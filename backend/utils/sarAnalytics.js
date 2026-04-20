const STATUS_COMPLETED = 'completed';
const STATUS_FAILED = 'failed';
const STATUS_PENDING = 'pending';
const STATUS_NOT_YET_TAKEN = 'not yet taken';
const STATUS_CREDITED = 'credited';
const STATUS_DROPPED = 'dropped';
const STATUS_INCOMPLETE = 'incomplete';
const STATUS_ONGOING = 'ongoing';

const DEFAULT_AVG_UNITS_PER_SEMESTER = Number(
  process.env.SAR_ANALYTICS_AVG_UNITS_PER_SEMESTER || 18,
);
const DEFAULT_AVG_SUBJECTS_PER_SEMESTER = Number(
  process.env.SAR_ANALYTICS_AVG_SUBJECTS_PER_SEMESTER || 6,
);
const INCLUDE_SUMMER_IN_ESTIMATE =
  String(process.env.INCLUDE_SUMMER_IN_ESTIMATE || 'false').toLowerCase() === 'true';

const toPlain = (value) => (value?.get ? value.get({ plain: true }) : value);

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const semesterLabel = (semester) => {
  if (Number(semester) === 1) return '1st Semester';
  if (Number(semester) === 2) return '2nd Semester';
  if (Number(semester) === 3) return 'Summer';
  return `Semester ${semester}`;
};

const toTermIndex = (yearLevel, semester) => {
  const cycle = INCLUDE_SUMMER_IN_ESTIMATE ? [1, 2, 3] : [1, 2];
  const normalizedYearLevel = toNumber(yearLevel);
  const normalizedSemester = toNumber(semester);

  if (normalizedYearLevel <= 0 || !cycle.includes(normalizedSemester)) {
    return null;
  }

  const cycleLength = cycle.length;
  const semesterOffset = cycle.indexOf(normalizedSemester);
  return (normalizedYearLevel - 1) * cycleLength + semesterOffset;
};

const parseSchoolYear = (schoolYear) => {
  const match = String(schoolYear || '').match(/^(\d{4})-(\d{4})$/);
  if (!match) return null;
  const startYear = Number(match[1]);
  const endYear = Number(match[2]);
  if (!Number.isInteger(startYear) || !Number.isInteger(endYear) || endYear !== startYear + 1) {
    return null;
  }
  return { startYear, endYear };
};

const advanceAcademicTerm = ({ schoolYear, semester }, steps, { includeSummer = false } = {}) => {
  const parsed = parseSchoolYear(schoolYear);
  if (!parsed || !Number.isInteger(steps) || steps < 0) {
    return null;
  }

  let currentStart = parsed.startYear;
  let currentEnd = parsed.endYear;
  let currentSemester = Number(semester);
  const cycle = includeSummer ? [1, 2, 3] : [1, 2];

  if (!cycle.includes(currentSemester)) {
    currentSemester = 1;
  }

  for (let index = 0; index < steps; index += 1) {
    const semesterIndex = cycle.indexOf(currentSemester);
    const isLastCycle = semesterIndex === cycle.length - 1;

    if (isLastCycle) {
      currentStart += 1;
      currentEnd += 1;
      currentSemester = cycle[0];
    } else {
      currentSemester = cycle[semesterIndex + 1];
    }
  }

  return {
    schoolYear: `${currentStart}-${currentEnd}`,
    semester: currentSemester,
    label: `${currentStart}-${currentEnd} ${semesterLabel(currentSemester)}`,
  };
};

const parseNumericGrade = (grade) => {
  if (grade === null || grade === undefined) {
    return null;
  }

  const parsed = Number(String(grade).trim());
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
};

const inferSubjectStatus = ({
  rawStatus,
  grade,
  yearLevel,
  semester,
  currentYearLevel,
  currentSemester,
}) => {
  const normalizedRawStatus = String(rawStatus || '')
    .trim()
    .toLowerCase();
  const normalizedGrade = String(grade || '')
    .trim()
    .toLowerCase();

  if (normalizedRawStatus === 'passed') {
    if (normalizedGrade === 'credited') {
      return STATUS_CREDITED;
    }
    return STATUS_COMPLETED;
  }

  if (normalizedRawStatus === 'failed') return STATUS_FAILED;
  if (normalizedRawStatus === 'dropped') return STATUS_DROPPED;
  if (normalizedRawStatus === 'incomplete') return STATUS_INCOMPLETE;

  const yLevel = toNumber(yearLevel);
  const sem = toNumber(semester);
  if (
    yLevel > 0 &&
    sem > 0 &&
    currentYearLevel > 0 &&
    currentSemester > 0 &&
    (yLevel > currentYearLevel || (yLevel === currentYearLevel && sem > currentSemester))
  ) {
    return STATUS_NOT_YET_TAKEN;
  }

  if (
    yLevel > 0 &&
    sem > 0 &&
    currentYearLevel > 0 &&
    currentSemester > 0 &&
    yLevel === currentYearLevel &&
    sem === currentSemester
  ) {
    return STATUS_ONGOING;
  }

  return STATUS_PENDING;
};

const buildStatusRank = (status) => {
  const ranking = {
    [STATUS_CREDITED]: 8,
    [STATUS_COMPLETED]: 7,
    [STATUS_FAILED]: 6,
    [STATUS_DROPPED]: 5,
    [STATUS_INCOMPLETE]: 4,
    [STATUS_ONGOING]: 3,
    [STATUS_PENDING]: 2,
    [STATUS_NOT_YET_TAKEN]: 1,
  };

  return ranking[status] || 0;
};

const computeGwa = (entries) => {
  const gradePoints = entries
    .map((entry) => {
      const numericGrade = parseNumericGrade(entry.grade);
      const units = toNumber(entry.units);
      if (!Number.isFinite(numericGrade) || units <= 0) {
        return null;
      }
      return {
        gradePoints: numericGrade * units,
        units,
      };
    })
    .filter(Boolean);

  const totalUnits = gradePoints.reduce((sum, item) => sum + item.units, 0);
  if (!totalUnits) {
    return null;
  }

  const totalGradePoints = gradePoints.reduce((sum, item) => sum + item.gradePoints, 0);
  return Number((totalGradePoints / totalUnits).toFixed(2));
};

const sortByPlacement = (left, right) => {
  const leftYear = toNumber(left.yearLevel);
  const rightYear = toNumber(right.yearLevel);
  if (leftYear !== rightYear) {
    return leftYear - rightYear;
  }

  const leftSemester = toNumber(left.semester);
  const rightSemester = toNumber(right.semester);
  if (leftSemester !== rightSemester) {
    return leftSemester - rightSemester;
  }

  return String(left.code || '').localeCompare(String(right.code || ''));
};

const statusCounterTemplate = () => ({
  [STATUS_COMPLETED]: 0,
  [STATUS_FAILED]: 0,
  [STATUS_PENDING]: 0,
  [STATUS_NOT_YET_TAKEN]: 0,
  [STATUS_CREDITED]: 0,
  [STATUS_DROPPED]: 0,
  [STATUS_INCOMPLETE]: 0,
  [STATUS_ONGOING]: 0,
});

const toSubjectKey = (courseId) => String(courseId || '');

const computeSarAnalytics = ({
  sar,
  studyPlanVersions,
  activeStudyPlanVersion,
  curriculumCourses,
  prerequisites,
  currentTerm,
  electiveTrackCourses,
  allCurriculumTrackCourses,
}) => {
  const sarPlain = toPlain(sar) || {};
  const versions = Array.isArray(studyPlanVersions)
    ? studyPlanVersions
        .map((version) => toPlain(version))
        .sort((left, right) => {
          if (toNumber(right.versionNumber) !== toNumber(left.versionNumber)) {
            return toNumber(right.versionNumber) - toNumber(left.versionNumber);
          }
          return toNumber(right.createdAt) - toNumber(left.createdAt);
        })
    : [];

  const resolvedActiveVersion =
    toPlain(activeStudyPlanVersion) ||
    versions.find((version) => String(version.status) === 'active') ||
    null;
  const latestVersion = versions[0] || resolvedActiveVersion || null;

  const normalizedCurriculumCourses = Array.isArray(curriculumCourses)
    ? curriculumCourses.map((entry) => toPlain(entry))
    : [];
  const normalizedPrerequisites = Array.isArray(prerequisites)
    ? prerequisites.map((entry) => toPlain(entry))
    : [];

  const currentYearLevel = toNumber(sarPlain.yearLevel);
  const currentSemester = toNumber(currentTerm?.semester || 1);

  const allVersionRows = versions.flatMap((version) =>
    Array.isArray(version.StudyPlanCourses)
      ? version.StudyPlanCourses.map((entry) => ({
          ...toPlain(entry),
          versionNumber: toNumber(version.versionNumber),
          versionStatus: version.status,
        }))
      : [],
  );

  const latestStatusByCourseId = new Map();

  allVersionRows.forEach((entry) => {
    const course = entry.Course || {};
    const key = toSubjectKey(entry.courseId || course.id);
    if (!key) {
      return;
    }

    const status = inferSubjectStatus({
      rawStatus: entry.status,
      grade: entry.grade,
      yearLevel: entry.yearLevel,
      semester: entry.semester,
      currentYearLevel,
      currentSemester,
    });

    const candidate = {
      courseId: toNumber(entry.courseId || course.id),
      code: course.code,
      name: course.name,
      units: toNumber(course.units),
      yearLevel: toNumber(entry.yearLevel),
      semester: toNumber(entry.semester),
      grade: entry.grade,
      rawStatus: entry.status,
      status,
      versionNumber: toNumber(entry.versionNumber),
    };

    const existing = latestStatusByCourseId.get(key);
    if (!existing || candidate.versionNumber > existing.versionNumber) {
      latestStatusByCourseId.set(key, candidate);
    } else if (existing && candidate.versionNumber === existing.versionNumber) {
      if (buildStatusRank(candidate.status) > buildStatusRank(existing.status)) {
        latestStatusByCourseId.set(key, candidate);
      }
    }
  });

  // Build sets for elective track resolution
  const normalizedSelectedTrackCourses = Array.isArray(electiveTrackCourses)
    ? electiveTrackCourses.map((e) => toPlain(e))
    : [];
  const normalizedAllTrackCourses = Array.isArray(allCurriculumTrackCourses)
    ? allCurriculumTrackCourses.map((e) => toPlain(e))
    : [];
  const selectedTrackCourseIds = new Set(
    normalizedSelectedTrackCourses.map((e) => String(e.courseId || e.Course?.id)),
  );
  const allTrackCourseIds = new Set(
    normalizedAllTrackCourses.map((e) => String(e.courseId || e.Course?.id)),
  );
  const selectedTrackByCourseId = new Map(
    normalizedSelectedTrackCourses.map((e) => [
      String(e.courseId || e.Course?.id),
      { yearLevel: toNumber(e.yearLevel), semester: toNumber(e.semester), Course: e.Course },
    ]),
  );

  const checklistBase =
    normalizedCurriculumCourses.length > 0
      ? normalizedCurriculumCourses
          .filter((entry) => {
            const courseId = String(entry.courseId || entry.Course?.id);
            // Remove placeholder elective courses that belong to OTHER tracks
            if (
              Boolean(entry.isElective) &&
              allTrackCourseIds.has(courseId) &&
              !selectedTrackCourseIds.has(courseId)
            ) {
              return false;
            }
            return true;
          })
          .map((entry) => {
            const courseId = String(entry.courseId || entry.Course?.id);
            const trackOverride = selectedTrackByCourseId.get(courseId);
            return {
              courseId: toNumber(entry.courseId || entry.Course?.id),
              code: trackOverride?.Course?.code || entry.Course?.code,
              name: trackOverride?.Course?.name || entry.Course?.name,
              units: toNumber(trackOverride?.Course?.units || entry.Course?.units),
              yearLevel: toNumber(trackOverride?.yearLevel || entry.yearLevel),
              semester: toNumber(trackOverride?.semester || entry.semester),
              isElective: Boolean(entry.isElective),
            };
          })
          // Add selected track courses not already in curriculum list
          .concat(
            normalizedSelectedTrackCourses
              .filter((e) => {
                const cid = String(e.courseId || e.Course?.id);
                return !normalizedCurriculumCourses.some(
                  (cc) => String(cc.courseId || cc.Course?.id) === cid,
                );
              })
              .map((e) => ({
                courseId: toNumber(e.courseId || e.Course?.id),
                code: e.Course?.code,
                name: e.Course?.name,
                units: toNumber(e.Course?.units),
                yearLevel: toNumber(e.yearLevel),
                semester: toNumber(e.semester),
                isElective: true,
              })),
          )
      : Array.from(latestStatusByCourseId.values()).map((entry) => ({
          courseId: toNumber(entry.courseId),
          code: entry.code,
          name: entry.name,
          units: toNumber(entry.units),
          yearLevel: toNumber(entry.yearLevel),
          semester: toNumber(entry.semester),
          isElective: false,
        }));

  const prerequisiteMap = new Map();
  normalizedPrerequisites.forEach((rule) => {
    const targetCourseId = toSubjectKey(rule.courseId);
    if (!targetCourseId) {
      return;
    }

    if (!prerequisiteMap.has(targetCourseId)) {
      prerequisiteMap.set(targetCourseId, []);
    }

    prerequisiteMap.get(targetCourseId).push({
      courseId: toNumber(rule.prerequisiteCourseId),
      code: rule.PrerequisiteCourse?.code,
      name: rule.PrerequisiteCourse?.name,
    });
  });

  const completedCourseIds = new Set(
    Array.from(latestStatusByCourseId.values())
      .filter((entry) => entry.status === STATUS_COMPLETED || entry.status === STATUS_CREDITED)
      .map((entry) => toSubjectKey(entry.courseId)),
  );

  const statusCounters = statusCounterTemplate();

  const subjectIndicators = checklistBase
    .map((subject) => {
      const latest = latestStatusByCourseId.get(toSubjectKey(subject.courseId));
      const status =
        latest?.status ||
        inferSubjectStatus({
          rawStatus: STATUS_PENDING,
          grade: null,
          yearLevel: subject.yearLevel,
          semester: subject.semester,
          currentYearLevel,
          currentSemester,
        });

      statusCounters[status] = (statusCounters[status] || 0) + 1;

      const requiredPrereqs = prerequisiteMap.get(toSubjectKey(subject.courseId)) || [];
      const unmetPrerequisites = requiredPrereqs.filter(
        (rule) => !completedCourseIds.has(toSubjectKey(rule.courseId)),
      );

      return {
        studyPlanCourseId: latest?.id || null,
        courseId: subject.courseId,
        code: subject.code || latest?.code || null,
        name: subject.name || latest?.name || null,
        units: toNumber(subject.units || latest?.units),
        yearLevel: toNumber(subject.yearLevel || latest?.yearLevel),
        semester: toNumber(subject.semester || latest?.semester),
        grade: latest?.grade || null,
        rawStatus: latest?.rawStatus || STATUS_PENDING,
        status,
        isElective: Boolean(subject.isElective),
        prerequisites: requiredPrereqs,
        unmetPrerequisites,
        isPrerequisiteMet: unmetPrerequisites.length === 0,
        isEligible:
          unmetPrerequisites.length === 0 &&
          (status === STATUS_PENDING ||
            status === STATUS_NOT_YET_TAKEN ||
            status === STATUS_ONGOING),
        isPriority: false,
      };
    })
    .sort(sortByPlacement);

  const pendingEligible = subjectIndicators.filter(
    (subject) =>
      subject.isEligible &&
      (subject.status === STATUS_PENDING ||
        subject.status === STATUS_NOT_YET_TAKEN ||
        subject.status === STATUS_ONGOING),
  );
  const earliestPrioritySlot = pendingEligible.reduce((minimum, subject) => {
    const slot = toNumber(subject.yearLevel) * 10 + toNumber(subject.semester);
    if (!minimum || slot < minimum) {
      return slot;
    }
    return minimum;
  }, null);

  subjectIndicators.forEach((subject) => {
    const slot = toNumber(subject.yearLevel) * 10 + toNumber(subject.semester);
    if (earliestPrioritySlot && slot === earliestPrioritySlot && subject.isEligible) {
      subject.isPriority = true;
    }
  });

  const totalUnits = checklistBase.reduce((sum, item) => sum + toNumber(item.units), 0);
  const completedUnits = subjectIndicators
    .filter((item) => item.status === STATUS_COMPLETED || item.status === STATUS_CREDITED)
    .reduce((sum, item) => sum + toNumber(item.units), 0);
  const remainingUnits = Math.max(totalUnits - completedUnits, 0);
  const completionPercentage =
    totalUnits > 0 ? Number(((completedUnits / totalUnits) * 100).toFixed(2)) : 0;

  const checklistTotalSubjects = checklistBase.length;
  const completedSubjects = subjectIndicators.filter(
    (item) => item.status === STATUS_COMPLETED || item.status === STATUS_CREDITED,
  ).length;
  const remainingSubjects = Math.max(checklistTotalSubjects - completedSubjects, 0);

  const takenSummary = {
    passed: statusCounters[STATUS_COMPLETED],
    failed:
      statusCounters[STATUS_FAILED] +
      statusCounters[STATUS_DROPPED] +
      statusCounters[STATUS_INCOMPLETE],
    credited: statusCounters[STATUS_CREDITED],
  };

  const rowsForGwa = subjectIndicators.filter((item) =>
    [STATUS_COMPLETED, STATUS_FAILED, STATUS_DROPPED].includes(item.status),
  );

  const groupedSemester = new Map();
  subjectIndicators.forEach((item) => {
    const key = `${item.yearLevel}-${item.semester}`;
    if (!groupedSemester.has(key)) {
      groupedSemester.set(key, []);
    }
    groupedSemester.get(key).push(item);
  });

  const semesterAcademicSummary = Array.from(groupedSemester.entries())
    .map(([key, entries]) => {
      const [yearLevel, semester] = key.split('-').map(Number);
      return {
        yearLevel,
        semester,
        label: `Year ${yearLevel} ${semesterLabel(semester)}`,
        totalUnits: entries.reduce((sum, item) => sum + toNumber(item.units), 0),
        totalSubjects: entries.length,
        completedUnits: entries
          .filter((entry) => entry.status === STATUS_COMPLETED || entry.status === STATUS_CREDITED)
          .reduce((sum, entry) => sum + toNumber(entry.units), 0),
        passedSubjects: entries.filter(
          (entry) => entry.status === STATUS_COMPLETED || entry.status === STATUS_CREDITED,
        ).length,
        failedSubjects: entries.filter((entry) =>
          [STATUS_FAILED, STATUS_DROPPED, STATUS_INCOMPLETE].includes(entry.status),
        ).length,
        pendingSubjects: entries.filter((entry) =>
          [STATUS_PENDING, STATUS_NOT_YET_TAKEN].includes(entry.status),
        ).length,
        gpa: computeGwa(entries),
      };
    })
    .sort((left, right) => {
      if (left.yearLevel !== right.yearLevel) {
        return left.yearLevel - right.yearLevel;
      }
      return left.semester - right.semester;
    });

  const currentOrLatestSemester =
    semesterAcademicSummary.find(
      (entry) => entry.yearLevel === currentYearLevel && entry.semester === currentSemester,
    ) ||
    semesterAcademicSummary[semesterAcademicSummary.length - 1] ||
    null;

  // Count remaining semesters from the actual study plan schedule:
  // Find distinct year/semester slots that still have incomplete courses.
  // Exclude the current semester (ongoing courses) — the student is already enrolled.
  const incompleteSemesterSlots = new Set();
  subjectIndicators.forEach((subject) => {
    if (
      subject.status !== STATUS_COMPLETED &&
      subject.status !== STATUS_CREDITED &&
      subject.status !== STATUS_ONGOING
    ) {
      const key = `${subject.yearLevel}-${subject.semester}`;
      incompleteSemesterSlots.add(key);
    }
  });

  // Detect whether summer is part of this student's curriculum
  const curriculumHasSummer = checklistBase.some((subject) => toNumber(subject.semester) === 3);

  // Keep average-based values for informational display only
  const averageUnits = DEFAULT_AVG_UNITS_PER_SEMESTER > 0 ? DEFAULT_AVG_UNITS_PER_SEMESTER : 18;
  const averageSubjects =
    DEFAULT_AVG_SUBJECTS_PER_SEMESTER > 0 ? DEFAULT_AVG_SUBJECTS_PER_SEMESTER : 6;
  const semestersByUnits = remainingUnits > 0 ? Math.ceil(remainingUnits / averageUnits) : 0;
  const semestersBySubjects =
    remainingSubjects > 0 ? Math.ceil(remainingSubjects / averageSubjects) : 0;

  const placementRemainingSemesters = (() => {
    if (remainingSubjects <= 0) {
      return 0;
    }

    const currentIndex = toTermIndex(currentYearLevel, currentSemester);
    if (currentIndex === null) {
      return 0;
    }

    const remainingIndices = subjectIndicators
      .filter((item) => ![STATUS_COMPLETED, STATUS_CREDITED].includes(item.status))
      .map((item) => toTermIndex(item.yearLevel, item.semester))
      .filter((index) => index !== null);

    if (remainingIndices.length === 0) {
      return 0;
    }

    const furthestRemainingIndex = Math.max(...remainingIndices);
    return Math.max(furthestRemainingIndex - currentIndex + 1, 1);
  })();

  const standingRemainingSemesters = (() => {
    const targetSemester = 2;
    const targetYearLevel = 4;

    const currentIndex = toTermIndex(currentYearLevel, currentSemester);
    const targetIndex = toTermIndex(targetYearLevel, targetSemester);
    if (currentIndex === null || targetIndex === null) {
      return null;
    }

    return Math.max(targetIndex - currentIndex + 1, 0);
  })();

  const unconstrainedEstimatedRemainingSemesters = Math.max(
    semestersByUnits,
    semestersBySubjects,
    placementRemainingSemesters,
    0,
  );

  const hasBacklog =
    statusCounters[STATUS_FAILED] > 0 ||
    statusCounters[STATUS_DROPPED] > 0 ||
    statusCounters[STATUS_INCOMPLETE] > 0;

  const estimatedRemainingSemesters =
    !hasBacklog &&
    Number.isFinite(standingRemainingSemesters) &&
    standingRemainingSemesters !== null &&
    standingRemainingSemesters > 0
      ? Math.min(unconstrainedEstimatedRemainingSemesters, standingRemainingSemesters)
      : unconstrainedEstimatedRemainingSemesters;

  const advancementSteps =
    estimatedRemainingSemesters > 0 ? Math.max(estimatedRemainingSemesters - 1, 0) : 0;

  const projectedTerm = currentTerm?.schoolYear
    ? advanceAcademicTerm(
        {
          schoolYear: currentTerm.schoolYear,
          semester: currentTerm.semester,
        },
        advancementSteps,
      )
    : null;

  const projectedDate = projectedTerm
    ? null
    : (() => {
        const now = new Date();
        const monthAdvance = advancementSteps * 6;
        const projected = new Date(now.getFullYear(), now.getMonth() + monthAdvance, 1);
        return projected.toISOString();
      })();

  const prerequisiteCourseEntries = subjectIndicators.filter(
    (subject) => Array.isArray(subject.prerequisites) && subject.prerequisites.length > 0,
  );

  const prerequisitesMetCount = prerequisiteCourseEntries.filter(
    (subject) => subject.isPrerequisiteMet,
  ).length;
  const prerequisitesUnmetCount = prerequisiteCourseEntries.length - prerequisitesMetCount;

  const reviewStatus = resolvedActiveVersion?.validatedAt
    ? 'approved'
    : latestVersion?.status === 'draft'
      ? 'draft'
      : latestVersion?.status === 'active'
        ? 'reviewed'
        : 'not_started';

  const program = sarPlain.Student?.program || sarPlain.Student?.program_name || null;
  const studentType = sarPlain.Student?.student_type || null;

  return {
    tags: {
      yearLevel: currentYearLevel || null,
      semester: toNumber(currentTerm?.semester) || null,
      semesterLabel: semesterLabel(currentTerm?.semester),
      schoolYear: currentTerm?.schoolYear || null,
      program,
      studentType,
      curriculumName: sarPlain.Curriculum?.name || null,
    },
    usedCurriculum: {
      id: sarPlain.Curriculum?.id || sarPlain.curriculumId || null,
      name: sarPlain.Curriculum?.name || null,
      description: sarPlain.Curriculum?.description || null,
    },
    progress: {
      unitsCompletedVsTotal: `${completedUnits} / ${totalUnits}`,
      totalUnits,
      completedUnits,
      remainingUnits,
      unitsEarned: completedUnits,
      completionPercentage,
      completedSubjects,
      remainingSubjects,
      totalSubjects: checklistTotalSubjects,
    },
    statusCounters: {
      ...statusCounters,
      totalSubjects: checklistTotalSubjects,
    },
    subjectsTakenSummary: takenSummary,
    gpaMonitoring: {
      gwa: computeGwa(rowsForGwa),
      gradedUnits: rowsForGwa.reduce((sum, entry) => sum + toNumber(entry.units), 0),
      gradedSubjects: rowsForGwa.length,
      latestSemesterGpa: currentOrLatestSemester?.gpa || null,
    },
    semesterAcademicSummary,
    adviserReviewWorkflow: {
      hasStudyPlan: Boolean(sarPlain.StudyPlan?.id),
      totalVersions: versions.length,
      latestVersionStatus: latestVersion?.status || null,
      activeVersionStatus: resolvedActiveVersion?.status || null,
      needsRevalidation: Boolean(
        resolvedActiveVersion?.needsRevalidation || latestVersion?.needsRevalidation,
      ),
      lastValidatedAt: resolvedActiveVersion?.validatedAt || null,
      reviewStatus,
      reviewedBy: resolvedActiveVersion?.ValidatedByAdviser
        ? {
            id: resolvedActiveVersion.ValidatedByAdviser.id,
            name: `${resolvedActiveVersion.ValidatedByAdviser.firstName || ''} ${resolvedActiveVersion.ValidatedByAdviser.lastName || ''}`.trim(),
            email: resolvedActiveVersion.ValidatedByAdviser.email || null,
          }
        : null,
    },
    prerequisiteChecking: {
      totalRules: normalizedPrerequisites.length,
      metSubjects: prerequisitesMetCount,
      unmetSubjects: prerequisitesUnmetCount,
      subjects: prerequisiteCourseEntries.map((subject) => ({
        courseId: subject.courseId,
        code: subject.code,
        name: subject.name,
        prerequisites: subject.prerequisites,
        unmetPrerequisites: subject.unmetPrerequisites,
        isPrerequisiteMet: subject.isPrerequisiteMet,
        eligibility: subject.isPrerequisiteMet ? 'eligible' : 'not-eligible',
      })),
    },
    curriculumChecklistOverview: {
      totalSubjects: checklistTotalSubjects,
      completedSubjects,
      remainingSubjects,
      items: subjectIndicators,
    },
    prioritySubjectIndicators: subjectIndicators.filter((subject) => subject.isPriority),
    remainingSemestersTracking: {
      estimatedRemainingSemesters,
      basedOnUnits: semestersByUnits,
      basedOnSubjects: semestersBySubjects,
      basedOnPlacement: placementRemainingSemesters,
      basedOnStanding: standingRemainingSemesters,
      hasBacklog,
      assumptions: {
        averageUnitsPerSemester: averageUnits,
        averageSubjectsPerSemester: averageSubjects,
        includeSummer: curriculumHasSummer,
      },
    },
    estimatedGraduationDate: {
      estimatedTerm: projectedTerm,
      estimatedDateISO: projectedDate,
      label:
        projectedTerm?.label ||
        (projectedDate ? new Date(projectedDate).toLocaleDateString() : 'N/A'),
    },
  };
};

module.exports = {
  computeSarAnalytics,
  inferSubjectStatus,
  semesterLabel,
};
