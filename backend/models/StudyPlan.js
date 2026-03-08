const { DataTypes } = require('sequelize');
const sequelize = require('../database/db');

const StudyPlan = sequelize.define('StudyPlan', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  status: {
    type: DataTypes.ENUM('draft', 'approved', 'voided', 'voided_due_to_failure')
  }
}, {
  tableName: 'study_plans',
  timestamps: false
});

module.exports = StudyPlan;
