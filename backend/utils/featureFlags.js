const isEnvTrue = (value) =>
  String(value || '')
    .trim()
    .toLowerCase() === 'true';

const isAdminFirstLoginEnforcementDisabled = () => {
  return isEnvTrue(process.env.DISABLE_ADMIN_FIRST_LOGIN_ENFORCEMENT);
};

const shouldBypassAdminFirstLoginEnforcement = (user) => {
  return (
    Boolean(user) &&
    (user.role === 'admin' || user.role === 'superadmin') &&
    isAdminFirstLoginEnforcementDisabled()
  );
};

const maskUserFirstLoginFlags = (user) => {
  if (!user) return user;

  const plain = user.get ? user.get({ plain: true }) : { ...user };

  if (shouldBypassAdminFirstLoginEnforcement(plain)) {
    plain.mustChangePassword = false;
    plain.mustChangeEmail = false;
  }

  return plain;
};

module.exports = {
  isAdminFirstLoginEnforcementDisabled,
  shouldBypassAdminFirstLoginEnforcement,
  maskUserFirstLoginFlags,
};
