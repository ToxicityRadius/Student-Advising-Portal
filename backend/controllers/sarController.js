const { imageSize } = require('image-size');
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
  ElectiveTrackCourse,
  User,
} = require('../models');
const { syncSarToProfile } = require('../utils/sarLinking');
const { parsePaginationParams, buildPaginatedPayload } = require('../utils/pagination');
const { buildElectiveTrackPlan } = require('../utils/studyPlan');
const { canManageProgram } = require('../utils/programAccess');

const {
  uploadProfilePicture: uploadProfilePictureAsset,
  deleteProfilePictureAsset,
} = require('../utils/profileStorage');
const { validateUploadedImageFile } = require('../utils/imageValidation');
const SARService = require('../services/SARService');
const NotificationService = require('../services/NotificationService');
const ActivityLogService = require('../services/ActivityLogService');

const tipEmailPattern = /@tip\.edu\.ph$/i;

const personAttributes = [
  'id',
  'firstName',
  'lastName',
  'email',
  'role',
  'studentId',
  'profile_picture',
  'first_name',
  'middle_name',
  'last_name',
  'suffix',
  'preferred_name',
  'program',
  'curriculum_id',
  'student_type',
  'current_year_level',
  'contact_number',
  'alternate_email',
  'sex',
  'citizenship',
  'address',
  'emergency_contact_name',
  'emergency_contact_relationship',
  'emergency_contact_number',
  'profile_updated_at',
];
const curriculumAttributes = ['id', 'name', 'description', 'isActive'];
const electiveTrackAttributes = ['id', 'name', 'description'];
const MAX_PROFILE_IMAGE_WIDTH = 2000;
const MAX_PROFILE_IMAGE_HEIGHT = 2000;

const buildSarIncludes = () => [
  { model: Curriculum, attributes: curriculumAttributes },
  { model: ElectiveTrack, attributes: electiveTrackAttributes },
  { model: User, as: 'Student', attributes: personAttributes },
  { model: User, as: 'CreatedByAdviser', attributes: personAttributes },
];

const normalizeEmail = (email) =>
  String(email || '')
    .trim()
    .toLowerCase();

const parseYearLevel = (value) => Number(value);

const isValidYearLevel = (value) => Number.isInteger(value) && value >= 1 && value <= 5;

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
    linkStatus: isLinkedToAccount ? 'linked' : 'unlinked',
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
    const data = await SARService.getAutofillByEmail(req.query.email);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const resolveMatchedStudent = async ({ email, studentNumber }) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedStudentNumber = String(studentNumber || '').trim();

  const [matchedByEmail, matchedByStudentNumber] = await Promise.all([
    normalizedEmail ? User.findOne({ where: { email: normalizedEmail, role: 'student' } }) : null,
    normalizedStudentNumber
      ? User.findOne({ where: { studentId: normalizedStudentNumber, role: 'student' } })
      : null,
  ]);

  if (
    matchedByEmail &&
    matchedByStudentNumber &&
    String(matchedByEmail.id) !== String(matchedByStudentNumber.id)
  ) {
    const error = new Error(
      'Student email and student number match different existing student accounts',
    );
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
    StudyPlanCourses: studyPlanCourses,
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
        include: [{ model: Course, attributes: ['id', 'code', 'name', 'units'] }],
      },
    ],
    order: [
      ['versionNumber', 'DESC'],
      ['createdAt', 'DESC'],
    ],
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
        message: 'studentName, studentNumber, email, and yearLevel are required',
      });
    }

    if (!tipEmailPattern.test(email)) {
      return res
        .status(400)
        .json({ success: false, message: 'Student email must end in @tip.edu.ph' });
    }

    if (!isValidYearLevel(yearLevel)) {
      return res
        .status(400)
        .json({ success: false, message: 'yearLevel must be an integer from 1 to 4' });
    }

    const curriculum = await getAssignedCurriculum(req.body.curriculumId);
    if (!curriculum) {
      return res.status(400).json({
        success: false,
        message: 'No curriculum was provided and there is no active curriculum to use as default',
      });
    }
    if (!(await canManageProgram(req.user, curriculum.programId))) {
      return res.status(403).json({ success: false, message: 'Program access denied' });
    }

    const [existingStudentNumber, existingEmail, matchedStudent] = await Promise.all([
      StudentAcademicRecord.findOne({ where: { studentNumber } }),
      StudentAcademicRecord.findOne({ where: { email } }),
      resolveMatchedStudent({ email, studentNumber }),
    ]);

    if (existingStudentNumber) {
      return res.status(409).json({
        success: false,
        message: 'A student academic record already exists for that student number',
      });
    }

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'A student academic record already exists for that email address',
      });
    }

    if (matchedStudent) {
      const existingStudentSar = await StudentAcademicRecord.findOne({
        where: { userId: matchedStudent.id },
      });
      if (existingStudentSar) {
        return res.status(409).json({
          success: false,
          message: 'This student account is already linked to another academic record',
        });
      }
    }

    const sar = await StudentAcademicRecord.create({
      userId: matchedStudent?.id || null,
      curriculumId: curriculum.id,
      programId: curriculum.programId,
      studentName,
      studentNumber,
      email,
      yearLevel,
      createdByAdviserId: req.user.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const createdSar = await StudentAcademicRecord.findByPk(sar.id, {
      include: buildSarIncludes(),
    });

    // SAR → Profile sync: mirror identity fields to linked student profile
    if (matchedStudent) {
      try {
        await syncSarToProfile(createdSar.get({ plain: true }));
      } catch (syncError) {
        console.error('[sarSync] createSAR sync error:', syncError.message);
      }
    }

    // Notify the student that their academic record was created
    if (matchedStudent) {
      NotificationService.notify({
        recipientId: matchedStudent.id,
        actorId: req.user.id,
        category: 'sar_created',
        resourceType: 'sar',
        resourceId: createdSar.id,
      });
    }

    ActivityLogService.logSafe({
      programId: createdSar.programId,
      actorId: req.user.id,
      action: 'sar.created',
      resourceType: 'sar',
      resourceId: createdSar.id,
      resourceLabel: createdSar.studentName,
      targetUserId: createdSar.userId || null,
      metadata: { studentNumber: createdSar.studentNumber },
    });

    return res.status(201).json({ success: true, data: serializeSar(createdSar) });
  } catch (error) {
    next(error);
  }
};

// @desc   Bulk create student academic records from array
// @route  POST /api/sars/bulk-create
// @access adviser, admin
exports.bulkCreateSARs = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { records } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'records must be a non-empty array' });
    }

    if (records.length > 100) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cannot create more than 100 records in a single request',
      });
    }

    const errors = [];
    const created = [];

    for (let i = 0; i < records.length; i++) {
      const item = records[i];
      const lineNum = i + 1;

      const studentName = String(item.studentName || '').trim();
      const studentNumber = String(item.studentNumber || '').trim();
      const email = normalizeEmail(item.email);
      const yearLevel = parseYearLevel(item.yearLevel);

      if (!studentName || !studentNumber || !email || !item.yearLevel) {
        errors.push({
          line: lineNum,
          message: 'studentName, studentNumber, email, and yearLevel are required',
        });
        continue;
      }

      if (!tipEmailPattern.test(email)) {
        errors.push({
          line: lineNum,
          studentNumber,
          message: 'Student email must end in @tip.edu.ph',
        });
        continue;
      }

      if (!isValidYearLevel(yearLevel)) {
        errors.push({
          line: lineNum,
          studentNumber,
          message: 'yearLevel must be an integer from 1 to 5',
        });
        continue;
      }

      const existingByNumber = await StudentAcademicRecord.findOne({
        where: { studentNumber },
        transaction,
      });
      if (existingByNumber) {
        errors.push({
          line: lineNum,
          studentNumber,
          message: 'A record already exists for this student number',
        });
        continue;
      }

      const existingByEmail = await StudentAcademicRecord.findOne({
        where: { email },
        transaction,
      });
      if (existingByEmail) {
        errors.push({
          line: lineNum,
          studentNumber,
          message: 'A record already exists for this email',
        });
        continue;
      }

      const curriculum = await getAssignedCurriculum(item.curriculumId);
      if (!curriculum) {
        errors.push({
          line: lineNum,
          studentNumber,
          message: 'No curriculum provided and no active curriculum available',
        });
        continue;
      }
      if (!(await canManageProgram(req.user, curriculum.programId))) {
        errors.push({
          line: lineNum,
          studentNumber,
          message: 'Program access denied',
        });
        continue;
      }

      let matchedStudent = null;
      try {
        matchedStudent = await resolveMatchedStudent({ email, studentNumber });
      } catch (matchErr) {
        errors.push({ line: lineNum, studentNumber, message: matchErr.message });
        continue;
      }

      const sar = await StudentAcademicRecord.create(
        {
          userId: matchedStudent?.id || null,
          curriculumId: curriculum.id,
          programId: curriculum.programId,
          studentName,
          studentNumber,
          email,
          yearLevel,
          createdByAdviserId: req.user.id,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        { transaction },
      );

      created.push({ id: sar.id, studentNumber, studentName, email });
    }

    if (created.length === 0) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ success: false, message: 'All records failed validation', errors });
    }

    await transaction.commit();

    return res.status(201).json({
      success: true,
      created: created.length,
      failed: errors.length,
      data: created,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

// @desc   Get student academic records
// @route  GET /api/sars
// @access adviser, admin, student (own only)
exports.getSARs = async (req, res, next) => {
  try {
    const paginationParams = parsePaginationParams(req.query, {
      defaultSortBy: 'studentName',
      allowedSortBy: ['studentName', 'studentNumber', 'email', 'yearLevel', 'createdAt'],
    });
    const { items, count, page, pageSize } = await SARService.listSARs({
      user: req.user,
      paginationParams,
      programId: req.query.programId,
      scope: req.query.scope,
      curriculumId: req.query.curriculumId,
      yearLevel: req.query.yearLevel,
      linkStatus: req.query.linkStatus,
      needsRevalidation: req.query.needsRevalidation,
      hasStudyPlan: req.query.hasStudyPlan,
      electiveTrackStatus: req.query.electiveTrackStatus,
    });
    const payload = buildPaginatedPayload({ items, page, pageSize, totalItems: count });
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
    const data = await SARService.getSARDetail(req.params.id, req.user);
    if (!data) {
      return res.status(404).json({ success: false, message: 'Student academic record not found' });
    }
    return res.status(200).json({ success: true, data });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc   Update a student academic record
// @route  PUT /api/sars/:id
// @access adviser, admin
// @desc   Update a student academic record
// @route  PUT /api/sars/:id
// @access adviser, admin
exports.updateSAR = async (req, res, next) => {
  try {
    const sar = await StudentAcademicRecord.findByPk(req.params.id);
    if (!sar) {
      return res.status(404).json({ success: false, message: 'Student academic record not found' });
    }

    // Build SAR-level field updates (studentName, studentNumber, yearLevel, curriculumId)
    const { updates, error: sarFieldError } = await SARService.buildSARFieldUpdates(req.body, sar);
    if (sarFieldError) {
      return res
        .status(sarFieldError.status)
        .json({ success: false, message: sarFieldError.message });
    }

    // Build student profile updates from studentProfile body field
    const { profileUpdates, error: profileError } = SARService.buildSARProfileUpdates(
      req.body.studentProfile,
    );
    if (profileError) {
      return res
        .status(profileError.status)
        .json({ success: false, message: profileError.message });
    }

    const removeProfilePicture =
      String(req.body.remove_profile_picture || '').toLowerCase() === 'true';

    if (
      Object.keys(updates).length === 0 &&
      Object.keys(profileUpdates).length === 0 &&
      !req.file &&
      !removeProfilePicture
    ) {
      return res
        .status(400)
        .json({ success: false, message: 'No valid SAR fields were provided for update' });
    }

    // Handle profile picture / linked student updates
    let linkedStudent = null;
    if (Object.keys(profileUpdates).length > 0 || req.file || removeProfilePicture) {
      if (!sar.userId) {
        return res.status(400).json({
          success: false,
          message:
            'Cannot update profile details because this SAR is not linked to a student account',
        });
      }

      linkedStudent = await User.findByPk(sar.userId);
      if (!linkedStudent) {
        return res
          .status(404)
          .json({ success: false, message: 'Linked student account not found' });
      }

      if (req.file) {
        const imageValidationError = validateUploadedImageFile(req.file);
        if (imageValidationError) {
          return res.status(400).json({ success: false, message: imageValidationError });
        }

        const dimensions = imageSize(req.file.buffer);
        const width = Number(dimensions?.width || 0);
        const height = Number(dimensions?.height || 0);

        if (
          !width ||
          !height ||
          width > MAX_PROFILE_IMAGE_WIDTH ||
          height > MAX_PROFILE_IMAGE_HEIGHT
        ) {
          return res.status(400).json({
            success: false,
            message: 'Profile image dimensions are invalid. Max dimensions are 2000x2000.',
          });
        }

        const publicUrl = await uploadProfilePictureAsset(req.file, sar.userId);
        profileUpdates.profile_picture = publicUrl;
      } else if (removeProfilePicture) {
        profileUpdates.profile_picture = null;
      }
    }

    updates.updatedAt = Date.now();
    await sar.update(updates);

    if (Object.keys(profileUpdates).length > 0) {
      const existingPicturePath = linkedStudent.profile_picture;
      profileUpdates.updatedAt = Date.now();
      profileUpdates.profile_updated_at = Date.now();
      await linkedStudent.update(profileUpdates);

      if (
        Object.prototype.hasOwnProperty.call(profileUpdates, 'profile_picture') &&
        existingPicturePath &&
        existingPicturePath !== profileUpdates.profile_picture
      ) {
        await deleteProfilePictureAsset(existingPicturePath);
      }
    }

    const updatedSar = await StudentAcademicRecord.findByPk(sar.id, {
      include: buildSarIncludes(),
    });

    // SAR → Profile sync: mirror identity field changes to linked student profile
    const identityChanged =
      updates.studentName !== undefined || updates.studentNumber !== undefined;
    if (identityChanged && updatedSar.userId) {
      try {
        await syncSarToProfile(updatedSar.get({ plain: true }));
      } catch (syncError) {
        console.error('[sarSync] updateSAR sync error:', syncError.message);
      }
    }

    ActivityLogService.logSafe({
      programId: updatedSar.programId,
      actorId: req.user.id,
      action: 'sar.updated',
      resourceType: 'sar',
      resourceId: updatedSar.id,
      resourceLabel: updatedSar.studentName,
      targetUserId: updatedSar.userId || null,
      metadata: { changedFields: Object.keys({ ...updates, ...profileUpdates }) },
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
      lock: transaction.LOCK.UPDATE,
    });

    if (!sar) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Student academic record not found' });
    }

    const existingStudyPlan = await StudyPlan.findOne({
      where: { studentAcademicRecordId: sar.id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (existingStudyPlan) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: 'Initial study plan has already been generated for this student',
      });
    }

    const [curriculumCourses, selectedTrackCourses, curriculumTrackCourses] = await Promise.all([
      CurriculumCourse.findAll({
        where: { curriculumId: sar.curriculumId },
        include: [{ model: Course, attributes: ['id', 'code', 'name', 'units'] }],
        order: [
          ['yearLevel', 'ASC'],
          ['semester', 'ASC'],
          [Course, 'code', 'ASC'],
        ],
        transaction,
      }),
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

    if (curriculumCourses.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'The assigned curriculum has no courses to generate a study plan from',
      });
    }

    const selectedTrackPlan = buildElectiveTrackPlan(selectedTrackCourses || []);
    const selectedTrackPlanByCourseId = new Map(
      selectedTrackPlan.map((item) => [String(item.courseId), item]),
    );
    const selectedTrackCourseIds = new Set(selectedTrackPlan.map((item) => String(item.courseId)));
    const curriculumTrackCourseIds = new Set(
      (curriculumTrackCourses || []).map((item) => String(item.courseId)),
    );
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
        semester: selectedTrackPlacement?.semester || curriculumCourse.semester,
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
        semester: item.semester,
      });
    });

    generatedRows.sort(
      (left, right) =>
        left.yearLevel - right.yearLevel ||
        left.semester - right.semester ||
        left.courseId - right.courseId,
    );

    const now = Date.now();

    const studyPlan = await StudyPlan.create(
      {
        studentAcademicRecordId: sar.id,
        createdAt: now,
        updatedAt: now,
      },
      { transaction },
    );

    const version = await StudyPlanVersion.create(
      {
        studyPlanId: studyPlan.id,
        versionNumber: 1,
        status: 'draft',
        generatedByAdviserId: req.user.id,
        createdAt: now,
        updatedAt: now,
      },
      { transaction },
    );

    await StudyPlanCourse.bulkCreate(
      generatedRows.map((curriculumCourse) => ({
        studyPlanVersionId: version.id,
        courseId: curriculumCourse.courseId,
        yearLevel: curriculumCourse.yearLevel,
        semester: curriculumCourse.semester,
        grade: null,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      })),
      { transaction },
    );

    await transaction.commit();

    const createdVersion = await StudyPlanVersion.findByPk(version.id, {
      include: [
        { model: User, as: 'GeneratedByAdviser', attributes: personAttributes },
        {
          model: StudyPlanCourse,
          include: [{ model: Course, attributes: ['id', 'code', 'name', 'units'] }],
        },
      ],
    });

    ActivityLogService.logSafe({
      programId: sar.programId,
      actorId: req.user.id,
      action: 'study_plan.generated',
      resourceType: 'study_plan_version',
      resourceId: createdVersion.id,
      resourceLabel: `Study plan v${createdVersion.versionNumber}`,
      targetUserId: sar.userId || null,
      metadata: { sarId: sar.id, versionNumber: createdVersion.versionNumber },
    });

    return res.status(201).json({
      success: true,
      data: serializeStudyPlanVersion(createdVersion),
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
    const { page, pageSize } = parsePaginationParams(req.query, {
      defaultSortBy: 'createdAt',
      allowedSortBy: ['versionNumber', 'createdAt', 'status'],
    });

    const sar = await StudentAcademicRecord.findByPk(req.params.id, {
      include: [
        {
          model: StudyPlan,
          attributes: ['id', 'studentAcademicRecordId', 'createdAt', 'updatedAt'],
        },
      ],
    });

    if (!sar) {
      return res.status(404).json({ success: false, message: 'Student academic record not found' });
    }

    if (req.user.role === 'student' && !isSarOwnedByUser(sar, req.user)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    if (!sar.StudyPlan) {
      const payload = buildPaginatedPayload({
        items: [],
        page,
        pageSize,
        totalItems: 0,
      });
      return res.status(200).json({ success: true, ...payload });
    }

    const versions = await fetchStudyPlanVersionsForStudyPlan(sar.StudyPlan.id);
    const totalItems = versions.length;
    const offset = (page - 1) * pageSize;
    const items = versions.slice(offset, offset + pageSize);
    const payload = buildPaginatedPayload({
      items,
      page,
      pageSize,
      totalItems,
    });

    return res.status(200).json({ success: true, ...payload });
  } catch (error) {
    next(error);
  }
};
