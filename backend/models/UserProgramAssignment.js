const { DataTypes } = require('sequelize');
const sequelize = require('../database/db');

const UserProgramAssignment = sequelize.define(
  'UserProgramAssignment',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    programId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'programs', key: 'id' },
    },
    createdAt: {
      type: DataTypes.BIGINT,
      defaultValue: () => Date.now(),
    },
    updatedAt: {
      type: DataTypes.BIGINT,
      defaultValue: () => Date.now(),
    },
  },
  {
    tableName: 'user_program_assignments',
    timestamps: false,
    indexes: [
      { fields: ['userId'] },
      { fields: ['programId'] },
      { fields: ['userId', 'programId'], unique: true },
    ],
  },
);

module.exports = UserProgramAssignment;
