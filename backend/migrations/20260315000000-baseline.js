'use strict';

/**
 * Baseline migration — documents the schema state established by sequelize.sync().
 *
 * This is intentionally a no-op: the existing database was created by Sequelize
 * auto-sync.  All tables already exist.  Future schema changes should be expressed
 * as new migration files that run AFTER this baseline.
 *
 * Running `db:migrate` on a fresh database requires running the seed/sync first
 * to create the initial tables, then running migrations for incremental changes.
 */
module.exports = {
  async up(queryInterface) {
    // Record that the baseline has been applied.  No DDL needed — tables
    // already exist from sequelize.sync().
  },

  async down() {
    // Intentionally empty — rolling back the baseline is not supported.
  }
};
