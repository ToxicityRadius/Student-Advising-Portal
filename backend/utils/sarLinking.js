const { Op } = require('sequelize');
const { StudentAcademicRecord } = require('../models');

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