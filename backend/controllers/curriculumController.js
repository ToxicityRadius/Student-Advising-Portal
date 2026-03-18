const { Op } = require('sequelize');
const {
  sequelize,
  Curriculum,
  Course,
  CurriculumCourse,
  Prerequisite,
  CoRequisite,
  CourseEquivalency,
  ElectiveTrack,
  ElectiveTrackCourse,
  StudyPlanCourse,
  User
} = require('../models');
const { parsePaginationParams, buildPaginatedPayload } = require('../utils/pagination');

const CURRICULUM_CSV_COLUMNS = [
  'exportVersion',
  'rowType',
  'curriculumId',
  'curriculumName',
  'courseCode',
  'courseName',
  'units',
  'yearLevel',
  'semester',
  'isElective',
  'relatedCourseCode',
  'trackName',
  'notes'
];

const ALLOWED_ROW_TYPES = new Set([
  'metadata',
  'structure',
  'prerequisite',
  'corequisite',
  'equivalency',
  'elective_track',
  'elective_track_course'
]);

const parseBoolean = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return false;
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'y';
};

const toIntegerOrNull = (value) => {
  const normalized = String(value ?? '').trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isInteger(parsed)) return null;
  return parsed;
};

const escapeCsvValue = (value) => {
  const raw = value === null || value === undefined ? '' : String(value);
  if (raw.includes(',') || raw.includes('"') || raw.includes('\n')) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
};

const serializeCsv = (rows) => {
  const header = CURRICULUM_CSV_COLUMNS.join(',');
  const lines = rows.map((row) => CURRICULUM_CSV_COLUMNS.map((column) => escapeCsvValue(row[column])).join(','));
  return [header, ...lines].join('\n');
};

const parseCsvText = (text) => {
  const rows = [];
  let current = '';
  let row = [];
  let inQuotes = false;

  const pushCell = () => {
    row.push(current);
    current = '';
  };

  const pushRow = () => {
    if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
      rows.push(row);
    }
    row = [];
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      pushCell();
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }
      pushCell();
      pushRow();
      continue;
    }

    current += char;
  }

  pushCell();
  pushRow();
  return rows;
};

const validateAndNormalizeCsvRows = ({ csvRows, expectedCurriculumId }) => {
  if (!Array.isArray(csvRows) || csvRows.length === 0) {
    return {
      errors: [{ rowNumber: 1, message: 'CSV file is empty.' }],
      normalizedRows: []
    };
  }

  const headers = csvRows[0].map((cell) => String(cell || '').trim());
  const missingColumns = CURRICULUM_CSV_COLUMNS.filter((column) => !headers.includes(column));
  if (missingColumns.length > 0) {
    return {
      errors: [{ rowNumber: 1, message: `CSV header is missing required columns: ${missingColumns.join(', ')}` }],
      normalizedRows: []
    };
  }

  const headerIndex = headers.reduce((acc, column, index) => {
    acc[column] = index;
    return acc;
  }, {});

  const normalizedRows = [];
  const errors = [];

  for (let index = 1; index < csvRows.length; index += 1) {
    const rawRow = csvRows[index];
    const rowNumber = index + 1;
    const pick = (column) => String(rawRow[headerIndex[column]] || '').trim();

    const normalized = {
      rowNumber,
      exportVersion: pick('exportVersion') || '1',
      rowType: pick('rowType').toLowerCase(),
      curriculumId: toIntegerOrNull(pick('curriculumId')),
      curriculumName: pick('curriculumName'),
      courseCode: pick('courseCode').toUpperCase(),
      courseName: pick('courseName'),
      units: toIntegerOrNull(pick('units')),
      yearLevel: toIntegerOrNull(pick('yearLevel')),
      semester: toIntegerOrNull(pick('semester')),
      isElective: parseBoolean(pick('isElective')),
      relatedCourseCode: pick('relatedCourseCode').toUpperCase(),
      trackName: pick('trackName'),
      notes: pick('notes')
    };

    if (!normalized.rowType || !ALLOWED_ROW_TYPES.has(normalized.rowType)) {
      errors.push({ rowNumber, rowType: normalized.rowType || null, message: 'Invalid rowType.' });
      continue;
    }

    if (normalized.curriculumId && Number(normalized.curriculumId) !== Number(expectedCurriculumId)) {
      errors.push({
        rowNumber,
        rowType: normalized.rowType,
        message: `curriculumId ${normalized.curriculumId} does not match selected curriculum ${expectedCurriculumId}.`
      });
      continue;
    }

    if (normalized.rowType === 'structure') {
      if (!normalized.courseCode) errors.push({ rowNumber, rowType: normalized.rowType, message: 'courseCode is required for structure rows.' });
      if (!normalized.courseName) errors.push({ rowNumber, rowType: normalized.rowType, message: 'courseName is required for structure rows.' });
      if (!normalized.units || normalized.units < 1 || normalized.units > 9) errors.push({ rowNumber, rowType: normalized.rowType, message: 'units must be 1-9 for structure rows.' });
      if (!normalized.yearLevel || normalized.yearLevel < 1 || normalized.yearLevel > 5) errors.push({ rowNumber, rowType: normalized.rowType, message: 'yearLevel is required for structure rows.' });
      if (!normalized.semester || ![1, 2, 3].includes(normalized.semester)) errors.push({ rowNumber, rowType: normalized.rowType, message: 'semester must be 1, 2, or 3 for structure rows.' });
    }

    if (normalized.rowType === 'prerequisite' || normalized.rowType === 'corequisite' || normalized.rowType === 'equivalency') {
      if (!normalized.courseCode) errors.push({ rowNumber, rowType: normalized.rowType, message: 'courseCode is required.' });
      if (!normalized.relatedCourseCode) errors.push({ rowNumber, rowType: normalized.rowType, message: 'relatedCourseCode is required.' });
      if (normalized.courseCode && normalized.relatedCourseCode && normalized.courseCode === normalized.relatedCourseCode) {
        errors.push({ rowNumber, rowType: normalized.rowType, message: 'courseCode and relatedCourseCode cannot be the same.' });
      }
    }

    if (normalized.rowType === 'elective_track' && !normalized.trackName) {
      errors.push({ rowNumber, rowType: normalized.rowType, message: 'trackName is required for elective_track rows.' });
    }

    if (normalized.rowType === 'elective_track_course') {
      if (!normalized.trackName) errors.push({ rowNumber, rowType: normalized.rowType, message: 'trackName is required for elective_track_course rows.' });
      if (!normalized.courseCode) errors.push({ rowNumber, rowType: normalized.rowType, message: 'courseCode is required for elective_track_course rows.' });
      if (normalized.yearLevel && (normalized.yearLevel < 1 || normalized.yearLevel > 5)) {
        errors.push({ rowNumber, rowType: normalized.rowType, message: 'yearLevel must be between 1 and 5.' });
      }
      if (normalized.semester && ![1, 2, 3].includes(normalized.semester)) {
        errors.push({ rowNumber, rowType: normalized.rowType, message: 'semester must be 1, 2, or 3 when provided.' });
      }
    }

    normalizedRows.push(normalized);
  }

  return { errors, normalizedRows };
};

const summarizeRows = (rows) => rows.reduce((acc, row) => {
  acc.totalRows += 1;
  acc.byType[row.rowType] = (acc.byType[row.rowType] || 0) + 1;
  return acc;
}, { totalRows: 0, byType: {} });

const resolveCourseByCodeMap = async ({ rows, transaction }) => {
  const courseCodes = [...new Set(
    rows
      .flatMap((row) => [row.courseCode, row.relatedCourseCode])
      .filter(Boolean)
      .map((value) => value.toUpperCase())
  )];

  const existingCourses = await Course.findAll({
    where: { code: { [Op.in]: courseCodes } },
    transaction
  });

  const map = new Map(existingCourses.map((course) => [course.code.toUpperCase(), course]));

  const createRows = rows.filter((row) =>
    row.rowType === 'structure' || row.rowType === 'elective_track_course'
  );
  for (const row of createRows) {
    if (!row.courseCode || map.has(row.courseCode)) {
      continue;
    }

    const created = await Course.create({
      code: row.courseCode,
      name: row.courseName,
      units: row.units
    }, { transaction });

    map.set(created.code.toUpperCase(), created);
  }

  return map;
};

// ─── Curriculum ───────────────────────────────────────────────────────────────

// @desc   Create a new curriculum
// @route  POST /api/curriculums
// @access admin
exports.createCurriculum = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Curriculum name is required' });
    }
    const curriculum = await Curriculum.create({
      name: name.trim(),
      description: description || null,
      isActive: false,
      createdById: req.user.id
    });
    return res.status(201).json({ success: true, data: curriculum });
  } catch (err) {
    next(err);
  }
};

// @desc   Get all curricula
// @route  GET /api/curriculums
// @access admin, adviser
exports.getCurriculums = async (req, res, next) => {
  try {
    const { page, pageSize, search, sortBy, sortOrder, offset, limit } = parsePaginationParams(req.query, {
      defaultSortBy: 'createdAt',
      allowedSortBy: ['createdAt', 'name', 'isActive']
    });
    const compact = String(req.query.compact || 'false').toLowerCase() === 'true';

    const where = search
      ? {
        [Op.or]: [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } }
        ]
      }
      : {};

    const { rows, count } = await Curriculum.findAndCountAll({
      where,
      attributes: compact ? ['id', 'name', 'description', 'isActive'] : undefined,
      include: compact ? [] : [{ model: User, as: 'CreatedBy', attributes: ['id', 'firstName', 'lastName'] }],
      order: [[sortBy, sortOrder], ['id', 'DESC']],
      offset,
      limit
    });

    const payload = buildPaginatedPayload({
      items: rows,
      page,
      pageSize,
      totalItems: count
    });

    res.set('Cache-Control', compact ? 'private, no-store' : 'private, max-age=30');
    return res.status(200).json({ success: true, ...payload });
  } catch (err) {
    next(err);
  }
};

// @desc   Get all curriculums with mapped course placements
// @route  GET /api/curriculums-map
// @access admin, adviser
exports.getCurriculumsMap = async (req, res, next) => {
  try {
    const curriculums = await Curriculum.findAll({
      attributes: ['id', 'name', 'description', 'isActive'],
      include: [
        {
          model: CurriculumCourse,
          attributes: ['id', 'courseId', 'yearLevel', 'semester', 'isElective'],
          include: [
            {
              model: Course,
              attributes: ['id', 'code', 'name', 'units']
            }
          ]
        }
      ],
      order: [
        ['name', 'ASC'],
        [CurriculumCourse, 'yearLevel', 'ASC'],
        [CurriculumCourse, 'semester', 'ASC'],
        [CurriculumCourse, Course, 'code', 'ASC']
      ]
    });

    const data = curriculums.map((curriculum) => ({
      id: curriculum.id,
      name: curriculum.name,
      description: curriculum.description,
      isActive: curriculum.isActive,
      courses: (curriculum.CurriculumCourses || []).map((entry) => ({
        curriculumCourseId: entry.id,
        courseId: entry.courseId,
        yearLevel: entry.yearLevel,
        semester: entry.semester,
        isElective: entry.isElective,
        code: entry.Course?.code || null,
        name: entry.Course?.name || null,
        units: entry.Course?.units || null
      }))
    }));

    res.set('Cache-Control', 'private, max-age=120');
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc   Get one curriculum with full course/track structure
// @route  GET /api/curriculums/:id
// @access admin, adviser
exports.getCurriculumById = async (req, res, next) => {
  try {
    const compact = String(req.query.compact || 'false').toLowerCase() === 'true';
    const curriculum = await Curriculum.findByPk(req.params.id, {
      attributes: compact ? ['id', 'name', 'description', 'isActive', 'createdAt', 'updatedAt'] : undefined,
      include: compact
        ? [{ model: User, as: 'CreatedBy', attributes: ['id', 'firstName', 'lastName'] }]
        : [
          { model: User, as: 'CreatedBy', attributes: ['id', 'firstName', 'lastName'] },
          {
            model: CurriculumCourse,
            include: [{ model: Course }]
          },
          {
            model: Prerequisite,
            include: [
              { model: Course, as: 'Course' },
              { model: Course, as: 'PrerequisiteCourse' }
            ]
          },
          {
            model: CoRequisite,
            include: [
              { model: Course, as: 'Course' },
              { model: Course, as: 'CoRequisiteCourse' }
            ]
          },
          {
            model: ElectiveTrack,
            include: [
              {
                model: ElectiveTrackCourse,
                include: [{ model: Course }]
              }
            ]
          }
        ]
    });
    if (!curriculum) {
      return res.status(404).json({ success: false, message: 'Curriculum not found' });
    }
    res.set('Cache-Control', compact ? 'private, max-age=120' : 'private, max-age=30');
    return res.status(200).json({ success: true, data: curriculum });
  } catch (err) {
    next(err);
  }
};

// @desc   Update curriculum name/description
// @route  PUT /api/curriculums/:id
// @access admin
exports.updateCurriculum = async (req, res, next) => {
  try {
    const curriculum = await Curriculum.findByPk(req.params.id);
    if (!curriculum) {
      return res.status(404).json({ success: false, message: 'Curriculum not found' });
    }
    const { name, description } = req.body;
    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ success: false, message: 'Curriculum name cannot be empty' });
    }
    await curriculum.update({
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description })
    });
    return res.status(200).json({ success: true, data: curriculum });
  } catch (err) {
    next(err);
  }
};

// @desc   Set a curriculum as the active one (deactivates all others)
// @route  PATCH /api/curriculums/:id/activate
// @access admin
exports.setActiveCurriculum = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const curriculum = await Curriculum.findByPk(req.params.id, { transaction });
    if (!curriculum) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Curriculum not found' });
    }
    // Both updates are wrapped in a transaction so a partial failure cannot
    // leave all curricula deactivated (Step 3.4)
    await Curriculum.update({ isActive: false }, { where: {}, transaction });
    await curriculum.update({ isActive: true }, { transaction });
    await transaction.commit();
    return res.status(200).json({ success: true, data: curriculum });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

// ─── Course ───────────────────────────────────────────────────────────────────

// @desc   Create a new course
// @route  POST /api/courses
// @access admin
exports.createCourse = async (req, res, next) => {
  try {
    const { code, name, units } = req.body;
    if (!code || !name || units === undefined) {
      return res.status(400).json({ success: false, message: 'code, name, and units are required' });
    }
    if (!Number.isInteger(Number(units)) || Number(units) < 1 || Number(units) > 9) {
      return res.status(400).json({ success: false, message: 'units must be an integer between 1 and 9' });
    }
    const existing = await Course.findOne({ where: { code: code.trim().toUpperCase() } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'A course with that code already exists' });
    }
    const course = await Course.create({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      units: Number(units)
    });
    return res.status(201).json({ success: true, data: course });
  } catch (err) {
    next(err);
  }
};

// @desc   Get all courses
// @route  GET /api/courses
// @access admin, adviser
exports.getCourses = async (req, res, next) => {
  try {
    const { page, pageSize, search, sortBy, sortOrder, offset, limit } = parsePaginationParams(req.query, {
      defaultSortBy: 'code',
      allowedSortBy: ['code', 'name', 'units', 'createdAt']
    });

    const where = search
      ? {
        [Op.or]: [
          { code: { [Op.iLike]: `%${search}%` } },
          { name: { [Op.iLike]: `%${search}%` } }
        ]
      }
      : {};

    const { rows, count } = await Course.findAndCountAll({
      where,
      include: [{
        model: CurriculumCourse,
        attributes: ['id', 'curriculumId'],
        required: false,
        include: [{
          model: Curriculum,
          attributes: ['id', 'name']
        }]
      }],
      distinct: true,
      order: [[sortBy, sortOrder], ['id', 'ASC']],
      offset,
      limit
    });

    const courseIds = rows.map((course) => course.id);
    const electiveTrackRows = courseIds.length > 0
      ? await ElectiveTrackCourse.findAll({
        attributes: ['courseId'],
        where: { courseId: { [Op.in]: courseIds } }
      })
      : [];
    const electiveCourseIds = new Set(electiveTrackRows.map((item) => Number(item.courseId)));

    const items = rows.map((course) => {
      const plainCourse = course.get({ plain: true });
      return {
        ...plainCourse,
        isElective: electiveCourseIds.has(Number(course.id))
      };
    });

    const payload = buildPaginatedPayload({
      items,
      page,
      pageSize,
      totalItems: count
    });

    return res.status(200).json({ success: true, ...payload });
  } catch (err) {
    next(err);
  }
};

// @desc   Update a course
// @route  PUT /api/courses/:id
// @access admin
exports.updateCourse = async (req, res, next) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    const { code, name, units } = req.body;
    if (units !== undefined) {
      if (!Number.isInteger(Number(units)) || Number(units) < 1 || Number(units) > 9) {
        return res.status(400).json({ success: false, message: 'units must be an integer between 1 and 9' });
      }
    }
    if (code !== undefined) {
      const existing = await Course.findOne({
        where: { code: code.trim().toUpperCase(), id: { [Op.ne]: course.id } }
      });
      if (existing) {
        return res.status(409).json({ success: false, message: 'A course with that code already exists' });
      }
    }
    await course.update({
      ...(code !== undefined && { code: code.trim().toUpperCase() }),
      ...(name !== undefined && { name: name.trim() }),
      ...(units !== undefined && { units: Number(units) })
    });
    return res.status(200).json({ success: true, data: course });
  } catch (err) {
    next(err);
  }
};

// @desc   Delete a course (blocked if referenced in any curriculum)
// @route  DELETE /api/courses/:id
// @access admin
exports.deleteCourse = async (req, res, next) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    const [ccCount, prereqCount, coreqCount, etcCount, spcCount] = await Promise.all([
      CurriculumCourse.count({ where: { courseId: course.id } }),
      Prerequisite.count({
        where: { [Op.or]: [{ courseId: course.id }, { prerequisiteCourseId: course.id }] }
      }),
      CoRequisite.count({
        where: { [Op.or]: [{ courseId: course.id }, { coRequisiteCourseId: course.id }] }
      }),
      ElectiveTrackCourse.count({ where: { courseId: course.id } }),
      StudyPlanCourse.count({ where: { courseId: course.id } })
    ]);
    if (ccCount + prereqCount + coreqCount + etcCount + spcCount > 0) {
      return res.status(409).json({
        success: false,
        message: 'Course is referenced in one or more curricula or study plans and cannot be deleted'
      });
    }
    await course.destroy();
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// ─── Curriculum–Course Assignment ─────────────────────────────────────────────

// @desc   Add a course to a curriculum at a specific year/semester position
// @route  POST /api/curriculums/:id/courses
// @access admin
exports.addCourseToCurriculum = async (req, res, next) => {
  try {
    const curriculum = await Curriculum.findByPk(req.params.id);
    if (!curriculum) {
      return res.status(404).json({ success: false, message: 'Curriculum not found' });
    }
    const { courseId, yearLevel, semester, isElective } = req.body;
    if (!courseId || !yearLevel || !semester) {
      return res.status(400).json({ success: false, message: 'courseId, yearLevel, and semester are required' });
    }
    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    const existing = await CurriculumCourse.findOne({
      where: { curriculumId: req.params.id, courseId }
    });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Course is already in this curriculum' });
    }
    const cc = await CurriculumCourse.create({
      curriculumId: req.params.id,
      courseId,
      yearLevel,
      semester,
      isElective: isElective || false
    });
    const result = await CurriculumCourse.findByPk(cc.id, { include: [{ model: Course }] });
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// @desc   Remove a course from a curriculum
// @route  DELETE /api/curriculums/:id/courses/:ccId
// @access admin
exports.removeCourseFromCurriculum = async (req, res, next) => {
  try {
    const cc = await CurriculumCourse.findByPk(req.params.ccId);
    if (!cc || String(cc.curriculumId) !== String(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Curriculum course entry not found' });
    }
    await cc.destroy();
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// @desc   Get all courses in a curriculum
// @route  GET /api/curriculums/:id/courses
// @access admin, adviser
exports.getCurriculumCourses = async (req, res, next) => {
  try {
    const curriculum = await Curriculum.findByPk(req.params.id);
    if (!curriculum) {
      return res.status(404).json({ success: false, message: 'Curriculum not found' });
    }
    const { page, pageSize, search, sortBy, sortOrder, offset, limit } = parsePaginationParams(req.query, {
      defaultSortBy: 'yearLevel',
      allowedSortBy: ['yearLevel', 'semester', 'id']
    });

    const where = {
      curriculumId: req.params.id,
      ...(search
        ? {
          [Op.or]: [
            { '$Course.code$': { [Op.iLike]: `%${search}%` } },
            { '$Course.name$': { [Op.iLike]: `%${search}%` } }
          ]
        }
        : {})
    };

    const { rows, count } = await CurriculumCourse.findAndCountAll({
      where,
      include: [{ model: Course }],
      order: [[sortBy, sortOrder], ['semester', 'ASC'], ['id', 'ASC']],
      offset,
      limit,
      distinct: true
    });

    const payload = buildPaginatedPayload({
      items: rows,
      page,
      pageSize,
      totalItems: count
    });

    return res.status(200).json({ success: true, ...payload });
  } catch (err) {
    next(err);
  }
};

// ─── Prerequisites ────────────────────────────────────────────────────────────

// @desc   Add a prerequisite relationship
// @route  POST /api/curriculums/:id/prerequisites
// @access admin
exports.addPrerequisite = async (req, res, next) => {
  try {
    const curriculum = await Curriculum.findByPk(req.params.id);
    if (!curriculum) {
      return res.status(404).json({ success: false, message: 'Curriculum not found' });
    }
    const { courseId, prerequisiteCourseId } = req.body;
    if (!courseId || !prerequisiteCourseId) {
      return res.status(400).json({ success: false, message: 'courseId and prerequisiteCourseId are required' });
    }
    if (String(courseId) === String(prerequisiteCourseId)) {
      return res.status(400).json({ success: false, message: 'A course cannot be its own prerequisite' });
    }
    const existing = await Prerequisite.findOne({
      where: { curriculumId: req.params.id, courseId, prerequisiteCourseId }
    });
    if (existing) {
      return res.status(409).json({ success: false, message: 'This prerequisite relationship already exists' });
    }
    const prereq = await Prerequisite.create({
      curriculumId: req.params.id,
      courseId,
      prerequisiteCourseId
    });
    const result = await Prerequisite.findByPk(prereq.id, {
      include: [
        { model: Course, as: 'Course' },
        { model: Course, as: 'PrerequisiteCourse' }
      ]
    });
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// @desc   Remove a prerequisite relationship
// @route  DELETE /api/curriculums/:id/prerequisites/:prereqId
// @access admin
exports.removePrerequisite = async (req, res, next) => {
  try {
    const prereq = await Prerequisite.findByPk(req.params.prereqId);
    if (!prereq || String(prereq.curriculumId) !== String(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Prerequisite not found' });
    }
    await prereq.destroy();
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// @desc   Get all prerequisites for a curriculum
// @route  GET /api/curriculums/:id/prerequisites
// @access admin, adviser
exports.getPrerequisites = async (req, res, next) => {
  try {
    const curriculum = await Curriculum.findByPk(req.params.id);
    if (!curriculum) {
      return res.status(404).json({ success: false, message: 'Curriculum not found' });
    }
    const { page, pageSize, search, sortBy, sortOrder, offset, limit } = parsePaginationParams(req.query, {
      defaultSortBy: 'id',
      allowedSortBy: ['id']
    });

    const where = {
      curriculumId: req.params.id,
      ...(search
        ? {
          [Op.or]: [
            { '$Course.code$': { [Op.iLike]: `%${search}%` } },
            { '$Course.name$': { [Op.iLike]: `%${search}%` } },
            { '$PrerequisiteCourse.code$': { [Op.iLike]: `%${search}%` } },
            { '$PrerequisiteCourse.name$': { [Op.iLike]: `%${search}%` } }
          ]
        }
        : {})
    };

    const { rows, count } = await Prerequisite.findAndCountAll({
      where,
      include: [
        { model: Course, as: 'Course' },
        { model: Course, as: 'PrerequisiteCourse' }
      ],
      order: [[sortBy, sortOrder], ['id', 'DESC']],
      offset,
      limit,
      distinct: true
    });

    const payload = buildPaginatedPayload({
      items: rows,
      page,
      pageSize,
      totalItems: count
    });

    return res.status(200).json({ success: true, ...payload });
  } catch (err) {
    next(err);
  }
};

// ─── Co-Requisites ────────────────────────────────────────────────────────────

// @desc   Add a co-requisite relationship
// @route  POST /api/curriculums/:id/corequisites
// @access admin
exports.addCoRequisite = async (req, res, next) => {
  try {
    const curriculum = await Curriculum.findByPk(req.params.id);
    if (!curriculum) {
      return res.status(404).json({ success: false, message: 'Curriculum not found' });
    }
    const { courseId, coRequisiteCourseId } = req.body;
    if (!courseId || !coRequisiteCourseId) {
      return res.status(400).json({ success: false, message: 'courseId and coRequisiteCourseId are required' });
    }
    if (String(courseId) === String(coRequisiteCourseId)) {
      return res.status(400).json({ success: false, message: 'A course cannot be its own co-requisite' });
    }
    const existing = await CoRequisite.findOne({
      where: { curriculumId: req.params.id, courseId, coRequisiteCourseId }
    });
    if (existing) {
      return res.status(409).json({ success: false, message: 'This co-requisite relationship already exists' });
    }
    const coreq = await CoRequisite.create({
      curriculumId: req.params.id,
      courseId,
      coRequisiteCourseId
    });
    const result = await CoRequisite.findByPk(coreq.id, {
      include: [
        { model: Course, as: 'Course' },
        { model: Course, as: 'CoRequisiteCourse' }
      ]
    });
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// @desc   Remove a co-requisite relationship
// @route  DELETE /api/curriculums/:id/corequisites/:coreqId
// @access admin
exports.removeCoRequisite = async (req, res, next) => {
  try {
    const coreq = await CoRequisite.findByPk(req.params.coreqId);
    if (!coreq || String(coreq.curriculumId) !== String(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Co-requisite not found' });
    }
    await coreq.destroy();
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// @desc   Get all co-requisites for a curriculum
// @route  GET /api/curriculums/:id/corequisites
// @access admin, adviser
exports.getCoRequisites = async (req, res, next) => {
  try {
    const curriculum = await Curriculum.findByPk(req.params.id);
    if (!curriculum) {
      return res.status(404).json({ success: false, message: 'Curriculum not found' });
    }
    const { page, pageSize, search, sortBy, sortOrder, offset, limit } = parsePaginationParams(req.query, {
      defaultSortBy: 'id',
      allowedSortBy: ['id']
    });

    const where = {
      curriculumId: req.params.id,
      ...(search
        ? {
          [Op.or]: [
            { '$Course.code$': { [Op.iLike]: `%${search}%` } },
            { '$Course.name$': { [Op.iLike]: `%${search}%` } },
            { '$CoRequisiteCourse.code$': { [Op.iLike]: `%${search}%` } },
            { '$CoRequisiteCourse.name$': { [Op.iLike]: `%${search}%` } }
          ]
        }
        : {})
    };

    const { rows, count } = await CoRequisite.findAndCountAll({
      where,
      include: [
        { model: Course, as: 'Course' },
        { model: Course, as: 'CoRequisiteCourse' }
      ],
      order: [[sortBy, sortOrder], ['id', 'DESC']],
      offset,
      limit,
      distinct: true
    });

    const payload = buildPaginatedPayload({
      items: rows,
      page,
      pageSize,
      totalItems: count
    });

    return res.status(200).json({ success: true, ...payload });
  } catch (err) {
    next(err);
  }
};

// ─── Equivalencies ────────────────────────────────────────────────────────────

// @desc   Add a course equivalency
// @route  POST /api/equivalencies
// @access admin
exports.addEquivalency = async (req, res, next) => {
  try {
    const { courseId, equivalentCourseId, notes } = req.body;
    if (!courseId || !equivalentCourseId) {
      return res.status(400).json({ success: false, message: 'courseId and equivalentCourseId are required' });
    }
    if (String(courseId) === String(equivalentCourseId)) {
      return res.status(400).json({ success: false, message: 'A course cannot be equivalent to itself' });
    }
    const existing = await CourseEquivalency.findOne({ where: { courseId, equivalentCourseId } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'This equivalency already exists' });
    }
    const equiv = await CourseEquivalency.create({ courseId, equivalentCourseId, notes: notes || null });
    const result = await CourseEquivalency.findByPk(equiv.id, {
      include: [
        { model: Course, as: 'Course' },
        { model: Course, as: 'EquivalentCourse' }
      ]
    });
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// @desc   Remove a course equivalency
// @route  DELETE /api/equivalencies/:id
// @access admin
exports.removeEquivalency = async (req, res, next) => {
  try {
    const equiv = await CourseEquivalency.findByPk(req.params.id);
    if (!equiv) {
      return res.status(404).json({ success: false, message: 'Equivalency not found' });
    }
    await equiv.destroy();
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// @desc   Get all course equivalencies
// @route  GET /api/equivalencies
// @access admin, adviser
exports.getEquivalencies = async (req, res, next) => {
  try {
    const { page, pageSize, search, sortBy, sortOrder, offset, limit } = parsePaginationParams(req.query, {
      defaultSortBy: 'id',
      allowedSortBy: ['id']
    });

    const where = search
      ? {
        [Op.or]: [
          { '$Course.code$': { [Op.iLike]: `%${search}%` } },
          { '$Course.name$': { [Op.iLike]: `%${search}%` } },
          { '$EquivalentCourse.code$': { [Op.iLike]: `%${search}%` } },
          { '$EquivalentCourse.name$': { [Op.iLike]: `%${search}%` } },
          { notes: { [Op.iLike]: `%${search}%` } }
        ]
      }
      : {};

    const { rows, count } = await CourseEquivalency.findAndCountAll({
      where,
      include: [
        { model: Course, as: 'Course' },
        { model: Course, as: 'EquivalentCourse' }
      ],
      order: [[sortBy, sortOrder], ['id', 'DESC']],
      offset,
      limit,
      distinct: true
    });

    const payload = buildPaginatedPayload({
      items: rows,
      page,
      pageSize,
      totalItems: count
    });

    return res.status(200).json({ success: true, ...payload });
  } catch (err) {
    next(err);
  }
};

// ─── Elective Tracks ──────────────────────────────────────────────────────────

// @desc   Create an elective track for a curriculum
// @route  POST /api/curriculums/:id/elective-tracks
// @access admin
exports.createElectiveTrack = async (req, res, next) => {
  try {
    const curriculum = await Curriculum.findByPk(req.params.id);
    if (!curriculum) {
      return res.status(404).json({ success: false, message: 'Curriculum not found' });
    }
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Track name is required' });
    }
    const track = await ElectiveTrack.create({
      curriculumId: req.params.id,
      name: name.trim(),
      description: description || null
    });
    return res.status(201).json({ success: true, data: track });
  } catch (err) {
    next(err);
  }
};

// @desc   Get all elective tracks for a curriculum
// @route  GET /api/curriculums/:id/elective-tracks
// @access admin, adviser
exports.getElectiveTracks = async (req, res, next) => {
  try {
    const curriculum = await Curriculum.findByPk(req.params.id);
    if (!curriculum) {
      return res.status(404).json({ success: false, message: 'Curriculum not found' });
    }
    const { page, pageSize, search, sortBy, sortOrder, offset, limit } = parsePaginationParams(req.query, {
      defaultSortBy: 'name',
      allowedSortBy: ['name', 'id']
    });

    const where = {
      curriculumId: req.params.id,
      ...(search
        ? {
          [Op.or]: [
            { name: { [Op.iLike]: `%${search}%` } },
            { description: { [Op.iLike]: `%${search}%` } }
          ]
        }
        : {})
    };

    const { rows, count } = await ElectiveTrack.findAndCountAll({
      where,
      include: [
        {
          model: ElectiveTrackCourse,
          include: [{ model: Course }]
        }
      ],
      order: [[sortBy, sortOrder], ['id', 'DESC']],
      offset,
      limit,
      distinct: true
    });

    const payload = buildPaginatedPayload({
      items: rows,
      page,
      pageSize,
      totalItems: count
    });

    return res.status(200).json({ success: true, ...payload });
  } catch (err) {
    next(err);
  }
};

// @desc   Update an elective track
// @route  PUT /api/elective-tracks/:id
// @access admin
exports.updateElectiveTrack = async (req, res, next) => {
  try {
    const track = await ElectiveTrack.findByPk(req.params.id);
    if (!track) {
      return res.status(404).json({ success: false, message: 'Elective track not found' });
    }
    const { name, description } = req.body;
    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ success: false, message: 'Track name cannot be empty' });
    }
    await track.update({
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description })
    });
    return res.status(200).json({ success: true, data: track });
  } catch (err) {
    next(err);
  }
};

// @desc   Delete an elective track
// @route  DELETE /api/elective-tracks/:id
// @access admin
exports.deleteElectiveTrack = async (req, res, next) => {
  try {
    const track = await ElectiveTrack.findByPk(req.params.id);
    if (!track) {
      return res.status(404).json({ success: false, message: 'Elective track not found' });
    }
    await track.destroy();
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// @desc   Add a course to an elective track
// @route  POST /api/elective-tracks/:id/courses
// @access admin
exports.addCourseToTrack = async (req, res, next) => {
  try {
    const track = await ElectiveTrack.findByPk(req.params.id);
    if (!track) {
      return res.status(404).json({ success: false, message: 'Elective track not found' });
    }
    const { courseId, yearLevel, semester } = req.body;
    if (!courseId) {
      return res.status(400).json({ success: false, message: 'courseId is required' });
    }
    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    const existing = await ElectiveTrackCourse.findOne({
      where: { electiveTrackId: req.params.id, courseId }
    });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Course is already in this elective track' });
    }
    const etc = await ElectiveTrackCourse.create({
      electiveTrackId: req.params.id,
      courseId,
      yearLevel: yearLevel || null,
      semester: semester || null
    });
    const result = await ElectiveTrackCourse.findByPk(etc.id, { include: [{ model: Course }] });
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// @desc   Update slot metadata for a course in an elective track
// @route  PUT /api/elective-tracks/:id/courses/:etcId
// @access admin
exports.updateTrackCourse = async (req, res, next) => {
  try {
    const etc = await ElectiveTrackCourse.findByPk(req.params.etcId);
    if (!etc || String(etc.electiveTrackId) !== String(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Elective track course entry not found' });
    }

    const rawYearLevel = req.body?.yearLevel;
    const rawSemester = req.body?.semester;
    const yearLevel = rawYearLevel === '' || rawYearLevel === null || rawYearLevel === undefined
      ? null
      : Number(rawYearLevel);
    const semester = rawSemester === '' || rawSemester === null || rawSemester === undefined
      ? null
      : Number(rawSemester);

    if ((yearLevel === null) !== (semester === null)) {
      return res.status(400).json({ success: false, message: 'yearLevel and semester must both be provided, or both be empty' });
    }

    if (yearLevel !== null && (!Number.isInteger(yearLevel) || yearLevel < 1)) {
      return res.status(400).json({ success: false, message: 'yearLevel must be a positive integer' });
    }

    if (semester !== null && ![1, 2, 3].includes(semester)) {
      return res.status(400).json({ success: false, message: 'semester must be 1, 2, or 3' });
    }

    await etc.update({
      yearLevel,
      semester
    });

    const result = await ElectiveTrackCourse.findByPk(etc.id, { include: [{ model: Course }] });
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// @desc   Remove a course from an elective track
// @route  DELETE /api/elective-tracks/:id/courses/:etcId
// @access admin
exports.removeCourseFromTrack = async (req, res, next) => {
  try {
    const etc = await ElectiveTrackCourse.findByPk(req.params.etcId);
    if (!etc || String(etc.electiveTrackId) !== String(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Elective track course entry not found' });
    }
    await etc.destroy();
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// ─── Curriculum CSV Import/Export ────────────────────────────────────────────

// @desc   Export curriculum structure and mappings to CSV
// @route  GET /api/curriculums/:id/export/csv
// @access admin
exports.exportCurriculumCsv = async (req, res, next) => {
  try {
    const curriculumId = Number(req.params.id);
    const curriculum = await Curriculum.findByPk(curriculumId);
    if (!curriculum) {
      return res.status(404).json({ success: false, message: 'Curriculum not found' });
    }

    const [structureRows, prereqRows, coreqRows, trackRows, equivalencies] = await Promise.all([
      CurriculumCourse.findAll({
        where: { curriculumId },
        include: [{ model: Course }],
        order: [['yearLevel', 'ASC'], ['semester', 'ASC'], ['id', 'ASC']]
      }),
      Prerequisite.findAll({
        where: { curriculumId },
        include: [{ model: Course, as: 'Course' }, { model: Course, as: 'PrerequisiteCourse' }],
        order: [['id', 'ASC']]
      }),
      CoRequisite.findAll({
        where: { curriculumId },
        include: [{ model: Course, as: 'Course' }, { model: Course, as: 'CoRequisiteCourse' }],
        order: [['id', 'ASC']]
      }),
      ElectiveTrack.findAll({
        where: { curriculumId },
        include: [{
          model: ElectiveTrackCourse,
          include: [{ model: Course }],
          required: false
        }],
        order: [['name', 'ASC']]
      }),
      CourseEquivalency.findAll({
        include: [{ model: Course, as: 'Course' }, { model: Course, as: 'EquivalentCourse' }],
        order: [['id', 'ASC']]
      })
    ]);

    const curriculumCourseCodes = new Set(structureRows.map((row) => row.Course?.code).filter(Boolean));
    const relevantEquivalencies = equivalencies.filter((row) => {
      const left = row.Course?.code;
      const right = row.EquivalentCourse?.code;
      return curriculumCourseCodes.has(left) || curriculumCourseCodes.has(right);
    });

    const rows = [
      {
        exportVersion: '1',
        rowType: 'metadata',
        curriculumId,
        curriculumName: curriculum.name,
        courseCode: '',
        courseName: '',
        units: '',
        yearLevel: '',
        semester: '',
        isElective: '',
        relatedCourseCode: '',
        trackName: '',
        notes: `generatedAt=${Date.now()}`
      },
      ...structureRows.map((row) => ({
        exportVersion: '1',
        rowType: 'structure',
        curriculumId,
        curriculumName: curriculum.name,
        courseCode: row.Course?.code || '',
        courseName: row.Course?.name || '',
        units: row.Course?.units ?? '',
        yearLevel: row.yearLevel ?? '',
        semester: row.semester ?? '',
        isElective: row.isElective ? 'true' : 'false',
        relatedCourseCode: '',
        trackName: '',
        notes: ''
      })),
      ...prereqRows.map((row) => ({
        exportVersion: '1',
        rowType: 'prerequisite',
        curriculumId,
        curriculumName: curriculum.name,
        courseCode: row.Course?.code || '',
        courseName: row.Course?.name || '',
        units: row.Course?.units ?? '',
        yearLevel: '',
        semester: '',
        isElective: '',
        relatedCourseCode: row.PrerequisiteCourse?.code || '',
        trackName: '',
        notes: ''
      })),
      ...coreqRows.map((row) => ({
        exportVersion: '1',
        rowType: 'corequisite',
        curriculumId,
        curriculumName: curriculum.name,
        courseCode: row.Course?.code || '',
        courseName: row.Course?.name || '',
        units: row.Course?.units ?? '',
        yearLevel: '',
        semester: '',
        isElective: '',
        relatedCourseCode: row.CoRequisiteCourse?.code || '',
        trackName: '',
        notes: ''
      })),
      ...trackRows.flatMap((track) => {
        const trackHeaderRow = {
          exportVersion: '1',
          rowType: 'elective_track',
          curriculumId,
          curriculumName: curriculum.name,
          courseCode: '',
          courseName: '',
          units: '',
          yearLevel: '',
          semester: '',
          isElective: '',
          relatedCourseCode: '',
          trackName: track.name,
          notes: track.description || ''
        };

        const trackCourseRows = (track.ElectiveTrackCourses || []).map((entry) => ({
          exportVersion: '1',
          rowType: 'elective_track_course',
          curriculumId,
          curriculumName: curriculum.name,
          courseCode: entry.Course?.code || '',
          courseName: entry.Course?.name || '',
          units: entry.Course?.units ?? '',
          yearLevel: entry.yearLevel ?? '',
          semester: entry.semester ?? '',
          isElective: '',
          relatedCourseCode: '',
          trackName: track.name,
          notes: ''
        }));

        return [trackHeaderRow, ...trackCourseRows];
      }),
      ...relevantEquivalencies.map((row) => ({
        exportVersion: '1',
        rowType: 'equivalency',
        curriculumId,
        curriculumName: curriculum.name,
        courseCode: row.Course?.code || '',
        courseName: row.Course?.name || '',
        units: row.Course?.units ?? '',
        yearLevel: '',
        semester: '',
        isElective: '',
        relatedCourseCode: row.EquivalentCourse?.code || '',
        trackName: '',
        notes: row.notes || ''
      }))
    ];

    const csv = serializeCsv(rows);
    const timestamp = new Date().toISOString().slice(0, 10);
    const safeName = String(curriculum.name || 'curriculum').replace(/[^a-zA-Z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const fileName = `${safeName || 'curriculum'}-${curriculumId}-${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.status(200).send(csv);
  } catch (err) {
    next(err);
  }
};

const parseImportRowsFromRequest = (req, curriculumId) => {
  if (!req.file || !req.file.buffer) {
    return {
      errors: [{ rowNumber: 0, message: 'CSV file is required. Upload with form-data field name "file".' }],
      normalizedRows: []
    };
  }

  const text = req.file.buffer.toString('utf8');
  const csvRows = parseCsvText(text);
  return validateAndNormalizeCsvRows({ csvRows, expectedCurriculumId: curriculumId });
};

// @desc   Preview curriculum CSV import (dry run)
// @route  POST /api/curriculums/:id/import/csv/preview
// @access admin
exports.previewCurriculumImportCsv = async (req, res, next) => {
  try {
    const curriculumId = Number(req.params.id);
    const curriculum = await Curriculum.findByPk(curriculumId);
    if (!curriculum) {
      return res.status(404).json({ success: false, message: 'Curriculum not found' });
    }

    const { errors, normalizedRows } = parseImportRowsFromRequest(req, curriculumId);
    const summary = summarizeRows(normalizedRows);

    return res.status(200).json({
      success: true,
      data: {
        dryRun: true,
        curriculumId,
        curriculumName: curriculum.name,
        summary,
        hasErrors: errors.length > 0,
        rowErrors: errors
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc   Apply curriculum CSV import
// @route  POST /api/curriculums/:id/import/csv/apply
// @access admin
exports.applyCurriculumImportCsv = async (req, res, next) => {
  const tx = await sequelize.transaction();

  try {
    const curriculumId = Number(req.params.id);
    const curriculum = await Curriculum.findByPk(curriculumId, { transaction: tx });
    if (!curriculum) {
      await tx.rollback();
      return res.status(404).json({ success: false, message: 'Curriculum not found' });
    }

    const { errors, normalizedRows } = parseImportRowsFromRequest(req, curriculumId);
    if (errors.length > 0) {
      await tx.rollback();
      return res.status(400).json({
        success: false,
        message: 'CSV validation failed. Fix row-level errors and retry.',
        data: {
          dryRun: false,
          hasErrors: true,
          rowErrors: errors,
          summary: summarizeRows(normalizedRows)
        }
      });
    }

    const courseByCode = await resolveCourseByCodeMap({ rows: normalizedRows, transaction: tx });

    const unresolvedCourseErrors = [];
    normalizedRows.forEach((row) => {
      if (row.courseCode && !courseByCode.has(row.courseCode)) {
        unresolvedCourseErrors.push({ rowNumber: row.rowNumber, rowType: row.rowType, message: `Unknown courseCode: ${row.courseCode}` });
      }
      if (row.relatedCourseCode && !courseByCode.has(row.relatedCourseCode)) {
        unresolvedCourseErrors.push({ rowNumber: row.rowNumber, rowType: row.rowType, message: `Unknown relatedCourseCode: ${row.relatedCourseCode}` });
      }
    });

    if (unresolvedCourseErrors.length > 0) {
      await tx.rollback();
      return res.status(400).json({
        success: false,
        message: 'CSV references unknown course codes.',
        data: {
          dryRun: false,
          hasErrors: true,
          rowErrors: unresolvedCourseErrors,
          summary: summarizeRows(normalizedRows)
        }
      });
    }

    const structureRows = normalizedRows.filter((row) => row.rowType === 'structure');
    const prereqRows = normalizedRows.filter((row) => row.rowType === 'prerequisite');
    const coreqRows = normalizedRows.filter((row) => row.rowType === 'corequisite');
    const equivRows = normalizedRows.filter((row) => row.rowType === 'equivalency');
    const trackHeaderRows = normalizedRows.filter((row) => row.rowType === 'elective_track');
    const trackCourseRows = normalizedRows.filter((row) => row.rowType === 'elective_track_course');

    await CurriculumCourse.destroy({ where: { curriculumId }, transaction: tx });
    if (structureRows.length > 0) {
      const structurePayload = structureRows.map((row) => ({
        curriculumId,
        courseId: courseByCode.get(row.courseCode).id,
        yearLevel: row.yearLevel,
        semester: row.semester,
        isElective: row.isElective
      }));
      await CurriculumCourse.bulkCreate(structurePayload, { transaction: tx });
    }

    await Prerequisite.destroy({ where: { curriculumId }, transaction: tx });
    if (prereqRows.length > 0) {
      await Prerequisite.bulkCreate(prereqRows.map((row) => ({
        curriculumId,
        courseId: courseByCode.get(row.courseCode).id,
        prerequisiteCourseId: courseByCode.get(row.relatedCourseCode).id
      })), { transaction: tx });
    }

    await CoRequisite.destroy({ where: { curriculumId }, transaction: tx });
    if (coreqRows.length > 0) {
      await CoRequisite.bulkCreate(coreqRows.map((row) => ({
        curriculumId,
        courseId: courseByCode.get(row.courseCode).id,
        coRequisiteCourseId: courseByCode.get(row.relatedCourseCode).id
      })), { transaction: tx });
    }

    const existingTracks = await ElectiveTrack.findAll({ where: { curriculumId }, transaction: tx });
    const existingTrackIds = existingTracks.map((track) => track.id);
    if (existingTrackIds.length > 0) {
      await ElectiveTrackCourse.destroy({ where: { electiveTrackId: { [Op.in]: existingTrackIds } }, transaction: tx });
    }
    await ElectiveTrack.destroy({ where: { curriculumId }, transaction: tx });

    const trackByName = new Map();
    const trackNames = new Set([
      ...trackHeaderRows.map((row) => row.trackName),
      ...trackCourseRows.map((row) => row.trackName)
    ].filter(Boolean));

    for (const name of trackNames) {
      const fromHeader = trackHeaderRows.find((row) => row.trackName === name);
      const createdTrack = await ElectiveTrack.create({
        curriculumId,
        name,
        description: fromHeader?.notes || null
      }, { transaction: tx });
      trackByName.set(name, createdTrack);
    }

    if (trackCourseRows.length > 0) {
      const missingTrackRows = trackCourseRows.filter((row) => !trackByName.has(row.trackName));
      if (missingTrackRows.length > 0) {
        await tx.rollback();
        return res.status(400).json({
          success: false,
          message: 'CSV track-course rows reference unknown track names.',
          data: {
            dryRun: false,
            hasErrors: true,
            rowErrors: missingTrackRows.map((row) => ({
              rowNumber: row.rowNumber,
              rowType: row.rowType,
              message: `Unknown trackName: ${row.trackName}`
            }))
          }
        });
      }

      await ElectiveTrackCourse.bulkCreate(trackCourseRows.map((row) => ({
        electiveTrackId: trackByName.get(row.trackName).id,
        courseId: courseByCode.get(row.courseCode).id,
        yearLevel: row.yearLevel,
        semester: row.semester
      })), { transaction: tx });
    }

    for (const row of equivRows) {
      const courseId = courseByCode.get(row.courseCode).id;
      const equivalentCourseId = courseByCode.get(row.relatedCourseCode).id;
      const [record] = await CourseEquivalency.findOrCreate({
        where: { courseId, equivalentCourseId },
        defaults: { notes: row.notes || null },
        transaction: tx
      });

      if (row.notes && record.notes !== row.notes) {
        await record.update({ notes: row.notes }, { transaction: tx });
      }
    }

    await tx.commit();

    console.log('[curriculumImport]', {
      action: 'apply',
      curriculumId,
      curriculumName: curriculum.name,
      importedBy: req.user?.id,
      summary: summarizeRows(normalizedRows)
    });

    return res.status(200).json({
      success: true,
      data: {
        curriculumId,
        curriculumName: curriculum.name,
        summary: summarizeRows(normalizedRows),
        hasErrors: false,
        rowErrors: []
      },
      message: 'Curriculum CSV import applied successfully.'
    });
  } catch (err) {
    await tx.rollback();
    next(err);
  }
};
