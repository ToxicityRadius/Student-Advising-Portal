const {
  sequelize,
  StudyPlanVersion,
  StudyPlanCourse,
  CurriculumCourse,
  Prerequisite,
  CoRequisite,
  ElectiveTrack,
  ElectiveTrackCourse,
  Course,
  User,
  PrerequisiteOverrideRequest,
} = require('../models');
const {
  buildElectiveTrackPlan,
  slotIndexFromYearSemester,
  yearSemesterFromSlotIndex,
} = require('../utils/studyPlan');

const {
  parseGradeInput,
  parseGradePayload,
  isBlockingStatus,
} = require('../utils/gradeValidation');
const {
  getCrossCurriculumAvailability,
  buildPrerequisiteCascade,
} = require('../utils/courseAvailability');
const GradeService = require('../services/GradeService');
const NotificationService = require('../services/NotificationService');
const ActivityLogService = require('../services/ActivityLogService');

const toNumber = (value) => Number(value);

const serializeVersion = GradeService.serializeVersion;

const getSarWithStudyPlan = GradeService.getSarWithStudyPlan;

const getActiveVersion = GradeService.getActiveVersion;

const collectConnectedComponents = GradeService.collectConnectedComponents;

const includeRelationsForVersion = GradeService.buildVersionIncludes();

const buildStandardUnitsBySlot = GradeService.buildStandardUnitsBySlot;
const buildRetakePlacementMap = GradeService.buildRetakePlacementMap;
const getAllowedUnitsForSlot = GradeService.getAllowedUnitsForSlot;
const buildMutualPrerequisitePairSet = GradeService.buildMutualPrerequisitePairSet;
const buildPrerequisiteOverrideMap = GradeService.buildPrerequisiteOverrideMap;
const isPrerequisitePlacementAllowed = GradeService.isPrerequisitePlacementAllowed;

const buildOverridePairSummary = (studyPlanCourses = [], overrideRequests = []) => {
  const courseCodeById = new Map(
    studyPlanCourses
      .map((entry) => [String(entry.courseId), entry.Course?.code])
      .filter(([, code]) => code),
  );

  const pairs = overrideRequests
    .map((override) => {
      const prerequisiteCode =
        courseCodeById.get(String(override.prerequisiteCourseId)) || 'a prerequisite';
      const dependentCode =
        courseCodeById.get(String(override.dependentCourseId)) || 'a dependent course';
      return `${prerequisiteCode} and ${dependentCode}`;
    })
    .filter(Boolean);

  return pairs.join('; ');
};

const makeRegenerationErrorResponse = async (res, transaction, error) => {
  await transaction.rollback();
  return res.status(error.statusCode || 400).json({
    success: false,
    code: error.code,
    message: error.message,
  });
};

// @desc   Enter grades for active study plan version courses
// @route  PUT /api/sars/:id/study-plan/active-version/grades
// @access adviser, admin
exports.enterGrades = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { grades } = req.body;

    if (!Array.isArray(grades) || grades.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'grades must be a non-empty array' });
    }

    // Step 3.5 — cap submission size to prevent slow transactions
    if (grades.length > 100) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cannot submit more than 100 grades in a single request',
      });
    }

    const sar = await getSarWithStudyPlan(req.params.id, transaction);
    if (!sar) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Student academic record not found' });
    }

    if (!sar.StudyPlan) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ success: false, message: 'No study plan exists for this student academic record' });
    }

    const activeVersion = await getActiveVersion(sar.StudyPlan.id, transaction);
    if (!activeVersion) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ success: false, message: 'No active study plan version found for grade entry' });
    }

    if (activeVersion.status === 'archived') {
      await transaction.rollback();
      return res
        .status(400)
        .json({ success: false, message: 'Cannot enter grades for an archived or locked version' });
    }

    const courseRows = await StudyPlanCourse.findAll({
      where: { studyPlanVersionId: activeVersion.id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    const byId = new Map(courseRows.map((row) => [String(row.id), row]));

    for (const item of grades) {
      if (!item || item.studyPlanCourseId === undefined || item.studyPlanCourseId === null) {
        throw new Error('Each grade item must include studyPlanCourseId');
      }

      const row = byId.get(String(item.studyPlanCourseId));
      if (!row) {
        throw new Error('One or more studyPlanCourseId values do not belong to the active version');
      }

      const parsed = parseGradePayload(item);
      await row.update(
        {
          grade: parsed.grade,
          status: parsed.status,
          updatedAt: Date.now(),
        },
        { transaction },
      );
    }

    await transaction.commit();

    // Notify the student that grades were entered
    if (sar.userId) {
      NotificationService.notify({
        recipientId: sar.userId,
        actorId: req.user.id,
        category: 'grades_entered',
        resourceType: 'study_plan_version',
        resourceId: activeVersion.id,
        meta: { gradeCount: grades.length },
      });
    }

    const refreshedVersion = await StudyPlanVersion.findByPk(activeVersion.id, {
      include: includeRelationsForVersion,
    });

    const serialized = serializeVersion(refreshedVersion);
    const summary = serialized.StudyPlanCourses.reduce(
      (acc, entry) => {
        acc[entry.status] = (acc[entry.status] || 0) + 1;
        return acc;
      },
      {
        pending: 0,
        passed: 0,
        failed: 0,
        dropped: 0,
        incomplete: 0,
        officially_dropped: 0,
        unofficially_dropped: 0,
      },
    );

    return res.status(200).json({
      success: true,
      data: serialized,
      summary,
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

// @desc   Bulk import grades from CSV rows
// @route  POST /api/sars/:id/study-plan/active-version/grades/bulk-import
// @access adviser, admin
exports.bulkImportGrades = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { rows } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'rows must be a non-empty array of { courseCode, grade }',
      });
    }

    if (rows.length > 200) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cannot import more than 200 grade rows in a single request',
      });
    }

    const sar = await getSarWithStudyPlan(req.params.id, transaction);
    if (!sar) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Student academic record not found' });
    }

    if (!sar.StudyPlan) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ success: false, message: 'No study plan exists for this student academic record' });
    }

    const activeVersion = await getActiveVersion(sar.StudyPlan.id, transaction);
    if (!activeVersion) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ success: false, message: 'No active study plan version found for grade entry' });
    }

    if (activeVersion.status === 'archived') {
      await transaction.rollback();
      return res
        .status(400)
        .json({ success: false, message: 'Cannot enter grades for an archived or locked version' });
    }

    const courseRows = await StudyPlanCourse.findAll({
      where: { studyPlanVersionId: activeVersion.id },
      include: [{ model: Course, attributes: ['id', 'code'] }],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    const byCode = new Map();
    for (const row of courseRows) {
      const code = String(row.Course?.code || '')
        .trim()
        .toUpperCase();
      if (code) byCode.set(code, row);
    }

    const errors = [];
    const updates = [];

    for (let i = 0; i < rows.length; i++) {
      const item = rows[i];
      const lineNum = i + 1;

      if (!item || !item.courseCode) {
        errors.push({ line: lineNum, message: 'Missing courseCode' });
        continue;
      }

      const code = String(item.courseCode).trim().toUpperCase();
      const planRow = byCode.get(code);

      if (!planRow) {
        errors.push({
          line: lineNum,
          courseCode: code,
          message: `Course code "${code}" not found in the active study plan`,
        });
        continue;
      }

      try {
        const parsed = parseGradePayload({ grade: item.grade });
        updates.push({ planRow, parsed, code, lineNum });
      } catch (err) {
        errors.push({ line: lineNum, courseCode: code, message: err.message });
      }
    }

    if (errors.length > 0 && updates.length === 0) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ success: false, message: 'All rows failed validation', errors });
    }

    for (const { planRow, parsed } of updates) {
      await planRow.update(
        { grade: parsed.grade, status: parsed.status, updatedAt: Date.now() },
        { transaction },
      );
    }

    await transaction.commit();

    if (sar.userId) {
      NotificationService.notify({
        recipientId: sar.userId,
        actorId: req.user.id,
        category: 'grades_entered',
        resourceType: 'study_plan_version',
        resourceId: activeVersion.id,
        meta: { gradeCount: updates.length, bulkImport: true },
      });
    }

    const refreshedVersion = await StudyPlanVersion.findByPk(activeVersion.id, {
      include: includeRelationsForVersion,
    });

    const serialized = serializeVersion(refreshedVersion);
    const summary = serialized.StudyPlanCourses.reduce(
      (acc, entry) => {
        acc[entry.status] = (acc[entry.status] || 0) + 1;
        return acc;
      },
      {
        pending: 0,
        passed: 0,
        failed: 0,
        dropped: 0,
        incomplete: 0,
        officially_dropped: 0,
        unofficially_dropped: 0,
      },
    );

    return res.status(200).json({
      success: true,
      data: serialized,
      summary,
      imported: updates.length,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

// @desc   Regenerate study plan and create next draft version
// @route  POST /api/sars/:id/study-plan/regenerate
// @access adviser, admin
exports.triggerRegeneration = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const sar = await getSarWithStudyPlan(req.params.id, transaction);

    if (!sar) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Student academic record not found' });
    }

    if (!sar.StudyPlan) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ success: false, message: 'No study plan exists for this student academic record' });
    }

    const activeVersion = await getActiveVersion(sar.StudyPlan.id, transaction);
    if (!activeVersion) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ success: false, message: 'No active study plan version found for regeneration' });
    }

    if (activeVersion.status === 'archived') {
      await transaction.rollback();
      return res
        .status(400)
        .json({ success: false, message: 'Cannot regenerate from an archived or locked version' });
    }

    const retakePlacements = Array.isArray(req.body?.retakePlacements)
      ? req.body.retakePlacements
      : [];
    const semesterOverrides = Array.isArray(req.body?.semesterOverrides)
      ? req.body.semesterOverrides
      : [];
    const semesterOverridePlacements = semesterOverrides.map((override) => ({
      courseId: override?.courseId,
      yearLevel: override?.yearLevel,
      semester: override?.semester,
    }));

    let retakePlacementByCourseId;
    try {
      retakePlacementByCourseId = buildRetakePlacementMap({
        activeEntries: activeVersion.StudyPlanCourses || [],
        retakePlacements: [...retakePlacements, ...semesterOverridePlacements],
      });
    } catch (error) {
      return makeRegenerationErrorResponse(res, transaction, error);
    }

    const [
      curriculumCourses,
      prerequisites,
      coRequisites,
      selectedTrackCourses,
      curriculumTrackCourses,
    ] = await Promise.all([
      CurriculumCourse.findAll({
        where: { curriculumId: sar.curriculumId },
        include: [{ model: Course, attributes: ['id', 'code', 'name', 'units'] }],
        transaction,
      }),
      Prerequisite.findAll({ where: { curriculumId: sar.curriculumId }, transaction }),
      CoRequisite.findAll({ where: { curriculumId: sar.curriculumId }, transaction }),
      sar.electiveTrackId
        ? ElectiveTrackCourse.findAll({
            where: { electiveTrackId: sar.electiveTrackId },
            include: [{ model: Course, attributes: ['id', 'code', 'name', 'units'] }],
            transaction,
          })
        : [],
      ElectiveTrackCourse.findAll({
        include: [
          {
            model: ElectiveTrack,
            attributes: ['id', 'curriculumId'],
            where: { curriculumId: sar.curriculumId },
          },
        ],
        transaction,
      }),
    ]);

    const curriculumByCourse = new Map();
    curriculumCourses.forEach((item) => {
      curriculumByCourse.set(String(item.courseId), {
        yearLevel: item.yearLevel,
        semester: item.semester,
        isElective: Boolean(item.isElective),
        units: Number(item.Course?.units || 0),
        sortKey: slotIndexFromYearSemester(item.yearLevel, item.semester),
      });
    });

    const selectedTrackPlan = buildElectiveTrackPlan(selectedTrackCourses || []);
    const selectedTrackCourseIds = new Set(selectedTrackPlan.map((item) => String(item.courseId)));
    const curriculumTrackCourseIds = new Set(
      (curriculumTrackCourses || []).map((item) => String(item.courseId)),
    );
    const standardUnitsBySlot = buildStandardUnitsBySlot({
      curriculumCourses,
      selectedTrackPlan,
      selectedTrackCourseIds,
      curriculumTrackCourseIds,
      hasSelectedTrack: Boolean(sar.electiveTrackId),
    });

    selectedTrackPlan.forEach((item) => {
      const courseId = String(item.courseId);
      const course = item.source?.Course;

      if (!curriculumByCourse.has(courseId)) {
        curriculumByCourse.set(courseId, {
          yearLevel: item.yearLevel,
          semester: item.semester,
          isElective: true,
          units: Number(course?.units || 0),
          sortKey: item.sortKey,
        });
      }
    });

    const prerequisiteMap = new Map();
    prerequisites.forEach((rule) => {
      const key = String(rule.courseId);
      if (!prerequisiteMap.has(key)) {
        prerequisiteMap.set(key, new Set());
      }
      prerequisiteMap.get(key).add(String(rule.prerequisiteCourseId));
    });
    const mutualPrerequisitePairs = buildMutualPrerequisitePairSet(prerequisites);

    const coReqMap = new Map();
    coRequisites.forEach((rule) => {
      const left = String(rule.courseId);
      const right = String(rule.coRequisiteCourseId);
      if (!coReqMap.has(left)) {
        coReqMap.set(left, new Set());
      }
      if (!coReqMap.has(right)) {
        coReqMap.set(right, new Set());
      }
      coReqMap.get(left).add(right);
      coReqMap.get(right).add(left);
    });

    selectedTrackPlan.forEach((item, index) => {
      if (index === 0) {
        return;
      }

      const currentCourseId = String(item.courseId);
      const previousCourseId = String(selectedTrackPlan[index - 1].courseId);

      if (!prerequisiteMap.has(currentCourseId)) {
        prerequisiteMap.set(currentCourseId, new Set());
      }

      prerequisiteMap.get(currentCourseId).add(previousCourseId);
    });

    const rawOverrideRequests = Array.isArray(req.body?.prerequisiteOverrideRequests)
      ? req.body.prerequisiteOverrideRequests
      : [];
    const pendingOverrideRequests = [];

    for (const item of rawOverrideRequests) {
      const prerequisiteCourseId = Number(item?.prerequisiteCourseId);
      const dependentCourseId = Number(item?.dependentCourseId);
      const yearLevel = Number(item?.yearLevel);
      const semester = Number(item?.semester);
      const reason = String(item?.reason || '').trim();

      if (
        !Number.isInteger(prerequisiteCourseId) ||
        !Number.isInteger(dependentCourseId) ||
        !Number.isInteger(yearLevel) ||
        ![1, 2, 3].includes(semester) ||
        !reason
      ) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          code: 'INVALID_PREREQUISITE_OVERRIDE_REQUEST',
          message:
            'Override requests require prerequisiteCourseId, dependentCourseId, yearLevel, semester, and reason',
        });
      }

      const prereqIds = prerequisiteMap.get(String(dependentCourseId)) || new Set();
      if (!prereqIds.has(String(prerequisiteCourseId))) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          code: 'INVALID_PREREQUISITE_OVERRIDE_PAIR',
          message: 'Override requests must match an existing prerequisite rule',
        });
      }

      pendingOverrideRequests.push({
        prerequisiteCourseId,
        dependentCourseId,
        yearLevel,
        semester,
        reason,
        status: 'pending',
      });
    }

    const prerequisiteOverrideMap = buildPrerequisiteOverrideMap(pendingOverrideRequests);

    const resolvedCourses = [];
    const requeueCourses = [];
    const versionCourseIds = new Set(
      activeVersion.StudyPlanCourses.map((entry) => String(entry.courseId)),
    );

    activeVersion.StudyPlanCourses.forEach((entry) => {
      const courseId = String(entry.courseId);
      const courseMeta = curriculumByCourse.get(courseId);
      if (!courseMeta) {
        return;
      }

      const parsed = parseGradeInput(entry.grade);
      const classification = parsed.status;
      const isElectiveExcluded =
        curriculumTrackCourseIds.has(courseId) &&
        sar.electiveTrackId &&
        !selectedTrackCourseIds.has(courseId);

      if (classification === 'passed') {
        resolvedCourses.push({
          courseId,
          course: entry.Course,
          yearLevel: entry.yearLevel,
          semester: entry.semester,
          grade: parsed.grade,
          status: 'passed',
          units: courseMeta.units,
        });
        return;
      }

      // INC (incomplete / 4.00) — keep in slot, treat as "conditionally met"
      // for prerequisite checking. Dependents are NOT blocked.
      if (classification === 'incomplete') {
        resolvedCourses.push({
          courseId,
          course: entry.Course,
          yearLevel: entry.yearLevel,
          semester: entry.semester,
          grade: parsed.grade,
          status: 'incomplete',
          units: courseMeta.units,
        });
        return;
      }

      if (isElectiveExcluded) {
        return;
      }

      const forcedPlacement = retakePlacementByCourseId.get(courseId) || null;
      requeueCourses.push({
        courseId,
        course: entry.Course,
        originalSortKey: forcedPlacement?.slotIndex ?? courseMeta.sortKey,
        units: courseMeta.units,
        forcedPlacement,
        failedGrade: parsed.grade,
        failedStatus: classification,
      });
    });

    selectedTrackPlan.forEach((item) => {
      const courseId = String(item.courseId);
      if (versionCourseIds.has(courseId)) {
        return;
      }

      const courseMeta = curriculumByCourse.get(courseId);
      requeueCourses.push({
        courseId,
        course: item.source?.Course || null,
        originalSortKey: item.sortKey,
        units: Number(courseMeta?.units || item.source?.Course?.units || 0),
      });
    });

    if (requeueCourses.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'All courses are already passed. Regeneration is not needed.',
      });
    }

    const placementByCourseId = new Map();
    const usedUnitsBySlot = new Map();
    const scheduledRows = [];

    resolvedCourses.forEach((entry) => {
      const slotIndex = slotIndexFromYearSemester(entry.yearLevel, entry.semester);
      placementByCourseId.set(entry.courseId, slotIndex);
      usedUnitsBySlot.set(
        slotIndex,
        (usedUnitsBySlot.get(slotIndex) || 0) + Number(entry.units || 0),
      );
      scheduledRows.push({
        courseId: toNumber(entry.courseId),
        yearLevel: entry.yearLevel,
        semester: entry.semester,
        grade: entry.grade,
        status: entry.status,
      });
    });

    const requeueIds = requeueCourses.map((item) => item.courseId);
    const adjacency = new Map(requeueIds.map((id) => [id, new Set()]));

    requeueIds.forEach((courseId) => {
      const neighbors = coReqMap.get(courseId) || new Set();
      neighbors.forEach((neighborId) => {
        if (adjacency.has(neighborId)) {
          adjacency.get(courseId).add(neighborId);
        }
      });
    });
    mutualPrerequisitePairs.forEach((pairKey) => {
      const [leftId, rightId] = String(pairKey).split('|');
      if (adjacency.has(leftId) && adjacency.has(rightId)) {
        adjacency.get(leftId).add(rightId);
        adjacency.get(rightId).add(leftId);
      }
    });

    const components = collectConnectedComponents(
      requeueIds,
      new Map([...adjacency.entries()].map(([key, set]) => [key, [...set]])),
    );

    const requeueMetaById = new Map(requeueCourses.map((item) => [item.courseId, item]));

    const sortedComponents = components
      .map((component) => {
        const forcedSlots = [
          ...new Set(
            component
              .map((id) => requeueMetaById.get(id)?.forcedPlacement?.slotIndex)
              .filter((slot) => Number.isInteger(slot)),
          ),
        ];
        return {
          courseIds: component,
          originalSortKey:
            forcedSlots[0] ??
            Math.min(
              ...component.map(
                (id) => requeueMetaById.get(id)?.originalSortKey || Number.MAX_SAFE_INTEGER,
              ),
            ),
          forcedSlotIndex: forcedSlots.length === 1 ? forcedSlots[0] : null,
          hasConflictingForcedSlots: forcedSlots.length > 1,
          totalUnits: component.reduce(
            (sum, id) => sum + Number(requeueMetaById.get(id)?.units || 0),
            0,
          ),
        };
      })
      .sort((left, right) => left.originalSortKey - right.originalSortKey);

    for (const component of sortedComponents) {
      if (component.hasConflictingForcedSlots) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          code: 'CONFLICTING_RETAKE_PLACEMENTS',
          message: 'Co-requisite retake courses must be placed in the same term',
        });
      }

      let slotIndex = Math.max(0, component.originalSortKey);

      // Apply semester overrides if provided
      for (const courseId of component.courseIds) {
        const override = semesterOverrides.find((o) => String(o.courseId) === courseId);
        if (override) {
          slotIndex = slotIndexFromYearSemester(
            Number(override.yearLevel),
            Number(override.semester),
          );
          break;
        }
      }

      let placed = false;

      while (!placed && slotIndex < 120) {
        const usedUnits = usedUnitsBySlot.get(slotIndex) || 0;
        const allowedUnits = getAllowedUnitsForSlot({ slotIndex, standardUnitsBySlot });
        if (usedUnits + component.totalUnits > allowedUnits) {
          if (component.forcedSlotIndex !== null) {
            break;
          }
          slotIndex += 1;
          continue;
        }

        let prerequisitesOk = true;
        for (const courseId of component.courseIds) {
          const prereqIds = prerequisiteMap.get(courseId) || new Set();
          for (const prereqId of prereqIds) {
            const prereqPlacement = component.courseIds.includes(prereqId)
              ? slotIndex
              : placementByCourseId.get(prereqId);
            const placementCheck = isPrerequisitePlacementAllowed({
              prerequisiteCourseId: prereqId,
              dependentCourseId: courseId,
              prerequisiteSlotIndex: prereqPlacement,
              dependentSlotIndex: slotIndex,
              overrideMap: prerequisiteOverrideMap,
              mutualPrerequisitePairs,
              allowPending: true,
            });
            if (!placementCheck.allowed) {
              prerequisitesOk = false;
              break;
            }
          }

          if (!prerequisitesOk) {
            break;
          }
        }

        if (!prerequisitesOk) {
          if (component.forcedSlotIndex !== null) {
            break;
          }
          slotIndex += 1;
          continue;
        }

        let coReqOk = true;
        for (const courseId of component.courseIds) {
          const coReqIds = coReqMap.get(courseId) || new Set();

          for (const coReqId of coReqIds) {
            const isInCurrentComponent = component.courseIds.includes(coReqId);
            if (isInCurrentComponent) {
              continue;
            }

            const coReqPlacement = placementByCourseId.get(coReqId);
            if (coReqPlacement === undefined) {
              coReqOk = false;
              break;
            }
          }

          if (!coReqOk) {
            break;
          }
        }

        if (!coReqOk) {
          if (component.forcedSlotIndex !== null) {
            break;
          }
          slotIndex += 1;
          continue;
        }

        const { yearLevel, semester } = yearSemesterFromSlotIndex(slotIndex);
        component.courseIds.forEach((courseId) => {
          const entry = requeueMetaById.get(courseId);
          placementByCourseId.set(courseId, slotIndex);
          scheduledRows.push({
            courseId: toNumber(courseId),
            yearLevel,
            semester,
            grade: null,
            status: 'pending',
          });
          usedUnitsBySlot.set(
            slotIndex,
            (usedUnitsBySlot.get(slotIndex) || 0) + Number(entry?.units || 0),
          );
        });

        placed = true;
      }

      if (!placed) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          code: 'UNABLE_TO_PLACE_RETAKE',
          message:
            'Unable to place all unresolved courses while satisfying prerequisite/co-requisite and unit constraints',
        });
      }
    }

    for (const override of pendingOverrideRequests) {
      const prerequisiteRow = scheduledRows.find(
        (row) => String(row.courseId) === String(override.prerequisiteCourseId),
      );
      const dependentRow = scheduledRows.find(
        (row) => String(row.courseId) === String(override.dependentCourseId),
      );

      if (
        !prerequisiteRow ||
        !dependentRow ||
        Number(prerequisiteRow.yearLevel) !== Number(override.yearLevel) ||
        Number(dependentRow.yearLevel) !== Number(override.yearLevel) ||
        Number(prerequisiteRow.semester) !== Number(override.semester) ||
        Number(dependentRow.semester) !== Number(override.semester)
      ) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          code: 'PREREQUISITE_OVERRIDE_NOT_APPLIED',
          message:
            'Requested prerequisite overrides must place both courses in the requested same term',
        });
      }
    }

    const latestVersion = await StudyPlanVersion.findOne({
      where: { studyPlanId: sar.StudyPlan.id },
      order: [['versionNumber', 'DESC']],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    const now = Date.now();
    const newVersion = await StudyPlanVersion.create(
      {
        studyPlanId: sar.StudyPlan.id,
        versionNumber: Number(latestVersion?.versionNumber || 0) + 1,
        status: 'draft',
        generatedByAdviserId: req.user.id,
        createdAt: now,
        updatedAt: now,
      },
      { transaction },
    );

    await StudyPlanCourse.bulkCreate(
      scheduledRows.map((row) => ({
        studyPlanVersionId: newVersion.id,
        courseId: row.courseId,
        yearLevel: row.yearLevel,
        semester: row.semester,
        grade: row.grade,
        status: row.status,
        createdAt: now,
        updatedAt: now,
      })),
      { transaction },
    );

    if (pendingOverrideRequests.length > 0) {
      await PrerequisiteOverrideRequest.bulkCreate(
        pendingOverrideRequests.map((override) => ({
          studentAcademicRecordId: sar.id,
          programId: sar.programId,
          studyPlanVersionId: newVersion.id,
          prerequisiteCourseId: override.prerequisiteCourseId,
          dependentCourseId: override.dependentCourseId,
          yearLevel: override.yearLevel,
          semester: override.semester,
          status: 'pending',
          reason: override.reason,
          requestedByAdviserId: req.user.id,
          createdAt: now,
          updatedAt: now,
        })),
        { transaction },
      );
    }

    await transaction.commit();

    // Notify the student that a new draft was generated
    if (sar.userId) {
      NotificationService.notify({
        recipientId: sar.userId,
        actorId: req.user.id,
        category: 'study_plan_regenerated',
        resourceType: 'study_plan_version',
        resourceId: newVersion.id,
        meta: { versionNumber: newVersion.versionNumber },
      });
    }

    if (pendingOverrideRequests.length > 0) {
      ActivityLogService.logSafe({
        programId: sar.programId,
        actorId: req.user.id,
        action: 'prerequisite_override.requested',
        resourceType: 'study_plan_version',
        resourceId: newVersion.id,
        resourceLabel: `Study plan v${newVersion.versionNumber}`,
        targetUserId: sar.userId || null,
        metadata: { requestCount: pendingOverrideRequests.length, sarId: sar.id },
      });

      const overridePairSummary = buildOverridePairSummary(
        activeVersion.StudyPlanCourses,
        pendingOverrideRequests,
      );

      const admins = await User.findAll({ where: { role: 'admin' }, attributes: ['id'] });
      admins.forEach((admin) => {
        NotificationService.notify({
          recipientId: admin.id,
          actorId: req.user.id,
          category: 'prerequisite_override_requested',
          resourceType: 'study_plan_version',
          resourceId: newVersion.id,
          meta: {
            adviserName: [req.user.firstName, req.user.lastName].filter(Boolean).join(' '),
            overridePairSummary,
          },
        });
      });
    }

    const createdVersion = await StudyPlanVersion.findByPk(newVersion.id, {
      include: includeRelationsForVersion,
    });

    // ── Build failedCourseAnalysis for the review UI ──
    const failedOrDroppedRequeue = requeueCourses.filter((item) =>
      isBlockingStatus(item.failedStatus),
    );

    let failedCourseAnalysis = null;
    if (failedOrDroppedRequeue.length > 0) {
      const failedCourseIds = failedOrDroppedRequeue.map((item) => item.courseId);

      // Cross-curriculum availability
      const availability = await getCrossCurriculumAvailability(failedCourseIds.map(Number));

      // Build course info map for cascade display
      const courseInfoMap = new Map();
      curriculumCourses.forEach((cc) => {
        courseInfoMap.set(String(cc.courseId), {
          code: cc.Course?.code || 'Unknown',
          name: cc.Course?.name || 'Unknown',
        });
      });
      selectedTrackPlan.forEach((item) => {
        const cid = String(item.courseId);
        if (!courseInfoMap.has(cid) && item.source?.Course) {
          courseInfoMap.set(cid, {
            code: item.source.Course.code || 'Unknown',
            name: item.source.Course.name || 'Unknown',
          });
        }
      });

      // Prerequisite cascade
      const cascadeMap = buildPrerequisiteCascade(failedCourseIds, prerequisiteMap, courseInfoMap);

      failedCourseAnalysis = {
        failedCourses: failedOrDroppedRequeue.map((item) => {
          const placement = placementByCourseId.get(item.courseId);
          const placedAt = placement !== undefined ? yearSemesterFromSlotIndex(placement) : null;
          const info = courseInfoMap.get(item.courseId) || {};

          return {
            courseId: Number(item.courseId),
            code: info.code || item.course?.code || 'Unknown',
            name: info.name || item.course?.name || 'Unknown',
            grade: item.failedGrade,
            status: item.failedStatus,
            placedAt,
            blockedCourses: cascadeMap.get(item.courseId) || [],
            availability: (availability.get(item.courseId) || []).map((a) => ({
              curriculumName: a.curriculumName,
              yearLevel: a.yearLevel,
              semester: a.semester,
            })),
          };
        }),
      };
    }

    return res.status(201).json({
      success: true,
      data: serializeVersion(createdVersion),
      failedCourseAnalysis,
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};
