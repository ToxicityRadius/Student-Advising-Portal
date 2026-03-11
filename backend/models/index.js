const sequelize = require('../database/db');
const User = require('./User');

// Self-referential adviser relationship (still used by profile fields)
User.hasMany(User, { as: 'Advisees', foreignKey: 'adviserId', constraints: false });
User.belongsTo(User, { as: 'Adviser', foreignKey: 'adviserId', constraints: false });

module.exports = {
  sequelize,
  User
};
