describe('Feature Flags', () => {
  let featureFlags;

  beforeEach(() => {
    jest.resetModules();
    delete process.env.DISABLE_ADMIN_FIRST_LOGIN_ENFORCEMENT;
  });

  const loadModule = () => {
    featureFlags = require('../utils/featureFlags');
    return featureFlags;
  };

  // ---- isAdminFirstLoginEnforcementDisabled ----

  describe('isAdminFirstLoginEnforcementDisabled', () => {
    test('returns false by default', () => {
      const { isAdminFirstLoginEnforcementDisabled } = loadModule();
      expect(isAdminFirstLoginEnforcementDisabled()).toBe(false);
    });

    test('returns true when env is "true"', () => {
      process.env.DISABLE_ADMIN_FIRST_LOGIN_ENFORCEMENT = 'true';
      const { isAdminFirstLoginEnforcementDisabled } = loadModule();
      expect(isAdminFirstLoginEnforcementDisabled()).toBe(true);
    });

    test('returns true case-insensitively', () => {
      process.env.DISABLE_ADMIN_FIRST_LOGIN_ENFORCEMENT = 'TRUE';
      const { isAdminFirstLoginEnforcementDisabled } = loadModule();
      expect(isAdminFirstLoginEnforcementDisabled()).toBe(true);
    });

    test('returns false for other values', () => {
      process.env.DISABLE_ADMIN_FIRST_LOGIN_ENFORCEMENT = 'false';
      const { isAdminFirstLoginEnforcementDisabled } = loadModule();
      expect(isAdminFirstLoginEnforcementDisabled()).toBe(false);
    });
  });

  // ---- shouldBypassAdminFirstLoginEnforcement ----

  describe('shouldBypassAdminFirstLoginEnforcement', () => {
    test('returns false when user is null', () => {
      process.env.DISABLE_ADMIN_FIRST_LOGIN_ENFORCEMENT = 'true';
      const { shouldBypassAdminFirstLoginEnforcement } = loadModule();
      expect(shouldBypassAdminFirstLoginEnforcement(null)).toBe(false);
    });

    test('returns false for non-admin user', () => {
      process.env.DISABLE_ADMIN_FIRST_LOGIN_ENFORCEMENT = 'true';
      const { shouldBypassAdminFirstLoginEnforcement } = loadModule();
      expect(shouldBypassAdminFirstLoginEnforcement({ role: 'student' })).toBe(false);
    });

    test('returns false when flag is disabled', () => {
      const { shouldBypassAdminFirstLoginEnforcement } = loadModule();
      expect(shouldBypassAdminFirstLoginEnforcement({ role: 'admin' })).toBe(false);
    });

    test('returns true for admin when flag enabled', () => {
      process.env.DISABLE_ADMIN_FIRST_LOGIN_ENFORCEMENT = 'true';
      const { shouldBypassAdminFirstLoginEnforcement } = loadModule();
      expect(shouldBypassAdminFirstLoginEnforcement({ role: 'admin' })).toBe(true);
    });
  });

  // ---- maskUserFirstLoginFlags ----

  describe('maskUserFirstLoginFlags', () => {
    test('returns null for null input', () => {
      const { maskUserFirstLoginFlags } = loadModule();
      expect(maskUserFirstLoginFlags(null)).toBeNull();
    });

    test('returns plain object without mutation when flag disabled', () => {
      const { maskUserFirstLoginFlags } = loadModule();
      const user = { role: 'admin', mustChangePassword: true, mustChangeEmail: true };
      const result = maskUserFirstLoginFlags(user);
      expect(result.mustChangePassword).toBe(true);
      expect(result.mustChangeEmail).toBe(true);
    });

    test('masks flags for admin when enforcement disabled', () => {
      process.env.DISABLE_ADMIN_FIRST_LOGIN_ENFORCEMENT = 'true';
      const { maskUserFirstLoginFlags } = loadModule();
      const user = { role: 'admin', mustChangePassword: true, mustChangeEmail: true };
      const result = maskUserFirstLoginFlags(user);
      expect(result.mustChangePassword).toBe(false);
      expect(result.mustChangeEmail).toBe(false);
    });

    test('does not mask for student even with flag enabled', () => {
      process.env.DISABLE_ADMIN_FIRST_LOGIN_ENFORCEMENT = 'true';
      const { maskUserFirstLoginFlags } = loadModule();
      const user = { role: 'student', mustChangePassword: true, mustChangeEmail: true };
      const result = maskUserFirstLoginFlags(user);
      expect(result.mustChangePassword).toBe(true);
      expect(result.mustChangeEmail).toBe(true);
    });

    test('handles Sequelize instance with get()', () => {
      const { maskUserFirstLoginFlags } = loadModule();
      const user = {
        get: ({ plain }) => plain ? { role: 'student', mustChangePassword: true } : {},
        role: 'student',
        mustChangePassword: true
      };
      const result = maskUserFirstLoginFlags(user);
      expect(result.role).toBe('student');
    });
  });
});
