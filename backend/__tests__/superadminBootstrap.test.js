const {
  buildSuperadminSeedUser,
  assertSingleActiveSuperadmin,
  DEFAULT_DEV_SUPERADMIN_EMAIL,
} = require('../utils/superadminBootstrap');

describe('superadmin bootstrap', () => {
  test('builds a safe local fallback superadmin that must change email and password', async () => {
    const hashPassword = jest.fn(async (value) => `hashed:${value}`);

    const user = await buildSuperadminSeedUser({
      env: { NODE_ENV: 'development' },
      now: 12345,
      hashPassword,
    });

    expect(user).toEqual(
      expect.objectContaining({
        firstName: 'System',
        lastName: 'Superadmin',
        email: DEFAULT_DEV_SUPERADMIN_EMAIL,
        password: 'hashed:Password123!',
        role: 'superadmin',
        isActive: true,
        isVerified: true,
        mustChangePassword: true,
        mustChangeEmail: true,
        createdAt: 12345,
        updatedAt: 12345,
      }),
    );
    expect(hashPassword).toHaveBeenCalledWith('Password123!', 10);
  });

  test('requires explicit superadmin credentials for production seeds', async () => {
    await expect(
      buildSuperadminSeedUser({
        env: { NODE_ENV: 'production' },
        now: 12345,
        hashPassword: jest.fn(),
      }),
    ).rejects.toThrow('SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD are required');
  });

  test('rejects a second active superadmin candidate', async () => {
    const User = {
      findOne: jest.fn().mockResolvedValue({ id: 1, email: 'owner@tip.edu.ph' }),
    };

    await expect(
      assertSingleActiveSuperadmin(User, {
        targetUserId: 2,
        nextRole: 'superadmin',
        nextIsActive: true,
      }),
    ).rejects.toThrow('Only one active Super Admin account is allowed');
  });
});
