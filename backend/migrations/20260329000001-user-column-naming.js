'use strict';

/**
 * Phase 7.1 — Normalize snake_case User columns to camelCase.
 *
 * Safety: Each renameColumn is wrapped in a try/catch so the migration
 * succeeds even on a fresh database where columns already have the new names
 * (created via sequelize.sync from an updated model).
 */
const RENAMES = [
  ['current_year_level', 'currentYearLevel'],
  ['is_onboarded', 'isOnboarded'],
  ['first_name', 'profileFirstName'],
  ['middle_name', 'middleName'],
  ['last_name', 'profileLastName'],
  ['contact_number', 'contactNumber'],
  ['profile_picture', 'profilePicture'],
  ['student_type', 'studentType'],
  ['alternate_email', 'alternateEmail'],
  ['emergency_contact_name', 'emergencyContactName'],
  ['emergency_contact_relationship', 'emergencyContactRelationship'],
  ['emergency_contact_number', 'emergencyContactNumber'],
  ['profile_updated_at', 'profileUpdatedAt'],
  ['profile_last_submitted_term_key', 'profileLastSubmittedTermKey'],
  ['profile_submission_locked_at', 'profileSubmissionLockedAt'],
  ['preferred_name', 'preferredName'],
  ['curriculum_id', 'userCurriculumId'],
];

async function safeRename(queryInterface, table, oldName, newName) {
  try {
    await queryInterface.renameColumn(table, oldName, newName);
  } catch (_err) {
    // Column may already have the new name (fresh DB via sync)
  }
}

module.exports = {
  async up(queryInterface) {
    for (const [oldName, newName] of RENAMES) {
      await safeRename(queryInterface, 'users', oldName, newName);
    }
  },

  async down(queryInterface) {
    for (const [oldName, newName] of RENAMES) {
      await safeRename(queryInterface, 'users', newName, oldName);
    }
  },
};
