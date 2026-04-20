/**
 * Integration tests — Auth routes.
 *
 * Covers: register, activate, login, /me, refresh, logout, forgot-password,
 *         reset-password, change-password, and role-based access.
 */

const request = require('supertest');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { app, models, helpers, mocks } = require('./support/helpers');

const { User } = models;
const { syncDB, closeDB, createUser, authToken, refreshTokenFor } = helpers;

beforeAll(async () => {
  await syncDB();
}, 120000);

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
  beforeAll(async () => {
    await createUser({
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

// ─── Verify Code / Resend Code ─────────────────────────────────────────────

describe('POST /api/auth/verify-code', () => {
  const hadOriginalEnable2FA = Object.prototype.hasOwnProperty.call(process.env, 'ENABLE_2FA');
  const originalEnable2FA = process.env.ENABLE_2FA;

  const createVerificationAgent = async (user) => {
    const agent = request.agent(app);
    const loginResponse = await agent.post('/api/auth/login').send({
      email: user.email,
      password: 'Password1!',
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.success).toBe(true);
    expect(loginResponse.body.requiresVerification).toBe(true);
    expect(
      loginResponse.headers['set-cookie']?.some((cookie) =>
        cookie.startsWith('verificationSession='),
      ),
    ).toBe(true);

    return agent;
  };

  const getWrongCodeFor = async (userId) => {
    const refreshedUser = await User.findByPk(userId);
    return refreshedUser.verificationCode === '000000' ? '111111' : '000000';
  };

  beforeAll(() => {
    process.env.ENABLE_2FA = 'true';
  });

  afterAll(() => {
    if (!hadOriginalEnable2FA) {
      delete process.env.ENABLE_2FA;
      return;
    }

    process.env.ENABLE_2FA = originalEnable2FA;
  });

  test('rejects verify requests when verification session is missing', async () => {
    const user = await createUser({
      isVerified: false,
      verificationCode: '123456',
      verificationCodeExpires: Date.now() + 10 * 60 * 1000,
    });

    const response = await request(app).post('/api/auth/verify-code').send({
      userId: user.id,
      code: '000000',
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/Verification session expired/i);
  });

  test('does not lock on first try, then locks on the third failed attempt', async () => {
    const user = await createUser({ isVerified: false });
    const agent = await createVerificationAgent(user);
    const wrongCode = await getWrongCodeFor(user.id);

    const first = await agent.post('/api/auth/verify-code').send({
      userId: user.id,
      code: wrongCode,
    });
    expect(first.status).toBe(400);
    expect(first.body.message).toContain('2 attempts remaining');

    const second = await agent.post('/api/auth/verify-code').send({
      userId: user.id,
      code: wrongCode,
    });
    expect(second.status).toBe(400);
    expect(second.body.message).toContain('1 attempt remaining');

    const third = await agent.post('/api/auth/verify-code').send({
      userId: user.id,
      code: wrongCode,
    });
    expect(third.status).toBe(429);
    expect(third.body.message).toMatch(/Too many failed attempts/i);
    expect(third.body.message).toMatch(/5 minutes/i);
  });

  test('keeps failed-attempt lockout across new verification sessions for the same user', async () => {
    const user = await createUser({ isVerified: false });
    const firstSessionAgent = await createVerificationAgent(user);
    const firstWrongCode = await getWrongCodeFor(user.id);

    const firstAttempt = await firstSessionAgent.post('/api/auth/verify-code').send({
      userId: user.id,
      code: firstWrongCode,
    });
    const secondAttempt = await firstSessionAgent.post('/api/auth/verify-code').send({
      userId: user.id,
      code: firstWrongCode,
    });

    expect(firstAttempt.status).toBe(400);
    expect(secondAttempt.status).toBe(400);

    const secondSessionAgent = await createVerificationAgent(user);
    const secondWrongCode = await getWrongCodeFor(user.id);

    const thirdAttempt = await secondSessionAgent.post('/api/auth/verify-code').send({
      userId: user.id,
      code: secondWrongCode,
    });

    expect(thirdAttempt.status).toBe(429);
    expect(thirdAttempt.body.message).toMatch(/Too many failed attempts/i);
  });

  test('resend code resets failed verification attempt count', async () => {
    const user = await createUser({ isVerified: false });
    const agent = await createVerificationAgent(user);
    const wrongCodeBeforeResend = await getWrongCodeFor(user.id);

    await agent.post('/api/auth/verify-code').send({
      userId: user.id,
      code: wrongCodeBeforeResend,
    });
    await agent.post('/api/auth/verify-code').send({
      userId: user.id,
      code: wrongCodeBeforeResend,
    });

    const resend = await agent.post('/api/auth/resend-code').send({
      userId: user.id,
    });
    expect(resend.status).toBe(200);
    expect(resend.body.success).toBe(true);

    const wrongCodeAfterResend = await getWrongCodeFor(user.id);

    const afterResend = await agent.post('/api/auth/verify-code').send({
      userId: user.id,
      code: wrongCodeAfterResend,
    });

    expect(afterResend.status).toBe(400);
    expect(afterResend.body.message).toContain('2 attempts remaining');
  });

  test('does not allow one user session to consume another user attempts', async () => {
    const victim = await createUser({ isVerified: false });
    const attacker = await createUser({ isVerified: false });

    const victimAgent = await createVerificationAgent(victim);
    const attackerAgent = await createVerificationAgent(attacker);

    const attackerTamperAttempt = await attackerAgent.post('/api/auth/verify-code').send({
      userId: victim.id,
      code: '000000',
    });
    expect(attackerTamperAttempt.status).toBe(401);

    const victimWrongCode = await getWrongCodeFor(victim.id);
    const victimFirstAttempt = await victimAgent.post('/api/auth/verify-code').send({
      userId: victim.id,
      code: victimWrongCode,
    });
    expect(victimFirstAttempt.status).toBe(400);
    expect(victimFirstAttempt.body.message).toContain('2 attempts remaining');
  });

  test('applies resend limiter within the same verification session', async () => {
    const user = await createUser({ isVerified: false });
    const agent = await createVerificationAgent(user);

    const canonicalUserId = String(user.id);
    const paddedUserId = `00${canonicalUserId}`;

    const resend1 = await agent.post('/api/auth/resend-code').send({
      userId: canonicalUserId,
    });
    const resend2 = await agent.post('/api/auth/resend-code').send({
      userId: paddedUserId,
    });
    const resend3 = await agent.post('/api/auth/resend-code').send({
      userId: canonicalUserId,
    });
    const resend4 = await agent.post('/api/auth/resend-code').send({
      userId: paddedUserId,
    });

    expect(resend1.status).toBe(200);
    expect(resend2.status).toBe(200);
    expect(resend3.status).toBe(200);
    expect(resend4.status).toBe(429);
    expect(resend4.body.message).toMatch(/Too many code resend attempts/i);
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
