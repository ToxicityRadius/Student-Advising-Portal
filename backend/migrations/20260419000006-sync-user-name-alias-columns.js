'use strict';

/**
 * Keeps canonical camelCase name columns and legacy snake_case aliases aligned.
 *
 * This is a data-only migration used during the transition period so older rows
 * do not break profile completeness checks or SAR sync flows.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE users
      SET "firstName" = first_name
      WHERE ("firstName" IS NULL OR "firstName" = '')
        AND first_name IS NOT NULL
        AND first_name <> '';
    `);

    await queryInterface.sequelize.query(`
      UPDATE users
      SET first_name = "firstName"
      WHERE (first_name IS NULL OR first_name = '')
        AND "firstName" IS NOT NULL
        AND "firstName" <> '';
    `);

    await queryInterface.sequelize.query(`
      UPDATE users
      SET "lastName" = last_name
      WHERE ("lastName" IS NULL OR "lastName" = '')
        AND last_name IS NOT NULL
        AND last_name <> '';
    `);

    await queryInterface.sequelize.query(`
      UPDATE users
      SET last_name = "lastName"
      WHERE (last_name IS NULL OR last_name = '')
        AND "lastName" IS NOT NULL
        AND "lastName" <> '';
    `);
  },

  async down() {
    // No-op: data synchronization migration.
  },
};
