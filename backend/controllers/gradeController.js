const {
  sequelize,
  StudentAcademicRecord,
  StudyPlan,
  StudyPlanVersion,
  StudyPlanCourse,
  CurriculumCourse,
  Prerequisite,
  CoRequisite,
  ElectiveTrackCourse,
  Course,
  User
} = require('../models');

const VALID_STATUSES = new Set(['pending', 'passed', 'failed', 'dropped', 'incomplete']);

const personAttributes = ['id', 'firstName', 'lastName', 'email', 'role', 'studentId'];

const toNumber = (value) => Number(value);

const formatQuarterGrade = (value) => Number(value).toFixed(2);

const parseGradeInput = (input) => {
  if (input === null || input === undefined) {
    return { grade: null, status: 'pending' };
  }

  const raw = String(input).trim();
  if (!raw) {
    return { grade: null, status: 'pending' };
  }

  const normalized = raw.toUpperCase();

  if (normalized === 'INC') {
    return { grade: 'INC', status: 'incomplete' };
  }

  if (normalized === 'PENDING') {
    return { grade: 'Pending', status: 'pending' };
  }

  const numeric = Number(raw);
  if (!Number.isFinite(numeric) || numeric < 1 || numeric > 5) {
    throw new Error('Grade must be between 1.00 and 5.00, INC, or Pending');
  }

  if (Math.round(numeric * 4) !== numeric * 4) {
    throw new Error('Numeric grades must be in 0.25 increments');
  }

  if (numeric <= 3) {
    return { grade: formatQuarterGrade(numeric), status: 'passed' };
  }

  if (numeric === 4) {
    return { grade: '4.00', status: 'dropped' };
  }

  return { grade: '5.00', status: 'failed' };
};

const parseGradePayload = (item) => {
  const parsed = parseGradeInput(item.grade);

  if (item.status !== undefined && item.status !== null) {
    const normalizedStatus = String(item.status).trim().toLowerCase();
    if (!VALID_STATUSES.has(normalizedStatus)) {
      throw new Error('Invalid status value provided');
    }

    if (normalizedStatus !== parsed.status) {
      throw new Error('Provided status does not match the computed status for the grade');
    }
  }

  return parsed;
};

const serializeVersion = (version) => {
  const plain = version.get ? version.get({ plain: true }) : version;
  const courses = Array.isArray(plain.StudyPlanCourses)
    ? [...plain.StudyPlanCourses].sort((left, right) => {
      if (left.yearLevel !== right.yearLevel) {
        return Number(left.yearLevel || 0) - Number(right.yearLevel || 0);
      }

      if (left.semester !== right.semester) {
        return Number(left.semester || 0) - Number(right.semester || 0);
      }

      return String(left.Course?.code || '').localeCompare(String(right.Course?.code || ''));
    })
    : [];

  return {
    ...plain,
    StudyPlanCourses: courses
  };
};

const getSarWithStudyPlan = async (sarId, transaction) => {
  return StudentAcademicRecord.findByPk(sarId, {
    include: [{ model: StudyPlan, attributes: ['id', 'studentAcademicRecordId'] }],
    transaction
  });
};

const getActiveVersion = async (studyPlanId, transaction) => {
  return StudyPlanVersion.findOne({
    where: { studyPlanId, status: 'active' },
    include: [
      {
        model: StudyPlanCourse,
        include: [{ model: Course, attributes: ['id', 'code', 'name', 'units'] }]
      }
    ],
    transaction
  });
};

const slotIndexFromYearSemester = (yearLevel, semester) => ((Number(yearLevel) - 1) * 3) + (Number(semester) - 1);

const yearSemesterFromSlotIndex = (slotIndex) => ({
  yearLevel: Math.floor(slotIndex / 3) + 1,
  semester: (slotIndex % 3) + 1
});

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

const includeRelationsForVersion = [
  { model: User, as: 'GeneratedByAdviser', attributes: personAttributes },
  {
    model: StudyPlanCourse,
    include: [{ model: Course, attributes: ['id', 'code', 'name', 'units'] }]
  }
];

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

    const sar = await getSarWithStudyPlan(req.params.id, transaction);
    if (!sar) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Student academic record not found' });
    }

    if (!sar.StudyPlan) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'No study plan exists for this student academic record' });
    }

    const activeVersion = await getActiveVersion(sar.StudyPlan.id, transaction);
    if (!activeVersion) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'No active study plan version found for grade entry' });
    }

    if (activeVersion.status === 'archived') {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Cannot enter grades for an archived or locked version' });
    }

    const courseRows = await StudyPlanCourse.findAll({
      where: { studyPlanVersionId: activeVersion.id },
      transaction,
      lock: transaction.LOCK.UPDATE
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
          updatedAt: Date.now()
        },
        { transaction }
      );
    }

    await transaction.commit();

    const refreshedVersion = await StudyPlanVersion.findByPk(activeVersion.id, {
      include: includeRelationsForVersion
    });

    const serialized = serializeVersion(refreshedVersion);
    const summary = serialized.StudyPlanCourses.reduce((acc, entry) => {
      acc[entry.status] = (acc[entry.status] || 0) + 1;
      return acc;
    }, { pending: 0, passed: 0, failed: 0, dropped: 0, incomplete: 0 });

    return res.status(200).json({
      success: true,
      data: serialized,
      summary
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
      return res.status(400).json({ success: false, message: 'No study plan exists for this student academic record' });
    }

    const activeVersion = await getActiveVersion(sar.StudyPlan.id, transaction);
    if (!activeVersion) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'No active study plan version found for regeneration' });
    }

    if (activeVersion.status === 'archived') {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Cannot regenerate from an archived or locked version' });
    }

    const [curriculumCourses, prerequisites, coRequisites, selectedTrackCourses] = await Promise.all([
      CurriculumCourse.findAll({ where: { curriculumId: sar.curriculumId }, include: [{ model: Course, attributes: ['id', 'code', 'name', 'units'] }], transaction }),
      Prerequisite.findAll({ where: { curriculumId: sar.curriculumId }, transaction }),
      CoRequisite.findAll({ where: { curriculumId: sar.curriculumId }, transaction }),
      sar.electiveTrackId
        ? ElectiveTrackCourse.findAll({ where: { electiveTrackId: sar.electiveTrackId }, transaction })
        : []
    ]);

    const curriculumByCourse = new Map();
    curriculumCourses.forEach((item) => {
      curriculumByCourse.set(String(item.courseId), {
        yearLevel: item.yearLevel,
        semester: item.semester,
        isElective: Boolean(item.isElective),
        units: Number(item.Course?.units || 0),
        sortKey: slotIndexFromYearSemester(item.yearLevel, item.semester)
      });
    });

    const selectedTrackCourseIds = new Set((selectedTrackCourses || []).map((item) => String(item.courseId)));

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

    const resolvedCourses = [];
    const requeueCourses = [];

    activeVersion.StudyPlanCourses.forEach((entry) => {
      const courseId = String(entry.courseId);
      const courseMeta = curriculumByCourse.get(courseId);
      if (!courseMeta) {
        return;
      }

      const parsed = parseGradeInput(entry.grade);
      const classification = parsed.status;
      const isElectiveExcluded = courseMeta.isElective && sar.electiveTrackId && !selectedTrackCourseIds.has(courseId);

      if (classification === 'passed') {
        resolvedCourses.push({
          courseId,
          course: entry.Course,
          yearLevel: entry.yearLevel,
          semester: entry.semester,
          grade: parsed.grade,
          status: 'passed',
          units: courseMeta.units
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
        units: courseMeta.units
      });
    });

    if (requeueCourses.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'All courses are already passed. Regeneration is not needed.' });
    }

    const placementByCourseId = new Map();
    const usedUnitsBySlot = new Map();
    const scheduledRows = [];

    resolvedCourses.forEach((entry) => {
      const slotIndex = slotIndexFromYearSemester(entry.yearLevel, entry.semester);
      placementByCourseId.set(entry.courseId, slotIndex);
      usedUnitsBySlot.set(slotIndex, (usedUnitsBySlot.get(slotIndex) || 0) + Number(entry.units || 0));
      scheduledRows.push({
        courseId: toNumber(entry.courseId),
        yearLevel: entry.yearLevel,
        semester: entry.semester,
        grade: entry.grade,
        status: entry.status
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
      new Map([...adjacency.entries()].map(([key, set]) => [key, [...set]]))
    );

    const requeueMetaById = new Map(requeueCourses.map((item) => [item.courseId, item]));

    const sortedComponents = components
      .map((component) => ({
        courseIds: component,
        originalSortKey: Math.min(...component.map((id) => requeueMetaById.get(id)?.originalSortKey || Number.MAX_SAFE_INTEGER)),
        totalUnits: component.reduce((sum, id) => sum + Number(requeueMetaById.get(id)?.units || 0), 0)
      }))
      .sort((left, right) => left.originalSortKey - right.originalSortKey);

    for (const component of sortedComponents) {
      let slotIndex = 0;
      let placed = false;

      while (!placed && slotIndex < 120) {
        const usedUnits = usedUnitsBySlot.get(slotIndex) || 0;
        if ((usedUnits + component.totalUnits) > 25) {
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
            status: 'pending'
          });
          usedUnitsBySlot.set(slotIndex, (usedUnitsBySlot.get(slotIndex) || 0) + Number(entry?.units || 0));
        });

        placed = true;
      }

      if (!placed) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Unable to place all unresolved courses while satisfying prerequisite/co-requisite and unit constraints'
        });
      }
    }

    const latestVersion = await StudyPlanVersion.findOne({
      where: { studyPlanId: sar.StudyPlan.id },
      order: [['versionNumber', 'DESC']],
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    const now = Date.now();
    const newVersion = await StudyPlanVersion.create({
      studyPlanId: sar.StudyPlan.id,
      versionNumber: Number(latestVersion?.versionNumber || 0) + 1,
      status: 'draft',
      generatedByAdviserId: req.user.id,
      createdAt: now,
      updatedAt: now
    }, { transaction });

    await StudyPlanCourse.bulkCreate(
      scheduledRows.map((row) => ({
        studyPlanVersionId: newVersion.id,
        courseId: row.courseId,
        yearLevel: row.yearLevel,
        semester: row.semester,
        grade: row.grade,
        status: row.status,
        createdAt: now,
        updatedAt: now
      })),
      { transaction }
    );

    await transaction.commit();

    const createdVersion = await StudyPlanVersion.findByPk(newVersion.id, {
      include: includeRelationsForVersion
    });

    return res.status(201).json({ success: true, data: serializeVersion(createdVersion) });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};