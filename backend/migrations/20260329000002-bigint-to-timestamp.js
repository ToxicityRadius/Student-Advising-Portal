'use strict';

/**
 * Phase 7.2 — Convert BIGINT timestamp columns to native TIMESTAMP WITH TIME ZONE.
 *
 * Existing values are milliseconds since Unix epoch (Date.now()).
 * PostgreSQL: to_timestamp(col / 1000.0) converts ms → timestamptz.
 *
 * After running this migration, update models to use DataTypes.DATE
 * and change Date.now() calls to new Date().
 */
const TABLES_COLUMNS = {
  users: [
    'activationTokenExpires',
    'resetPasswordExpires',
    'verificationCodeExpires',
    'refreshTokenExpires',
    'lastLogin',
    'passwordUpdatedAt',
    'createdAt',
    'updatedAt',
    'emailChangeCodeExpires',
    'lockedUntil',
    // These may have been renamed by the column-naming migration:
    // 'profileUpdatedAt' (was profile_updated_at)
    // 'profileSubmissionLockedAt' (was profile_submission_locked_at)
  ],
  student_academic_records: ['createdAt', 'updatedAt'],
  study_plan_versions: ['createdAt', 'updatedAt', 'validatedAt'],
  study_plan_courses: ['createdAt', 'updatedAt'],
};

async function safeAlter(queryInterface, table, column) {
  try {
    await queryInterface.sequelize.query(
      `ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE TIMESTAMP WITH TIME ZONE USING to_timestamp("${column}" / 1000.0)`,
    );
  } catch {
    // Column may already be TIMESTAMP (fresh DB) or not exist
  }
}

async function safeRevert(queryInterface, table, column) {
  try {
    await queryInterface.sequelize.query(
      `ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE BIGINT USING (EXTRACT(EPOCH FROM "${column}") * 1000)::BIGINT`,
    );
  } catch {
    // Ignore if column doesn't exist or is already BIGINT
  }
}

module.exports = {
  async up(queryInterface) {
    for (const [table, columns] of Object.entries(TABLES_COLUMNS)) {
      for (const column of columns) {
        await safeAlter(queryInterface, table, column);
      }
    }
  },

  async down(queryInterface) {
    for (const [table, columns] of Object.entries(TABLES_COLUMNS)) {
      for (const column of columns) {
        await safeRevert(queryInterface, table, column);
      }
    }
  },
};
