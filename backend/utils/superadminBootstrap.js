const { Op } = require('sequelize');
const { ROLE_SUPERADMIN } = require('../constants');

const DEFAULT_DEV_SUPERADMIN_EMAIL = 'superadmin.cpe@tip.edu.ph';
const DEFAULT_DEV_SUPERADMIN_PASSWORD = 'Password123!';
const HASH_ROUNDS = 10;

const normalizeEmail = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();

const isProductionEnv = (env = process.env) => env.NODE_ENV === 'production';

const resolveSuperadminSeedConfig = (env = process.env) => {
  const production = isProductionEnv(env);
  const configuredEmail = normalizeEmail(env.SUPERADMIN_EMAIL);
  const configuredPassword = String(env.SUPERADMIN_PASSWORD || '');

  if (production && (!configuredEmail || !configuredPassword)) {
    throw new Error('SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD are required for production seeds');
  }

  const usesFallbackEmail = !configuredEmail;
  const usesFallbackPassword = !configuredPassword;

  return {
    email: configuredEmail || DEFAULT_DEV_SUPERADMIN_EMAIL,
    password: configuredPassword || DEFAULT_DEV_SUPERADMIN_PASSWORD,
    mustChangeEmail: usesFallbackEmail,
    mustChangePassword: usesFallbackPassword,
  };
};

const buildSuperadminSeedUser = async ({ env = process.env, now, hashPassword }) => {
  if (typeof hashPassword !== 'function') {
    throw new Error('hashPassword function is required');
  }

  const config = resolveSuperadminSeedConfig(env);
  const timestamp = now || Date.now();

  return {
    firstName: 'System',
    lastName: 'Superadmin',
    email: config.email,
    password: await hashPassword(config.password, HASH_ROUNDS),
    role: ROLE_SUPERADMIN,
    isActive: true,
    isVerified: true,
    mustChangePassword: config.mustChangePassword,
    mustChangeEmail: config.mustChangeEmail,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

const assertSingleActiveSuperadmin = async (
  UserModel,
  { targetUserId, nextRole, nextIsActive },
) => {
  if (nextRole !== ROLE_SUPERADMIN || nextIsActive !== true) {
    return;
  }

  const normalizedTargetId = Number(targetUserId);
  const where = {
    role: ROLE_SUPERADMIN,
    isActive: true,
  };

  if (Number.isInteger(normalizedTargetId) && normalizedTargetId > 0) {
    where.id = { [Op.ne]: normalizedTargetId };
  }

  const existing = await UserModel.findOne({
    where,
    attributes: ['id', 'email'],
  });

  if (existing) {
    const error = new Error('Only one active Super Admin account is allowed');
    error.statusCode = 409;
    throw error;
  }
};

module.exports = {
  DEFAULT_DEV_SUPERADMIN_EMAIL,
  DEFAULT_DEV_SUPERADMIN_PASSWORD,
  buildSuperadminSeedUser,
  resolveSuperadminSeedConfig,
  assertSingleActiveSuperadmin,
};
