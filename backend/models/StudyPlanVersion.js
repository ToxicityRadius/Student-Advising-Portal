const { DataTypes } = require('sequelize');
const sequelize = require('../database/db');

const StudyPlanVersion = sequelize.define('StudyPlanVersion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  studyPlanId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'study_plans', key: 'id' }
  },
  versionNumber: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('draft', 'active', 'archived'),
    defaultValue: 'draft'
  },
  needsRevalidation: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  generatedByAdviserId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' }
  },
  validatedByAdviserId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' }
  },
  validatedAt: {
    type: DataTypes.BIGINT,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
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
  tableName: 'study_plan_versions',
  timestamps: false,
  indexes: [
    { fields: ['studyPlanId', 'status'], name: 'study_plan_versions_plan_status' },
    { fields: ['status'], name: 'study_plan_versions_status' }
  ]
});

module.exports = StudyPlanVersion;
