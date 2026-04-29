/**
 * Returns the default landing path for a given user role.
 */
export function getHomePathForRole(role) {
  switch (role) {
    case 'superadmin':
      return '/admin/dashboard';
    case 'admin':
      return '/admin/dashboard';
    case 'adviser':
      return '/adviser/dashboard';
    default:
      return '/dashboard';
  }
}
