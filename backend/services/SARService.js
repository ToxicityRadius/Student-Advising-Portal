/**
 * SARService — Business logic for Student Academic Records.
 *
 * Extracted from sarController to separate HTTP concerns from domain logic.
 * Controllers delegate query composition, validation, and data transformation here.
 */

const { Op } = require('sequelize');
const {
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
  User,
} = require('../models');
const { computeSarAnalytics } = require('../utils/sarAnalytics');
const { sortStudyPlanCourses } = require('../utils/studyPlan');

const TIP_EMAIL_PATTERN = /@tip\.edu\.ph$/i;

const PERSON_ATTRIBUTES = [
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

const CURRICULUM_ATTRIBUTES = ['id', 'name', 'description', 'isActive'];
const ELECTIVE_TRACK_ATTRIBUTES = ['id', 'name', 'description'];

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

const normalizeEmail = (email) =>
  String(email || '')
    .trim()
    .toLowerCase();

const parseYearLevel = (value) => Number(value);

const isValidYearLevel = (value) => Number.isInteger(value) && value >= 1 && value <= 5;

const composeStudentDisplayName = (studentUser) => {
  if (!studentUser) return '';
  const firstName = String(studentUser.first_name || studentUser.firstName || '').trim();
  const lastName = String(studentUser.last_name || studentUser.lastName || '').trim();
  const full = [firstName, lastName].filter(Boolean).join(' ').trim();
  return full || String(studentUser.preferred_name || '').trim();
};

const buildStudentOwnershipWhere = (user) => {
  const checks = [];
  if (user?.id) checks.push({ userId: user.id });
  if (user?.email) checks.push({ email: normalizeEmail(user.email) });
  if (user?.studentId) checks.push({ studentNumber: user.studentId });
  return checks.length > 0 ? { [Op.or]: checks } : { id: null };
};

const isSarOwnedByUser = (sar, user) => {
  if (!sar || !user) return false;
  const sarEmail = normalizeEmail(sar.email);
  const userEmail = normalizeEmail(user.email);
  return (
    String(sar.userId || '') === String(user.id || '') ||
    (sarEmail && userEmail && sarEmail === userEmail) ||
    (sar.studentNumber && user.studentId && String(sar.studentNumber) === String(user.studentId))
  );
};

const serializeSar = (sar) => {
  const plain = sar?.get ? sar.get({ plain: true }) : sar;
  return {
    ...plain,
    isLinkedToAccount: Boolean(plain?.userId),
    linkStatus: plain?.userId ? 'linked' : 'unlinked',
  };
};

const serializeStudyPlanVersion = (version) => {
  const plain = version?.get ? version.get({ plain: true }) : version;
  const courses = Array.isArray(plain.StudyPlanCourses)
    ? sortStudyPlanCourses(plain.StudyPlanCourses)
    : [];
  return { ...plain, StudyPlanCourses: courses };
};

// ---------------------------------------------------------------------------
// Includes builders
// ---------------------------------------------------------------------------

const buildSarIncludes = () => [
  { model: Curriculum, attributes: CURRICULUM_ATTRIBUTES },
  { model: ElectiveTrack, attributes: ELECTIVE_TRACK_ATTRIBUTES },
  { model: User, as: 'Student', attributes: PERSON_ATTRIBUTES },
  { model: User, as: 'CreatedByAdviser', attributes: PERSON_ATTRIBUTES },
];

// ---------------------------------------------------------------------------
// Data-access methods
// ---------------------------------------------------------------------------

/**
 * Returns the defaults curriculum (active) or a specific one by ID.
 */
const getAssignedCurriculum = async (curriculumId) => {
  if (curriculumId) return Curriculum.findByPk(curriculumId);
  return Curriculum.findOne({ where: { isActive: true } });
};

/**
 * Resolves the student User record that matches the given email or studentNumber.
 * Throws a 409 error if email and studentNumber point to different accounts.
 */
const resolveMatchedStudent = async ({ email, studentNumber }) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedStudentNumber = String(studentNumber || '').trim();

  const [byEmail, byStudentNumber] = await Promise.all([
    normalizedEmail ? User.findOne({ where: { email: normalizedEmail, role: 'student' } }) : null,
    normalizedStudentNumber
      ? User.findOne({ where: { studentId: normalizedStudentNumber, role: 'student' } })
      : null,
  ]);

  if (byEmail && byStudentNumber && String(byEmail.id) !== String(byStudentNumber.id)) {
    const err = new Error(
      'Student email and student number match different existing student accounts',
    );
    err.statusCode = 409;
    throw err;
  }

  return byEmail || byStudentNumber || null;
};

/**
 * Builds autofill data for SAR creation form from a student email lookup.
 */
const getAutofillByEmail = async (email) => {
  const normalized = normalizeEmail(email);

  if (!normalized) {
    throw Object.assign(new Error('email query parameter is required'), { statusCode: 400 });
  }
  if (!TIP_EMAIL_PATTERN.test(normalized)) {
    throw Object.assign(new Error('Student email must end in @tip.edu.ph'), { statusCode: 400 });
  }

  const matchedStudent = await User.findOne({
    where: { email: normalized, role: 'student' },
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
      'lastName',
    ],
  });

  if (!matchedStudent) {
    return {
      foundStudentAccount: false,
      linkStatus: 'unlinked',
      email: normalized,
      message:
        'No registered student account found. You can still create an unlinked SAR manually.',
      autofill: { studentName: '', studentNumber: '', yearLevel: null, curriculumId: null },
      autoFilledFields: [],
    };
  }

  const existingSar = await StudentAcademicRecord.findOne({
    where: { [Op.or]: [{ userId: matchedStudent.id }, { email: normalized }] },
    attributes: ['id'],
  });

  const studentName = composeStudentDisplayName(matchedStudent);
  const studentNumber = String(matchedStudent.studentId || '').trim();
  const resolvedYearLevel = isValidYearLevel(parseYearLevel(matchedStudent.current_year_level))
    ? parseYearLevel(matchedStudent.current_year_level)
    : 1;
  const curriculum = await getAssignedCurriculum(matchedStudent.curriculum_id || null);

  const autoFilledFields = [];
  if (studentName) autoFilledFields.push('studentName');
  if (studentNumber) autoFilledFields.push('studentNumber');
  if (resolvedYearLevel) autoFilledFields.push('yearLevel');
  if (curriculum?.id) autoFilledFields.push('curriculumId');

  return {
    foundStudentAccount: true,
    linkStatus: 'linked',
    email: normalized,
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
      curriculumId: curriculum?.id || null,
    },
    autoFilledFields,
  };
};

/**
 * Fetches all study plan versions for a study plan, serialized and sorted.
 */
const fetchStudyPlanVersionsForStudyPlan = async (studyPlanId) => {
  const versions = await StudyPlanVersion.findAll({
    where: { studyPlanId },
    include: [
      { model: User, as: 'GeneratedByAdviser', attributes: PERSON_ATTRIBUTES },
      { model: User, as: 'ValidatedByAdviser', attributes: PERSON_ATTRIBUTES },
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

/**
 * Fetches a paginated list of SARs, applying ownership scoping if requestor is a student.
 */
const listSARs = async ({ user, paginationParams }) => {
  const { page, pageSize, search, sortBy, sortOrder, offset, limit } = paginationParams;

  const baseWhere = user.role === 'student' ? buildStudentOwnershipWhere(user) : {};
  const searchWhere = search
    ? {
        [Op.or]: [
          { studentName: { [Op.iLike]: `%${search}%` } },
          { studentNumber: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
        ],
      }
    : null;

  const where = searchWhere ? { [Op.and]: [baseWhere, searchWhere] } : baseWhere;

  const { rows, count } = await StudentAcademicRecord.findAndCountAll({
    where,
    include: buildSarIncludes(),
    order: [
      [sortBy, sortOrder],
      ['studentNumber', 'ASC'],
      ['id', 'DESC'],
    ],
    offset,
    limit,
  });

  return { items: rows.map(serializeSar), count, page, pageSize };
};

/**
 * Loads one SAR by ID with all includes needed for the detail view, including analytics.
 * Returns null if not found; throws 403 if student accesses another student's record.
 */
const getSARDetail = async (sarId, requestUser) => {
  const sar = await StudentAcademicRecord.findByPk(sarId, {
    include: [
      ...buildSarIncludes(),
      { model: StudyPlan, attributes: ['id', 'studentAcademicRecordId', 'createdAt', 'updatedAt'] },
    ],
  });

  if (!sar) return null;

  if (requestUser.role === 'student' && !isSarOwnedByUser(sar, requestUser)) {
    const err = new Error('Forbidden');
    err.statusCode = 403;
    throw err;
  }

  const sarData = serializeSar(sar);
  const versions = sarData.StudyPlan?.id
    ? await fetchStudyPlanVersionsForStudyPlan(sarData.StudyPlan.id)
    : [];

  const activeStudyPlanVersion = versions.find((v) => v.status === 'active') || null;
  const latestStudyPlanVersion = versions[0] || null;

  const [
    curriculumCourses,
    prerequisites,
    currentTerm,
    electiveTrackCourses,
    allCurriculumTrackCourses,
  ] = await Promise.all([
    CurriculumCourse.findAll({
      where: { curriculumId: sarData.curriculumId },
      include: [{ model: Course, attributes: ['id', 'code', 'name', 'units'] }],
      order: [
        ['yearLevel', 'ASC'],
        ['semester', 'ASC'],
        [Course, 'code', 'ASC'],
      ],
    }),
    Prerequisite.findAll({
      where: { curriculumId: sarData.curriculumId },
      include: [{ model: Course, as: 'PrerequisiteCourse', attributes: ['id', 'code', 'name'] }],
    }),
    AcademicTerm.findOne({
      where: { isCurrent: true },
      attributes: ['id', 'schoolYear', 'semester'],
    }),
    sarData.electiveTrackId
      ? ElectiveTrackCourse.findAll({
          where: { electiveTrackId: sarData.electiveTrackId },
          include: [{ model: Course, attributes: ['id', 'code', 'name', 'units'] }],
        })
      : [],
    ElectiveTrackCourse.findAll({
      include: [
        {
          model: ElectiveTrack,
          attributes: ['id', 'curriculumId'],
          where: { curriculumId: sarData.curriculumId },
        },
        { model: Course, attributes: ['id', 'code', 'name', 'units'] },
      ],
    }),
  ]);

  const analytics = computeSarAnalytics({
    sar: sarData,
    studyPlanVersions: versions,
    activeStudyPlanVersion,
    curriculumCourses,
    prerequisites,
    currentTerm,
    electiveTrackCourses,
    allCurriculumTrackCourses,
  });

  return {
    ...sarData,
    activeStudyPlanVersion,
    latestStudyPlanVersion,
    analytics,
    studyPlanVersions: versions.map(({ id, versionNumber, status, createdAt, updatedAt }) => ({
      id,
      versionNumber,
      status,
      createdAt,
      updatedAt,
    })),
  };
};

// ---------------------------------------------------------------------------
// SAR update helpers (Phase 7.5 — decompose updateSAR)
// ---------------------------------------------------------------------------

const ALLOWED_SAR_PROFILE_FIELDS = [
  'first_name',
  'middle_name',
  'last_name',
  'suffix',
  'preferred_name',
  'program',
  'student_type',
  'contact_number',
  'alternate_email',
  'sex',
  'citizenship',
  'address',
  'emergency_contact_name',
  'emergency_contact_relationship',
  'emergency_contact_number',
];

const ALLOWED_SEX = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
const ALLOWED_STUDENT_TYPES = ['regular', 'irregular', 'transferee', 'ladderized'];

const normalizeProfileField = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const normalized = String(value).trim();
  return normalized === '' ? null : normalized;
};

/**
 * Validates and builds the SAR-level update object from request body.
 * Returns { updates, error } — if error is set, respond with status 400/409.
 */
const buildSARFieldUpdates = async (body, currentSar) => {
  const updates = {};

  if (body.studentName !== undefined) {
    const studentName = String(body.studentName || '').trim();
    if (!studentName) {
      return { updates: null, error: { status: 400, message: 'studentName cannot be empty' } };
    }
    updates.studentName = studentName;
  }

  if (body.studentNumber !== undefined) {
    const studentNumber = String(body.studentNumber || '').trim();
    if (!studentNumber) {
      return { updates: null, error: { status: 400, message: 'studentNumber cannot be empty' } };
    }
    if (studentNumber !== String(currentSar.studentNumber || '').trim()) {
      const conflict = await StudentAcademicRecord.findOne({
        where: { studentNumber, id: { [Op.ne]: currentSar.id } },
      });
      if (conflict) {
        return {
          updates: null,
          error: {
            status: 409,
            message: 'Another student academic record already uses that student number',
          },
        };
      }
    }
    updates.studentNumber = studentNumber;
  }

  if (body.yearLevel !== undefined) {
    const yearLevel = parseYearLevel(body.yearLevel);
    if (!isValidYearLevel(yearLevel)) {
      return {
        updates: null,
        error: { status: 400, message: 'yearLevel must be an integer from 1 to 4' },
      };
    }
    updates.yearLevel = yearLevel;
  }

  if (body.curriculumId !== undefined) {
    const curriculum = await Curriculum.findByPk(body.curriculumId);
    if (!curriculum) {
      return { updates: null, error: { status: 404, message: 'Assigned curriculum not found' } };
    }
    updates.curriculumId = curriculum.id;
  }

  return { updates, error: null };
};

/**
 * Validates and builds the student profile update object from request body.
 * Returns { profileUpdates, error } — if error is set, respond with the given status.
 */
const buildSARProfileUpdates = (rawStudentProfile) => {
  if (rawStudentProfile === undefined) {
    return { profileUpdates: {}, error: null };
  }

  let studentProfile = rawStudentProfile;
  if (typeof studentProfile === 'string') {
    try {
      studentProfile = JSON.parse(studentProfile);
    } catch {
      return {
        profileUpdates: null,
        error: { status: 400, message: 'studentProfile must be valid JSON when provided as text' },
      };
    }
  }

  if (!studentProfile || typeof studentProfile !== 'object' || Array.isArray(studentProfile)) {
    return {
      profileUpdates: null,
      error: { status: 400, message: 'studentProfile must be an object when provided' },
    };
  }

  const profileUpdates = {};
  for (const field of ALLOWED_SAR_PROFILE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(studentProfile, field)) {
      profileUpdates[field] = normalizeProfileField(studentProfile[field]);
    }
  }

  if (
    Object.prototype.hasOwnProperty.call(profileUpdates, 'student_type') &&
    profileUpdates.student_type !== null &&
    !ALLOWED_STUDENT_TYPES.includes(profileUpdates.student_type)
  ) {
    return {
      profileUpdates: null,
      error: {
        status: 400,
        message: `student_type must be one of: ${ALLOWED_STUDENT_TYPES.join(', ')}`,
      },
    };
  }

  if (
    Object.prototype.hasOwnProperty.call(profileUpdates, 'sex') &&
    profileUpdates.sex !== null &&
    !ALLOWED_SEX.includes(profileUpdates.sex)
  ) {
    return {
      profileUpdates: null,
      error: { status: 400, message: `sex must be one of: ${ALLOWED_SEX.join(', ')}` },
    };
  }

  if (
    Object.prototype.hasOwnProperty.call(profileUpdates, 'alternate_email') &&
    profileUpdates.alternate_email !== null &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileUpdates.alternate_email)
  ) {
    return {
      profileUpdates: null,
      error: { status: 400, message: 'alternate_email must be a valid email address' },
    };
  }

  return { profileUpdates, error: null };
};

module.exports = {
  // Pure helpers (also exported for use in controllers that need them inline)
  normalizeEmail,
  parseYearLevel,
  isValidYearLevel,
  composeStudentDisplayName,
  buildStudentOwnershipWhere,
  isSarOwnedByUser,
  serializeSar,
  serializeStudyPlanVersion,
  buildSarIncludes,
  // Domain methods
  getAssignedCurriculum,
  resolveMatchedStudent,
  getAutofillByEmail,
  fetchStudyPlanVersionsForStudyPlan,
  listSARs,
  getSARDetail,
  buildSARFieldUpdates,
  buildSARProfileUpdates,
};
