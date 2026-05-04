const { Op } = require('sequelize');

const buildNonSuperadminActivityWhere = (user) => {
  if (user?.role === 'superadmin') {
    return null;
  }

  return {
    [Op.or]: [{ actorId: { [Op.is]: null } }, { '$Actor.role$': { [Op.ne]: 'superadmin' } }],
  };
};

module.exports = {
  buildNonSuperadminActivityWhere,
};
