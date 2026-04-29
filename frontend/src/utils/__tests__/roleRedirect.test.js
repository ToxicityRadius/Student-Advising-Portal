import { getHomePathForRole } from '../roleRedirect';

describe('roleRedirect', () => {
  test('routes faculty roles to their operations dashboards', () => {
    expect(getHomePathForRole('superadmin')).toBe('/admin/dashboard');
    expect(getHomePathForRole('admin')).toBe('/admin/dashboard');
    expect(getHomePathForRole('adviser')).toBe('/adviser/dashboard');
  });

  test('keeps students on the existing dashboard', () => {
    expect(getHomePathForRole('student')).toBe('/dashboard');
    expect(getHomePathForRole(undefined)).toBe('/dashboard');
  });
});
