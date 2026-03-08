const { DataTypes } = require('sequelize');
const sequelize = require('../database/db');

const Invitation = sequelize.define('Invitation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  role: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  invitationToken: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  invitationExpires: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  invitedBy: {
    type: DataTypes.INTEGER
  },
  isUsed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  usedAt: {
    type: DataTypes.BIGINT
  },
  createdAt: {
    type: DataTypes.BIGINT,
    defaultValue: () => Date.now()
  }
}, {
  tableName: 'faculty_invitations',
  timestamps: false
});



module.exports = Invitation;
