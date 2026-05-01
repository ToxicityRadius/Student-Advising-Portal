const { PERMISSIONS, hasPermission, requirePermission } = require('../utils/permissions');

const createResponse = () => {
  const res = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
  };
  return res;
};

describe('permission map', () => {
  test('grants global permissions only to superadmin', () => {
    expect(hasPermission({ role: 'superadmin' }, PERMISSIONS.managePrograms)).toBe(true);
    expect(hasPermission({ role: 'superadmin' }, PERMISSIONS.transferOwnership)).toBe(true);
    expect(hasPermission({ role: 'superadmin' }, PERMISSIONS.manageUserDetails)).toBe(true);
    expect(hasPermission({ role: 'superadmin' }, PERMISSIONS.toggleUserStatus)).toBe(true);

    expect(hasPermission({ role: 'admin' }, PERMISSIONS.managePrograms)).toBe(false);
    expect(hasPermission({ role: 'admin' }, PERMISSIONS.transferOwnership)).toBe(false);
    expect(hasPermission({ role: 'admin' }, PERMISSIONS.manageUserDetails)).toBe(false);
    expect(hasPermission({ role: 'admin' }, PERMISSIONS.toggleUserStatus)).toBe(false);
  });

  test('keeps Program Chair scoped academic permissions', () => {
    expect(hasPermission({ role: 'admin' }, PERMISSIONS.assignAdviser)).toBe(true);
    expect(hasPermission({ role: 'admin' }, PERMISSIONS.manageCurriculum)).toBe(true);
    expect(hasPermission({ role: 'admin' }, PERMISSIONS.manageTerms)).toBe(true);
    expect(hasPermission({ role: 'admin' }, PERMISSIONS.manageOverrides)).toBe(true);

    expect(hasPermission({ role: 'adviser' }, PERMISSIONS.manageCurriculum)).toBe(false);
    expect(hasPermission({ role: 'student' }, PERMISSIONS.manageTerms)).toBe(false);
  });

  test('permission middleware blocks with consistent copy', () => {
    const req = { user: { role: 'admin' } };
    const res = createResponse();
    const next = jest.fn();

    requirePermission(PERMISSIONS.transferOwnership)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Insufficient Permission',
      code: 'INSUFFICIENT_PERMISSION',
    });
  });
});
