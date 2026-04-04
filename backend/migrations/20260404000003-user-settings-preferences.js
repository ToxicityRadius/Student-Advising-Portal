'use strict';

/**
 * Adds four user preference columns to the users table:
 *  - notif_inapp     (BOOLEAN, default true)  — receive in-app notifications
 *  - notif_email     (BOOLEAN, default false) — receive email notifications (future)
 *  - notif_reminders (BOOLEAN, default false) — receive advising reminders (future)
 *  - compact_mode    (BOOLEAN, default false) — denser UI layout
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'notif_inapp', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });
    await queryInterface.addColumn('users', 'notif_email', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addColumn('users', 'notif_reminders', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addColumn('users', 'compact_mode', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'notif_inapp');
    await queryInterface.removeColumn('users', 'notif_email');
    await queryInterface.removeColumn('users', 'notif_reminders');
    await queryInterface.removeColumn('users', 'compact_mode');
  },
};
