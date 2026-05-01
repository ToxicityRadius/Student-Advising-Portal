export const ROLE_SUPERADMIN = 'superadmin';
export const ROLE_PROGRAM_CHAIR = 'admin';
export const ROLE_ADVISER = 'adviser';
export const ROLE_STUDENT = 'student';

export const getRoleLabel = (role) => {
  switch (role) {
    case ROLE_SUPERADMIN:
      return 'Super Admin';
    case ROLE_PROGRAM_CHAIR:
      return 'Program Chair';
    case ROLE_ADVISER:
      return 'Adviser';
    case ROLE_STUDENT:
      return 'Student';
    default:
      return '';
  }
};

export const isSuperadmin = (userOrRole) =>
  (typeof userOrRole === 'string' ? userOrRole : userOrRole?.role) === ROLE_SUPERADMIN;

export const isProgramChair = (userOrRole) =>
  (typeof userOrRole === 'string' ? userOrRole : userOrRole?.role) === ROLE_PROGRAM_CHAIR;

export const isFacultyRole = (role) =>
  [ROLE_SUPERADMIN, ROLE_PROGRAM_CHAIR, ROLE_ADVISER].includes(role);
