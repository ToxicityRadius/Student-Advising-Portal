/**
 * Integration tests — Auth routes.
 *
 * Covers: register, activate, login, /me, refresh, logout, forgot-password,
 *         reset-password, change-password, and role-based access.
 */

const request = require('supertest');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { app, sequelize, models, helpers, mocks } = require('./support/helpers');

const { User } = models;
const { syncDB, closeDB, createUser, authToken, refreshTokenFor } = helpers;

beforeAll(async () => {
  await syncDB();
}, 30000);

afterAll(async () => {
  await closeDB();
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Registration ───────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  test('registers a new student and returns 201', async () => {
    const res = await request(app).post('/api/auth/register').send({
      studentId: '2100001',
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      email: 'juandc@tip.edu.ph',
      password: 'Password1!',
      role: 'student',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(mocks.email.sendActivationEmail).toHaveBeenCalledTimes(1);
  });

  test('registers a new adviser', async () => {
    const res = await request(app).post('/api/auth/register').send({
      firstName: 'Adviser',
      lastName: 'One',
      email: 'adviser1.cpe@tip.edu.ph',
      password: 'Password1!',
      role: 'adviser',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test('rejects duplicate email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      studentId: '2100001',
      firstName: 'Juan',
      lastName: 'Duplicate',
      email: 'juandc@tip.edu.ph',
      password: 'Password1!',
      role: 'student',
    });

    // Existing active user → 400, existing inactive → 200 (resends activation)
    expect([200, 400]).toContain(res.status);
  });

  test('rejects admin self-registration', async () => {
    const res = await request(app).post('/api/auth/register').send({
      firstName: 'Hacker',
      lastName: 'Admin',
      email: 'hacker.cpe@tip.edu.ph',
      password: 'Password1!',
      role: 'admin',
    });

    expect(res.status).toBe(403);
  });

  test('rejects non-TIP email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      studentId: '2100099',
      firstName: 'External',
      lastName: 'User',
      email: 'external@gmail.com',
      password: 'Password1!',
      role: 'student',
    });

    expect(res.status).toBe(400);
  });

  test('rejects weak password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      studentId: '2100002',
      firstName: 'Weak',
      lastName: 'Pass',
      email: 'weakpass@tip.edu.ph',
      password: 'short',
      role: 'student',
    });

    expect(res.status).toBe(400);
  });
});

// ─── Account Activation ─────────────────────────────────────────────────────

describe('GET /api/auth/activate/:token', () => {
  test('activates a user with valid token', async () => {
    const activationToken = crypto.randomBytes(32).toString('hex');
    const user = await createUser({
      email: 'activate.me@tip.edu.ph',
      isActive: false,
      activationToken,
      activationTokenExpires: Date.now() + 3600000,
    });

    const res = await request(app).get(`/api/auth/activate/${activationToken}`);

    // Activation typically redirects or returns success
    expect([200, 302]).toContain(res.status);

    const refreshed = await User.findByPk(user.id);
    expect(refreshed.isActive).toBe(true);
  });

  test('rejects invalid activation token', async () => {
    const res = await request(app).get('/api/auth/activate/invalidtoken123');

    expect([400, 404]).toContain(res.status);
  });
});

// ─── Login ──────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  let activeUser;

  beforeAll(async () => {
    activeUser = await createUser({
      email: 'login.test@tip.edu.ph',
      isActive: true,
      isVerified: true,
    });
  });

  test('logs in with correct credentials and returns tokens', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login.test@tip.edu.ph', password: 'Password1!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    // Should set HttpOnly cookies
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some((c) => c.startsWith('token='))).toBe(true);
  });

  test('rejects wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login.test@tip.edu.ph', password: 'WrongPassword1!' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('rejects non-existent user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@tip.edu.ph', password: 'Password1!' });

    expect([400, 401]).toContain(res.status);
  });

  test('rejects inactive account', async () => {
    await createUser({
      email: 'inactive.login@tip.edu.ph',
      isActive: false,
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'inactive.login@tip.edu.ph', password: 'Password1!' });

    expect([401, 403]).toContain(res.status);
  });
});

// ─── GET /me ────────────────────────────────────────────────────────────────

describe('GET /api/auth/me', () => {
  test('returns current user when authenticated', async () => {
    const user = await createUser({ email: 'me.test@tip.edu.ph' });
    const token = authToken(user);

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Response should have user data
    const data = res.body.data || res.body;
    expect(data.email || data.user?.email).toBe('me.test@tip.edu.ph');
  });

  test('rejects unauthenticated request', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
  });
});

// ─── Refresh Token ──────────────────────────────────────────────────────────

describe('POST /api/auth/refresh', () => {
  test('issues new access token with valid refresh token', async () => {
    const user = await createUser({ email: 'refresh.test@tip.edu.ph' });
    const rt = await refreshTokenFor(user);

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [`refreshToken=${rt}`])
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('rejects missing refresh token', async () => {
    const res = await request(app).post('/api/auth/refresh').send({});

    // 400 (no token provided) or 401 depending on controller implementation
    expect([400, 401]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });
});

// ─── Logout ─────────────────────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
  test('clears auth cookies on logout', async () => {
    const user = await createUser({ email: 'logout.test@tip.edu.ph' });
    const token = authToken(user);

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(200);
    // Cookies should be cleared
    const cookies = res.headers['set-cookie'];
    if (cookies) {
      const tokenCookies = cookies.filter((c) => c.startsWith('token='));
      tokenCookies.forEach((c) => {
        // Cleared cookies typically have expired date or empty value
        expect(c).toMatch(/expires=Thu, 01 Jan 1970|token=;|Max-Age=0/i);
      });
    }
  });
});

// ─── Forgot Password ───────────────────────────────────────────────────────

describe('POST /api/auth/forgot-password', () => {
  test('sends reset email for existing user', async () => {
    await createUser({ email: 'forgot.test@tip.edu.ph' });

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'forgot.test@tip.edu.ph' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mocks.email.sendPasswordResetEmail).toHaveBeenCalled();
  });

  test('returns 200 even for non-existent email (no enumeration)', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nonexistent@tip.edu.ph' });

    // Should not reveal whether the email exists
    expect(res.status).toBe(200);
  });
});

// ─── Reset Password ────────────────────────────────────────────────────────

describe('PUT /api/auth/reset-password/:token', () => {
  test('resets password with valid token', async () => {
    // The raw token is sent via URL; the DB stores the sha256 hash
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const user = await createUser({
      email: 'reset.pass@tip.edu.ph',
      resetPasswordToken: hashedToken,
      resetPasswordExpires: Date.now() + 3600000,
    });

    const res = await request(app)
      .put(`/api/auth/reset-password/${rawToken}`)
      .send({ password: 'NewPassword1!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify password was actually changed
    const updated = await User.findByPk(user.id);
    const valid = await bcrypt.compare('NewPassword1!', updated.password);
    expect(valid).toBe(true);
  });

  test('rejects expired reset token', async () => {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    await createUser({
      email: 'expired.reset@tip.edu.ph',
      resetPasswordToken: hashedToken,
      resetPasswordExpires: Date.now() - 1000, // already expired
    });

    const res = await request(app)
      .put(`/api/auth/reset-password/${rawToken}`)
      .send({ password: 'NewPassword1!' });

    expect(res.status).toBe(400);
  });
});

// ─── Change Password ───────────────────────────────────────────────────────

describe('PUT /api/auth/change-password', () => {
  test('changes password for authenticated user', async () => {
    const user = await createUser({ email: 'chgpass.test@tip.edu.ph' });
    const token = authToken(user);

    const res = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        oldPassword: 'Password1!',
        newPassword: 'NewPassword2!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('rejects wrong current password', async () => {
    const user = await createUser({ email: 'chgpass2.test@tip.edu.ph' });
    const token = authToken(user);

    const res = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        oldPassword: 'WrongPassword1!',
        newPassword: 'NewPassword2!',
      });

    expect(res.status).toBe(401);
  });
});

// ─── Role-based access ─────────────────────────────────────────────────────

describe('Role-based access control', () => {
  let studentToken, adviserToken, adminToken;

  beforeAll(async () => {
    const student = await createUser({ role: 'student', email: 'rbac.student@tip.edu.ph' });
    const adviser = await createUser({ role: 'adviser', email: 'rbac.adviser.cpe@tip.edu.ph' });
    const admin = await createUser({ role: 'admin', email: 'rbac.admin.cpe@tip.edu.ph' });

    studentToken = authToken(student);
    adviserToken = authToken(adviser);
    adminToken = authToken(admin);
  });

  test('admin can access admin-only endpoints', async () => {
    const res = await request(app)
      .get('/api/curriculums')
      .set('Authorization', `Bearer ${adminToken}`);

    expect([200, 304]).toContain(res.status);
  });

  test('student cannot access admin-only endpoints', async () => {
    const res = await request(app)
      .post('/api/curriculums')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ name: 'Hack', year: '2025' });

    expect(res.status).toBe(403);
  });

  test('adviser can access adviser-level endpoints', async () => {
    const res = await request(app).get('/api/sars').set('Authorization', `Bearer ${adviserToken}`);

    expect([200, 304]).toContain(res.status);
  });
});
