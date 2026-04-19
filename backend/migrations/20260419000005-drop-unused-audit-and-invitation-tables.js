'use strict';

/**
 * Removes unused legacy tables that are no longer wired to runtime routes/controllers.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS public.audit_logs;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS public.faculty_invitations;');
  },

  async down() {
    throw new Error(
      'Irreversible migration: audit_logs and faculty_invitations were removed from the system.',
    );
  },
};
