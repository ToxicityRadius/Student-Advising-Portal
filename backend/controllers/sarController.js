const { Op } = require('sequelize');
const {
  sequelize,
  StudentAcademicRecord,
  StudyPlan,
  StudyPlanVersion,
  StudyPlanCourse,
  Curriculum,
  CurriculumCourse,
  Course,
  ElectiveTrack,
  User
} = require('../models');

const tipEmailPattern = /@tip\.edu\.ph$/i;

const personAttributes = ['id', 'firstName', 'lastName', 'email', 'role', 'studentId'];
const curriculumAttributes = ['id', 'name', 'description', 'isActive'];
const electiveTrackAttributes = ['id', 'name', 'description'];

const buildSarIncludes = () => ([
  { model: Curriculum, attributes: curriculumAttributes },
  { model: ElectiveTrack, attributes: electiveTrackAttributes },
  { model: User, as: 'Student', attributes: personAttributes },
  { model: User, as: 'CreatedByAdviser', attributes: personAttributes }
]);

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const parseYearLevel = (value) => Number(value);

const isValidYearLevel = (value) => Number.isInteger(value) && value >= 1 && value <= 4;

const buildStudentOwnershipWhere = (user) => {
  const ownershipChecks = [];

  if (user?.id) {
    ownershipChecks.push({ userId: user.id });
  }

  if (user?.email) {
    ownershipChecks.push({ email: normalizeEmail(user.email) });
  }

  if (user?.studentId) {
    ownershipChecks.push({ studentNumber: user.studentId });
  }

  return ownershipChecks.length > 0 ? { [Op.or]: ownershipChecks } : { id: null };
};

const isSarOwnedByUser = (sar, user) => {
  if (!sar || !user) {
    return false;
  }

  const sarEmail = normalizeEmail(sar.email);
  const userEmail = normalizeEmail(user.email);

  return (
    String(sar.userId || '') === String(user.id || '') ||
    (sarEmail && userEmail && sarEmail === userEmail) ||
    (sar.studentNumber && user.studentId && String(sar.studentNumber) === String(user.studentId))
  );
};

const serializeSar = (sar) => {
  const plainSar = sar?.get ? sar.get({ plain: true }) : sar;
  const isLinkedToAccount = Boolean(plainSar?.userId);

  return {
    ...plainSar,
    isLinkedToAccount,
    linkStatus: isLinkedToAccount ? 'linked' : 'unlinked'
  };
};

const getAssignedCurriculum = async (curriculumId) => {
  if (curriculumId) {
    return Curriculum.findByPk(curriculumId);
  }

  return Curriculum.findOne({ where: { isActive: true } });
};

const resolveMatchedStudent = async ({ email, studentNumber }) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedStudentNumber = String(studentNumber || '').trim();

  const [matchedByEmail, matchedByStudentNumber] = await Promise.all([
    normalizedEmail
      ? User.findOne({ where: { email: normalizedEmail, role: 'student' } })
      : null,
    normalizedStudentNumber
      ? User.findOne({ where: { studentId: normalizedStudentNumber, role: 'student' } })
      : null
  ]);

  if (
    matchedByEmail &&
    matchedByStudentNumber &&
    String(matchedByEmail.id) !== String(matchedByStudentNumber.id)
  ) {
    const error = new Error('Student email and student number match different existing student accounts');
    error.statusCode = 409;
    throw error;
  }

  return matchedByEmail || matchedByStudentNumber || null;
};

const serializeStudyPlanVersion = (version) => {
  const plainVersion = version.get ? version.get({ plain: true }) : version;
  const studyPlanCourses = Array.isArray(plainVersion.StudyPlanCourses)
    ? [...plainVersion.StudyPlanCourses].sort((left, right) => {
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
    ...plainVersion,
    StudyPlanCourses: studyPlanCourses
  };
};

const fetchStudyPlanVersionsForStudyPlan = async (studyPlanId) => {
  const versions = await StudyPlanVersion.findAll({
    where: { studyPlanId },
    include: [
      { model: User, as: 'GeneratedByAdviser', attributes: personAttributes },
      { model: User, as: 'ValidatedByAdviser', attributes: personAttributes },
      {
        model: StudyPlanCourse,
        include: [{ model: Course, attributes: ['id', 'code', 'name', 'units'] }]
      }
    ],
    order: [['versionNumber', 'DESC'], ['createdAt', 'DESC']]
  });

  return versions.map(serializeStudyPlanVersion);
};

// @desc   Create a student academic record
// @route  POST /api/sars
// @access adviser, admin
exports.createSAR = async (req, res, next) => {
  try {
    const studentName = String(req.body.studentName || '').trim();
    const studentNumber = String(req.body.studentNumber || '').trim();
    const email = normalizeEmail(req.body.email);
    const yearLevel = parseYearLevel(req.body.yearLevel);

    if (!studentName || !studentNumber || !email || !req.body.yearLevel) {
      return res.status(400).json({
        success: false,
        message: 'studentName, studentNumber, email, and yearLevel are required'
      });
    }

    if (!tipEmailPattern.test(email)) {
      return res.status(400).json({ success: false, message: 'Student email must end in @tip.edu.ph' });
    }

    if (!isValidYearLevel(yearLevel)) {
      return res.status(400).json({ success: false, message: 'yearLevel must be an integer from 1 to 4' });
    }

    const curriculum = await getAssignedCurriculum(req.body.curriculumId);
    if (!curriculum) {
      return res.status(400).json({
        success: false,
        message: 'No curriculum was provided and there is no active curriculum to use as default'
      });
    }

    const [existingStudentNumber, existingEmail, matchedStudent] = await Promise.all([
      StudentAcademicRecord.findOne({ where: { studentNumber } }),
      StudentAcademicRecord.findOne({ where: { email } }),
      resolveMatchedStudent({ email, studentNumber })
    ]);

    if (existingStudentNumber) {
      return res.status(409).json({ success: false, message: 'A student academic record already exists for that student number' });
    }

    if (existingEmail) {
      return res.status(409).json({ success: false, message: 'A student academic record already exists for that email address' });
    }

    if (matchedStudent) {
      const existingStudentSar = await StudentAcademicRecord.findOne({ where: { userId: matchedStudent.id } });
      if (existingStudentSar) {
        return res.status(409).json({ success: false, message: 'This student account is already linked to another academic record' });
      }
    }

    const sar = await StudentAcademicRecord.create({
      userId: matchedStudent?.id || null,
      curriculumId: curriculum.id,
      studentName,
      studentNumber,
      email,
      yearLevel,
      createdByAdviserId: req.user.id,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    const createdSar = await StudentAcademicRecord.findByPk(sar.id, {
      include: buildSarIncludes()
    });

    return res.status(201).json({ success: true, data: serializeSar(createdSar) });
  } catch (error) {
    next(error);
  }
};

// @desc   Get student academic records
// @route  GET /api/sars
// @access adviser, admin, student (own only)
exports.getSARs = async (req, res, next) => {
  try {
    const where = req.user.role === 'student' ? buildStudentOwnershipWhere(req.user) : {};

    const sars = await StudentAcademicRecord.findAll({
      where,
      include: buildSarIncludes(),
      order: [['studentName', 'ASC'], ['studentNumber', 'ASC']]
    });

    return res.status(200).json({ success: true, data: sars.map(serializeSar) });
  } catch (error) {
    next(error);
  }
};

// @desc   Get one student academic record
// @route  GET /api/sars/:id
// @access adviser, admin, student (own only)
exports.getSARById = async (req, res, next) => {
  try {
    const sar = await StudentAcademicRecord.findByPk(req.params.id, {
      include: [
        ...buildSarIncludes(),
        {
          model: StudyPlan,
          attributes: ['id', 'studentAcademicRecordId', 'createdAt', 'updatedAt']
        }
      ]
    });

    if (!sar) {
      return res.status(404).json({ success: false, message: 'Student academic record not found' });
    }

    if (req.user.role === 'student' && !isSarOwnedByUser(sar, req.user)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const sarData = serializeSar(sar);
    const versions = sarData.StudyPlan?.id
      ? await fetchStudyPlanVersionsForStudyPlan(sarData.StudyPlan.id)
      : [];

    const activeStudyPlanVersion = versions.find((version) => version.status === 'active') || null;
    const latestStudyPlanVersion = versions[0] || null;

    return res.status(200).json({
      success: true,
      data: {
        ...sarData,
        activeStudyPlanVersion,
        latestStudyPlanVersion,
        studyPlanVersions: versions.map((version) => ({
          id: version.id,
          versionNumber: version.versionNumber,
          status: version.status,
          createdAt: version.createdAt,
          updatedAt: version.updatedAt
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Update a student academic record
// @route  PUT /api/sars/:id
// @access adviser, admin
exports.updateSAR = async (req, res, next) => {
  try {
    const sar = await StudentAcademicRecord.findByPk(req.params.id);
    if (!sar) {
      return res.status(404).json({ success: false, message: 'Student academic record not found' });
    }

    const updates = {};

    if (req.body.yearLevel !== undefined) {
      const yearLevel = parseYearLevel(req.body.yearLevel);
      if (!isValidYearLevel(yearLevel)) {
        return res.status(400).json({ success: false, message: 'yearLevel must be an integer from 1 to 4' });
      }
      updates.yearLevel = yearLevel;
    }

    if (req.body.curriculumId !== undefined) {
      const curriculum = await Curriculum.findByPk(req.body.curriculumId);
      if (!curriculum) {
        return res.status(404).json({ success: false, message: 'Assigned curriculum not found' });
      }
      updates.curriculumId = curriculum.id;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid SAR fields were provided for update' });
    }

    updates.updatedAt = Date.now();
    await sar.update(updates);

    const updatedSar = await StudentAcademicRecord.findByPk(sar.id, {
      include: buildSarIncludes()
    });

    return res.status(200).json({ success: true, data: serializeSar(updatedSar) });
  } catch (error) {
    next(error);
  }
};

// @desc   Generate the initial study plan for a student academic record
// @route  POST /api/sars/:id/study-plan/generate
// @access adviser, admin
exports.generateInitialStudyPlan = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const sar = await StudentAcademicRecord.findByPk(req.params.id, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!sar) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Student academic record not found' });
    }

    const existingStudyPlan = await StudyPlan.findOne({
      where: { studentAcademicRecordId: sar.id },
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (existingStudyPlan) {
      await transaction.rollback();
      return res.status(409).json({ success: false, message: 'Initial study plan has already been generated for this student' });
    }

    const curriculumCourses = await CurriculumCourse.findAll({
      where: { curriculumId: sar.curriculumId },
      include: [{ model: Course, attributes: ['id', 'code', 'name', 'units'] }],
      order: [['yearLevel', 'ASC'], ['semester', 'ASC'], [Course, 'code', 'ASC']],
      transaction
    });

    if (curriculumCourses.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'The assigned curriculum has no courses to generate a study plan from' });
    }

    const now = Date.now();

    const studyPlan = await StudyPlan.create({
      studentAcademicRecordId: sar.id,
      createdAt: now,
      updatedAt: now
    }, { transaction });

    const version = await StudyPlanVersion.create({
      studyPlanId: studyPlan.id,
      versionNumber: 1,
      status: 'draft',
      generatedByAdviserId: req.user.id,
      createdAt: now,
      updatedAt: now
    }, { transaction });

    await StudyPlanCourse.bulkCreate(
      curriculumCourses.map((curriculumCourse) => ({
        studyPlanVersionId: version.id,
        courseId: curriculumCourse.courseId,
        yearLevel: curriculumCourse.yearLevel,
        semester: curriculumCourse.semester,
        grade: null,
        status: 'pending',
        createdAt: now,
        updatedAt: now
      })),
      { transaction }
    );

    await transaction.commit();

    const createdVersion = await StudyPlanVersion.findByPk(version.id, {
      include: [
        { model: User, as: 'GeneratedByAdviser', attributes: personAttributes },
        {
          model: StudyPlanCourse,
          include: [{ model: Course, attributes: ['id', 'code', 'name', 'units'] }]
        }
      ]
    });

    return res.status(201).json({
      success: true,
      data: serializeStudyPlanVersion(createdVersion)
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

// @desc   Get all study plan versions for a student academic record
// @route  GET /api/sars/:id/study-plan/versions
// @access adviser, admin, student (own only)
exports.getStudyPlanVersions = async (req, res, next) => {
  try {
    const sar = await StudentAcademicRecord.findByPk(req.params.id, {
      include: [{ model: StudyPlan, attributes: ['id', 'studentAcademicRecordId', 'createdAt', 'updatedAt'] }]
    });

    if (!sar) {
      return res.status(404).json({ success: false, message: 'Student academic record not found' });
    }

    if (req.user.role === 'student' && !isSarOwnedByUser(sar, req.user)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    if (!sar.StudyPlan) {
      return res.status(200).json({ success: true, data: [] });
    }

    const versions = await fetchStudyPlanVersionsForStudyPlan(sar.StudyPlan.id);
    return res.status(200).json({ success: true, data: versions });
  } catch (error) {
    next(error);
  }
};