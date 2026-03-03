const Curriculum = require('../models/Curriculum');
const Subject = require('../models/Subject');
const Prerequisite = require('../models/Prerequisite');
const EquivalencyRule = require('../models/EquivalencyRule');

// ──────────────── Curriculum CRUD ────────────────

exports.createCurriculum = async (req, res, next) => {
  try {
    const { version_year, active_status } = req.body;

    if (!version_year) {
      return res.status(400).json({ success: false, message: 'version_year is required' });
    }

    const curriculum = await Curriculum.create({
      version_year,
      active_status: active_status !== undefined ? active_status : true
    });

    res.status(201).json({ success: true, data: curriculum });
  } catch (error) {
    next(error);
  }
};

exports.getCurriculums = async (req, res, next) => {
  try {
    const curriculums = await Curriculum.findAll({
      include: [{ model: Subject }],
      order: [['id', 'DESC']]
    });

    res.json({ success: true, data: curriculums });
  } catch (error) {
    next(error);
  }
};

exports.updateCurriculum = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { version_year, active_status } = req.body;

    const curriculum = await Curriculum.findByPk(id);
    if (!curriculum) {
      return res.status(404).json({ success: false, message: 'Curriculum not found' });
    }

    await Curriculum.update(
      { version_year, active_status },
      { where: { id } }
    );

    const updated = await Curriculum.findByPk(id);
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

exports.deleteCurriculum = async (req, res, next) => {
  try {
    const { id } = req.params;

    const curriculum = await Curriculum.findByPk(id);
    if (!curriculum) {
      return res.status(404).json({ success: false, message: 'Curriculum not found' });
    }

    await Curriculum.destroy({ where: { id } });
    res.json({ success: true, message: 'Curriculum deleted' });
  } catch (error) {
    next(error);
  }
};

// ──────────────── Subject CRUD ────────────────

exports.createSubject = async (req, res, next) => {
  try {
    const { curriculumId, course_code, title, units, seasonal_term } = req.body;

    if (!curriculumId || !course_code || !title) {
      return res.status(400).json({
        success: false,
        message: 'curriculumId, course_code, and title are required'
      });
    }

    // Verify curriculum exists
    const curriculum = await Curriculum.findByPk(curriculumId);
    if (!curriculum) {
      return res.status(404).json({ success: false, message: 'Curriculum not found' });
    }

    const subject = await Subject.create({
      CurriculumId: curriculumId,
      course_code,
      title,
      units: units || 3,
      seasonal_term: seasonal_term || null
    });

    res.status(201).json({ success: true, data: subject });
  } catch (error) {
    next(error);
  }
};

exports.getSubjectsByCurriculum = async (req, res, next) => {
  try {
    const { curriculumId } = req.params;

    const subjects = await Subject.findAll({
      where: { CurriculumId: curriculumId },
      order: [['course_code', 'ASC']]
    });

    res.json({ success: true, data: subjects });
  } catch (error) {
    next(error);
  }
};

exports.updateSubject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { course_code, title, units, seasonal_term, curriculumId } = req.body;

    const subject = await Subject.findByPk(id);
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    const updateData = { course_code, title, units, seasonal_term };
    if (curriculumId !== undefined) {
      updateData.CurriculumId = curriculumId;
    }

    await Subject.update(updateData, { where: { id } });

    const updated = await Subject.findByPk(id);
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

exports.deleteSubject = async (req, res, next) => {
  try {
    const { id } = req.params;

    const subject = await Subject.findByPk(id);
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    await Subject.destroy({ where: { id } });
    res.json({ success: true, message: 'Subject deleted' });
  } catch (error) {
    next(error);
  }
};

// ──────────────── Prerequisites ────────────────

exports.addPrerequisite = async (req, res, next) => {
  try {
    const { subject_id, required_subj_id } = req.body;

    if (!subject_id || !required_subj_id) {
      return res.status(400).json({
        success: false,
        message: 'subject_id and required_subj_id are required'
      });
    }

    if (subject_id === required_subj_id) {
      return res.status(400).json({
        success: false,
        message: 'A subject cannot be its own prerequisite'
      });
    }

    // Verify both subjects exist
    const subject = await Subject.findByPk(subject_id);
    const requiredSubject = await Subject.findByPk(required_subj_id);

    if (!subject || !requiredSubject) {
      return res.status(404).json({ success: false, message: 'One or both subjects not found' });
    }

    // Check for duplicate
    const existing = await Prerequisite.findOne({
      where: { subject_id, required_subj_id }
    });

    if (existing) {
      return res.status(409).json({ success: false, message: 'Prerequisite already exists' });
    }

    const prerequisite = await Prerequisite.create({ subject_id, required_subj_id });
    res.status(201).json({ success: true, data: prerequisite });
  } catch (error) {
    next(error);
  }
};

// ──────────────── Equivalency Rules ────────────────

exports.setEquivalency = async (req, res, next) => {
  try {
    const { source_subject_id, target_subject_id } = req.body;

    if (!source_subject_id || !target_subject_id) {
      return res.status(400).json({
        success: false,
        message: 'source_subject_id and target_subject_id are required'
      });
    }

    if (source_subject_id === target_subject_id) {
      return res.status(400).json({
        success: false,
        message: 'A subject cannot be equivalent to itself'
      });
    }

    // Verify both subjects exist
    const source = await Subject.findByPk(source_subject_id);
    const target = await Subject.findByPk(target_subject_id);

    if (!source || !target) {
      return res.status(404).json({ success: false, message: 'One or both subjects not found' });
    }

    // Check for duplicate
    const existing = await EquivalencyRule.findOne({
      where: { source_subject_id, target_subject_id }
    });

    if (existing) {
      return res.status(409).json({ success: false, message: 'Equivalency rule already exists' });
    }

    const rule = await EquivalencyRule.create({ source_subject_id, target_subject_id });
    res.status(201).json({ success: true, data: rule });
  } catch (error) {
    next(error);
  }
};
