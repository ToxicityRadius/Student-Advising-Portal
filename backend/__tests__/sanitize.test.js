const {
  computeProfileCompletionScore,
  sanitizeUser,
  sanitizeUserWithProfile
} = require('../utils/sanitize');

// Mock featureFlags so we can control maskUserFirstLoginFlags behaviour
jest.mock('../utils/featureFlags', () => ({
  maskUserFirstLoginFlags: jest.fn((user) => {
    if (!user) return null;
    return user.get ? user.get({ plain: true }) : { ...user };
  })
}));

const { maskUserFirstLoginFlags } = require('../utils/featureFlags');

describe('sanitize', () => {
  afterEach(() => jest.clearAllMocks());

  // ---- computeProfileCompletionScore ----

  describe('computeProfileCompletionScore', () => {
    test('returns 0 when no fields filled', () => {
      expect(computeProfileCompletionScore({ role: 'admin' })).toBe(0);
    });

    test('returns 100 for non-student with all common fields', () => {
      const user = {
        role: 'admin',
        first_name: 'A',
        last_name: 'B',
        contact_number: '123',
        sex: 'Male',
        citizenship: 'Filipino',
        address: '123 St',
        emergency_contact_name: 'C',
        emergency_contact_number: '456',
        profile_picture: 'pic.jpg'
      };
      expect(computeProfileCompletionScore(user)).toBe(100);
    });

    test('includes student-specific fields for students', () => {
      const user = {
        role: 'student',
        first_name: 'A',
        last_name: 'B',
        contact_number: '123',
        sex: 'Male',
        citizenship: 'Filipino',
        address: '123 St',
        emergency_contact_name: 'C',
        emergency_contact_number: '456',
        profile_picture: 'pic.jpg'
        // missing 4 student fields
      };
      // 9 / 13 = ~69%
      expect(computeProfileCompletionScore(user)).toBe(69);
    });

    test('returns 100 for student with all fields', () => {
      const user = {
        role: 'student',
        first_name: 'A',
        last_name: 'B',
        contact_number: '123',
        sex: 'Male',
        citizenship: 'Filipino',
        address: '123 St',
        emergency_contact_name: 'C',
        emergency_contact_number: '456',
        profile_picture: 'pic.jpg',
        program: 'BSCpE',
        curriculum_id: 1,
        student_type: 'Regular',
        current_year_level: 3
      };
      expect(computeProfileCompletionScore(user)).toBe(100);
    });

    test('treats empty string as unfilled', () => {
      const user = { role: 'admin', first_name: '', last_name: 'B' };
      // 1 / 9 = ~11%
      expect(computeProfileCompletionScore(user)).toBe(11);
    });
  });

  // ---- sanitizeUser ----

  describe('sanitizeUser', () => {
    test('returns null for null input', () => {
      expect(sanitizeUser(null)).toBeNull();
    });

    test('removes sensitive fields', () => {
      const user = {
        id: 1,
        email: 'a@b.com',
        password: 'hashed',
        refreshToken: 'tok',
        activationToken: 'act',
        resetPasswordToken: 'rst'
      };
      const result = sanitizeUser(user);
      expect(result.password).toBeUndefined();
      expect(result.refreshToken).toBeUndefined();
      expect(result.activationToken).toBeUndefined();
      expect(result.resetPasswordToken).toBeUndefined();
      expect(result.id).toBe(1);
    });

    test('adds gender alias from sex', () => {
      const result = sanitizeUser({ sex: 'Female' });
      expect(result.gender).toBe('Female');
    });

    test('sets gender to null when sex is missing', () => {
      const result = sanitizeUser({ id: 1 });
      expect(result.gender).toBeNull();
    });

    test('calls maskUserFirstLoginFlags', () => {
      sanitizeUser({ id: 1 });
      expect(maskUserFirstLoginFlags).toHaveBeenCalledTimes(1);
    });
  });

  // ---- sanitizeUserWithProfile ----

  describe('sanitizeUserWithProfile', () => {
    test('returns null for null input', () => {
      expect(sanitizeUserWithProfile(null)).toBeNull();
    });

    test('removes sensitive fields', () => {
      const user = { password: 'hashed', role: 'admin', first_name: 'A' };
      const result = sanitizeUserWithProfile(user);
      expect(result.password).toBeUndefined();
    });

    test('adds profileCompletionScore', () => {
      const user = { role: 'admin', first_name: 'A' };
      const result = sanitizeUserWithProfile(user);
      expect(typeof result.profileCompletionScore).toBe('number');
    });

    test('handles Sequelize instance with get()', () => {
      const plain = { role: 'admin', first_name: 'A', password: 'x' };
      const user = { get: ({ plain: p }) => (p ? { ...plain } : {}) };
      const result = sanitizeUserWithProfile(user);
      expect(result.password).toBeUndefined();
      expect(result.profileCompletionScore).toBeDefined();
    });

    test('adds gender alias', () => {
      const result = sanitizeUserWithProfile({ role: 'admin', sex: 'Male' });
      expect(result.gender).toBe('Male');
    });
  });
});
