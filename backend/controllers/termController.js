const { AcademicTerm } = require('../models');

// Get all academic terms
exports.getTerms = async (req, res, next) => {
  try {
    const terms = await AcademicTerm.findAll({ order: [['start_date', 'DESC']] });
    res.json({ success: true, data: terms });
  } catch (error) {
    next(error);
  }
};

// Get the active term
exports.getActiveTerm = async (req, res, next) => {
  try {
    const term = await AcademicTerm.findOne({ where: { is_active: true } });
    res.json({ success: true, data: term });
  } catch (error) {
    next(error);
  }
};

// Create a new term
exports.createTerm = async (req, res, next) => {
  try {
    const { term_name, start_date, end_date, is_active, prelim_exam_date, midterm_exam_date, final_exam_date } = req.body;

    if (!term_name || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'term_name, start_date, and end_date are required'
      });
    }

    // If this term should be active, deactivate all others first
    if (is_active) {
      await AcademicTerm.update({ is_active: false }, { where: {} });
    }

    const term = await AcademicTerm.create({
      term_name,
      start_date,
      end_date,
      prelim_exam_date: prelim_exam_date || null,
      midterm_exam_date: midterm_exam_date || null,
      final_exam_date: final_exam_date || null,
      is_active: is_active || false
    });

    res.status(201).json({ success: true, data: term });
  } catch (error) {
    next(error);
  }
};

// Update a term
exports.updateTerm = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { term_name, start_date, end_date, is_active, prelim_exam_date, midterm_exam_date, final_exam_date } = req.body;

    const term = await AcademicTerm.findByPk(id);
    if (!term) {
      return res.status(404).json({ success: false, message: 'Academic term not found' });
    }

    // If setting this term to active, deactivate all others first
    if (is_active) {
      await AcademicTerm.update({ is_active: false }, { where: {} });
    }

    await AcademicTerm.update(
      {
        term_name, start_date, end_date, is_active,
        prelim_exam_date: prelim_exam_date || null,
        midterm_exam_date: midterm_exam_date || null,
        final_exam_date: final_exam_date || null
      },
      { where: { id } }
    );

    const updated = await AcademicTerm.findByPk(id);
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// Delete a term
exports.deleteTerm = async (req, res, next) => {
  try {
    const { id } = req.params;

    const term = await AcademicTerm.findByPk(id);
    if (!term) {
      return res.status(404).json({ success: false, message: 'Academic term not found' });
    }

    await AcademicTerm.destroy({ where: { id } });
    res.json({ success: true, message: 'Academic term deleted' });
  } catch (error) {
    next(error);
  }
};

// Toggle (set active) a specific term — deactivates all others
exports.setActiveTerm = async (req, res, next) => {
  try {
    const { id } = req.params;

    const term = await AcademicTerm.findByPk(id);
    if (!term) {
      return res.status(404).json({ success: false, message: 'Academic term not found' });
    }

    // Deactivate all, then activate this one
    await AcademicTerm.update({ is_active: false }, { where: {} });
    await AcademicTerm.update({ is_active: true }, { where: { id } });

    const updated = await AcademicTerm.findByPk(id);
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};
