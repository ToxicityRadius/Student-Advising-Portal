const { CourseOffering, Subject } = require('../models');

// GET /api/course-offerings/:term
exports.getOfferingsByTerm = async (req, res, next) => {
  try {
    const { term } = req.params;

    const offerings = await CourseOffering.findAll({
      where: { target_term: term },
      include: [{ model: Subject }],
      order: [[Subject, 'course_code', 'ASC']]
    });

    res.json({ success: true, data: offerings });
  } catch (error) {
    next(error);
  }
};

// POST /api/course-offerings/toggle
exports.toggleOffering = async (req, res, next) => {
  try {
    const { target_term, SubjectId } = req.body;

    if (!target_term || !SubjectId) {
      return res.status(400).json({
        success: false,
        message: 'target_term and SubjectId are required'
      });
    }

    const existing = await CourseOffering.findOne({
      where: { target_term, SubjectId }
    });

    if (existing) {
      await existing.destroy();
      return res.json({
        success: true,
        message: 'Course offering closed successfully',
        state: 'closed'
      });
    }

    await CourseOffering.create({
      target_term,
      SubjectId,
      is_automatically_opened: false
    });

    return res.status(201).json({
      success: true,
      message: 'Course offering opened successfully',
      state: 'opened'
    });
  } catch (error) {
    next(error);
  }
};
