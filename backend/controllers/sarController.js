const { Op } = require('sequelize');
const {
  sequelize,
  StudentAcademicRecord,
  StudyPlan,
  StudyPlanVersion,
  StudyPlanCourse,
  Curriculum,
  CurriculumCourse,
  Prerequisite,
  AcademicTerm,
  Course,
  ElectiveTrack,
  ElectiveTrackCourse,
  User
} = require('../models');
const { syncSarToProfile } = require('../utils/sarLinking');
const { parsePaginationParams, buildPaginatedPayload } = require('../utils/pagination');
const { computeSarAnalytics } = require('../utils/sarAnalytics');
const { buildElectiveTrackPlan } = require('../utils/studyPlan');

const tipEmailPattern = /@tip\.edu\.ph$/i;

const personAttributes = ['id', 'firstName', 'lastName', 'email', 'role', 'studentId', 'profile_picture', 'program', 'student_type'];
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

const composeStudentDisplayName = (studentUser) => {
  if (!studentUser) {
    return '';
  }

  const firstName = String(studentUser.first_name || studentUser.firstName || '').trim();
  const lastName = String(studentUser.last_name || studentUser.lastName || '').trim();
  const fallback = [firstName, lastName].filter(Boolean).join(' ').trim();

  if (fallback) {
    return fallback;
  }

  return String(studentUser.preferred_name || '').trim();
};

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

// @desc   Get SAR create-form autofill values by student email
// @route  GET /api/sars/autofill?email=
// @access adviser, admin
exports.getSarAutofillByEmail = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.query.email);

    if (!email) {
      return res.status(400).json({ success: false, message: 'email query parameter is required' });
    }

    if (!tipEmailPattern.test(email)) {
      return res.status(400).json({ success: false, message: 'Student email must end in @tip.edu.ph' });
    }

    const matchedStudent = await User.findOne({
      where: { email, role: 'student' },
      attributes: [
        'id',
        'email',
        'studentId',
        'current_year_level',
        'curriculum_id',
        'preferred_name',
        'first_name',
        'last_name',
        'firstName',
        'lastName'
      ]
    });

    if (!matchedStudent) {
      return res.status(200).json({
        success: true,
        data: {
          foundStudentAccount: false,
          linkStatus: 'unlinked',
          email,
          message: 'No registered student account found. You can still create an unlinked SAR manually.',
          autofill: {
            studentName: '',
            studentNumber: '',
            yearLevel: null,
            curriculumId: null
          },
          autoFilledFields: []
        }
      });
    }

    const existingSar = await StudentAcademicRecord.findOne({
      where: {
        [Op.or]: [
          { userId: matchedStudent.id },
          { email }
        ]
      },
      attributes: ['id']
    });

    const studentName = composeStudentDisplayName(matchedStudent);
    const studentNumber = String(matchedStudent.studentId || '').trim();
    const resolvedYearLevel = isValidYearLevel(parseYearLevel(matchedStudent.current_year_level))
      ? parseYearLevel(matchedStudent.current_year_level)
      : 1;

    const curriculum = await getAssignedCurriculum(matchedStudent.curriculum_id || null);

    const autoFilledFields = [];
    if (studentName) {
      autoFilledFields.push('studentName');
    }
    if (studentNumber) {
      autoFilledFields.push('studentNumber');
    }
    if (resolvedYearLevel) {
      autoFilledFields.push('yearLevel');
    }
    if (curriculum?.id) {
      autoFilledFields.push('curriculumId');
    }

    return res.status(200).json({
      success: true,
      data: {
        foundStudentAccount: true,
        linkStatus: 'linked',
        email,
        studentId: matchedStudent.id,
        hasExistingSar: Boolean(existingSar),
        existingSarId: existingSar?.id || null,
        message: existingSar
          ? 'Student account found, but this account is already linked to an existing SAR.'
          : 'Student account found. Fields were auto-populated from the student profile.',
        autofill: {
          studentName,
          studentNumber,
          yearLevel: resolvedYearLevel,
          curriculumId: curriculum?.id || null
        },
        autoFilledFields
      }
    });
  } catch (error) {
    next(error);
  }
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

    // SAR → Profile sync: mirror identity fields to linked student profile
    if (matchedStudent) {
      try {
        await syncSarToProfile(createdSar.get({ plain: true }));
      } catch (syncError) {
        console.error('[sarSync] createSAR sync error:', syncError.message);
      }
    }

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
    const { page, pageSize, search, sortBy, sortOrder, offset, limit } = parsePaginationParams(req.query, {
      defaultSortBy: 'studentName',
      allowedSortBy: ['studentName', 'studentNumber', 'email', 'yearLevel', 'createdAt']
    });

    const baseWhere = req.user.role === 'student' ? buildStudentOwnershipWhere(req.user) : {};
    const searchWhere = search
      ? {
        [Op.or]: [
          { studentName: { [Op.iLike]: `%${search}%` } },
          { studentNumber: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } }
        ]
      }
      : null;

    const where = searchWhere
      ? { [Op.and]: [baseWhere, searchWhere] }
      : baseWhere;

    const { rows, count } = await StudentAcademicRecord.findAndCountAll({
      where,
      include: buildSarIncludes(),
      order: [[sortBy, sortOrder], ['studentNumber', 'ASC'], ['id', 'DESC']],
      offset,
      limit
    });

    const items = rows.map(serializeSar);
    const payload = buildPaginatedPayload({
      items,
      page,
      pageSize,
      totalItems: count
    });

    return res.status(200).json({ success: true, ...payload });
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
    const [curriculumCourses, prerequisites, currentTerm] = await Promise.all([
      CurriculumCourse.findAll({
        where: { curriculumId: sarData.curriculumId },
        include: [{ model: Course, attributes: ['id', 'code', 'name', 'units'] }],
        order: [['yearLevel', 'ASC'], ['semester', 'ASC'], [Course, 'code', 'ASC']]
      }),
      Prerequisite.findAll({
        where: { curriculumId: sarData.curriculumId },
        include: [{ model: Course, as: 'PrerequisiteCourse', attributes: ['id', 'code', 'name'] }]
      }),
      AcademicTerm.findOne({ where: { isCurrent: true }, attributes: ['id', 'schoolYear', 'semester'] })
    ]);

    const analytics = computeSarAnalytics({
      sar: sarData,
      studyPlanVersions: versions,
      activeStudyPlanVersion,
      curriculumCourses,
      prerequisites,
      currentTerm
    });

    return res.status(200).json({
      success: true,
      data: {
        ...sarData,
        activeStudyPlanVersion,
        latestStudyPlanVersion,
        analytics,
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

    if (req.body.studentName !== undefined) {
      const studentName = String(req.body.studentName || '').trim();
      if (!studentName) {
        return res.status(400).json({ success: false, message: 'studentName cannot be empty' });
      }
      updates.studentName = studentName;
    }

    if (req.body.studentNumber !== undefined) {
      const studentNumber = String(req.body.studentNumber || '').trim();
      if (!studentNumber) {
        return res.status(400).json({ success: false, message: 'studentNumber cannot be empty' });
      }
      // Check uniqueness only when changing to a different value
      if (studentNumber !== String(sar.studentNumber || '').trim()) {
        const conflict = await StudentAcademicRecord.findOne({
          where: { studentNumber, id: { [Op.ne]: sar.id } }
        });
        if (conflict) {
          return res.status(409).json({ success: false, message: 'Another student academic record already uses that student number' });
        }
      }
      updates.studentNumber = studentNumber;
    }

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

    // SAR → Profile sync: mirror identity field changes to linked student profile
    const identityChanged = updates.studentName !== undefined || updates.studentNumber !== undefined;
    if (identityChanged && updatedSar.userId) {
      try {
        await syncSarToProfile(updatedSar.get({ plain: true }));
      } catch (syncError) {
        console.error('[sarSync] updateSAR sync error:', syncError.message);
      }
    }

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

    const [curriculumCourses, selectedTrackCourses, curriculumTrackCourses] = await Promise.all([
      CurriculumCourse.findAll({
        where: { curriculumId: sar.curriculumId },
        include: [{ model: Course, attributes: ['id', 'code', 'name', 'units'] }],
        order: [['yearLevel', 'ASC'], ['semester', 'ASC'], [Course, 'code', 'ASC']],
        transaction
      }),
      sar.electiveTrackId
        ? ElectiveTrackCourse.findAll({
          where: { electiveTrackId: sar.electiveTrackId },
          include: [{ model: Course, attributes: ['id', 'code', 'name', 'units'] }],
          transaction
        })
        : [],
      ElectiveTrackCourse.findAll({
        include: [{
          model: ElectiveTrack,
          attributes: ['id', 'curriculumId'],
          where: { curriculumId: sar.curriculumId }
        }],
        transaction
      })
    ]);

    if (curriculumCourses.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'The assigned curriculum has no courses to generate a study plan from' });
    }

    const selectedTrackPlan = buildElectiveTrackPlan(selectedTrackCourses || []);
    const selectedTrackPlanByCourseId = new Map(selectedTrackPlan.map((item) => [String(item.courseId), item]));
    const selectedTrackCourseIds = new Set(selectedTrackPlan.map((item) => String(item.courseId)));
    const curriculumTrackCourseIds = new Set((curriculumTrackCourses || []).map((item) => String(item.courseId)));
    const generatedRows = [];
    const includedCourseIds = new Set();

    curriculumCourses.forEach((curriculumCourse) => {
      const courseId = String(curriculumCourse.courseId);
      if (curriculumTrackCourseIds.has(courseId) && !selectedTrackCourseIds.has(courseId)) {
        return;
      }

      const selectedTrackPlacement = selectedTrackPlanByCourseId.get(courseId);
      generatedRows.push({
        courseId: curriculumCourse.courseId,
        yearLevel: selectedTrackPlacement?.yearLevel || curriculumCourse.yearLevel,
        semester: selectedTrackPlacement?.semester || curriculumCourse.semester
      });
      includedCourseIds.add(courseId);
    });

    selectedTrackPlan.forEach((item) => {
      const courseId = String(item.courseId);
      if (includedCourseIds.has(courseId)) {
        return;
      }

      generatedRows.push({
        courseId: item.courseId,
        yearLevel: item.yearLevel,
        semester: item.semester
      });
    });

    generatedRows.sort((left, right) => left.yearLevel - right.yearLevel
      || left.semester - right.semester
      || left.courseId - right.courseId);

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
      generatedRows.map((curriculumCourse) => ({
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