const { DataTypes } = require('sequelize');
const sequelize = require('../database/db');

const Curriculum = sequelize.define('Curriculum', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  createdById: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' }
  },
  createdAt: {
    type: DataTypes.BIGINT,
    defaultValue: () => Date.now()
  },
  updatedAt: {
    type: DataTypes.BIGINT,
    defaultValue: () => Date.now()
  }
}, {
  tableName: 'curriculums',
  timestamps: false
});

module.exports = Curriculum;
