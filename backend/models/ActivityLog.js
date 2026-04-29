const { DataTypes } = require('sequelize');
const sequelize = require('../database/db');

const ActivityLog = sequelize.define(
  'ActivityLog',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    programId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'programs', key: 'id' },
    },
    actorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
    },
    action: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    resourceType: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    resourceId: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    resourceLabel: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    targetUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.BIGINT,
      defaultValue: () => Date.now(),
    },
  },
  {
    tableName: 'activity_logs',
    timestamps: false,
    indexes: [
      { fields: ['programId'] },
      { fields: ['actorId'] },
      { fields: ['targetUserId'] },
      { fields: ['resourceType', 'resourceId'] },
      { fields: ['action'] },
      { fields: ['createdAt'] },
    ],
  },
);

module.exports = ActivityLog;
