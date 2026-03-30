const {
  sequelize,
  StudentAcademicRecord,
  StudyPlan,
  StudyPlanVersion,
  StudyPlanCourse,
  CurriculumCourse,
  Prerequisite,
  CoRequisite,
  ElectiveTrack,
  ElectiveTrackCourse,
  Course,
  User,
} = require('../models');
const {
  buildElectiveTrackPlan,
  slotIndexFromYearSemester,
  yearSemesterFromSlotIndex,
} = require('../utils/studyPlan');

const {
  VALID_STATUSES,
  parseGradeInput,
  parseGradePayload,
  formatQuarterGrade,
} = require('../utils/gradeValidation');
const audit = require('../utils/auditLog');
const GradeService = require('../services/GradeService');
const NotificationService = require('../services/NotificationService');

const personAttributes = ['id', 'firstName', 'lastName', 'email', 'role', 'studentId'];

const toNumber = (value) => Number(value);

const serializeVersion = GradeService.serializeVersion;

const getSarWithStudyPlan = GradeService.getSarWithStudyPlan;

const getActiveVersion = GradeService.getActiveVersion;

const collectConnectedComponents = GradeService.collectConnectedComponents;

const includeRelationsForVersion = GradeService.buildVersionIncludes();

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

    audit.log({
      userId: req.user?.id ?? null,
      action: 'GRADE_ENTRY',
      resource: 'grade',
      resourceId: req.params.id,
      meta: { gradeCount: grades.length, activeVersionId: activeVersion.id },
    });

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
      { pending: 0, passed: 0, failed: 0, dropped: 0, incomplete: 0 },
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

    audit.log({
      userId: req.user?.id ?? null,
      action: 'GRADE_BULK_IMPORT',
      resource: 'grade',
      resourceId: req.params.id,
      meta: { imported: updates.length, failed: errors.length, activeVersionId: activeVersion.id },
    });

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
      { pending: 0, passed: 0, failed: 0, dropped: 0, incomplete: 0 },
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
    const selectedTrackPlanByCourseId = new Map(
      selectedTrackPlan.map((item) => [String(item.courseId), item]),
    );
    const selectedTrackCourseIds = new Set(selectedTrackPlan.map((item) => String(item.courseId)));
    const curriculumTrackCourseIds = new Set(
      (curriculumTrackCourses || []).map((item) => String(item.courseId)),
    );

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

      if (isElectiveExcluded) {
        return;
      }

      requeueCourses.push({
        courseId,
        course: entry.Course,
        originalSortKey: courseMeta.sortKey,
        units: courseMeta.units,
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

    const components = collectConnectedComponents(
      requeueIds,
      new Map([...adjacency.entries()].map(([key, set]) => [key, [...set]])),
    );

    const requeueMetaById = new Map(requeueCourses.map((item) => [item.courseId, item]));

    const sortedComponents = components
      .map((component) => ({
        courseIds: component,
        originalSortKey: Math.min(
          ...component.map(
            (id) => requeueMetaById.get(id)?.originalSortKey || Number.MAX_SAFE_INTEGER,
          ),
        ),
        totalUnits: component.reduce(
          (sum, id) => sum + Number(requeueMetaById.get(id)?.units || 0),
          0,
        ),
      }))
      .sort((left, right) => left.originalSortKey - right.originalSortKey);

    for (const component of sortedComponents) {
      let slotIndex = Math.max(0, component.originalSortKey);
      let placed = false;

      while (!placed && slotIndex < 120) {
        const usedUnits = usedUnitsBySlot.get(slotIndex) || 0;
        if (usedUnits + component.totalUnits > 25) {
          slotIndex += 1;
          continue;
        }

        let prerequisitesOk = true;
        for (const courseId of component.courseIds) {
          const prereqIds = prerequisiteMap.get(courseId) || new Set();
          for (const prereqId of prereqIds) {
            const prereqPlacement = placementByCourseId.get(prereqId);
            if (prereqPlacement === undefined || prereqPlacement >= slotIndex) {
              prerequisitesOk = false;
              break;
            }
          }

          if (!prerequisitesOk) {
            break;
          }
        }

        if (!prerequisitesOk) {
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
          message:
            'Unable to place all unresolved courses while satisfying prerequisite/co-requisite and unit constraints',
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

    const createdVersion = await StudyPlanVersion.findByPk(newVersion.id, {
      include: includeRelationsForVersion,
    });

    return res.status(201).json({ success: true, data: serializeVersion(createdVersion) });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};
