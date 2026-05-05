const { DataTypes } = require('sequelize');
const sequelize = require('../database/db');

const Notification = sequelize.define(
  'Notification',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    recipientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    actorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [['info', 'success', 'warning', 'error']],
      },
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    resourceType: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    resourceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    targetPath: {
      type: DataTypes.STRING(512),
      allowNull: true,
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    createdAt: {
      type: DataTypes.BIGINT,
      defaultValue: () => Date.now(),
    },
  },
  {
    tableName: 'notifications',
    timestamps: false,
    indexes: [
      { fields: ['recipientId'] },
      { fields: ['recipientId', 'isRead'] },
      { fields: ['createdAt'] },
    ],
  },
);

module.exports = Notification;
