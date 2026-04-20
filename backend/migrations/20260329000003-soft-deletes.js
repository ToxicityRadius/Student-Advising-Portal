'use strict';

/**
 * Phase 7.3 — Add soft-delete support (deletedAt columns) to audit-sensitive tables.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = ['student_academic_records', 'study_plan_versions', 'study_plan_courses'];
    for (const table of tables) {
      try {
        await queryInterface.addColumn(table, 'deletedAt', {
          type: Sequelize.DATE,
          allowNull: true,
          defaultValue: null,
        });
        await queryInterface.addIndex(table, ['deletedAt'], {
          name: `${table}_deleted_at_idx`,
        });
      } catch {
        // Column may already exist (fresh DB via sync)
      }
    }
  },

  async down(queryInterface) {
    const tables = ['student_academic_records', 'study_plan_versions', 'study_plan_courses'];
    for (const table of tables) {
      try {
        await queryInterface.removeIndex(table, `${table}_deleted_at_idx`);
        await queryInterface.removeColumn(table, 'deletedAt');
      } catch {
        // Ignore if column doesn't exist
      }
    }
  },
};
