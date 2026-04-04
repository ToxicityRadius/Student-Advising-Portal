'use strict';

/**
 * Adds three new columns:
 *  - courses.lecture_hours       (INTEGER, nullable)
 *  - courses.laboratory_hours    (INTEGER, nullable)
 *  - curriculum_courses.min_year_standing_required (INTEGER, nullable, 1-5)
 *
 * min_year_standing_required encodes:
 *   null  = no standing restriction (available to all years)
 *   1-4   = student must have completed all courses up to that year level
 *   5     = "Graduating" status (all prior semesters completed)
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('courses', 'lecture_hours', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.addColumn('courses', 'laboratory_hours', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.addColumn('curriculum_courses', 'min_year_standing_required', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('courses', 'lecture_hours');
    await queryInterface.removeColumn('courses', 'laboratory_hours');
    await queryInterface.removeColumn('curriculum_courses', 'min_year_standing_required');
  },
};
