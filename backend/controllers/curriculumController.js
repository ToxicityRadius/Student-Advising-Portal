const { Op } = require('sequelize');
const {
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
    const curricula = await Curriculum.findAll({
      include: [{ model: User, as: 'CreatedBy', attributes: ['id', 'firstName', 'lastName'] }],
      order: [['createdAt', 'DESC']]
    });
    return res.status(200).json({ success: true, data: curricula });
  } catch (err) {
    next(err);
  }
};

// @desc   Get one curriculum with full course/track structure
// @route  GET /api/curriculums/:id
// @access admin, adviser
exports.getCurriculumById = async (req, res, next) => {
  try {
    const curriculum = await Curriculum.findByPk(req.params.id, {
      include: [
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
  try {
    const curriculum = await Curriculum.findByPk(req.params.id);
    if (!curriculum) {
      return res.status(404).json({ success: false, message: 'Curriculum not found' });
    }
    await Curriculum.update({ isActive: false }, { where: {} });
    await curriculum.update({ isActive: true });
    return res.status(200).json({ success: true, data: curriculum });
  } catch (err) {
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
    const courses = await Course.findAll({ order: [['code', 'ASC']] });
    return res.status(200).json({ success: true, data: courses });
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
    const courses = await CurriculumCourse.findAll({
      where: { curriculumId: req.params.id },
      include: [{ model: Course }],
      order: [['yearLevel', 'ASC'], ['semester', 'ASC']]
    });
    return res.status(200).json({ success: true, data: courses });
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
    const prereqs = await Prerequisite.findAll({
      where: { curriculumId: req.params.id },
      include: [
        { model: Course, as: 'Course' },
        { model: Course, as: 'PrerequisiteCourse' }
      ]
    });
    return res.status(200).json({ success: true, data: prereqs });
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
    const coreqs = await CoRequisite.findAll({
      where: { curriculumId: req.params.id },
      include: [
        { model: Course, as: 'Course' },
        { model: Course, as: 'CoRequisiteCourse' }
      ]
    });
    return res.status(200).json({ success: true, data: coreqs });
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
    const equivs = await CourseEquivalency.findAll({
      include: [
        { model: Course, as: 'Course' },
        { model: Course, as: 'EquivalentCourse' }
      ]
    });
    return res.status(200).json({ success: true, data: equivs });
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
    const tracks = await ElectiveTrack.findAll({
      where: { curriculumId: req.params.id },
      include: [
        {
          model: ElectiveTrackCourse,
          include: [{ model: Course }]
        }
      ]
    });
    return res.status(200).json({ success: true, data: tracks });
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
