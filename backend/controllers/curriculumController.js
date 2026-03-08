const { Curriculum, Subject, Prerequisite, EquivalencyRule } = require('../models');

// ──────────────── Helpers ────────────────

/**
 * Detect whether adding an edge (from → to) in a directed graph would create
 * a cycle.  Works for both prerequisite and equivalency graphs.
 *
 * @param {Function} getNeighbours  async (nodeId) => [neighbourId, …]
 * @param {number}   from           The node the new edge departs from
 * @param {number}   to             The node the new edge arrives at
 * @returns {Promise<boolean>}      true if a cycle would be created
 */
async function wouldCreateCycle(getNeighbours, from, to) {
  // If adding edge from→to, a cycle exists when we can already reach "from"
  // starting from "to" (i.e. there is a path to → … → from).
  const visited = new Set();
  const stack = [to];

  while (stack.length) {
    const current = stack.pop();
    if (current === from) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const neighbours = await getNeighbours(current);
    stack.push(...neighbours);
  }
  return false;
}

// ──────────────── Curriculum CRUD ────────────────

// ──────────────── Get All Subjects (across all curricula) ────────────────

exports.getAllSubjects = async (req, res, next) => {
  try {
    const subjects = await Subject.findAll({
      include: [
        { model: Prerequisite, as: 'prerequisites' }
      ],
      order: [['year_level', 'ASC'], ['course_code', 'ASC']]
    });
    res.json({ success: true, data: subjects });
  } catch (error) {
    next(error);
  }
};

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
      include: [{
        model: Subject,
        include: [
          {
            model: Prerequisite,
            as: 'prerequisites',
            include: [{ model: Subject, as: 'RequiredSubject' }]
          },
          {
            model: EquivalencyRule,
            as: 'equivalencies',
            include: [{ model: Subject, as: 'TargetSubject' }]
          }
        ]
      }],
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
    const { curriculumId, course_code, title, units, seasonal_term, year_level } = req.body;

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
      seasonal_term: seasonal_term || null,
      year_level: year_level || 1
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
    const { course_code, title, units, seasonal_term, curriculumId, year_level } = req.body;

    const subject = await Subject.findByPk(id);
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    const updateData = { course_code, title, units, seasonal_term };
    if (curriculumId !== undefined) {
      updateData.CurriculumId = curriculumId;
    }
    if (year_level !== undefined) {
      updateData.year_level = year_level;
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

    // Direct reverse-loop check: does the required subject already require this subject?
    const reversePrereq = await Prerequisite.findOne({
      where: { subject_id: required_subj_id, required_subj_id: subject_id }
    });

    if (reversePrereq) {
      return res.status(400).json({
        success: false,
        message: 'Circular dependency detected: The required subject already requires this subject.'
      });
    }

    // Deep circular dependency check (transitive loops)
    const cycle = await wouldCreateCycle(
      async (nodeId) => {
        const rows = await Prerequisite.findAll({ where: { subject_id: nodeId } });
        return rows.map(r => r.required_subj_id);
      },
      required_subj_id,
      subject_id
    );

    if (cycle) {
      return res.status(400).json({
        success: false,
        message: 'Circular dependency detected: The required subject already requires this subject.'
      });
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

    // Direct reverse-loop check: is target already mapped to source?
    const reverseEquiv = await EquivalencyRule.findOne({
      where: { source_subject_id: target_subject_id, target_subject_id: source_subject_id }
    });

    if (reverseEquiv) {
      return res.status(400).json({
        success: false,
        message: 'Circular dependency detected: These subjects are already mapped in reverse.'
      });
    }

    // Deep circular dependency check (transitive loops)
    const cycle = await wouldCreateCycle(
      async (nodeId) => {
        const rows = await EquivalencyRule.findAll({ where: { source_subject_id: nodeId } });
        return rows.map(r => r.target_subject_id);
      },
      target_subject_id,
      source_subject_id
    );

    if (cycle) {
      return res.status(400).json({
        success: false,
        message: 'Circular dependency detected: These subjects are already mapped in reverse.'
      });
    }

    const rule = await EquivalencyRule.create({ source_subject_id, target_subject_id });
    res.status(201).json({ success: true, data: rule });
  } catch (error) {
    next(error);
  }
};

// ──────────────── Delete Prerequisite ────────────────

exports.deletePrerequisite = async (req, res, next) => {
  try {
    const { id } = req.params;

    const prereq = await Prerequisite.findByPk(id);
    if (!prereq) {
      return res.status(404).json({ success: false, message: 'Prerequisite not found' });
    }

    await Prerequisite.destroy({ where: { id } });
    res.json({ success: true, message: 'Prerequisite deleted' });
  } catch (error) {
    next(error);
  }
};

// ──────────────── Delete Equivalency ────────────────

exports.deleteEquivalency = async (req, res, next) => {
  try {
    const { id } = req.params;

    const rule = await EquivalencyRule.findByPk(id);
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Equivalency rule not found' });
    }

    await EquivalencyRule.destroy({ where: { id } });
    res.json({ success: true, message: 'Equivalency rule deleted' });
  } catch (error) {
    next(error);
  }
};
