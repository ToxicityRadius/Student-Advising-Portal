'use strict';

/**
 * Adds max_students_per_section (INTEGER, nullable) to the courses table.
 * When set, the forecast uses this per-course cap instead of the global sectionCap.
 * Useful for labs (e.g. 30) vs. lecture halls (e.g. 45).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('courses', 'max_students_per_section', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('courses', 'max_students_per_section');
  },
};
