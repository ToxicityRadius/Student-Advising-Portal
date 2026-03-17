/**
 * Returns the default landing path for a given user role.
 */
export function getHomePathForRole(role) {
  switch (role) {
    case 'admin':
      return '/admin/curriculum';
    case 'adviser':
      return '/adviser/students';
    default:
      return '/dashboard';
  }
}
