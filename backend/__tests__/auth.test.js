const request = require('supertest');

// Set env vars before any require
process.env.JWT_SECRET = 'test-secret-key-for-unit-tests';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-tests';
process.env.NODE_ENV = 'test';
process.env.ENABLE_2FA = 'false';

const express = require('express');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../utils/jwt');

// ---- Mock Sequelize models ----
const mockUserInstance = (data) => ({
  ...data,
  get: (opts) => (opts && opts.plain ? { ...data } : data),
  update: jest.fn(async (fields) => Object.assign(data, fields)),
  save: jest.fn(async () => data),
});

jest.mock('../models', () => {
  const actualSequelize = { authenticate: jest.fn().mockResolvedValue(true) };
  const User = {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    findAll: jest.fn().mockResolvedValue([]),
    findAndCountAll: jest.fn().mockResolvedValue({ rows: [], count: 0 }),
    create: jest.fn(),
    update: jest.fn().mockResolvedValue([1]),
    destroy: jest.fn(),
  };
  return {
    sequelize: actualSequelize,
    User,
    Curriculum: { findAll: jest.fn().mockResolvedValue([]) },
    StudentAcademicRecord: {
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue([0]),
    },
    StudyPlan: { findAll: jest.fn().mockResolvedValue([]) },
    AcademicTerm: { findAll: jest.fn().mockResolvedValue([]) },
    CurriculumCourse: { findAll: jest.fn().mockResolvedValue([]) },
    Course: { findAll: jest.fn().mockResolvedValue([]) },
    Prerequisite: { findAll: jest.fn().mockResolvedValue([]) },
    CoRequisite: { findAll: jest.fn().mockResolvedValue([]) },
    CourseEquivalency: { findAll: jest.fn().mockResolvedValue([]) },
    ElectiveTrack: { findAll: jest.fn().mockResolvedValue([]) },
    ElectiveTrackCourse: { findAll: jest.fn().mockResolvedValue([]) },
    ForecastSnapshot: { findAll: jest.fn().mockResolvedValue([]) },
    StudyPlanVersion: { findAll: jest.fn().mockResolvedValue([]) },
    StudyPlanCourse: { findAll: jest.fn().mockResolvedValue([]) },
  };
});

const { User } = require('../models');

// Build a minimal Express app with auth routes for testing
const authRoutes = require('../routes/authRoutes');
const userRoutes = require('../routes/userRoutes');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use((err, req, res, _next) => {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  });
  return app;
}

describe('Auth API', () => {
  let app;

  beforeAll(() => {
    app = buildApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Restore default mock return for User.update
    User.update.mockResolvedValue([1]);
  });

  // ------- POST /api/auth/login -------

  describe('POST /api/auth/login', () => {
    test('returns 400 for invalid email format before controller logic runs', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: 'Password1!' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.errors.email).toBe('Email must be valid');
      expect(User.findOne).not.toHaveBeenCalled();
    });

    test('returns 400 when email or password is missing', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: 'test@test.com' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('returns 401 for non-existent user', async () => {
      User.findOne.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@test.com', password: 'Password1!' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('returns 401 for wrong password', async () => {
      const hashed = await bcrypt.hash('CorrectPass1!', 10);
      const user = mockUserInstance({
        id: 1,
        email: 'user@test.com',
        password: hashed,
        role: 'student',
        isActive: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
        mustChangePassword: false,
        mustChangeEmail: false,
      });
      User.findOne.mockResolvedValue(user);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@test.com', password: 'WrongPass1!' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('returns 429 when account is locked', async () => {
      const hashed = await bcrypt.hash('Password1!', 10);
      const user = mockUserInstance({
        id: 1,
        email: 'locked@test.com',
        password: hashed,
        role: 'student',
        isActive: true,
        failedLoginAttempts: 5,
        lockedUntil: Date.now() + 15 * 60 * 1000,
        mustChangePassword: false,
        mustChangeEmail: false,
      });
      User.findOne.mockResolvedValue(user);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'locked@test.com', password: 'Password1!' });

      expect(res.status).toBe(429);
      expect(res.body.success).toBe(false);
    });

    test('sets auth cookies and returns fallback tokens on successful login', async () => {
      const hashed = await bcrypt.hash('Password1!', 10);
      const user = mockUserInstance({
        id: 2,
        email: 'student@test.com',
        password: hashed,
        role: 'student',
        isActive: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
        mustChangePassword: false,
        mustChangeEmail: false,
        firstName: 'Test',
        lastName: 'User',
        studentId: '1234567',
        is_verified: true,
      });
      User.findOne.mockResolvedValue(user);
      // After login success, the controller fetches the updated user via findByPk
      User.findByPk.mockResolvedValue(user);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'student@test.com', password: 'Password1!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toEqual(expect.any(String));
      expect(res.body.refreshToken).toEqual(expect.any(String));
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('student@test.com');
      expect(res.headers['set-cookie']).toEqual(
        expect.arrayContaining([
          expect.stringContaining('token='),
          expect.stringContaining('refreshToken='),
        ]),
      );
    });

    test('returns 401 when account is inactive', async () => {
      const hashed = await bcrypt.hash('Password1!', 10);
      const user = mockUserInstance({
        id: 3,
        email: 'inactive@test.com',
        password: hashed,
        role: 'student',
        isActive: false,
        failedLoginAttempts: 0,
        lockedUntil: null,
        mustChangePassword: false,
        mustChangeEmail: false,
      });
      User.findOne.mockResolvedValue(user);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'inactive@test.com', password: 'Password1!' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    test('returns 400 when neither body nor cookie includes a refresh token', async () => {
      const res = await request(app).post('/api/auth/refresh-token').send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.errors.request).toBe('Refresh token is required');
    });
  });

  // ------- GET /api/auth/me -------

  describe('GET /api/auth/me', () => {
    test('returns 401 when no token provided', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('returns 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalidtoken123');

      expect(res.status).toBe(401);
    });

    test('returns user data with valid token', async () => {
      const user = mockUserInstance({
        id: 5,
        email: 'me@test.com',
        role: 'student',
        firstName: 'Jane',
        lastName: 'Doe',
        isActive: true,
        password: 'hashed',
        sex: 'Female',
        mustChangePassword: false,
        mustChangeEmail: false,
      });
      User.findByPk.mockResolvedValue(user);

      const token = generateToken({ id: 5, role: 'student', is_verified: true });

      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('me@test.com');
      // Password should be stripped
      expect(res.body.user.password).toBeUndefined();
    });

    test('returns 401 when user is deactivated', async () => {
      const user = mockUserInstance({
        id: 6,
        email: 'deactivated@test.com',
        role: 'student',
        isActive: false,
      });
      User.findByPk.mockResolvedValue(user);

      const token = generateToken({ id: 6, role: 'student', is_verified: true });

      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
    });
  });

  // ------- Role-based access -------

  describe('Role-based access control', () => {
    test('admin can access admin-only routes', async () => {
      const admin = mockUserInstance({
        id: 10,
        email: 'admin@test.com',
        role: 'admin',
        isActive: true,
        mustChangePassword: false,
        mustChangeEmail: false,
      });
      User.findByPk.mockResolvedValue(admin);
      User.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      const token = generateToken({ id: 10, role: 'admin', is_verified: true });

      const res = await request(app).get('/api/users').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    test('student cannot access admin-only user listing', async () => {
      const student = mockUserInstance({
        id: 11,
        email: 'student@test.com',
        role: 'student',
        isActive: true,
        mustChangePassword: false,
        mustChangeEmail: false,
      });
      User.findByPk.mockResolvedValue(student);

      const token = generateToken({ id: 11, role: 'student', is_verified: true });

      const res = await request(app).get('/api/users').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    test('unauthenticated user gets 401 on protected route', async () => {
      const res = await request(app).get('/api/users');

      expect(res.status).toBe(401);
    });
  });
});
