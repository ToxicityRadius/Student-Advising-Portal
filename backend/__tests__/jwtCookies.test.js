describe('jwt auth cookie configuration', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.AUTH_COOKIE_SAME_SITE;
    delete process.env.AUTH_COOKIE_SECURE;
    delete process.env.AUTH_COOKIE_DOMAIN;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  test('defaults to strict sameSite and non-secure outside production', () => {
    process.env.NODE_ENV = 'test';
    const { getAuthCookieOptions } = require('../utils/jwt');

    const cookieOptions = getAuthCookieOptions();
    expect(cookieOptions.token.sameSite).toBe('strict');
    expect(cookieOptions.token.secure).toBe(false);
    expect(cookieOptions.refreshToken.sameSite).toBe('strict');
    expect(cookieOptions.refreshToken.path).toBe('/api/auth');
  });

  test('uses SameSite=None with secure cookies for cross-site production', () => {
    process.env.NODE_ENV = 'production';
    process.env.AUTH_COOKIE_SAME_SITE = 'none';
    const { getAuthCookieOptions } = require('../utils/jwt');

    const cookieOptions = getAuthCookieOptions();
    expect(cookieOptions.token.sameSite).toBe('none');
    expect(cookieOptions.token.secure).toBe(true);
    expect(cookieOptions.refreshToken.sameSite).toBe('none');
    expect(cookieOptions.refreshToken.secure).toBe(true);
  });

  test('forces secure when sameSite is none even if AUTH_COOKIE_SECURE is false', () => {
    process.env.NODE_ENV = 'production';
    process.env.AUTH_COOKIE_SAME_SITE = 'none';
    process.env.AUTH_COOKIE_SECURE = 'false';
    const { getAuthCookieOptions } = require('../utils/jwt');

    const cookieOptions = getAuthCookieOptions();
    expect(cookieOptions.token.sameSite).toBe('none');
    expect(cookieOptions.token.secure).toBe(true);
  });

  test('applies configured cookie domain to set and clear operations', () => {
    process.env.NODE_ENV = 'production';
    process.env.AUTH_COOKIE_SAME_SITE = 'none';
    process.env.AUTH_COOKIE_DOMAIN = 'api.example.com';

    const { getAuthCookieOptions, clearAuthCookies } = require('../utils/jwt');
    const cookieOptions = getAuthCookieOptions();
    expect(cookieOptions.token.domain).toBe('api.example.com');
    expect(cookieOptions.refreshToken.domain).toBe('api.example.com');

    const res = {
      clearCookie: jest.fn(),
    };
    clearAuthCookies(res);

    expect(res.clearCookie).toHaveBeenNthCalledWith(
      1,
      'token',
      expect.objectContaining({
        domain: 'api.example.com',
        sameSite: 'none',
        secure: true,
        httpOnly: true,
      }),
    );

    expect(res.clearCookie).toHaveBeenNthCalledWith(
      2,
      'refreshToken',
      expect.objectContaining({
        domain: 'api.example.com',
        sameSite: 'none',
        secure: true,
        httpOnly: true,
        path: '/api/auth',
      }),
    );
  });

  test('ignores invalid AUTH_COOKIE_DOMAIN values', () => {
    process.env.NODE_ENV = 'production';
    process.env.AUTH_COOKIE_SAME_SITE = 'none';
    process.env.AUTH_COOKIE_DOMAIN = 'https://api.example.com:443';

    const { getAuthCookieOptions } = require('../utils/jwt');
    const cookieOptions = getAuthCookieOptions();

    expect(cookieOptions.token.domain).toBeUndefined();
    expect(cookieOptions.refreshToken.domain).toBeUndefined();
  });
});
