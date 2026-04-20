/**
 * Integration test setup.
 *
 * Provides a fully wired Express app backed by the real PostgreSQL database.
 * Tables are reset (force-synced) before the suite and closed after.
 *
 * Usage in test files:
 *   const { app, sequelize, models, helpers } = require('./setup');
 */

// ── Env overrides (must precede all app requires) ───────────────────────────
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'integration-test-jwt-secret';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'integration-test-refresh-secret';
process.env.JWT_EXPIRE = '30m';
process.env.JWT_REFRESH_EXPIRE = '30d';
process.env.ENABLE_2FA = 'false';
process.env.DISABLE_ADMIN_FIRST_LOGIN_ENFORCEMENT = 'true';

// ── Mock email to prevent real SMTP calls ───────────────────────────────────
jest.mock('../../../utils/email', () => ({
  sendActivationEmail: jest.fn().mockResolvedValue(true),
  sendWelcomeEmail: jest.fn().mockResolvedValue(true),
  sendVerificationCode: jest.fn().mockResolvedValue(true),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
  sendEmailChangeVerificationCode: jest.fn().mockResolvedValue(true),
}));

// Suppress pino logging during tests
jest.mock('../../../utils/logger', () => {
  const noop = () => {};
  return {
    info: noop,
    warn: noop,
    error: noop,
    debug: noop,
    fatal: noop,
    child: () => ({ info: noop, warn: noop, error: noop, debug: noop, fatal: noop }),
  };
});

// ── Real app & models ───────────────────────────────────────────────────────
const app = require('../../../server');
const db = require('../../../models');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { generateToken, generateRefreshToken } = require('../../../utils/jwt');

const { sequelize, User, Curriculum, Course, CurriculumCourse } = db;

// ── DB lifecycle ────────────────────────────────────────────────────────────

/**
 * Reset all tables (force sync). Call in beforeAll.
 */
async function syncDB() {
  await sequelize.sync({ force: true });
}

/**
 * Close the connection pool. Call in afterAll.
 */
async function closeDB() {
  await sequelize.close();
}

// ── Test data helpers ───────────────────────────────────────────────────────

let userCounter = 0;

/**
 * Create a user directly in the database (bypasses registration flow).
 * Returns the Sequelize instance.
 */
async function createUser(overrides = {}) {
  userCounter += 1;
  const now = Date.now();
  const salt = await bcrypt.genSalt(4); // fast rounds for tests
  const defaults = {
    firstName: `Test${userCounter}`,
    lastName: 'User',
    first_name: `Test${userCounter}`,
    last_name: 'User',
    email: `testuser${userCounter}.cpe@tip.edu.ph`,
    password: await bcrypt.hash('Password1!', salt),
    role: 'student',
    isActive: true,
    isVerified: true,
    createdAt: now,
    updatedAt: now,
  };
  return User.create({ ...defaults, ...overrides });
}

/**
 * Generate a Bearer-ready JWT access token for the given user instance.
 */
function authToken(user) {
  return generateToken(user);
}

/**
 * Generate a refresh token and persist it on the user row.
 */
async function refreshTokenFor(user) {
  const rt = generateRefreshToken(user.id);
  const refreshTokenHash = crypto.createHash('sha256').update(rt).digest('hex');
  await user.update({
    refreshToken: refreshTokenHash,
    refreshTokenExpires: Date.now() + 30 * 24 * 60 * 60 * 1000,
  });
  return rt;
}

/**
 * Create a minimal curriculum with N courses.
 */
async function createCurriculum(adminUser, courseCount = 3) {
  const curriculum = await Curriculum.create({
    name: `Test Curriculum ${Date.now()}`,
    description: 'Integration test curriculum',
    year: '2025',
    isActive: true,
    createdById: adminUser.id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const courses = [];
  for (let i = 1; i <= courseCount; i++) {
    const course = await Course.create({
      code: `TST${String(i).padStart(3, '0')}`,
      name: `Test Course ${i}`,
      units: 3,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await CurriculumCourse.create({
      curriculumId: curriculum.id,
      courseId: course.id,
      yearLevel: 1,
      semester: 1,
    });
    courses.push(course);
  }

  return { curriculum, courses };
}

module.exports = {
  app,
  sequelize,
  models: db,
  helpers: {
    syncDB,
    closeDB,
    createUser,
    authToken,
    refreshTokenFor,
    createCurriculum,
  },
  mocks: {
    email: require('../../../utils/email'),
  },
};
