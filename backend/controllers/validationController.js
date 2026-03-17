const {
  sequelize,
  AcademicTerm,
  StudentAcademicRecord,
  StudyPlan,
  StudyPlanVersion,
  StudyPlanCourse,
  CurriculumCourse,
  ElectiveTrack,
  ElectiveTrackCourse,
  Course,
  User
} = require('../models');
const {
  buildElectiveTrackPlan,
  isElectiveTrackSelectionRequired
} = require('../utils/studyPlan');

const personAttributes = ['id', 'firstName', 'lastName', 'email', 'role', 'studentId'];

const includeRelationsForVersion = [
  { model: User, as: 'GeneratedByAdviser', attributes: personAttributes },
  { model: User, as: 'ValidatedByAdviser', attributes: personAttributes },
  {
    model: StudyPlanCourse,
    include: [{ model: Course, attributes: ['id', 'code', 'name', 'units'] }]
  }
];

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

const fetchTrackContext = async ({ curriculumId, electiveTrackId, transaction, includeCourse = false }) => {
  const courseInclude = includeCourse
    ? [{ model: Course, attributes: ['id', 'code', 'name', 'units'] }]
    : [];

  const [selectedTrackRows, curriculumTrackRows] = await Promise.all([
    electiveTrackId
      ? ElectiveTrackCourse.findAll({
        where: { electiveTrackId },
        include: courseInclude,
        transaction
      })
      : [],
    ElectiveTrackCourse.findAll({
      include: [{
        model: ElectiveTrack,
        attributes: ['id', 'curriculumId'],
        where: { curriculumId }
      }],
      transaction
    })
  ]);

  const selectedTrackPlan = buildElectiveTrackPlan(selectedTrackRows || []);

  return {
    selectedTrackRows,
    selectedTrackPlan,
    selectedTrackCourseIds: new Set(selectedTrackPlan.map((row) => String(row.courseId))),
    curriculumTrackCourseIds: new Set(curriculumTrackRows.map((row) => String(row.courseId)))
  };
};

const mergeVersionCoursesWithSelectedTrack = ({ baseEntries, selectedTrackPlan, curriculumTrackCourseIds }) => {
  const mergedRows = [];
  const selectedTrackPlanByCourseId = new Map(selectedTrackPlan.map((item) => [String(item.courseId), item]));
  const selectedTrackCourseIds = new Set(selectedTrackPlan.map((item) => String(item.courseId)));
  const includedCourseIds = new Set();

  (baseEntries || []).forEach((entry) => {
    const courseId = String(entry.courseId);

    if (curriculumTrackCourseIds.has(courseId) && !selectedTrackCourseIds.has(courseId)) {
      return;
    }

    const trackPlacement = selectedTrackPlanByCourseId.get(courseId);
    mergedRows.push({
      courseId: Number(entry.courseId),
      yearLevel: trackPlacement?.yearLevel || entry.yearLevel,
      semester: trackPlacement?.semester || entry.semester,
      grade: entry.grade,
      status: entry.status
    });
    includedCourseIds.add(courseId);
  });

  selectedTrackPlan.forEach((item) => {
    const courseId = String(item.courseId);
    if (includedCourseIds.has(courseId)) {
      return;
    }

    mergedRows.push({
      courseId: item.courseId,
      yearLevel: item.yearLevel,
      semester: item.semester,
      grade: null,
      status: 'pending'
    });
  });

  return mergedRows.sort((left, right) => Number(left.yearLevel || 0) - Number(right.yearLevel || 0)
    || Number(left.semester || 0) - Number(right.semester || 0)
    || Number(left.courseId || 0) - Number(right.courseId || 0));
};

const syncDraftVersionForElectiveTrack = async ({ sar, adviserId, transaction }) => {
  if (!sar?.StudyPlan?.id || !sar.electiveTrackId) {
    return null;
  }

  const [activeVersion, latestDraftVersion, latestVersion, trackContext] = await Promise.all([
    StudyPlanVersion.findOne({
      where: { studyPlanId: sar.StudyPlan.id, status: 'active' },
      include: [{
        model: StudyPlanCourse,
        include: [{ model: Course, attributes: ['id', 'code', 'name', 'units'] }]
      }],
      transaction
    }),
    StudyPlanVersion.findOne({
      where: { studyPlanId: sar.StudyPlan.id, status: 'draft' },
      include: [{
        model: StudyPlanCourse,
        include: [{ model: Course, attributes: ['id', 'code', 'name', 'units'] }]
      }],
      order: [['versionNumber', 'DESC'], ['createdAt', 'DESC']],
      transaction
    }),
    StudyPlanVersion.findOne({
      where: { studyPlanId: sar.StudyPlan.id },
      order: [['versionNumber', 'DESC'], ['createdAt', 'DESC']],
      transaction,
      lock: transaction.LOCK.UPDATE
    }),
    fetchTrackContext({
      curriculumId: sar.curriculumId,
      electiveTrackId: sar.electiveTrackId,
      transaction,
      includeCourse: true
    })
  ]);

  const baseVersion = latestDraftVersion || activeVersion;
  if (!baseVersion) {
    return null;
  }

  const now = Date.now();
  const mergedRows = mergeVersionCoursesWithSelectedTrack({
    baseEntries: baseVersion.StudyPlanCourses,
    selectedTrackPlan: trackContext.selectedTrackPlan,
    curriculumTrackCourseIds: trackContext.curriculumTrackCourseIds
  });

  let draftVersion = latestDraftVersion;

  if (!draftVersion) {
    draftVersion = await StudyPlanVersion.create({
      studyPlanId: sar.StudyPlan.id,
      versionNumber: Number(latestVersion?.versionNumber || 0) + 1,
      status: 'draft',
      generatedByAdviserId: adviserId,
      needsRevalidation: true,
      createdAt: now,
      updatedAt: now
    }, { transaction });
  } else {
    await StudyPlanCourse.destroy({
      where: { studyPlanVersionId: draftVersion.id },
      transaction
    });

    await draftVersion.update({
      needsRevalidation: true,
      updatedAt: now
    }, { transaction });
  }

  if (activeVersion) {
    await activeVersion.update({
      needsRevalidation: true,
      updatedAt: now
    }, { transaction });
  }

  await StudyPlanCourse.bulkCreate(
    mergedRows.map((row) => ({
      studyPlanVersionId: draftVersion.id,
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

  return draftVersion.id;
};

const isFutureSemesterCourse = ({ entry, sar, currentTerm }) => {
  const currentYearLevel = Number(sar?.yearLevel || 0);
  const currentSemester = Number(currentTerm?.semester || 0);

  const entryYearLevel = Number(entry?.yearLevel || 0);
  const entrySemester = Number(entry?.semester || 0);

  if (!currentYearLevel || !currentSemester || !entryYearLevel || !entrySemester) {
    return true;
  }

  if (entryYearLevel > currentYearLevel) {
    return true;
  }

  return entryYearLevel === currentYearLevel && entrySemester > currentSemester;
};

const validateElectiveCoursesAgainstTrack = async ({ sar, studyPlanVersion, currentTerm, transaction }) => {
  if (!sar.electiveTrackId) {
    return { valid: true };
  }

  const versionCourseIds = [...new Set((studyPlanVersion.StudyPlanCourses || []).map((item) => item.courseId))];
  const electiveCurriculumRows = await CurriculumCourse.findAll({
    where: {
      curriculumId: sar.curriculumId,
      isElective: true,
      courseId: versionCourseIds
    },
    transaction
  });

  const electiveCourseIds = new Set(electiveCurriculumRows.map((row) => String(row.courseId)));
  const trackContext = await fetchTrackContext({
    curriculumId: sar.curriculumId,
    electiveTrackId: sar.electiveTrackId,
    transaction,
    includeCourse: true
  });

  const selectedTrackCodeByCourseId = new Map(
    trackContext.selectedTrackPlan.map((item) => [
      String(item.courseId),
      item.source?.Course?.code || `course-${item.courseId}`
    ])
  );
  const invalidElectives = [];

  (studyPlanVersion.StudyPlanCourses || []).forEach((entry) => {
    if (!isFutureSemesterCourse({ entry, sar, currentTerm })) {
      return;
    }

    const courseId = String(entry.courseId);
    if (!electiveCourseIds.has(courseId)) {
      return;
    }

    if (!trackContext.curriculumTrackCourseIds.has(courseId)) {
      return;
    }

    if (!trackContext.selectedTrackCourseIds.has(courseId)) {
      invalidElectives.push(entry.Course?.code || `course-${entry.courseId}`);
    }
  });

  const missingElectives = [...trackContext.selectedTrackCourseIds]
    .filter((courseId) => !versionCourseIds.includes(Number(courseId)))
    .map((courseId) => selectedTrackCodeByCourseId.get(courseId) || `course-${courseId}`);

  if (invalidElectives.length > 0 || missingElectives.length > 0) {
    return {
      valid: false,
      invalidElectives: [...new Set(invalidElectives)],
      missingElectives: [...new Set(missingElectives)]
    };
  }

  return { valid: true };
};

// @desc   Validate a draft study plan version and make it active
// @route  PATCH /api/sars/:id/study-plan/versions/:versionId/validate
// @access adviser, admin
exports.validateVersion = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const sar = await StudentAcademicRecord.findByPk(req.params.id, {
      include: [{ model: StudyPlan, attributes: ['id', 'studentAcademicRecordId'] }],
      transaction
    });

    if (!sar) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Student academic record not found' });
    }

    if (!sar.StudyPlan) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'No study plan exists for this student academic record' });
    }

    const studyPlanVersion = await StudyPlanVersion.findByPk(req.params.versionId, {
      include: [{
        model: StudyPlanCourse,
        include: [{ model: Course, attributes: ['id', 'code', 'name', 'units'] }]
      }],
      transaction
    });

    if (!studyPlanVersion || String(studyPlanVersion.studyPlanId) !== String(sar.StudyPlan.id)) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Study plan version not found for this student' });
    }

    if (studyPlanVersion.status !== 'draft') {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Only draft study plan versions can be validated' });
    }

    const currentTerm = await AcademicTerm.findOne({ where: { isCurrent: true }, transaction });
    const electiveTrackRequired = isElectiveTrackSelectionRequired({
      yearLevel: sar.yearLevel,
      currentSemester: currentTerm?.semester
    });

    if (electiveTrackRequired && !sar.electiveTrackId) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'ELECTIVE_TRACK_REQUIRED',
        message: 'Elective track selection is required before validating this study plan.'
      });
    }

    const electiveTrackCheck = await validateElectiveCoursesAgainstTrack({
      sar,
      studyPlanVersion,
      currentTerm,
      transaction
    });

    if (!electiveTrackCheck.valid) {
      await transaction.rollback();
      const messageParts = [];
      if (electiveTrackCheck.invalidElectives?.length) {
        messageParts.push(`Invalid elective courses: ${electiveTrackCheck.invalidElectives.join(', ')}`);
      }
      if (electiveTrackCheck.missingElectives?.length) {
        messageParts.push(`Missing selected-track electives: ${electiveTrackCheck.missingElectives.join(', ')}`);
      }

      return res.status(400).json({
        success: false,
        message: messageParts.join('. ')
      });
    }

    const now = Date.now();

    await StudyPlanVersion.update(
      {
        status: 'archived',
        updatedAt: now
      },
      {
        where: {
          studyPlanId: sar.StudyPlan.id,
          status: 'active'
        },
        transaction
      }
    );

    await studyPlanVersion.update(
      {
        status: 'active',
        validatedByAdviserId: req.user.id,
        validatedAt: now,
        needsRevalidation: false,
        updatedAt: now
      },
      { transaction }
    );

    await transaction.commit();

    const updatedVersion = await StudyPlanVersion.findByPk(studyPlanVersion.id, {
      include: includeRelationsForVersion
    });

    return res.status(200).json({ success: true, data: serializeVersion(updatedVersion) });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

// @desc   Select elective track for a student academic record
// @route  PATCH /api/sars/:id/elective-track
// @access adviser, admin
exports.selectElectiveTrack = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const electiveTrackId = Number(req.body?.electiveTrackId);
    if (!Number.isInteger(electiveTrackId) || electiveTrackId <= 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'electiveTrackId is required and must be a valid ID' });
    }

    const sar = await StudentAcademicRecord.findByPk(req.params.id, {
      include: [{ model: StudyPlan, attributes: ['id', 'studentAcademicRecordId'] }],
      transaction
    });

    if (!sar) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Student academic record not found' });
    }

    if (sar.electiveTrackId) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Elective track is already selected and cannot be changed' });
    }

    const selectedTrack = await ElectiveTrack.findByPk(electiveTrackId, { transaction });
    if (!selectedTrack || String(selectedTrack.curriculumId) !== String(sar.curriculumId)) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Selected elective track must belong to the student curriculum' });
    }

    await sar.update(
      {
        electiveTrackId,
        updatedAt: Date.now()
      },
      { transaction }
    );

    const syncedDraftVersionId = await syncDraftVersionForElectiveTrack({
      sar,
      adviserId: req.user.id,
      transaction
    });

    await transaction.commit();

    const updatedSar = await StudentAcademicRecord.findByPk(sar.id, {
      include: [{ model: ElectiveTrack, attributes: ['id', 'name', 'description'] }]
    });

    const draftVersion = syncedDraftVersionId
      ? await StudyPlanVersion.findByPk(syncedDraftVersionId, { include: includeRelationsForVersion })
      : null;

    return res.status(200).json({
      success: true,
      data: {
        sar: updatedSar,
        draftVersion: draftVersion ? serializeVersion(draftVersion) : null
      }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

// @desc   Update semester placements for a draft study plan version
// @route  PUT /api/sars/:id/study-plan/versions/:versionId/courses
// @access adviser, admin
exports.updateDraftVersionCourses = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const courses = Array.isArray(req.body?.courses) ? req.body.courses : [];

    if (courses.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'courses must be a non-empty array' });
    }

    const sar = await StudentAcademicRecord.findByPk(req.params.id, {
      include: [{ model: StudyPlan, attributes: ['id'] }],
      transaction
    });

    if (!sar?.StudyPlan?.id) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Study plan not found for this student' });
    }

    const draftVersion = await StudyPlanVersion.findByPk(req.params.versionId, {
      include: [{
        model: StudyPlanCourse,
        include: [{ model: Course, attributes: ['id', 'code', 'name', 'units'] }]
      }],
      transaction
    });

    if (!draftVersion || String(draftVersion.studyPlanId) !== String(sar.StudyPlan.id)) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Study plan version not found for this student' });
    }

    if (draftVersion.status !== 'draft') {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Only draft study plan versions can be edited' });
    }

    const rowsById = new Map((draftVersion.StudyPlanCourses || []).map((row) => [String(row.id), row]));

    for (const item of courses) {
      const studyPlanCourseId = String(item?.studyPlanCourseId || '');
      const row = rowsById.get(studyPlanCourseId);
      const yearLevel = Number(item?.yearLevel);
      const semester = Number(item?.semester);

      if (!row) {
        throw new Error('One or more study plan courses do not belong to this draft version');
      }

      if (!Number.isInteger(yearLevel) || yearLevel < 1) {
        throw new Error('yearLevel must be a positive integer');
      }

      if (![1, 2, 3].includes(semester)) {
        throw new Error('semester must be 1, 2, or 3');
      }

      await row.update({
        yearLevel,
        semester,
        updatedAt: Date.now()
      }, { transaction });
    }

    await draftVersion.update({ updatedAt: Date.now() }, { transaction });

    await transaction.commit();

    const updatedVersion = await StudyPlanVersion.findByPk(draftVersion.id, {
      include: includeRelationsForVersion
    });

    return res.status(200).json({ success: true, data: serializeVersion(updatedVersion) });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};