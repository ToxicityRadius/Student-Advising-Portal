const { Op } = require('sequelize');
const { StudentAcademicRecord, User } = require('../models');

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const normalizeStudentId = (studentId) => String(studentId || '').trim();

const buildMatchConditions = ({ email, studentId }) => {
  const conditions = [];

  const normalizedEmail = normalizeEmail(email);
  if (normalizedEmail) {
    conditions.push({ email: normalizedEmail });
  }

  const normalizedStudentId = normalizeStudentId(studentId);
  if (normalizedStudentId) {
    conditions.push({ studentNumber: normalizedStudentId });
  }

  return conditions;
};

exports.linkStudentAccountToSar = async ({ userId, email, studentId, transaction }) => {
  const conditions = buildMatchConditions({ email, studentId });

  if (!userId || conditions.length === 0) {
    return { linked: false, reason: 'no-match-criteria' };
  }

  const existingLinkedSar = await StudentAcademicRecord.findOne({ where: { userId }, transaction });
  if (existingLinkedSar) {
    return { linked: false, reason: 'already-linked', sarId: existingLinkedSar.id };
  }

  const matchedSar = await StudentAcademicRecord.findOne({
    where: {
      userId: null,
      [Op.or]: conditions
    },
    order: [['updatedAt', 'DESC'], ['id', 'DESC']],
    transaction
  });

  if (!matchedSar) {
    return { linked: false, reason: 'no-unlinked-sar' };
  }

  await matchedSar.update({ userId, updatedAt: Date.now() }, { transaction });
  return { linked: true, sarId: matchedSar.id };
};

/**
 * Sync SAR identity fields to the linked student profile (SAR → Profile).
 *
 * - studentNumber is synced to User.studentId.
 * - studentName is parsed (last word = last_name, rest = first_name) and synced
 *   to User.first_name + User.last_name.
 *
 * Only applies when the SAR has a linked userId. Idempotent — no-op when values
 * already match.
 */
exports.syncSarToProfile = async (sar, options = {}) => {
  const { transaction } = options;

  if (!sar || !sar.userId) {
    return { synced: false, reason: 'no-linked-user' };
  }

  const user = await User.findByPk(sar.userId, { transaction });
  if (!user) {
    return { synced: false, reason: 'user-not-found' };
  }

  const updates = {};

  // Sync studentNumber → studentId
  if (sar.studentNumber) {
    const sarStudentNumber = String(sar.studentNumber).trim();
    if (sarStudentNumber && sarStudentNumber !== String(user.studentId || '').trim()) {
      updates.studentId = sarStudentNumber;
    }
  }

  // Sync studentName → first_name + last_name
  if (sar.studentName) {
    const nameParts = String(sar.studentName).trim().split(/\s+/).filter(Boolean);
    if (nameParts.length >= 2) {
      const sarLastName = nameParts[nameParts.length - 1];
      const sarFirstName = nameParts.slice(0, -1).join(' ');
      if (sarFirstName && sarFirstName !== String(user.first_name || '').trim()) {
        updates.first_name = sarFirstName;
      }
      if (sarLastName && sarLastName !== String(user.last_name || '').trim()) {
        updates.last_name = sarLastName;
      }
    } else if (nameParts.length === 1 && !user.first_name) {
      updates.first_name = nameParts[0];
    }
  }

  if (Object.keys(updates).length === 0) {
    return { synced: false, reason: 'no-changes' };
  }

  updates.updatedAt = Date.now();
  await User.update(updates, { where: { id: sar.userId }, transaction });

  const syncedFields = Object.keys(updates).filter((k) => k !== 'updatedAt');
  console.log(`[sarSync] SAR ${sar.id} → User ${sar.userId}: synced fields [${syncedFields.join(', ')}]`);
  return { synced: true, fields: syncedFields };
};

/**
 * Sync student profile identity fields to the linked SAR (Profile → SAR).
 *
 * - first_name + last_name are composed to update SAR.studentName.
 * - studentId is synced to SAR.studentNumber.
 *
 * Looks up SAR by userId first; falls back to an unlinked SAR matched by email
 * (and auto-links it when found). Idempotent — no-op when values already match.
 */
exports.syncProfileToSar = async ({ userId, email, firstName, lastName, studentId } = {}, options = {}) => {
  const { transaction } = options;

  if (!userId) {
    return { synced: false, reason: 'no-user-id' };
  }

  // Primary lookup: SAR linked by userId
  let sar = await StudentAcademicRecord.findOne({ where: { userId }, transaction });

  // Fallback: unlinked SAR matched by student email — auto-link it
  if (!sar && email) {
    const normalizedEmail = normalizeEmail(email);
    sar = await StudentAcademicRecord.findOne({
      where: { email: normalizedEmail, userId: null },
      order: [['updatedAt', 'DESC'], ['id', 'DESC']],
      transaction
    });
    if (sar) {
      await sar.update({ userId, updatedAt: Date.now() }, { transaction });
    }
  }

  if (!sar) {
    return { synced: false, reason: 'no-linked-sar' };
  }

  const updates = {};

  // Sync first_name + last_name → studentName
  const newStudentName = [String(firstName || '').trim(), String(lastName || '').trim()]
    .filter(Boolean)
    .join(' ');
  if (newStudentName && newStudentName !== String(sar.studentName || '').trim()) {
    updates.studentName = newStudentName;
  }

  // Sync studentId → studentNumber
  if (studentId) {
    const normalizedStudentId = String(studentId).trim();
    if (normalizedStudentId && normalizedStudentId !== String(sar.studentNumber || '').trim()) {
      updates.studentNumber = normalizedStudentId;
    }
  }

  if (Object.keys(updates).length === 0) {
    return { synced: false, reason: 'no-changes' };
  }

  updates.updatedAt = Date.now();
  await sar.update(updates, { transaction });

  const syncedFields = Object.keys(updates).filter((k) => k !== 'updatedAt');
  console.log(`[sarSync] User ${userId} → SAR ${sar.id}: synced fields [${syncedFields.join(', ')}]`);
  return { synced: true, sarId: sar.id, fields: syncedFields };
};