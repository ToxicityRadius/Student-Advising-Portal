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
  if (versionCourseIds.length === 0) {
    return { valid: true };
  }

  const electiveCurriculumRows = await CurriculumCourse.findAll({
    where: {
      curriculumId: sar.curriculumId,
      isElective: true,
      courseId: versionCourseIds
    },
    transaction
  });

  const electiveCourseIds = new Set(electiveCurriculumRows.map((row) => String(row.courseId)));
  if (electiveCourseIds.size === 0) {
    return { valid: true };
  }

  const [trackRows, curriculumTrackRows] = await Promise.all([
    ElectiveTrackCourse.findAll({
      where: { electiveTrackId: sar.electiveTrackId },
      transaction
    }),
    ElectiveTrackCourse.findAll({
      include: [{
        model: ElectiveTrack,
        attributes: ['id', 'curriculumId'],
        where: { curriculumId: sar.curriculumId }
      }],
      transaction
    })
  ]);

  const trackCourseIds = new Set(trackRows.map((row) => String(row.courseId)));
  const curriculumTrackCourseIds = new Set(curriculumTrackRows.map((row) => String(row.courseId)));
  const invalidElectives = [];

  (studyPlanVersion.StudyPlanCourses || []).forEach((entry) => {
    if (!isFutureSemesterCourse({ entry, sar, currentTerm })) {
      return;
    }

    const courseId = String(entry.courseId);
    if (!electiveCourseIds.has(courseId)) {
      return;
    }

    if (!curriculumTrackCourseIds.has(courseId)) {
      return;
    }

    if (!trackCourseIds.has(courseId)) {
      invalidElectives.push(entry.Course?.code || `course-${entry.courseId}`);
    }
  });

  if (invalidElectives.length > 0) {
    return {
      valid: false,
      invalidElectives: [...new Set(invalidElectives)]
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
    const electiveTrackRequired = Number(sar.yearLevel) === 2 && Number(currentTerm?.semester) === 2;

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
      return res.status(400).json({
        success: false,
        message: `Elective courses must belong to the selected track. Invalid courses: ${electiveTrackCheck.invalidElectives.join(', ')}`
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

    await transaction.commit();

    const updatedSar = await StudentAcademicRecord.findByPk(sar.id, {
      include: [{ model: ElectiveTrack, attributes: ['id', 'name', 'description'] }]
    });

    return res.status(200).json({ success: true, data: updatedSar });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};